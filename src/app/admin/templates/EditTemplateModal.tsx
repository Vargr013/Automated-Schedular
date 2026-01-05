'use client'

import { useState } from 'react'
import { updateTemplate } from '@/app/actions/templates'

type Department = {
    id: number
    name: string
}

type Template = {
    id: number
    name: string
    start_time: string
    end_time: string
    department_id: number
}

export default function EditTemplateModal({ template, departments }: { template: Template, departments: Department[] }) {
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
                    <h3 style={{ fontSize: '1.25rem' }}>Edit Template</h3>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                </div>

                <form action={async (formData) => {
                    await updateTemplate(formData)
                    setIsOpen(false)
                }}>
                    <input type="hidden" name="id" value={template.id} />

                    <div className="form-group">
                        <label>Template Name</label>
                        <input name="name" defaultValue={template.name} required className="input" />
                    </div>

                    <div className="form-group">
                        <label>Department</label>
                        <select name="department_id" defaultValue={template.department_id} required className="select">
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Start Time</label>
                            <input name="start_time" type="time" defaultValue={template.start_time} required className="input" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>End Time</label>
                            <input name="end_time" type="time" defaultValue={template.end_time} required className="input" />
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
