'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getValidationMonthTag, getValidationMonthsForRange } from '@/lib/validation/cache-tags'

export async function createLeaveRequest(formData: FormData) {
    const userId = parseInt(formData.get('userId') as string)
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const reason = formData.get('reason') as string
    const leaveType = formData.get('leaveType') as string

    await prisma.leave.create({
        data: {
            userId,
            startDate,
            endDate,
            reason,
            leaveType: (leaveType as any) || 'UNPAID', // Cast enum if needed or validate
            status: 'PENDING'
        }
    })

    revalidatePath(`/schedule/${userId}`, 'page')
    revalidatePath('/admin/leave', 'page')
}

export async function updateLeaveStatus(leaveId: number, status: 'APPROVED' | 'DECLINED' | 'PENDING') {
    const leave = await prisma.leave.update({
        where: { id: leaveId },
        data: { status }
    })

    revalidatePath('/admin/leave', 'page')
    revalidatePath('/admin/roster', 'page')
    for (const month of getValidationMonthsForRange(leave.startDate, leave.endDate)) {
        revalidateTag(getValidationMonthTag(month), 'max')
    }
}

export async function updateLeaveDetails(
    leaveId: number,
    data: { startDate: string; endDate: string; reason: string; leaveType: string }
) {
    const existing = await prisma.leave.findUnique({
        where: { id: leaveId },
        select: { startDate: true, endDate: true }
    })

    await prisma.leave.update({
        where: { id: leaveId },
        data: {
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason,
            leaveType: data.leaveType as any
        }
    })

    revalidatePath('/admin/leave', 'page')
    revalidatePath('/admin/roster', 'page')
    const months = new Set<string>([
        ...getValidationMonthsForRange(data.startDate, data.endDate),
        ...(existing ? getValidationMonthsForRange(existing.startDate, existing.endDate) : [])
    ])
    for (const month of months) {
        revalidateTag(getValidationMonthTag(month), 'max')
    }
}

export async function getLeaveRequests(status?: string, leaveType?: string, month?: string) {
    const where: Prisma.LeaveWhereInput = {}
    if (status) where.status = status as any // Enum cast might be needed depending on schema
    if (leaveType) where.leaveType = leaveType as any

    if (month) {
        const startOfMonth = `${month}-01`
        // Simple trick for end of month in string comparison: YYYY-MM-32 covers all days
        // actually just YYYY-MM-31 is enough for standard comparison, 
        // but lets use last day of month logic or just simple string compare.
        // If month is "2024-02", start is "2024-02-01". 
        // Overlap: A.Start <= B.End && A.End >= B.Start
        // Leave.StartDate <= MonthEnd && Leave.EndDate >= MonthStart

        // We can't easily calculate MonthEnd string without date libs in strict SQL/Prisma without native Date objects if they are strings.
        // But since they are strings YYYY-MM-DD:
        // We can just approximate MonthEnd as `${month}-31`. It works for string comparison (2024-02-28 < 2024-02-31).

        where.AND = [
            { startDate: { lte: `${month}-31` } },
            { endDate: { gte: `${month}-01` } }
        ]
    }

    const requests = await prisma.leave.findMany({
        where,
        include: {
            user: true
        },
        orderBy: {
            startDate: 'asc'
        }
    })

    // Manual serialization is more efficient than JSON.parse(JSON.stringify)
    // Dates are already strings in DB, so we just pass them through. 
    // This removes the overhead and fixes the type error.
    return requests.map(req => ({
        ...req,
        startDate: req.startDate,
        endDate: req.endDate,
    }))
}

export async function getUserLeaveRequests(userId: number) {
    return await prisma.leave.findMany({
        where: { userId },
        orderBy: {
            startDate: 'desc'
        }
    })
}
