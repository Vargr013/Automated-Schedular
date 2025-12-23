'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, addMonths, subMonths, parseISO, setMonth, setYear } from 'date-fns'
import { useState, useRef, useEffect } from 'react'

export default function MonthSelector({ currentMonth }: { currentMonth: string }) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Current selected date
    const date = parseISO(`${currentMonth}-01`)

    // View state for the popover (to navigate years without changing selection)
    const [viewYear, setViewYear] = useState(date.getFullYear())

    useEffect(() => {
        // Reset view year when selection changes or closes
        if (!isOpen) setViewYear(date.getFullYear())
    }, [isOpen, date])

    // Specific Month Selection
    const handleSelect = (monthIndex: number) => {
        const newDate = setMonth(setYear(date, viewYear), monthIndex)
        const newMonthStr = format(newDate, 'yyyy-MM')
        router.push(`/admin/roster?month=${newMonthStr}`)
        setIsOpen(false)
    }

    // Navigation
    const nextMonth = () => {
        const newDate = addMonths(date, 1)
        router.push(`/admin/roster?month=${format(newDate, 'yyyy-MM')}`)
    }

    const prevMonth = () => {
        const newDate = subMonths(date, 1)
        router.push(`/admin/roster?month=${format(newDate, 'yyyy-MM')}`)
    }

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Navigation Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <button
                    onClick={prevMonth}
                    style={{ padding: '0.5rem', cursor: 'pointer', borderRight: '1px solid var(--border)' }}
                    className="hover:bg-muted"
                >
                    <ChevronLeft size={20} />
                </button>

                {/* Main Label */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: '600',
                        minWidth: '160px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                    className="hover:bg-muted"
                >
                    <CalendarIcon size={16} className="text-muted-foreground" />
                    <span>{format(date, 'MMMM yyyy')}</span>
                </button>

                <button
                    onClick={nextMonth}
                    style={{ padding: '0.5rem', cursor: 'pointer', borderLeft: '1px solid var(--border)' }}
                    className="hover:bg-muted"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Popover */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '120%',
                    left: 0,
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    padding: '1rem',
                    zIndex: 50,
                    width: '280px'
                }}>
                    {/* Year Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setViewYear(y => y - 1)}
                            style={{ padding: '0.25rem' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontWeight: '600' }}>{viewYear}</span>
                        <button
                            onClick={() => setViewYear(y => y + 1)}
                            style={{ padding: '0.25rem' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Month Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {months.map((m, i) => {
                            const isSelected = date.getMonth() === i && date.getFullYear() === viewYear
                            return (
                                <button
                                    key={m}
                                    onClick={() => handleSelect(i)}
                                    style={{
                                        padding: '0.5rem 0.25rem',
                                        fontSize: '0.875rem',
                                        borderRadius: '0.375rem',
                                        backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                                        color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)',
                                        border: isSelected ? 'none' : '1px solid transparent'
                                    }}
                                    className={!isSelected ? 'hover:bg-muted' : ''}
                                >
                                    {m.slice(0, 3)}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
