'use client'

import { useState } from 'react'
import { AutomationRuleData, createRule, updateRule, deleteRule } from '@/app/actions/rules'
import { format } from 'date-fns'
import { Pencil, X, Check, Plus } from 'lucide-react'

type RuleWithDept = AutomationRuleData & { department: { name: string, color_code: string } }

function RuleForm({
    initialValues,
    departments,
    onSubmit,
    onCancel,
    submitLabel
}: {
    initialValues?: Partial<AutomationRuleData>,
    departments: any[],
    onSubmit: (data: any) => Promise<void>,
    onCancel: () => void,
    submitLabel: string
}) {
    const [deptId, setDeptId] = useState(initialValues?.department_id || departments[0]?.id)
    const [day, setDay] = useState(initialValues?.day_of_week ?? 1)
    const [start, setStart] = useState(initialValues?.start_time || '09:00')
    const [end, setEnd] = useState(initialValues?.end_time || '17:00')
    const [count, setCount] = useState(initialValues?.count || 1)
    const [reqType, setReqType] = useState(initialValues?.required_type || 'ANY')
    const [isSmod, setIsSmod] = useState(initialValues?.is_smod || false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        await onSubmit({
            department_id: Number(deptId),
            day_of_week: Number(day),
            start_time: start,
            end_time: end,
            count: Number(count),
            required_type: reqType === 'ANY' ? undefined : reqType,
            is_smod: isSmod
        })
        setIsSubmitting(false)
    }

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    return (
        <form onSubmit={handleSubmit} style={{
            background: 'var(--muted)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            marginTop: '0.5rem',
            marginBottom: '0.5rem'
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--muted-foreground)' }}>Department</label>
                    <select
                        value={deptId}
                        onChange={e => setDeptId(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                    >
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--muted-foreground)' }}>Day</label>
                    <select
                        value={day}
                        onChange={e => setDay(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                    >
                        {DAYS.map((d, i) => (
                            <option key={i} value={i}>{d}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--muted-foreground)' }}>Start Time</label>
                    <input
                        type="time"
                        value={start}
                        onChange={e => setStart(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--muted-foreground)' }}>End Time</label>
                    <input
                        type="time"
                        value={end}
                        onChange={e => setEnd(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--muted-foreground)' }}>Count</label>
                    <input
                        type="number"
                        min="1"
                        value={count}
                        onChange={e => setCount(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--muted-foreground)' }}>Type</label>
                    <select
                        value={reqType}
                        onChange={e => setReqType(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                    >
                        <option value="ANY">Any</option>
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                    </select>
                </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id={`isSmod-${initialValues?.id || 'new'}`}
                        checked={isSmod}
                        onChange={e => setIsSmod(e.target.checked)}
                    />
                    <label htmlFor={`isSmod-${initialValues?.id || 'new'}`} style={{ fontSize: '0.9rem' }}>Mark as SMOD Shift</label>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            color: 'var(--muted-foreground)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.375rem',
                            cursor: 'pointer'
                        }}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--primary)',
                            color: 'white',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : submitLabel}
                    </button>
                </div>
            </div>
        </form>
    )
}

export default function RuleList({ rules, departments }: { rules: RuleWithDept[], departments: any[] }) {
    const [isAdding, setIsAdding] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)

    const handleDelete = async (id: number) => {
        if (confirm('Delete this rule?')) {
            await deleteRule(id)
        }
    }

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    // Group by Day
    const grouped = rules.reduce((acc, rule) => {
        if (!acc[rule.day_of_week]) acc[rule.day_of_week] = []
        acc[rule.day_of_week].push(rule)
        return acc
    }, {} as Record<number, RuleWithDept[]>)

    return (
        <div>
            {/* Header / Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Active Rules</h2>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--primary)',
                            color: 'white',
                            borderRadius: '0.375rem',
                            fontWeight: '500',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Plus size={16} />
                        Add Rule
                    </button>
                )}
            </div>

            {/* Add Form */}
            {isAdding && (
                <div style={{ marginBottom: '2rem' }}>
                    <RuleForm
                        departments={departments}
                        submitLabel="Create Rule"
                        onCancel={() => setIsAdding(false)}
                        onSubmit={async (data) => {
                            await createRule(data)
                            setIsAdding(false)
                        }}
                    />
                </div>
            )}

            {/* Rules List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                    const dayRules = grouped[dayIdx]
                    if (!dayRules || dayRules.length === 0) return null

                    return (
                        <div key={dayIdx} className="card">
                            <h3 style={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                borderBottom: '1px solid var(--border)',
                                paddingBottom: '0.5rem',
                                marginBottom: '0.5rem',
                                color: 'var(--foreground)'
                            }}>
                                {DAYS[dayIdx]}
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', color: 'var(--muted-foreground)' }}>
                                            <th style={{ padding: '0.5rem' }}>Department</th>
                                            <th style={{ padding: '0.5rem' }}>Time</th>
                                            <th style={{ padding: '0.5rem' }}>Count</th>
                                            <th style={{ padding: '0.5rem' }}>Type</th>
                                            <th style={{ padding: '0.5rem' }}>SMOD</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dayRules.map(rule => {
                                            const isEditing = editId === rule.id

                                            if (isEditing) {
                                                return (
                                                    <tr key={rule.id}>
                                                        <td colSpan={6} style={{ padding: '0.5rem' }}>
                                                            <RuleForm
                                                                initialValues={rule}
                                                                departments={departments}
                                                                submitLabel="Update Rule"
                                                                onCancel={() => setEditId(null)}
                                                                onSubmit={async (data) => {
                                                                    await updateRule(rule.id!, data)
                                                                    setEditId(null)
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                )
                                            }

                                            return (
                                                <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{
                                                            width: '12px',
                                                            height: '12px',
                                                            borderRadius: '50%',
                                                            backgroundColor: rule.department.color_code
                                                        }} />
                                                        {rule.department.name}
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>{rule.start_time} - {rule.end_time}</td>
                                                    <td style={{ padding: '0.5rem' }}>{rule.count}</td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {rule.required_type ? (
                                                            <span style={{
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                background: rule.required_type === 'FULL_TIME' ? '#dbeafe' : '#fce7f3',
                                                                color: rule.required_type === 'FULL_TIME' ? '#1e40af' : '#9d174d'
                                                            }}>
                                                                {rule.required_type === 'FULL_TIME' ? 'FT' : 'PT'}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {rule.is_smod && '✅'}
                                                    </td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => setEditId(rule.id!)}
                                                            style={{
                                                                color: 'var(--primary)',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                padding: '4px'
                                                            }}
                                                            title="Edit Rule"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => rule.id && handleDelete(rule.id)}
                                                            style={{
                                                                color: 'var(--destructive)',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                padding: '4px'
                                                            }}
                                                            title="Delete Rule"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
