'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createLeaveRequest(formData: FormData) {
    const userId = parseInt(formData.get('userId') as string)
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const reason = formData.get('reason') as string
    const leaveType = formData.get('leaveType') as string

    await (prisma as any).leave.create({
        data: {
            userId,
            startDate,
            endDate,
            reason,
            leaveType: leaveType || 'UNPAID',
            status: 'PENDING'
        }
    })

    revalidatePath(`/schedule/${userId}`)
    revalidatePath('/admin/leave')
}

export async function updateLeaveStatus(leaveId: number, status: 'APPROVED' | 'DECLINED' | 'PENDING') {
    await (prisma as any).leave.update({
        where: { id: leaveId },
        data: { status }
    })

    revalidatePath('/admin/leave')
    // We might need to revalidate the user's schedule page too, but we'd need to fetch the request first to know the userId. 
    // For now, admin side is most critical.
}

export async function getLeaveRequests(status?: string, leaveType?: string) {
    const where: any = {}
    if (status) where.status = status
    if (leaveType) where.leaveType = leaveType

    return await (prisma as any).leave.findMany({
        where,
        include: {
            user: true
        },
        orderBy: {
            startDate: 'asc'
        }
    })
}

export async function getUserLeaveRequests(userId: number) {
    return await (prisma as any).leave.findMany({
        where: { userId },
        orderBy: {
            startDate: 'desc'
        }
    })
}
