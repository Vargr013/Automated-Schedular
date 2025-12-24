import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createEvents } from 'ics'
import { parseISO, addMonths, format, subMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params
    const id = parseInt(userId)

    if (isNaN(id)) {
        return new NextResponse('Invalid User ID', { status: 400 })
    }

    // Fetch shifts (2 months back to 6 months forward for a healthy feed)
    const now = new Date()
    const startDate = format(subMonths(now, 2), 'yyyy-MM-dd')
    const endDate = format(addMonths(now, 6), 'yyyy-MM-dd')

    const shifts = await prisma.shift.findMany({
        where: {
            user_id: id,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            department: true
        }
    })

    if (shifts.length === 0) {
        // Return empty calendar instead of error
    }

    const events = shifts.map(shift => {
        const startDateTime = parseISO(`${shift.date}T${shift.start_time}`)
        const endDateTime = parseISO(`${shift.date}T${shift.end_time}`)

        const duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
        const durationHours = Math.floor(duration)
        const durationMinutes = Math.round((duration - durationHours) * 60)

        return {
            start: [
                startDateTime.getFullYear(),
                startDateTime.getMonth() + 1,
                startDateTime.getDate(),
                startDateTime.getHours(),
                startDateTime.getMinutes()
            ] as [number, number, number, number, number],
            duration: { hours: durationHours, minutes: durationMinutes },
            title: `Shift: ${shift.department.name}`,
            description: `CityROCK JHB Work Shift\nDepartment: ${shift.department.name}${shift.is_smod ? '\nRole: SMOD' : ''}`,
            location: 'CityROCK JHB',
            status: 'CONFIRMED',
            busyStatus: 'BUSY'
        }
    })

    return new Promise((resolve) => {
        createEvents(events as any, (error, value) => {
            if (error) {
                resolve(new NextResponse('Error generating calendar', { status: 500 }))
                return
            }

            resolve(new NextResponse(value, {
                headers: {
                    'Content-Type': 'text/calendar; charset=utf-8',
                    'Content-Disposition': `attachment; filename="shift-schedule-${id}.ics"`,
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                }
            }))
        })
    })
}
