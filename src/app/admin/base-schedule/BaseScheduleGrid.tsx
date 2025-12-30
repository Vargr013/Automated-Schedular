'use client'

import { useState } from 'react'
import { createBaseRule, deleteBaseRule } from '@/app/actions/rules'

type User = {
    id: number
    name: string
}

type Template = {
    id: number
    name: string
    start_time: string
    end_time: string
    department: {
        id: number
        name: string
        color_code: string
    }
}

type BaseRule = {
    id: number
    user_id: number
    day_of_week: number
    template_id: number
    template: Template
}

const WEEK_DAYS = [
    { name: 'Monday', id: 1 },
    { name: 'Tuesday', id: 2 },
    { name: 'Wednesday', id: 3 },
    { name: 'Thursday', id: 4 },
    { name: 'Friday', id: 5 },
    { name: 'Saturday', id: 6 },
    { name: 'Sunday', id: 0 },
]

export default function BaseScheduleGrid({
    users,
    templates,
    rules
}: {
    users: User[]
    templates: Template[]
    rules: BaseRule[]
}) {
    const [selectedCell, setSelectedCell] = useState<{ userId: number, dayIndex: number } | null>(null)

    const getRuleForCell = (userId: number, dayIndex: number) => {
        return rules.find(r => r.user_id === userId && r.day_of_week === dayIndex)
    }

    // Helper to get day name from index (0-6)
    const getDayName = (dayIndex: number) => {
        return WEEK_DAYS.find(d => d.id === dayIndex)?.name || 'Unknown'
    }

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `200px repeat(7, minmax(140px, 1fr))` }}>
                    {/* Header */}
                    <div style={{
                        padding: '1rem',
                        fontWeight: '600',
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        background: 'var(--background)',
                        position: 'sticky',
                        left: 0
                    }}>Staff Member</div>
                    {WEEK_DAYS.map((day, index) => (
                        <div key={day.id} style={{
                            padding: '1rem',
                            textAlign: 'center',
                            fontWeight: '600',
                            borderBottom: '1px solid var(--border)',
                            borderRight: index === 6 ? 'none' : '1px solid var(--border)',
                            background: 'var(--muted)',
                            color: 'var(--muted-foreground)'
                        }}>
                            {day.name}
                        </div>
                    ))}

                    {/* Rows */}
                    {users.map(user => (
                        <div key={user.id} style={{ display: 'contents' }}>
                            <div style={{
                                padding: '1rem',
                                borderBottom: '1px solid var(--border)',
                                borderRight: '1px solid var(--border)',
                                background: 'var(--background)',
                                position: 'sticky',
                                left: 0,
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                {user.name}
                            </div>
                            {WEEK_DAYS.map((day, index) => {
                                const rule = getRuleForCell(user.id, day.id)
                                return (
                                    <div
                                        key={`${user.id}-${day.id}`}
                                        onClick={() => setSelectedCell({ userId: user.id, dayIndex: day.id })}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            borderRight: index === 6 ? 'none' : '1px solid var(--border)',
                                            minHeight: '80px',
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            backgroundColor: 'var(--background)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                                    >
                                        {rule ? (
                                            <div style={{
                                                backgroundColor: rule.template.department.color_code,
                                                color: '#fff',
                                                padding: '6px 8px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                position: 'relative'
                                            }}>
                                                <div style={{ fontWeight: '600' }}>{rule.template.name}</div>
                                                <div style={{ opacity: 0.9 }}>{rule.template.start_time} - {rule.template.end_time}</div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (confirm('Remove base rule?')) deleteBaseRule(rule.id)
                                                    }}
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
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
                                                <span style={{ fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>+</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {selectedCell && (
                <div className="modal-overlay" onClick={() => setSelectedCell(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem' }}>Assign Base Shift</h3>
                            <button onClick={() => setSelectedCell(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                        </div>

                        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--muted-foreground)' }}>Staff:</span>
                                <span style={{ fontWeight: '600' }}>{users.find(u => u.id === selectedCell.userId)?.name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--muted-foreground)' }}>Day:</span>
                                <span style={{ fontWeight: '600' }}>{getDayName(selectedCell.dayIndex)}</span>
                            </div>
                        </div>

                        <form action={async (formData) => {
                            await createBaseRule(formData)
                            setSelectedCell(null)
                        }}>
                            <input type="hidden" name="user_id" value={selectedCell.userId} />
                            <input type="hidden" name="day_of_week" value={selectedCell.dayIndex} />

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Select Template</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                    {templates.map(template => (
                                        <label key={template.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '0.75rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                            className="template-option"
                                        >
                                            <input type="radio" name="template_id" value={template.id} required style={{ accentColor: 'var(--primary)' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {template.name}
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        padding: '2px 6px',
                                                        borderRadius: '10px',
                                                        backgroundColor: template.department.color_code + '20',
                                                        color: template.department.color_code
                                                    }}>
                                                        {template.department.name}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                                    {template.start_time} - {template.end_time}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedCell(null)}>Cancel</button>
                                <button type="submit" className="btn" style={{ flex: 1 }}>Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
