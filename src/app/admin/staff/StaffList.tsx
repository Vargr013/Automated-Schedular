'use client'

import { deleteUser, toggleAutoSchedule } from '@/app/actions/users'
import AddUserForm from './AddUserForm'
import EditUserModal from './EditUserModal'
import { useState } from 'react'
import { Pencil, Trash2, CalendarCheck, CalendarX } from 'lucide-react'

type Department = {
    id: number
    name: string
    color_code: string
}

type User = {
    id: number
    name: string
    email: string
    type: string
    category: string
    max_weekly_hours: number
    auto_schedule: boolean
    skills: {
        department: {
            id: number
            name: string
            color_code: string
        }
    }[]
}

export default function StaffList({ users, departments }: { users: User[], departments: Department[] }) {
    const [editingUser, setEditingUser] = useState<User | null>(null)

    const handleToggleAutoSchedule = async (user: User) => {
        try {
            await toggleAutoSchedule(user.id, !user.auto_schedule)
        } catch (error) {
            console.error('Failed to toggle auto-schedule', error)
            alert('Failed to update user')
        }
    }

    return (
        <div>
            <h1>Staff Management</h1>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Name</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Email</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Type</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Category</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Category</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Auto</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Skills</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '0.75rem 1rem' }}>{user.name}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>{user.email}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 8px',
                                        borderRadius: '99px',
                                        backgroundColor: user.type === 'FULL_TIME' ? 'var(--primary)' : 'var(--muted)',
                                        color: user.type === 'FULL_TIME' ? 'var(--primary-foreground)' : 'var(--foreground)',
                                        fontWeight: '500'
                                    }}>
                                        {user.type === 'FULL_TIME' ? 'Full Time' : 'Part Time'}
                                    </span>
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>{user.category}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <button
                                        onClick={() => handleToggleAutoSchedule(user)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: user.auto_schedule ? '#10b981' : '#ef4444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.875rem'
                                        }}
                                        title="Toggle Auto-Schedule"
                                    >
                                        {user.auto_schedule ? <CalendarCheck size={18} /> : <CalendarX size={18} />}
                                    </button>
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {user.skills.map(s => (
                                            <span key={s.department.id} style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: s.department.color_code,
                                                color: '#fff',
                                                fontSize: '0.75rem',
                                                fontWeight: '500'
                                            }}>
                                                {s.department.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => setEditingUser(user)}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px', height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Edit"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <form action={deleteUser.bind(null, user.id)}>
                                            <button
                                                type="submit"
                                                className="btn btn-danger"
                                                style={{ padding: '6px', height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Delete"
                                                onClick={(e) => {
                                                    if (!confirm('Are you sure you want to delete this user?')) {
                                                        e.preventDefault()
                                                    }
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>No staff members found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AddUserForm departments={departments} />

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    departments={departments}
                    onClose={() => setEditingUser(null)}
                />
            )}
        </div>
    )
}
