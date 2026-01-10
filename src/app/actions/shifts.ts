'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, parseISO, subDays } from 'date-fns'
import { validateRoster } from '@/lib/validation/engine'

export async function getShifts(startDate: string, endDate: string) {
    // Dates should be in YYYY-MM-DD format
    return await prisma.shift.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            user: true,
            department: true
        }
    })
}

export async function getUserShifts(userId: number, startDate: string, endDate: string) {
    return await prisma.shift.findMany({
        where: {
            user_id: userId,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            department: true
        },
        orderBy: {
            date: 'asc'
        }
    })
}

export async function createShift(formData: FormData) {
    const user_id = parseInt(formData.get('user_id') as string)
    const department_id = parseInt(formData.get('department_id') as string)
    const date = formData.get('date') as string
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string
    const is_smod = formData.get('is_smod') === 'on'

    await prisma.shift.create({
        data: {
            user_id,
            department_id,
            date,
            start_time,
            end_time,
            is_smod
        }
    })

    revalidatePath('/admin/roster')
}

export async function deleteShift(id: number) {
    await prisma.shift.delete({
        where: { id }
    })

    revalidatePath('/admin/roster')
}

export async function moveShift(shiftId: number, newUserId: number, newDate: string) {
    await prisma.shift.update({
        where: { id: shiftId },
        data: {
            user_id: newUserId,
            date: newDate
        }
    })
    revalidatePath('/admin/roster')
}

export async function generateSchedule(month: string) {
    const date = parseISO(`${month}-01`)
    const start = startOfMonth(date)
    const end = endOfMonth(date)

    // 1. Fetch Constraints & Buffer Shifts
    // HARDCODED RULE: Max 5 Days in 7 Day Window
    const constraintConfigs = [{
        id: -1,
        name: 'Max 5 Days (Hardcoded)',
        type: 'MAX_CONSECUTIVE_DAYS',
        params: { limit: 5, window: 7 },
        severity: 'CRITICAL',
        isActive: true,
        department_id: null
    }]

    // Fetch existing shifts for context (include leading buffer for rolling windows)

    // Fetch existing shifts for context (include leading buffer for rolling windows)
    // Fetch existing shifts for context (include leading buffer for rolling windows)
    const bufferStart = subDays(start, 14) // 14 day buffer
    const existingShiftsDB = await prisma.shift.findMany({
        where: {
            date: {
                gte: format(bufferStart, 'yyyy-MM-dd'),
                lte: format(end, 'yyyy-MM-dd')
            }
        },
        include: { user: true, department: true } // Need checks? validation expects ShiftData
    })

    // Mutable list of shifts to track state during generation
    let currentShifts = existingShiftsDB.map(s => ({
        id: s.id,
        user_id: s.user_id,
        department_id: s.department_id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time
    }))

    const days = eachDayOfInterval({ start, end })
    const rules = await prisma.userBaseRule.findMany({
        include: {
            template: true,
            user: true
        }
    })

    let createdCount = 0

    // Validation engine imported at top


    for (const day of days) {
        const dayOfWeek = getDay(day)
        const dateString = format(day, 'yyyy-MM-dd')

        const matchingRules = rules.filter(r => r.day_of_week === dayOfWeek)

        for (const rule of matchingRules) {
            // Check if shift already exists in our local tracker
            const exists = currentShifts.find(s => s.user_id === rule.user_id && s.date === dateString)

            if (!exists) {
                // RULE: FT Staff Working Weekend (Sat & Sun) get Fri & Mon OFF
                if (rule.user.type === 'FULL_TIME') {
                    const isFriday = dayOfWeek === 5
                    const isMonday = dayOfWeek === 1

                    if (isFriday || isMonday) {
                        // Check if user has rules for BOTH Sat (6) and Sun (0)
                        const worksSat = rules.some(r => r.user_id === rule.user_id && r.day_of_week === 6)
                        const worksSun = rules.some(r => r.user_id === rule.user_id && r.day_of_week === 0)

                        // If they work the full weekend, skip Fri/Mon
                        if (worksSat && worksSun) {
                            continue
                        }
                    }
                }

                // Candidate Shift
                const candidate = {
                    id: -1, // Formatting placeholder
                    user_id: rule.user_id,
                    department_id: rule.template.department_id,
                    date: dateString,
                    start_time: rule.template.start_time,
                    end_time: rule.template.end_time
                }

                // Optimization: Validate ONLY this user's shifts
                const userShifts = [...currentShifts.filter(s => s.user_id === rule.user_id), candidate]

                // Check violations
                const violations = validateRoster(userShifts, constraintConfigs)

                // If any violation involves our candidate shift, skip it
                // Note: The candidate has ID -1. 
                // Violations usually return shiftId.
                const isViolation = violations.some((v: any) => v.shiftId === -1)

                if (!isViolation) {
                    // Create in DB
                    const newShift = await prisma.shift.create({
                        data: {
                            user_id: rule.user_id,
                            department_id: rule.template.department_id,
                            date: dateString,
                            start_time: rule.template.start_time,
                            end_time: rule.template.end_time
                        }
                    })

                    // Add to local tracker
                    currentShifts.push({
                        id: newShift.id,
                        user_id: newShift.user_id,
                        department_id: newShift.department_id,
                        date: newShift.date,
                        start_time: newShift.start_time,
                        end_time: newShift.end_time
                    })

                    createdCount++
                }
            }
        }
    }

    revalidatePath('/admin/roster')
    return { success: true, count: createdCount }
}
