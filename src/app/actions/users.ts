'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getUsers() {
    return await prisma.user.findMany({
        include: {
            skills: {
                include: {
                    department: true
                }
            }
        }
    })
}

export async function getUser(id: number) {
    return await prisma.user.findUnique({
        where: { id }
    })
}

export async function createUser(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const type = formData.get('type') as string
    const category = formData.get('category') as string
    const max_weekly_hours = parseInt(formData.get('max_weekly_hours') as string) || 40
    const skills = formData.getAll('skills') as string[]

    await prisma.user.create({
        data: {
            name,
            email,
            type,
            category,
            max_weekly_hours,
            skills: {
                create: skills.map(deptId => ({
                    department: {
                        connect: { id: parseInt(deptId) }
                    }
                }))
            }
        }
    })

    revalidatePath('/admin/staff')
}

export async function updateUser(id: number, formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const type = formData.get('type') as string
    const category = formData.get('category') as string
    const max_weekly_hours = parseInt(formData.get('max_weekly_hours') as string) || 40
    const skills = formData.getAll('skills') as string[]

    await prisma.user.update({
        where: { id },
        data: {
            name,
            email,
            type,
            category,
            max_weekly_hours,
            skills: {
                deleteMany: {},
                create: skills.map(deptId => ({
                    department: {
                        connect: { id: parseInt(deptId) }
                    }
                }))
            }
        }
    })

    revalidatePath('/admin/staff')
}

export async function toggleAutoSchedule(id: number, auto_schedule: boolean) {
    await prisma.user.update({
        where: { id },
        data: { auto_schedule }
    })
    revalidatePath('/admin/staff')
}

export async function deleteUser(id: number) {
    // Delete skills first if cascade is not set? Prisma usually handles cascade if configured, but explicit m-n might need manual cleanup if not cascading.
    // UserSkill has user_id, so deleting user should cascade delete UserSkill rows if relation is set to cascade.
    // In schema: user User @relation(fields: [user_id], references: [id])
    // Default is usually restrict. I should check schema.
    // I didn't set onDelete: Cascade.
    // I should update schema to Cascade deletion of UserSkill when User is deleted.

    // Delete related records manually to avoid foreign key constraints
    await prisma.userSkill.deleteMany({
        where: { user_id: id }
    })

    await prisma.userBaseRule.deleteMany({
        where: { user_id: id }
    })

    await prisma.shift.deleteMany({
        where: { user_id: id }
    })

    await prisma.user.delete({
        where: { id }
    })

    revalidatePath('/admin/staff')
}
