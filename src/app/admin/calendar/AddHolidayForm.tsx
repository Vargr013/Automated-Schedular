'use client'

import { createOperatingDay } from '@/app/actions/calendar'
import { useRef } from 'react'

export default function AddHolidayForm() {
    const formRef = useRef<HTMLFormElement>(null)

    async function action(formData: FormData) {
        await createOperatingDay(formData)
        formRef.current?.reset()
    }

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                Add Operating Exception
            </h3>
            <form ref={formRef} action={action}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Date</label>
                        <input name="date" type="date" required className="input" />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Status</label>
                        <select name="status" className="select">
                            <option value="HOLIDAY">Public Holiday</option>
                            <option value="CLOSED">Closed</option>
                            <option value="OPEN">Special Open Hours</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Event Note</label>
                        <input name="event_note" type="text" className="input" placeholder="e.g. Christmas Day, Renovation" />
                    </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)', marginBottom: '2rem' }}>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--muted-foreground)' }}>Optional: Override Operating Hours</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Open Time</label>
                            <input name="open_time" type="time" className="input" />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Close Time</label>
                            <input name="close_time" type="time" className="input" />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn" style={{ minWidth: '150px' }}>
                        Add Exception
                    </button>
                </div>
            </form>
        </div>
    )
}
