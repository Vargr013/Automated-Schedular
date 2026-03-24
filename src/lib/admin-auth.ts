import 'server-only'

import { auth } from '@/auth'

export async function requireAdmin() {
    const session = await auth()

    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    return session
}

export function isAdminRole(role: string | undefined) {
    return role === 'ADMIN'
}
