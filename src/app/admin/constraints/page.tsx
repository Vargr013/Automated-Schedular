import { getConstraints } from '@/app/actions/constraints'
import { getDepartments } from '@/app/actions/departments'
import ConstraintList from './ConstraintList'
import AddConstraintForm from './AddConstraintForm'

export const dynamic = 'force-dynamic'

export default async function ConstraintsPage() {
    const [constraints, departments] = await Promise.all([
        getConstraints(),
        getDepartments()
    ])

    return (
        <div>
            <h1 style={{ marginBottom: '2rem' }}>Limitation Rules</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
                <div>
                    <div className="card">
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Add New Rule</h2>
                        <AddConstraintForm departments={departments} />
                    </div>
                </div>

                <div>
                    <ConstraintList constraints={constraints} departments={departments} />
                </div>
            </div>
        </div>
    )
}
