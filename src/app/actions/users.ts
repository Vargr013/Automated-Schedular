'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const UserFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    type: z.string().min(1, "Type is required"),
    category: z.string().min(1, "Category is required"),
    max_weekly_hours: z.coerce.number().min(0).default(40),
    hourly_rate: z.coerce.number().min(0).default(0),
    skills: z.array(z.string()).default([])
})

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
    const validatedFields = UserFormSchema.parse({
        name: formData.get('name'),
        email: formData.get('email'),
        type: formData.get('type'),
        category: formData.get('category'),
        max_weekly_hours: formData.get('max_weekly_hours'),
        hourly_rate: formData.get('hourly_rate'),
        skills: formData.getAll('skills')
    })

    await prisma.user.create({
        data: {
            name: validatedFields.name,
            email: validatedFields.email,
            type: validatedFields.type,
            category: validatedFields.category,
            max_weekly_hours: validatedFields.max_weekly_hours,
            hourly_rate: validatedFields.hourly_rate,
            skills: {
                create: validatedFields.skills.map(deptId => ({
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
    const validatedFields = UserFormSchema.parse({
        name: formData.get('name'),
        email: formData.get('email'),
        type: formData.get('type'),
        category: formData.get('category'),
        max_weekly_hours: formData.get('max_weekly_hours'),
        hourly_rate: formData.get('hourly_rate'),
        skills: formData.getAll('skills')
    })

    await prisma.user.update({
        where: { id },
        data: {
            name: validatedFields.name,
            email: validatedFields.email,
            type: validatedFields.type,
            category: validatedFields.category,
            max_weekly_hours: validatedFields.max_weekly_hours,
            hourly_rate: validatedFields.hourly_rate,
            skills: {
                deleteMany: {},
                create: validatedFields.skills.map(deptId => ({
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
    // NOTE: Schema has been updated to Cascade, but we keep this for safety (or if schema isn't pushed yet)
    await prisma.leave.deleteMany({
        where: { userId: id }
    })

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
