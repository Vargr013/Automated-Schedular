'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getOperatingDays() {
    return await prisma.operatingDay.findMany({
        orderBy: {
            date: 'asc'
        }
    })
}

export async function createOperatingDay(formData: FormData) {
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
    const id = Number(formData.get('id'))
    await prisma.operatingDay.delete({
        where: { id }
    })

    revalidatePath('/admin/calendar')
}
