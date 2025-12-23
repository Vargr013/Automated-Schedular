'use client'

import { useState } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import { addLeave, deleteLeave, getLeavesForMonth } from '@/app/actions/scheduler'

type Leave = {
    id: number
    userId: number
    startDate: string
    endDate: string
    reason: string | null
    user: {
        name: string
    }
}

type User = {
    id: number
    name: string
}

export default function LeaveManager({ users, leaves: initialLeaves }: { users: User[], leaves: Leave[] }) {
    const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'))
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedUser, setSelectedUser] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)

    // We'll manage leaves state locally for optimistic updates or just refetch
    // For simplicity, let's assume parent passes fresh leaves or we re-fetch.
    // Actually, server actions and router refresh are best.

    const monthDate = parseISO(`${currentMonth}-01`)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const handleMonthChange = (offset: number) => {
        const newDate = new Date(monthDate.setMonth(monthDate.getMonth() + offset))
        setCurrentMonth(format(newDate, 'yyyy-MM'))
    }

    const handleAddLeave = async () => {
        if (!selectedDate || !selectedUser) return

        setIsLoading(true)
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            await addLeave({
                userId: parseInt(selectedUser),
                startDate: dateStr,
                endDate: dateStr, // Single day for now simplicity
                reason: 'Unavailable'
            })
            // Reset
            setSelectedUser('')
        } catch (error) {
            console.error(error)
            alert('Failed to add leave')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteLeave = async (id: number) => {
        if (!confirm('Remove this leave entry?')) return
        try {
            await deleteLeave(id)
        } catch (error) {
            console.error(error)
            alert('Failed to delete leave')
        }
    }

    // correct leaves filter for display
    const currentMonthLeaves = initialLeaves.filter(l => l.startDate.startsWith(currentMonth) || l.endDate.startsWith(currentMonth))

    return (
        <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Leave Management</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => handleMonthChange(-1)} className="btn btn-secondary"><ChevronLeft size={20} /></button>
                    <span style={{ fontWeight: 'bold', minWidth: '150px', textAlign: 'center' }}>
                        {format(monthDate, 'MMMM yyyy')}
                    </span>
                    <button onClick={() => handleMonthChange(1)} className="btn btn-secondary"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'var(--border)', border: '1px solid var(--border)' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} style={{ padding: '0.5rem', backgroundColor: 'var(--muted)', fontWeight: 'bold', textAlign: 'center' }}>
                        {day}
                    </div>
                ))}

                {/* Pad Start */}
                {Array.from({ length: (daysInMonth[0].getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`pad-${i}`} style={{ backgroundColor: 'var(--background)' }} />
                ))}

                {daysInMonth.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const dayLeaves = currentMonthLeaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr)
                    const isSelected = selectedDate && isSameDay(selectedDate, day)

                    return (
                        <div
                            key={day.toISOString()}
                            style={{
                                minHeight: '100px',
                                padding: '0.5rem',
                                backgroundColor: isSelected ? 'var(--muted)' : 'var(--background)',
                                cursor: 'pointer',
                                border: isSelected ? '2px solid var(--primary)' : 'none'
                            }}
                            onClick={() => setSelectedDate(day)}
                        >
                            <div style={{ textAlign: 'right', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>{format(day, 'd')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {dayLeaves.map(leave => (
                                    <div key={leave.id} style={{
                                        fontSize: '0.75rem',
                                        backgroundColor: '#fee2e2',
                                        color: '#991b1b',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span>{leave.user.name}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteLeave(leave.id) }}
                                            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#991b1b' }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {selectedDate && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--muted)', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>Add Leave for {format(selectedDate, 'MMM d')}:</span>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    >
                        <option value="">Select Staff...</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleAddLeave}
                        disabled={!selectedUser || isLoading}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {isLoading && <Loader2 className="spin" size={16} />}
                        Add Leave
                    </button>
                </div>
            )}
        </div>
    )
}
