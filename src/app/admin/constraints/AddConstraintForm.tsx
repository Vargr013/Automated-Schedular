'use client'

import { createConstraint } from '@/app/actions/constraints'
import { useState } from 'react'

type Department = {
    id: number
    name: string
}

export default function AddConstraintForm({ departments }: { departments: Department[] }) {
    const [type, setType] = useState('MAX_CONSECUTIVE_DAYS')

    return (
        <form action={async (formData) => {
            // Pack params into JSON string
            const rawParams: any = {}
            if (type === 'MAX_CONSECUTIVE_DAYS') {
                rawParams.limit = parseInt(formData.get('limit') as string)
                rawParams.window = parseInt(formData.get('window') as string)
            }

            // We need to inject the params JSON into the formData manually or just call the server action differently?
            // Since we're using form action, we can't easily modify the payload unless we use a hidden input or client binding.
            // Let's bind.

            const payload = {
                name: formData.get('name') as string,
                type,
                params: JSON.stringify(rawParams),
                severity: formData.get('severity') as string,
                department_id: formData.get('department_id') ? parseInt(formData.get('department_id') as string) : undefined
            }

            await createConstraint(payload)
            // Reset form? browser does it if we don't preventDefault. But we are using a custom handler wrapper.
            // Actually, simplest is to use client handler calling server action.
        }}>
            <div className="form-group">
                <label>Rule Name</label>
                <input name="name" required placeholder="e.g., Max 5 days" className="input" />
            </div>

            <div className="form-group">
                <label>Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="select">
                    <option value="MAX_CONSECUTIVE_DAYS">Day Limit (Time Window)</option>
                    {/* Future types can be added here */}
                </select>
            </div>

            <div className="form-group">
                <label>Severity</label>
                <select name="severity" className="select" defaultValue="WARNING">
                    <option value="WARNING">Warning (Orange)</option>
                    <option value="CRITICAL">Critical (Red/Prevent)</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                    Currently all alerts are visual only.
                </p>
            </div>

            <div className="form-group">
                <label>Department (Optional)</label>
                <select name="department_id" className="select">
                    <option value="">All Departments</option>
                    {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Parameters</h4>

                {type === 'MAX_CONSECUTIVE_DAYS' && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Max Days</label>
                            <input name="limit" type="number" defaultValue="5" required className="input" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>In Window (Days)</label>
                            <input name="window" type="number" defaultValue="7" required className="input" />
                        </div>
                    </div>
                )}
            </div>

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '1.5rem' }}>Create Rule</button>
        </form>
    )
}
