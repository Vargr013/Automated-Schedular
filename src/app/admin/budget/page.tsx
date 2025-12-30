import { getBudget, getCostStats } from '@/app/actions/budget'
import BudgetControl from './BudgetControl'
import CostDashboard from './CostDashboard'
import MonthSelector from '@/app/admin/roster/MonthSelector' // Reusing existing selector

export const dynamic = 'force-dynamic'

export default async function BudgetPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string }>
}) {
    const params = await searchParams
    const currentMonth = params.month || new Date().toISOString().slice(0, 7)

    const [budget, stats] = await Promise.all([
        getBudget(currentMonth),
        getCostStats(currentMonth)
    ])

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ margin: 0 }}>Budget & Costing</h1>
                    <MonthSelector currentMonth={currentMonth} baseUrl="/admin/budget" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <BudgetControl month={currentMonth} currentBudget={budget} />
                <CostDashboard stats={stats} budget={budget} />
            </div>
        </div>
    )
}
