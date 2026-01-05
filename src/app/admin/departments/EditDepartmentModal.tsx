'use client'

import { useState } from 'react'
import { updateDepartment } from '@/app/actions/departments'
import { Edit2 } from 'lucide-react'

type Department = {
    id: number
    name: string
    color_code: string
}

export default function EditDepartmentModal({ department }: { department: Department }) {
    const [isOpen, setIsOpen] = useState(false)

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem' }}
            >
                Edit
            </button>
        )
    }

    return (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>Edit Department</h3>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                </div>

                <form action={async (formData) => {
                    await updateDepartment(formData)
                    setIsOpen(false)
                }}>
                    <input type="hidden" name="id" value={department.id} />

                    <div className="form-group">
                        <label>Department Name</label>
                        <input name="name" defaultValue={department.name} required className="input" />
                    </div>

                    <div className="form-group">
                        <label>Color Code</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input name="color_code" type="color" defaultValue={department.color_code} style={{ width: '50px', height: '38px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                            <input name="color_code_text" defaultValue={department.color_code} className="input" style={{ flex: 1 }} readOnly />
                        </div>
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
