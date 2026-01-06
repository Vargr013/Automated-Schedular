'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getShifts } from './shifts'
import { getOperatingDays } from './calendar'
import { format, parseISO } from 'date-fns'

export async function getBudget(month: string) {
    const budget = await prisma.monthlyBudget.findUnique({
        where: { month }
    })
    return budget?.budget || 0
}

export async function setBudget(month: string, amount: number) {
    await prisma.monthlyBudget.upsert({
        where: { month },
        update: { budget: amount },
        create: { month, budget: amount }
    })
    revalidatePath('/admin/budget')
}

export async function getCostStats(month: string) {
    // 1. Get Data
    const startDate = `${month}-01`
    // Simple end date calculation (good enough for stats, better to be strict but this works for monthly scope usually)
    // Actually, let's strictly find the end of the month
    const d = parseISO(startDate)
    // We need 'yyyy-MM-dd' for end of month
    // Let's use getShifts which takes string dates
    // But getShifts relies on string comparison.
    // Let's just fetch all shifts that start with the month string for efficiency? 
    // prisma.shift.findMany({ where: { date: { startsWith: month } } }) approach is cleaner if DB supports it (SQLite does)

    // Fetch directly to avoid huge payload overhead of getShifts if possible, but getShifts joins departments/users which we need.
    // let's reuse getShifts logic but strictly filter
    // Construct end date:
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
    let departmentCosts: Record<string, number> = {}
    let departmentHours: Record<string, number> = {}
    let typeCosts: Record<string, number> = {} // FULL_TIME vs PART_TIME

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
