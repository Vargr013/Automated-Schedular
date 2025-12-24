'use client'

import { useState, useEffect } from 'react'
import { createEvents } from 'ics'
import { saveAs } from 'file-saver'
import { format, parseISO, addMinutes } from 'date-fns'
import { Calendar, RefreshCw, Copy, Check, Info } from 'lucide-react'

type Shift = {
    id: number
    date: string
    start_time: string
    end_time: string
    department: {
        name: string
    }
}

export default function CalendarExport({ shifts, userId }: { shifts: Shift[], userId: number }) {
    const [showSyncInfo, setShowSyncInfo] = useState(false)
    const [copied, setCopied] = useState(false)
    const [baseUrl, setBaseUrl] = useState('')

    useEffect(() => {
        setBaseUrl(window.location.origin)
    }, [])

    const syncUrl = `${baseUrl}/api/calendar/${userId}`

    const handleCopy = () => {
        navigator.clipboard.writeText(syncUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleIcsExport = async () => {
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
                description: `Work Shift at ${shift.department.name}`,
                location: 'Work',
                status: 'CONFIRMED',
                busyStatus: 'BUSY'
            }
        })

        createEvents(events as any, (error, value) => {
            if (error) {
                console.error(error)
                alert('Error generating calendar file')
                return
            }

            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
            saveAs(blob, 'my-shifts.ics')
        })
    }

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={handleIcsExport}
                    className="btn btn-secondary"
                    title="Download current month's shifts as an .ics file"
                    style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <Calendar size={14} />
                    One-time Export
                </button>
                <button
                    onClick={() => setShowSyncInfo(!showSyncInfo)}
                    className="btn"
                    style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <RefreshCw size={14} className={showSyncInfo ? 'spinner' : ''} />
                    Automated Sync
                </button>
            </div>

            {showSyncInfo && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    width: '300px',
                    backgroundColor: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '1rem',
                    zIndex: 100,
                    color: 'var(--foreground)'
                }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 'bold' }}>Live Calendar Feed</h4>
                    <p style={{ fontSize: '0.75rem', margin: '0 0 1rem 0', color: 'var(--muted-foreground)' }}>
                        Copy this link and add it as a "Calendar Subscription" in Google or Apple Calendar to sync shifts automatically.
                    </p>

                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: 'var(--muted)',
                        borderRadius: '0.4rem',
                        marginBottom: '1rem'
                    }}>
                        <code style={{ fontSize: '0.7rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {syncUrl}
                        </code>
                        <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>

                    <div style={{ fontSize: '0.7rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                        <div style={{ marginBottom: '0.4rem' }}>
                            <strong>Google:</strong> Settings &gt; Add Calendar &gt; From URL
                        </div>
                        <div>
                            <strong>Apple:</strong> File &gt; New Calendar Subscription
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
