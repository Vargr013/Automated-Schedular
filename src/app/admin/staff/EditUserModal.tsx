'use client'

import { updateUser } from '@/app/actions/users'
import { useState, useEffect } from 'react'

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
    skills: {
        department: {
            id: number
        }
    }[]
}

export default function EditUserModal({
    user,
    departments,
    onClose
}: {
    user: User
    departments: Department[]
    onClose: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function action(formData: FormData) {
        setIsSubmitting(true)
        await updateUser(user.id, formData)
        setIsSubmitting(false)
        onClose()
    }

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const userSkillIds = new Set(user.skills.map(s => s.department.id))

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>Edit Staff Member</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                </div>

                <form action={action}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Full Name</label>
                            <input name="name" type="text" required className="input" defaultValue={user.name} />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Email Address</label>
                            <input name="email" type="email" required className="input" defaultValue={user.email} />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Employment Type</label>
                            <select name="type" className="select" defaultValue={user.type}>
                                <option value="FULL_TIME">Full Time</option>
                                <option value="PART_TIME">Part Time</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Roster Category</label>
                            <select name="category" className="select" defaultValue={user.category || 'Front Desk'}>
                                <option value="Management">Management (MOD)</option>
                                <option value="Shift Manager">Shift Manager (SMOD)</option>
                                <option value="Cafe">Cafe</option>
                                <option value="Shop">Shop</option>
                                <option value="Front Desk">Front Desk</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Max Weekly Hours</label>
                            <input name="max_weekly_hours" type="number" defaultValue={user.max_weekly_hours} className="input" />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500', fontSize: '0.875rem' }}>Skills / Departments</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {departments.map(dept => (
                                <label
                                    key={dept.id}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        backgroundColor: 'var(--background)',
                                        transition: 'all 0.2s',
                                        userSelect: 'none'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <input
                                        type="checkbox"
                                        name="skills"
                                        value={dept.id}
                                        defaultChecked={userSkillIds.has(dept.id)}
                                        style={{ width: '1rem', height: '1rem', accentColor: dept.color_code }}
                                    />
                                    <span style={{ fontWeight: '500', color: 'var(--foreground)' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: dept.color_code,
                                            marginRight: '6px'
                                        }}></span>
                                        {dept.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn" disabled={isSubmitting} style={{ minWidth: '120px' }}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
