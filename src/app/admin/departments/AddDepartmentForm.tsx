'use client'

import { createDepartment } from '@/app/actions/departments'
import { useEffect, useRef } from 'react'

export default function AddDepartmentForm({ onClose }: { onClose: () => void }) {
    const formRef = useRef<HTMLFormElement>(null)

    async function action(formData: FormData) {
        await createDepartment(formData)
        formRef.current?.reset()
        onClose()
    }

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '540px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>Add Department</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                </div>

                <form ref={formRef} action={action}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Department Name</label>
                            <input name="name" type="text" required className="input" placeholder="e.g. Cafe, Front Desk" />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Color Code</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input
                                    name="color_code"
                                    type="color"
                                    defaultValue="#3b82f6"
                                    style={{
                                        height: '2.5rem',
                                        width: '4rem',
                                        padding: '0',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius)',
                                        cursor: 'pointer',
                                        backgroundColor: 'transparent'
                                    }}
                                />
                                <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Pick a distinct color for the roster</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn" style={{ minWidth: '150px' }}>
                            Create Department
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
