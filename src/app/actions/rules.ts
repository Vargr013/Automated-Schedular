'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getBaseRules() {
    return await prisma.userBaseRule.findMany({
        include: {
            template: {
                include: {
                    department: true
                }
            }
        }
    })
}

export async function createBaseRule(formData: FormData) {
    const user_id = parseInt(formData.get('user_id') as string)
    const template_id = parseInt(formData.get('template_id') as string)
    const day_of_week = parseInt(formData.get('day_of_week') as string)

    // Check if rule exists for this slot, if so, update or delete first (simple approach: delete existing for this slot)
    // Actually, unique constraint might not be there, but logically one base shift per day per user for now.
    // Let's just create. If we want to replace, we should probably handle that in UI or here.
    // For now, let's assume the UI handles "clearing" or we just add. 
    // Ideally, we should check if one exists and update it, or delete old one.

    const existing = await prisma.userBaseRule.findFirst({
        where: {
            user_id,
            day_of_week
        }
    })

    if (existing) {
        await prisma.userBaseRule.delete({
            where: { id: existing.id }
        })
    }

    await prisma.userBaseRule.create({
        data: {
            user_id,
            template_id,
            day_of_week,
            recurrence_type: 'WEEKLY' // Default for now
        }
    })

    revalidatePath('/admin/base-schedule')
}

export async function deleteBaseRule(id: number) {
    await prisma.userBaseRule.delete({
        where: { id }
    })

    revalidatePath('/admin/base-schedule')
}
