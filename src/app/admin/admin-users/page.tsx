import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import AdminUsersManager from './AdminUsersManager'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
    const session = await auth()
    const currentUserId = session?.user ? Number((session.user as { id?: string | number }).id) : null

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            type: true,
            category: true,
            role: true,
            password: true,
        },
        orderBy: {
            name: 'asc',
        },
    })

    const adminUsers = users
        .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            type: user.type,
            category: user.category,
            role: user.role,
            hasPassword: Boolean(user.password),
        }))
        .sort((a, b) => {
            if (a.role !== b.role) {
                return a.role === 'ADMIN' ? -1 : 1
            }

            if (a.hasPassword !== b.hasPassword) {
                return a.hasPassword ? -1 : 1
            }

            return a.name.localeCompare(b.name)
        })

    return <AdminUsersManager users={adminUsers} currentUserId={currentUserId} />
}
