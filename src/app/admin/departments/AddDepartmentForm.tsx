'use client'

import { createDepartment } from '@/app/actions/departments'
import { useRef } from 'react'

export default function AddDepartmentForm() {
    const formRef = useRef<HTMLFormElement>(null)

    async function action(formData: FormData) {
        await createDepartment(formData)
        formRef.current?.reset()
    }

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                Add New Department
            </h3>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn" style={{ minWidth: '150px' }}>
                        Create Department
                    </button>
                </div>
            </form>
        </div>
    )
}
