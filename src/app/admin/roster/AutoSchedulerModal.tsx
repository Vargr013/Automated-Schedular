'use client'

import { useState } from 'react'
import { generateSchedule } from '@/app/actions/scheduler'
import { Loader2, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'

export default function AutoSchedulerModal({ currentMonth }: { currentMonth: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleGenerate = async () => {
        if (!confirm(`Are you sure you want to generate the schedule for ${currentMonth}? This will add shifts for part-time staff.`)) return

        setIsLoading(true)
        try {
            await generateSchedule({ month: currentMonth })
            setIsOpen(false)
            alert('Schedule generated successfully!')
        } catch (error) {
            console.error(error)
            alert('Failed to generate schedule. Check console for details.')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn btn-secondary"
                style={{ marginLeft: '10px', backgroundColor: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <CalendarClock size={16} />
                Auto-Schedule
            </button>
        )
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
        }}>
            <div className="card" style={{ width: '400px', backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }}>
                <h2>Auto-Scheduler</h2>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    This will automatically assign <strong>Part-Time</strong> staff to shifts for <strong>{format(new Date(currentMonth + '-01'), 'MMMM yyyy')}</strong> based on the defined rules and availability.
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                    <strong>Note:</strong> Existing manual shifts will be respected. Staff marked with "Auto-Schedule: OFF" will be skipped.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={() => setIsOpen(false)} className="btn btn-secondary" disabled={isLoading}>Cancel</button>
                    <button
                        onClick={handleGenerate}
                        className="btn btn-primary"
                        disabled={isLoading}
                        style={{ backgroundColor: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {isLoading && <Loader2 className="spin" size={16} />}
                        Generate Schedule
                    </button>
                </div>
            </div>
        </div>
    )
}
