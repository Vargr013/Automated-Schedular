'use server'

import prisma from '@/lib/prisma'
import { eachDayOfInterval, format, getDay, parseISO } from 'date-fns'
import { getMonthRosterRange } from '@/lib/date-utils'
import { getValidationMonthTag, VALIDATION_RULES_TAG } from '@/lib/validation/cache-tags'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'

export type RosterWarning = {
    type: 'LEAVE_CONFLICT' | 'UNDERSTAFFED'
    date: string
    message: string
    shiftId?: number
    userId?: number
    departmentId?: number
    startTime?: string
    endTime?: string
}

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
    revalidatePath('/admin/constraints', 'page')
    revalidatePath('/admin/roster', 'page')
    revalidateTag(VALIDATION_RULES_TAG, 'max')
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
    revalidatePath('/admin/constraints', 'page')
    revalidatePath('/admin/roster', 'page')
    revalidateTag(VALIDATION_RULES_TAG, 'max')
}

export async function deleteConstraint(id: number) {
    await prisma.constraint.delete({ where: { id } })
    revalidatePath('/admin/constraints', 'page')
    revalidatePath('/admin/roster', 'page')
    revalidateTag(VALIDATION_RULES_TAG, 'max')
}

function getMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}

function isTimeMatch(ruleStart: string, ruleEnd: string, shiftStart: string, shiftEnd: string, tolerance: number) {
    return Math.abs(getMinutes(shiftStart) - getMinutes(ruleStart)) <= tolerance &&
        Math.abs(getMinutes(shiftEnd) - getMinutes(ruleEnd)) <= tolerance
}

async function computeMonthValidation(month: string): Promise<RosterWarning[]> {
    const { startDate, endDate } = getMonthRosterRange(month)

    const [shifts, leaves, rules] = await Promise.all([
        prisma.shift.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        type: true
                    }
                },
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        }),
        prisma.leave.findMany({
            where: {
                status: 'APPROVED',
                OR: [
                    { startDate: { gte: startDate, lte: endDate } },
                    { endDate: { gte: startDate, lte: endDate } },
                    { startDate: { lte: startDate }, endDate: { gte: endDate } }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        }),
        prisma.automationRule.findMany({
            include: {
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })
    ])

    const warnings: RosterWarning[] = []

    for (const shift of shifts) {
        const leave = leaves.find((item) =>
            item.userId === shift.user_id &&
            item.startDate <= shift.date &&
            item.endDate >= shift.date
        )

        if (leave) {
            warnings.push({
                type: 'LEAVE_CONFLICT',
                date: shift.date,
                shiftId: shift.id,
                userId: shift.user_id,
                departmentId: shift.department_id,
                startTime: shift.start_time,
                endTime: shift.end_time,
                message: `${shift.user.name} is on approved leave but is scheduled for ${shift.start_time}-${shift.end_time}.`
            })
        }
    }

    const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
    })

    for (const day of days) {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayOfWeek = getDay(day)
        const dayRules = rules.filter((rule) => rule.day_of_week === dayOfWeek)
        const dayShifts = shifts.filter((shift) => shift.date === dateStr)

        for (const rule of dayRules) {
            const matchesFound = dayShifts.filter((shift) =>
                shift.department_id === rule.department_id &&
                isTimeMatch(rule.start_time, rule.end_time, shift.start_time, shift.end_time, rule.tolerance) &&
                (rule.required_type ? shift.user.type === rule.required_type : true) &&
                (rule.is_smod ? shift.is_smod : true)
            ).length

            const missingCount = Math.max(0, rule.count - matchesFound)

            for (let index = 0; index < missingCount; index += 1) {
                warnings.push({
                    type: 'UNDERSTAFFED',
                    date: dateStr,
                    departmentId: rule.department_id,
                    startTime: rule.start_time,
                    endTime: rule.end_time,
                    message: `Understaffed: ${rule.department.name} needs ${rule.count} @ ${rule.start_time}-${rule.end_time}${rule.required_type ? ` (${rule.required_type})` : ''}. Found ${matchesFound}.`
                })
            }
        }
    }

    return warnings
}

export async function validateMonth(month: string) {
    const runValidation = unstable_cache(
        async () => computeMonthValidation(month),
        [getValidationMonthTag(month)],
        {
            tags: [getValidationMonthTag(month), VALIDATION_RULES_TAG],
            revalidate: 30
        }
    )

    return runValidation()
}
