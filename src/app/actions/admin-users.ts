'use server'

import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

const PasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
})

async function getUserForAdminAccess(userId: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            password: true,
        },
    })

    if (!user) {
        throw new Error('User not found')
    }

    return user
}

async function getActiveAdminLoginCount() {
    return prisma.user.count({
        where: {
            role: 'ADMIN',
            NOT: {
                password: null,
            },
        },
    })
}

function revalidateAdminAccessViews() {
    revalidatePath('/admin/admin-users')
    revalidatePath('/admin/staff')
}

export async function grantAdminAccess(userId: number) {
    await requireAdmin()
    await getUserForAdminAccess(userId)

    await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' },
    })

    revalidateAdminAccessViews()
}

export async function revokeAdminAccess(userId: number) {
    const session = await requireAdmin()
    const currentUserId = Number((session.user as { id?: string | number }).id)
    const user = await getUserForAdminAccess(userId)

    if (user.id === currentUserId) {
        throw new Error('Use another admin account to remove your own admin access.')
    }

    if (user.role === 'ADMIN' && user.password) {
        const activeAdminLoginCount = await getActiveAdminLoginCount()
        if (activeAdminLoginCount <= 1) {
            throw new Error('At least one admin login must remain enabled.')
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role: 'STAFF' },
    })

    revalidateAdminAccessViews()
}

export async function setUserPassword(userId: number, formData: FormData) {
    await requireAdmin()
    await getUserForAdminAccess(userId)

    const { password } = PasswordSchema.parse({
        password: formData.get('password'),
    })

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    })

    revalidateAdminAccessViews()
}

export async function disableUserLogin(userId: number) {
    const session = await requireAdmin()
    const currentUserId = Number((session.user as { id?: string | number }).id)
    const user = await getUserForAdminAccess(userId)

    if (user.id === currentUserId) {
        throw new Error('Use another admin account to disable your own login.')
    }

    if (user.role === 'ADMIN' && user.password) {
        const activeAdminLoginCount = await getActiveAdminLoginCount()
        if (activeAdminLoginCount <= 1) {
            throw new Error('At least one admin login must remain enabled.')
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: { password: null },
    })

    revalidateAdminAccessViews()
}
