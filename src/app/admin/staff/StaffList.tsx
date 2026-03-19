'use client'

import { deleteUser, toggleAutoSchedule } from '@/app/actions/users'
import { deleteDepartment } from '@/app/actions/departments'
import AddUserForm from './AddUserForm'
import EditUserModal from './EditUserModal'
import { useState } from 'react'
import { Pencil, Trash2, CalendarCheck, CalendarX, Plus } from 'lucide-react'
import AddDepartmentForm from '../departments/AddDepartmentForm'
import EditDepartmentModal from '../departments/EditDepartmentModal'

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
    hourly_rate: number
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
    const [showAddDepartment, setShowAddDepartment] = useState(false)
    const [showAddStaff, setShowAddStaff] = useState(false)

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ marginBottom: 0 }}>Staff Management</h1>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setShowAddDepartment((current) => !current)
                            setShowAddStaff(false)
                        }}
                    >
                        <Plus size={16} />
                        {showAddDepartment ? 'Close Department' : 'Add Department'}
                    </button>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => {
                            setShowAddStaff((current) => !current)
                            setShowAddDepartment(false)
                        }}
                    >
                        <Plus size={16} />
                        {showAddStaff ? 'Close Staff Form' : 'Add Staff'}
                    </button>
                </div>
            </div>

            {showAddDepartment && (
                <AddDepartmentForm onClose={() => setShowAddDepartment(false)} />
            )}

            {showAddStaff && (
                <AddUserForm departments={departments} onClose={() => setShowAddStaff(false)} />
            )}

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.05rem', marginBottom: 0 }}>Teams and Roles</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {departments.map((department) => (
                            <span
                                key={department.id}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    padding: '0.45rem 0.7rem',
                                    borderRadius: '999px',
                                    backgroundColor: 'rgba(148, 163, 184, 0.12)',
                                    border: '1px solid var(--border)',
                                    fontSize: '0.82rem',
                                    color: 'var(--foreground)'
                                }}
                            >
                                <span style={{ width: '10px', height: '10px', borderRadius: '999px', backgroundColor: department.color_code, flexShrink: 0 }} />
                                {department.name}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Department</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Color</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Used By</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map((department) => {
                                const assignedCount = users.filter((user) =>
                                    user.skills.some((skill) => skill.department.id === department.id)
                                ).length

                                return (
                                    <tr key={department.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{department.name}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <span style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: department.color_code, border: '1px solid var(--border)' }} />
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{department.color_code}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)' }}>
                                            {assignedCount} {assignedCount === 1 ? 'staff member' : 'staff members'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <EditDepartmentModal department={department} />
                                                <form action={deleteDepartment}>
                                                    <input type="hidden" name="id" value={department.id} />
                                                    <button
                                                        type="submit"
                                                        className="btn btn-danger"
                                                        style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem' }}
                                                        onClick={(event) => {
                                                            if (!confirm(`Delete ${department.name}? This may fail if it is still in use.`)) {
                                                                event.preventDefault()
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {departments.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                                        No departments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Name</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Email</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Type</th>
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
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>No staff members found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

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
