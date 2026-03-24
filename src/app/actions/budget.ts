'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getShifts } from './shifts'
import { parseISO } from 'date-fns'
import { requireAdmin } from '@/lib/admin-auth'

export async function getBudget(month: string) {
    const budget = await prisma.monthlyBudget.findUnique({
        where: { month }
    })
    return budget?.budget || 0
}

export async function setBudget(month: string, amount: number) {
    await requireAdmin()

    await prisma.monthlyBudget.upsert({
        where: { month },
        update: { budget: amount },
        create: { month, budget: amount }
    })
    revalidatePath('/admin/budget')
}

export async function getCostStats(month: string) {
    const year = parseInt(month.split('-')[0])
    const m = parseInt(month.split('-')[1])
    const lastDay = new Date(year, m, 0).getDate() // days in month

    const start = `${month}-01`
    const end = `${month}-${lastDay}`

    // Fetch Data
    const [shifts, users, operatingDays] = await Promise.all([
        getShifts(start, end),
        prisma.user.findMany(),
        prisma.operatingDay.findMany({
            where: {
                date: { gte: start, lte: end },
                status: 'HOLIDAY'
            }
        })
    ])

    const holidayDates = new Set(operatingDays.map(d => d.date))

    let totalCost = 0
    let totalHours = 0
    const departmentCosts: Record<string, number> = {}
    const departmentHours: Record<string, number> = {}
    const typeCosts: Record<string, number> = {} // FULL_TIME vs PART_TIME

    // Helper for Sunday
    const isSunday = (dateStr: string) => {
        return parseISO(dateStr).getDay() === 0
    }

    for (const shift of shifts) {
        const user = users.find(u => u.id === shift.user_id)
        if (!user || !user.hourly_rate) continue

        // Calculate Duration
        const sTime = parseISO(`${shift.date}T${shift.start_time}`)
        const eTime = parseISO(`${shift.date}T${shift.end_time}`)
        const hours = (eTime.getTime() - sTime.getTime()) / (1000 * 60 * 60)

        // Multiplier
        let multiplier = 1.0
        if (holidayDates.has(shift.date)) {
            multiplier = 2.0
        } else if (isSunday(shift.date)) {
            multiplier = 1.5
        }

        const effectiveHours = hours * multiplier
        const cost = effectiveHours * user.hourly_rate

        totalCost += cost
        totalHours += hours // Actual hours

        // Aggregate Dept
        const deptName = shift.department.name
        departmentCosts[deptName] = (departmentCosts[deptName] || 0) + cost
        departmentHours[deptName] = (departmentHours[deptName] || 0) + hours

        // Aggregate Type
        const type = user.type || 'Unknown'
        typeCosts[type] = (typeCosts[type] || 0) + cost
    }

    return {
        totalCost,
        totalHours,
        departmentCosts,
        departmentHours,
        typeCosts
    }
}
