'use server'

import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, subDays, addDays, format, parseISO } from 'date-fns'
import { validateRoster } from '@/lib/validation/engine'
import { ConstraintConfig, Violation, ShiftData } from '@/lib/validation/types'
import { revalidatePath } from 'next/cache'

export async function getConstraints() {
    return await prisma.constraint.findMany({
        include: { department: true }
    })
}

export async function createConstraint(data: {
    name: string
    type: string
    params: string
    severity: string
    department_id?: number | null
}) {
    await prisma.constraint.create({
        data: {
            ...data,
            department_id: data.department_id || null
        }
    })
    revalidatePath('/admin/constraints')
    revalidatePath('/admin/roster')
}

export async function updateConstraint(data: {
    id: number
    name: string
    type: string
    params: string
    severity: string
    department_id?: number | null
}) {
    await prisma.constraint.update({
        where: { id: data.id },
        data: {
            name: data.name,
            type: data.type,
            params: data.params,
            severity: data.severity,
            department_id: data.department_id || null
        }
    })
    revalidatePath('/admin/constraints')
    revalidatePath('/admin/roster')
}

export async function deleteConstraint(id: number) {
    await prisma.constraint.delete({ where: { id } })
    revalidatePath('/admin/constraints')
    revalidatePath('/admin/roster')
}

export async function validateMonth(month: string) {
    // 1. Fetch Constraints
    // 1. No longer fetching from DB, using hardcoded rule below
    // const constraints = await prisma.constraint.findMany({ where: { isActive: true } })
    // if (constraints.length === 0) return []

    // 2. Fetch Shifts for month PLUS buffer (e.g. prev 14 days to handle rolling windows)
    const date = parseISO(`${month}-01`)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const queryStart = subDays(monthStart, 14) // 2 weeks buffer
    const queryEnd = monthEnd

    const shifts = await prisma.shift.findMany({
        where: {
            date: {
                gte: format(queryStart, 'yyyy-MM-dd'),
                lte: format(queryEnd, 'yyyy-MM-dd')
            }
        }
    })

    // Map to ShiftData interface
    const shiftData: ShiftData[] = shifts.map(s => ({
        id: s.id,
        user_id: s.user_id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        department_id: s.department_id
    }))

    // 3. Run Engine
    // HARDCODED RULE: Max 5 Days in 7 Day Window
    const configList: ConstraintConfig[] = [{
        id: -1,
        name: 'Max 5 Days',
        type: 'MAX_CONSECUTIVE_DAYS',
        params: { limit: 5, window: 7 },
        severity: 'WARNING',
        isActive: true,
        department_id: null
    }]

    const violations = validateRoster(shiftData, configList, month)

    return violations
}
