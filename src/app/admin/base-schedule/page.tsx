import { getUsers } from '@/app/actions/users'
import { getTemplates } from '@/app/actions/templates'
import { getBaseRules } from '@/app/actions/rules'
import { getLeavesForMonth } from '@/app/actions/scheduler'
import BaseScheduleGrid from './BaseScheduleGrid'
import LeaveManager from '../schedule/LeaveManager'

export const dynamic = 'force-dynamic'

export default async function ScheduleManagementPage() {
    // Default to current month for initial load
    const currentMonth = new Date().toISOString().slice(0, 7)

    const [users, templates, rules, leaves] = await Promise.all([
        getUsers(),
        getTemplates(),
        getBaseRules(),
        getLeavesForMonth(currentMonth)
    ])

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
                <p className="text-muted-foreground">
                    Manage recurring base schedules and staff availability.
                </p>
            </div>

            <section className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <div>
                        <h2 className="text-xl font-semibold">Base Schedule (Recurring Rules)</h2>
                        <p className="text-sm text-muted-foreground">Assign recurring shift templates to staff.</p>
                    </div>
                </div>
                <BaseScheduleGrid
                    users={users}
                    templates={templates}
                    rules={rules}
                />
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <div>
                        <h2 className="text-xl font-semibold">Staff Leave & Availability</h2>
                        <p className="text-sm text-muted-foreground">Manage time off and unavailability for staff.</p>
                    </div>
                </div>
                <LeaveManager users={users} leaves={leaves} />
            </section>
        </div>
    )
}
