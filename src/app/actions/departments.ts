'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getDepartments() {
    return await prisma.department.findMany()
}

export async function createDepartment(formData: FormData) {
    const name = formData.get('name') as string
    const color_code = formData.get('color_code') as string

    await prisma.department.create({
        data: {
            name,
            color_code
        }
    })

    revalidatePath('/admin/departments')
}

export async function updateDepartment(formData: FormData) {
    const id = Number(formData.get('id'))
    const name = formData.get('name') as string
    const color_code = formData.get('color_code') as string

    await prisma.department.update({
        where: { id },
        data: {
            name,
            color_code
        }
    })
    revalidatePath('/admin/departments')
}

export async function deleteDepartment(formData: FormData) {
    const id = Number(formData.get('id'))
    try {
        await prisma.department.delete({
            where: { id }
        })
        revalidatePath('/admin/departments')
    } catch (e) {
        console.error('Failed to delete department:', e)
        // In a real app we might return an error state
    }
}
