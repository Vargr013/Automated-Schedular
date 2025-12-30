import { getUser } from '@/app/actions/users'
import { getUserShifts as fetchUserShifts } from '@/app/actions/shifts'
import { getUserLeaveRequests } from '@/app/actions/leave'
import { isMonthPublished } from '@/app/actions/publish'
import { format, startOfMonth, endOfMonth, parseISO, isSameDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameWeek } from 'date-fns'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import CalendarExport from './CalendarExport'
import LeaveSection from './LeaveSection'
import { getMultiplier } from '@/lib/holidays'

export const dynamic = 'force-dynamic'

export default async function PersonalSchedulePage({
    params,
    searchParams
}: {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ month?: string }>
}) {
    const { userId } = await params
    const { month } = await searchParams

    const id = parseInt(userId)
    if (isNaN(id)) redirect('/schedule')

    const user = await getUser(id)
    if (!user) redirect('/schedule')

    const currentMonth = month || new Date().toISOString().slice(0, 7)
    const monthDate = parseISO(`${currentMonth}-01`)
    const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd')

    const isPublished = await isMonthPublished(currentMonth)

    // Only fetch shifts if published or if viewing a past month (optional, but let's stick to strict publishing for "Activate")
    // Use empty array if not published
    const shifts = isPublished ? await fetchUserShifts(id, startDate, endDate) : []
    const leaveRequests = await getUserLeaveRequests(id)

    // Group by Week
    const weeks = []
    let currentWeekStart = startOfWeek(monthDate, { weekStartsOn: 1 })
    const monthEnd = endOfMonth(monthDate)

    while (currentWeekStart <= monthEnd) {
        const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
        const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd })

        // Check if any shifts in this week
        const weekShifts = shifts.filter((s: any) => {
            const shiftDate = parseISO(s.date)
            return isSameWeek(shiftDate, currentWeekStart, { weekStartsOn: 1 })
        })

        if (weekShifts.length > 0 || isSameWeek(new Date(), currentWeekStart, { weekStartsOn: 1 })) {
            weeks.push({
                start: currentWeekStart,
                end: currentWeekEnd,
                days: daysInWeek,
                shifts: weekShifts
            })
        }

        currentWeekStart = addDays(currentWeekStart, 7)
    }

    // Previous/Next Month Logic
    const prevMonth = format(addDays(monthDate, -1), 'yyyy-MM')
    const nextMonth = format(addDays(endOfMonth(monthDate), 1), 'yyyy-MM')

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: '1rem',
                backgroundColor: 'var(--background)',
                borderBottom: '1px solid var(--border)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Link href="/" style={{ textDecoration: 'none', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                        Home
                    </Link>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <Link href="/schedule" style={{ textDecoration: 'none', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                        Back
                    </Link>
                </div>
                <div style={{ fontWeight: '600' }}>{user.name}</div>
                <CalendarExport shifts={shifts} userId={id} />
            </div>

            {/* Month Nav */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: 'var(--muted)',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href={`/schedule/${userId}?month=${prevMonth}`} style={{ textDecoration: 'none', fontSize: '1.25rem' }}>&lsaquo;</Link>
                    <span style={{ fontWeight: '600' }}>{format(monthDate, 'MMMM yyyy')}</span>
                    <Link href={`/schedule/${userId}?month=${nextMonth}`} style={{ textDecoration: 'none', fontSize: '1.25rem' }}>&rsaquo;</Link>
                </div>

                {/* Total Hours Badge */}
                <div style={{
                    backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                    color: 'var(--primary)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '2rem',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    border: '1px solid rgba(var(--primary-rgb), 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    lineHeight: '1.2'
                }}>
                    <span>
                        {shifts.reduce((acc: number, s: any) => {
                            const start = parseISO(`${s.date}T${s.start_time}`)
                            const end = parseISO(`${s.date}T${s.end_time}`)
                            const rawHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                            return acc + (rawHours * getMultiplier(s.date))
                        }, 0).toFixed(1)} hrs <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>(weighted)</span>
                    </span>
                    {shifts.some((s: any) => getMultiplier(s.date) > 1) && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 'normal', color: 'var(--muted-foreground)' }}>
                            incl. Sun (1.5x) & Holidays (2x)
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <LeaveSection userId={id} requests={leaveRequests as any} />

                {!isPublished ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--foreground)' }}>Schedule Not Published</h3>
                        <p>The roster for {format(monthDate, 'MMMM yyyy')} has not been published yet.</p>
                    </div>
                ) : weeks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                        No shifts scheduled for this month.
                    </div>
                ) : (
                    weeks.map((week, i) => (
                        <div key={i} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{
                                padding: '0.75rem 1rem',
                                backgroundColor: 'var(--muted)',
                                borderBottom: '1px solid var(--border)',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: 'var(--muted-foreground)'
                            }}>
                                Week of {format(week.start, 'MMM d')}
                            </div>
                            <div>
                                {week.days.map(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd')
                                    const shift = shifts.find((s: any) => s.date === dateStr)
                                    const isToday = isSameDay(day, new Date())

                                    if (!shift && !isToday) return null // Hide empty days unless it's today

                                    return (
                                        <div key={dateStr} style={{
                                            padding: '1rem',
                                            borderBottom: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            backgroundColor: isToday ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                minWidth: '3.5rem',
                                                paddingRight: '1rem',
                                                borderRight: '1px solid var(--border)'
                                            }}>
                                                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>{format(day, 'EEE')}</span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>{format(day, 'd')}</span>
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                {shift ? (
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                                                            {shift.start_time} - {shift.end_time}
                                                        </div>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                backgroundColor: shift.department.color_code
                                                            }}></span>
                                                            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{shift.department.name}</span>
                                                            {shift.is_smod && (
                                                                <span style={{
                                                                    fontSize: '0.65rem',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: '#000',
                                                                    color: '#fff',
                                                                    fontWeight: 'bold'
                                                                }}>SMOD</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Off</div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
