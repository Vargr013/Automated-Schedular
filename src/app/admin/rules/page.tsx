import { getRules, seedRules } from '@/app/actions/rules'
import { getDepartments } from '@/app/actions/departments'
import RuleList from './RuleList'

export const dynamic = 'force-dynamic'

export default async function RulesPage() {
    const [rules, departments] = await Promise.all([
        getRules(),
        getDepartments()
    ])

    return (
        <div style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>Automation Rules</h1>

                {rules.length === 0 && (
                    <form action={async () => {
                        'use server'
                        await seedRules()
                    }}>
                        <button
                            type="submit"
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'var(--primary)',
                                color: 'white',
                                borderRadius: '0.5rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Import Default Rules
                        </button>
                    </form>
                )}
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
                <RuleList rules={rules} departments={departments} />
            </div>
        </div>
    )
}
