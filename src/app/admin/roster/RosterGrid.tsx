'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameWeek } from 'date-fns'
import { createShift, deleteShift, moveShift } from '@/app/actions/shifts'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import DraggableShift from './DraggableShift'
import DroppableCell from './DroppableCell'

type User = {
    id: number
    name: string
    type: string
    category: string
    max_weekly_hours: number
    skills: {
        department: {
            id: number
            color_code: string
        }
    }[]
}

type Department = {
    id: number
    name: string
    color_code: string
}

type Shift = {
    id: number
    user_id: number
    department_id: number
    date: string
    start_time: string
    end_time: string
    is_smod: boolean
    department: {
        color_code: string
        name: string
    }
}

type OperatingDay = {
    id: number
    date: string
    status: string // OPEN, CLOSED, HOLIDAY
    event_note: string | null
}

export default function RosterGrid({
    users,
    departments,
    shifts,
    operatingDays,
    currentMonth,
    violations = []
}: {
    users: User[]
    departments: Department[]
    shifts: Shift[]
    operatingDays: OperatingDay[]
    currentMonth: string
    violations?: { shiftId?: number, message: string }[]
}) {
    const [selectedCell, setSelectedCell] = useState<{ userId: number, date: string } | null>(null)

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const shiftId = active.data.current?.shiftId
            const [userIdStr, dateStr] = (over.id as string).split('|')
            const userId = parseInt(userIdStr)

            if (shiftId && userId && dateStr) {
                // Optimistic update could go here, but for now we rely on server revalidation
                await moveShift(shiftId, userId, dateStr)
            }
        }
    }

    const monthDate = parseISO(`${currentMonth}-01`)
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate)
    })

    // Validation Logic
    const { weeklyHours, conflicts } = useMemo(() => {
        const weeklyHours: Record<number, Record<string, number>> = {}
        const conflicts = new Set<number>()

        // Initialize weekly hours
        users.forEach(u => weeklyHours[u.id] = {})

        // Helper to get minutes
        const getMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number)
            return h * 60 + m
        }

        // Calculate hours and check conflicts
        shifts.forEach(shift => {
            // 1. Weekly Hours
            const shiftDate = parseISO(shift.date)
            const weekKey = format(startOfWeek(shiftDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            const duration = (getMinutes(shift.end_time) - getMinutes(shift.start_time)) / 60

            if (!weeklyHours[shift.user_id]) weeklyHours[shift.user_id] = {}
            weeklyHours[shift.user_id][weekKey] = (weeklyHours[shift.user_id][weekKey] || 0) + duration

            // 2. Conflicts
            const sameDayShifts = shifts.filter(s => s.user_id === shift.user_id && s.date === shift.date && s.id !== shift.id)
            for (const other of sameDayShifts) {
                const start1 = getMinutes(shift.start_time)
                const end1 = getMinutes(shift.end_time)
                const start2 = getMinutes(other.start_time)
                const end2 = getMinutes(other.end_time)

                if (Math.max(start1, start2) < Math.min(end1, end2)) {
                    conflicts.add(shift.id)
                }
            }
        })

        return { weeklyHours, conflicts }
    }, [shifts, users])

    const getShiftsForCell = (userId: number, dateStr: string) => {
        return shifts.filter(s => s.user_id === userId && s.date === dateStr)
    }

    const getDayStatus = (dateStr: string) => {
        return operatingDays.find(d => d.date === dateStr)
    }

    const handleCellClick = (userId: number, dateStr: string) => {
        setSelectedCell({ userId, date: dateStr })
    }

    const renderUserRows = (userList: User[]) => {
        return userList.map(user => {
            return (
                <div key={`row-${user.id}`} style={{ display: 'contents' }}>
                    <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        position: 'sticky',
                        left: 0,
                        background: 'var(--background)',
                        zIndex: 10,
                        fontWeight: '500',
                        color: 'var(--foreground)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>{user.name}</span>
                    </div>
                    {daysInMonth.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const cellShifts = getShiftsForCell(user.id, dateStr)
                        const status = getDayStatus(dateStr)
                        const isClosed = status?.status === 'HOLIDAY' || status?.status === 'CLOSED'

                        return (
                            <div
                                key={`${user.id}-${dateStr}`}
                                onClick={() => handleCellClick(user.id, dateStr)}
                                style={{
                                    borderBottom: '1px solid var(--border)',
                                    borderRight: '1px solid var(--border)',
                                    position: 'relative',
                                }}
                            >
                                <DroppableCell userId={user.id} date={dateStr} isClosed={isClosed}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {cellShifts.map(shift => {
                                            const isConflict = conflicts.has(shift.id)
                                            // Check for violations
                                            const shiftViolations = violations.filter(v => v.shiftId === shift.id)
                                            const hasViolation = shiftViolations.length > 0

                                            return (
                                                <DraggableShift key={shift.id} shift={shift}>
                                                    <div style={{
                                                        backgroundColor: shift.department.color_code,
                                                        color: '#fff',
                                                        padding: '6px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                        position: 'relative',
                                                        border: isConflict
                                                            ? '2px solid #ef4444'
                                                            : hasViolation
                                                                ? '2px solid #f59e0b' // Orange for warning
                                                                : '1px solid rgba(255,255,255,0.2)'
                                                    }}>
                                                        <div style={{ fontWeight: '600', marginBottom: '1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            {shift.department.name}
                                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                                {isConflict && <AlertTriangle size={12} color="white" fill="#ef4444" />}
                                                                {hasViolation && (
                                                                    <div title={shiftViolations.map(v => v.message).join('\n')} style={{ cursor: 'help' }}>
                                                                        <AlertCircle size={12} color="white" fill="#f59e0b" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ opacity: 0.9 }}>{shift.start_time} - {shift.end_time}</div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (confirm('Delete shift?')) deleteShift(shift.id)
                                                            }}
                                                            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on delete button
                                                            style={{
                                                                position: 'absolute',
                                                                top: '4px',
                                                                right: '4px',
                                                                background: 'rgba(0,0,0,0.2)',
                                                                border: 'none',
                                                                color: '#fff',
                                                                cursor: 'pointer',
                                                                fontSize: '10px',
                                                                width: '16px',
                                                                height: '16px',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                lineHeight: 1
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </DraggableShift>
                                            )
                                        })}
                                    </div>
                                </DroppableCell>
                            </div>
                        )
                    })}
                </div>
            )
        })
    }

    // Group Users by Type then Category
    const groupedUsers = useMemo(() => {
        const groups: Record<string, Record<string, User[]>> = {
            'FULL_TIME': {
                'Management': [],
                'Shift Manager': [],
                'Cafe': [],
                'Shop': [],
                'Front Desk': []
            },
            'PART_TIME': {
                'Management': [],
                'Shift Manager': [],
                'Cafe': [],
                'Shop': [],
                'Front Desk': []
            }
        }

        users.forEach(user => {
            const type = user.type === 'FULL_TIME' ? 'FULL_TIME' : 'PART_TIME'
            const cat = user.category || 'Front Desk'

            if (groups[type][cat]) {
                groups[type][cat].push(user)
            } else {
                // Fallback
                if (!groups[type]['Front Desk']) groups[type]['Front Desk'] = []
                groups[type]['Front Desk'].push(user)
            }
        })

        return groups
    }, [users])

    const CATEGORY_ORDER = ['Management', 'Shift Manager', 'Cafe', 'Shop', 'Front Desk']

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ overflowX: 'auto', flex: 1, maxWidth: '100vw' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `200px repeat(${daysInMonth.length}, minmax(120px, 1fr))`,
                    }}>
                        {/* Header Row */}
                        <div style={{
                            padding: '1rem',
                            fontWeight: '600',
                            borderBottom: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            position: 'sticky',
                            left: 0,
                            background: 'var(--background)',
                            zIndex: 20,
                            color: 'var(--foreground)'
                        }}>
                            Staff Member
                        </div>
                        {daysInMonth.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const status = getDayStatus(dateStr)
                            const isHoliday = status?.status === 'HOLIDAY'
                            const isClosed = status?.status === 'CLOSED'

                            return (
                                <div key={dateStr} style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    borderBottom: '1px solid var(--border)',
                                    borderRight: '1px solid var(--border)',
                                    backgroundColor: isHoliday ? 'rgba(239, 68, 68, 0.1)' : isClosed ? 'var(--muted)' : 'var(--background)',
                                    color: isHoliday ? 'var(--destructive)' : 'var(--foreground)',
                                    minWidth: '120px'
                                }}>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>{format(day, 'EEE')}</div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{format(day, 'd')}</div>
                                    {status?.event_note && <div style={{ fontSize: '0.65rem', marginTop: '2px', fontWeight: '500' }}>{status.event_note}</div>}
                                </div>
                            )
                        })}

                        {/* Full Time Section */}
                        <div style={{
                            gridColumn: `1 / span ${daysInMonth.length + 1}`,
                            padding: '0.75rem 1rem',
                            backgroundColor: '#333',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '1rem',
                            position: 'sticky',
                            left: 0
                        }}>
                            Full Time & Cafe
                        </div>

                        {CATEGORY_ORDER.map(category => {
                            const categoryUsers = groupedUsers['FULL_TIME'][category]
                            if (!categoryUsers || categoryUsers.length === 0) return null

                            return (
                                <div key={`ft-${category}`} style={{ display: 'contents' }}>
                                    <div style={{
                                        gridColumn: `1 / span ${daysInMonth.length + 1}`,
                                        padding: '0.5rem 1rem',
                                        backgroundColor: 'var(--muted)',
                                        borderBottom: '1px solid var(--border)',
                                        fontWeight: '700',
                                        fontSize: '0.875rem',
                                        color: 'var(--foreground)',
                                        position: 'sticky',
                                        left: 0,
                                        paddingLeft: '2rem' // Indent
                                    }}>
                                        {category === 'Management' ? 'Management (MOD)' :
                                            category === 'Shift Manager' ? 'Shift Manager (SMOD)' :
                                                category}
                                    </div>
                                    {renderUserRows(categoryUsers)}
                                </div>
                            )
                        })}

                        {/* Part Time Section */}
                        <div style={{
                            gridColumn: `1 / span ${daysInMonth.length + 1}`,
                            padding: '0.75rem 1rem',
                            backgroundColor: '#333',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '1rem',
                            position: 'sticky',
                            left: 0
                        }}>
                            Part Time
                        </div>

                        {CATEGORY_ORDER.map(category => {
                            const categoryUsers = groupedUsers['PART_TIME'][category]
                            if (!categoryUsers || categoryUsers.length === 0) return null

                            return (
                                <div key={`pt-${category}`} style={{ display: 'contents' }}>
                                    <div style={{
                                        gridColumn: `1 / span ${daysInMonth.length + 1}`,
                                        padding: '0.5rem 1rem',
                                        backgroundColor: 'var(--muted)',
                                        borderBottom: '1px solid var(--border)',
                                        fontWeight: '700',
                                        fontSize: '0.875rem',
                                        color: 'var(--foreground)',
                                        position: 'sticky',
                                        left: 0,
                                        paddingLeft: '2rem' // Indent
                                    }}>
                                        {category === 'Management' ? 'Management (MOD)' :
                                            category === 'Shift Manager' ? 'Shift Manager (SMOD)' :
                                                category}
                                    </div>
                                    {renderUserRows(categoryUsers)}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Add Shift Modal */}
                {selectedCell && (
                    <div className="modal-overlay" onClick={() => setSelectedCell(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem' }}>Add Shift</h3>
                                <button onClick={() => setSelectedCell(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                            </div>

                            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Staff:</span>
                                    <span style={{ fontWeight: '600' }}>{users.find(u => u.id === selectedCell.userId)?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Date:</span>
                                    <span style={{ fontWeight: '600' }}>{format(parseISO(selectedCell.date), 'MMMM do, yyyy')}</span>
                                </div>
                            </div>

                            <form action={async (formData) => {
                                await createShift(formData)
                                setSelectedCell(null)
                            }}>
                                <input type="hidden" name="user_id" value={selectedCell.userId} />
                                <input type="hidden" name="date" value={selectedCell.date} />

                                <div className="form-group">
                                    <label>Department</label>
                                    <select name="department_id" required className="select">
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Start Time</label>
                                        <input name="start_time" type="time" required className="input" />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>End Time</label>
                                        <input name="end_time" type="time" required className="input" />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="checkbox" name="is_smod" style={{ width: '1.25rem', height: '1.25rem' }} />
                                        <span>Shift Manager (SMOD)</span>
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedCell(null)}>Cancel</button>
                                    <button type="submit" className="btn" style={{ flex: 1 }}>Save Shift</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DndContext>
    )
}
