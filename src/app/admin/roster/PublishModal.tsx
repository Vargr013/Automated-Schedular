'use client'

import { useState } from 'react'
import { publishSchedule } from '@/app/actions/publish'
import { addMonths, format } from 'date-fns'

export default function PublishModal({ isOpen, onClose, currentMonth }: { isOpen: boolean, onClose: () => void, currentMonth: string }) {
    const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM')

    // Default to next month if current view is this month, or just use current view? 
    // User said "always auto to the next month based on the current date", but "select the month to publish".
    // Let's default state to nextMonth.
    const [month, setMonth] = useState(nextMonth)
    const [sendEmail, setSendEmail] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await publishSchedule(month, sendEmail)
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                onClose()
            }, 1500)
        } catch (error) {
            alert('Failed to publish')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>Publish Roster</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                </div>

                {success ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'green', fontWeight: 'bold' }}>
                        Schedule Published Successfully!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Month to Publish</label>
                            <input
                                type="month"
                                className="input"
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={sendEmail}
                                    onChange={e => setSendEmail(e.target.checked)}
                                    style={{ width: '1.25rem', height: '1.25rem' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '500' }}>Notify Staff via Email</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Sends a shift breakdown to all staff with emails.</div>
                                </div>
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancel</button>
                            <button type="submit" className="btn" style={{ flex: 1, backgroundColor: 'var(--primary)', color: 'white' }} disabled={loading}>
                                {loading ? 'Publishing...' : 'Publish'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
