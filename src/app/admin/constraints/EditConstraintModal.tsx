'use client'

import { useState } from 'react'
import { updateConstraint } from '@/app/actions/constraints'
import { Edit2 } from 'lucide-react'

type Department = {
    id: number
    name: string
}

type Constraint = {
    id: number
    name: string
    type: string
    params: string
    severity: string
    department: { id: number, name: string } | null
}

export default function EditConstraintModal({ constraint, departments }: { constraint: Constraint, departments: Department[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [type, setType] = useState(constraint.type)

    // Parse params
    const parsedParams = JSON.parse(constraint.params)

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem', height: 'auto', display: 'flex', alignItems: 'center' }}
            >
                <Edit2 size={16} />
            </button>
        )
    }

    return (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>Edit Rule</h3>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                </div>

                <form action={async (formData) => {
                    const rawParams: any = {}
                    if (type === 'MAX_CONSECUTIVE_DAYS') {
                        rawParams.limit = parseInt(formData.get('limit') as string)
                        rawParams.window = parseInt(formData.get('window') as string)
                    }

                    const payload = {
                        id: constraint.id,
                        name: formData.get('name') as string,
                        type,
                        params: JSON.stringify(rawParams),
                        severity: formData.get('severity') as string,
                        department_id: formData.get('department_id') ? parseInt(formData.get('department_id') as string) : undefined
                    }

                    await updateConstraint(payload)
                    setIsOpen(false)
                }}>
                    <div className="form-group">
                        <label>Rule Name</label>
                        <input name="name" defaultValue={constraint.name} required className="input" />
                    </div>

                    <div className="form-group">
                        <label>Type</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="select">
                            <option value="MAX_CONSECUTIVE_DAYS">Day Limit (Time Window)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Severity</label>
                        <select name="severity" defaultValue={constraint.severity} className="select">
                            <option value="WARNING">Warning (Orange)</option>
                            <option value="CRITICAL">Critical (Red/Prevent)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Department (Optional)</label>
                        <select name="department_id" defaultValue={constraint.department?.id || ''} className="select">
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
                                    <input name="limit" type="number" defaultValue={parsedParams.limit} required className="input" />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>In Window (Days)</label>
                                    <input name="window" type="number" defaultValue={parsedParams.window} required className="input" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsOpen(false)}>Cancel</button>
                        <button type="submit" className="btn" style={{ flex: 1 }}>Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
