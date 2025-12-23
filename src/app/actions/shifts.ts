'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, parseISO } from 'date-fns'

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

export async function generateSchedule(month: string) {
    const date = parseISO(`${month}-01`)
    const start = startOfMonth(date)
    const end = endOfMonth(date)

    const days = eachDayOfInterval({ start, end })
    const rules = await prisma.userBaseRule.findMany({
        include: {
            template: true
        }
    })

    let createdCount = 0

    for (const day of days) {
        const dayOfWeek = getDay(day) // 0 = Sunday, 1 = Monday...
        const dateString = format(day, 'yyyy-MM-dd')

        // Find rules matching this day of week
        const matchingRules = rules.filter(r => r.day_of_week === dayOfWeek)

        for (const rule of matchingRules) {
            // Check if shift already exists
            const existingShift = await prisma.shift.findFirst({
                where: {
                    user_id: rule.user_id,
                    date: dateString
                }
            })

            if (!existingShift) {
                await prisma.shift.create({
                    data: {
                        user_id: rule.user_id,
                        department_id: rule.template.department_id,
                        date: dateString,
                        start_time: rule.template.start_time,
                        end_time: rule.template.end_time
                    }
                })
                createdCount++
            }
        }
    }

    revalidatePath('/admin/roster')
    return { success: true, count: createdCount }
}
