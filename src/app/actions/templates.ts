'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getTemplates() {
    return await prisma.shiftTemplate.findMany({
        include: {
            department: true
        },
        orderBy: {
            name: 'asc'
        }
    })
}

export async function createTemplate(formData: FormData) {
    const name = formData.get('name') as string
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string
    const department_id = parseInt(formData.get('department_id') as string)

    await prisma.shiftTemplate.create({
        data: {
            name,
            start_time,
            end_time,
            department_id
        }
    })

    revalidatePath('/admin/templates')
}

export async function updateTemplate(formData: FormData) {
    const id = parseInt(formData.get('id') as string)
    const name = formData.get('name') as string
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string
    const department_id = parseInt(formData.get('department_id') as string)

    await prisma.shiftTemplate.update({
        where: { id },
        data: {
            name,
            start_time,
            end_time,
            department_id
        }
    })
    revalidatePath('/admin/templates')
}

export async function deleteTemplate(formData: FormData) {
    const id = parseInt(formData.get('id') as string)

    await prisma.shiftTemplate.delete({
        where: { id }
    })

    revalidatePath('/admin/templates')
}
