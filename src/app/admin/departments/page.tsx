import { getDepartments, deleteDepartment } from '@/app/actions/departments'
import AddDepartmentForm from './AddDepartmentForm'
import EditDepartmentModal from './EditDepartmentModal'

export const dynamic = 'force-dynamic'

export default async function DepartmentsPage() {
    const departments = await getDepartments()

    return (
        <div>
            <h1 style={{ marginBottom: '20px' }}>Departments & Roles</h1>

            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Color Code</th>
                            <th style={{ width: '100px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map((dept) => (
                            <tr key={dept.id}>
                                <td>{dept.name}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '20px', height: '20px', backgroundColor: dept.color_code, borderRadius: '4px', border: '1px solid var(--border)' }}></div>
                                        <span style={{ fontFamily: 'monospace' }}>{dept.color_code}</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <EditDepartmentModal department={dept} />
                                        <form action={deleteDepartment}>
                                            <input type="hidden" name="id" value={dept.id} />
                                            <button type="submit" className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem' }}>Delete</button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {departments.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>No departments found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AddDepartmentForm />
        </div>
    )
}
