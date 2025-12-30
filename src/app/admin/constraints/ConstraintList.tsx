'use client'

import { deleteConstraint } from '@/app/actions/constraints'
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react'

type Constraint = {
    id: number
    name: string
    type: string
    params: string
    severity: string
    department: { name: string } | null
}

export default function ConstraintList({ constraints }: { constraints: Constraint[] }) {
    if (constraints.length === 0) {
        return <div className="card" style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '3rem' }}>No active rules found.</div>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {constraints.map(c => {
                const params = JSON.parse(c.params)

                return (
                    <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                backgroundColor: c.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: c.severity === 'CRITICAL' ? 'var(--destructive)' : '#f59e0b'
                            }}>
                                {c.severity === 'CRITICAL' ? <AlertTriangle size={24} /> : <AlertCircle size={24} />}
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{c.name}</h3>
                                <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                                    {c.type === 'MAX_CONSECUTIVE_DAYS' && `Max ${params.limit} days in ${params.window} day window`}
                                </div>
                                {c.department && (
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '0.5rem',
                                        fontSize: '0.75rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--muted)',
                                        color: 'var(--foreground)'
                                    }}>
                                        Applies to: {c.department.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            className="btn btn-danger"
                            style={{ padding: '0.5rem' }}
                            onClick={async () => {
                                if (confirm('Delete this rule?')) await deleteConstraint(c.id)
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
