'use client'

import { useState } from 'react'
import { updateOperatingDay } from '@/app/actions/calendar'

type OperatingDay = {
    id: number
    date: string
    status: string
    event_note: string | null
    open_time: string | null
    close_time: string | null
}

export default function EditOperatingDayModal({ day }: { day: OperatingDay }) {
    const [isOpen, setIsOpen] = useState(false)
    const [status, setStatus] = useState(day.status)

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem' }}
            >
                Edit
            </button>
        )
    }

    return (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>Edit Operating Day</h3>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                </div>

                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontWeight: '600' }}>Date: </span> {day.date}
                </div>

                <form action={async (formData) => {
                    await updateOperatingDay(formData)
                    setIsOpen(false)
                }}>
                    <input type="hidden" name="id" value={day.id} />

                    <div className="form-group">
                        <label>Status</label>
                        <select
                            name="status"
                            className="select"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="OPEN">Open (Standard)</option>
                            <option value="holx">Hybrid/Special</option>
                            <option value="HOLIDAY">Holiday (Closed/Premium)</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Event / Note</label>
                        <input name="event_note" className="input" defaultValue={day.event_note || ''} placeholder="e.g. Christmas Day" />
                    </div>

                    {status !== 'CLOSED' && status !== 'HOLIDAY' && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Open Time</label>
                                <input name="open_time" type="time" className="input" defaultValue={day.open_time || ''} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Close Time</label>
                                <input name="close_time" type="time" className="input" defaultValue={day.close_time || ''} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsOpen(false)}>Cancel</button>
                        <button type="submit" className="btn" style={{ flex: 1 }}>Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
