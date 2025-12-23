import { getTemplates, deleteTemplate } from '@/app/actions/templates'
import { getDepartments } from '@/app/actions/departments'
import AddTemplateForm from './AddTemplateForm'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
    const [templates, departments] = await Promise.all([
        getTemplates(),
        getDepartments()
    ])

    return (
        <div>
            <h1 style={{ marginBottom: '20px' }}>Shift Templates</h1>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Define standard shift patterns to quickly assign to staff.</p>

            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Time</th>
                            <th>Duration</th>
                            <th style={{ width: '100px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.map((template) => {
                            // Simple duration calc
                            const start = parseInt(template.start_time.split(':')[0])
                            const end = parseInt(template.end_time.split(':')[0])
                            let duration = end - start
                            if (duration < 0) duration += 24 // Handle overnight

                            return (
                                <tr key={template.id}>
                                    <td style={{ fontWeight: '500' }}>{template.name}</td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: template.department.color_code + '20', // 20 = low opacity hex
                                            color: template.department.color_code,
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: template.department.color_code }}></span>
                                            {template.department.name}
                                        </span>
                                    </td>
                                    <td>{template.start_time} - {template.end_time}</td>
                                    <td style={{ color: 'var(--muted-foreground)' }}>{duration} hrs</td>
                                    <td>
                                        <form action={deleteTemplate}>
                                            <input type="hidden" name="id" value={template.id} />
                                            <button type="submit" className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem' }}>Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            )
                        })}
                        {templates.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>No templates found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AddTemplateForm departments={departments} />
        </div>
    )
}
