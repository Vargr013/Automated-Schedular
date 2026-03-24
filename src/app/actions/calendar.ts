'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'

export async function getOperatingDays() {
    return getOperatingDaysForRange()
}

export async function getOperatingDaysForRange(startDate?: string, endDate?: string) {
    return await prisma.operatingDay.findMany({
        where: startDate && endDate ? {
            date: {
                gte: startDate,
                lte: endDate
            }
        } : undefined,
        orderBy: {
            date: 'asc'
        }
    })
}

export async function createOperatingDay(formData: FormData) {
    await requireAdmin()

    const date = formData.get('date') as string
    const status = formData.get('status') as string
    const event_note = formData.get('event_note') as string
    const open_time = formData.get('open_time') as string || null
    const close_time = formData.get('close_time') as string || null

    await prisma.operatingDay.create({
        data: {
            date, // "YYYY-MM-DD"
            status,
            event_note,
            open_time,
            close_time
        }
    })

    revalidatePath('/admin/calendar')
}

export async function updateOperatingDay(formData: FormData) {
    await requireAdmin()

    const id = parseInt(formData.get('id') as string)
    const status = formData.get('status') as string
    const event_note = formData.get('event_note') as string
    const open_time = formData.get('open_time') as string || null
    const close_time = formData.get('close_time') as string || null

    await prisma.operatingDay.update({
        where: { id },
        data: {
            status,
            event_note,
            open_time,
            close_time
        }
    })
    revalidatePath('/admin/calendar')
    revalidatePath('/admin/roster')
}

export async function deleteOperatingDay(formData: FormData) {
    await requireAdmin()

    const id = Number(formData.get('id'))
    await prisma.operatingDay.delete({
        where: { id }
    })

    revalidatePath('/admin/calendar')
}
