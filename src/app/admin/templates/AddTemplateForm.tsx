'use client'

import { createTemplate } from '@/app/actions/templates'
import { useRef } from 'react'

type Department = {
    id: number
    name: string
    color_code: string
}

export default function AddTemplateForm({ departments }: { departments: Department[] }) {
    const formRef = useRef<HTMLFormElement>(null)

    async function action(formData: FormData) {
        await createTemplate(formData)
        formRef.current?.reset()
    }

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                Add New Shift Template
            </h3>
            <form ref={formRef} action={action}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Template Name</label>
                        <input name="name" type="text" required className="input" placeholder="e.g. Morning Shift" />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Department</label>
                        <select name="department_id" required className="select">
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Start Time</label>
                        <input name="start_time" type="time" required className="input" />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>End Time</label>
                        <input name="end_time" type="time" required className="input" />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn" style={{ minWidth: '150px' }}>
                        Create Template
                    </button>
                </div>
            </form>
        </div>
    )
}
