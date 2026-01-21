import { getUsers } from '@/app/actions/users'
import { getDepartments } from '@/app/actions/departments'
import { getShifts } from '@/app/actions/shifts'
import { getOperatingDays } from '@/app/actions/calendar'
import { validateMonth } from '@/app/actions/constraints'
import RosterGrid from './RosterGrid'
import MonthSelector from './MonthSelector'
import GenerateButton from './GenerateButton'
import AutoSchedulerModal from './AutoSchedulerModal'
import ClearScheduleButton from './ClearScheduleButton'
import EnhancedPdfButton from './EnhancedPdfButton'
import PublishButton from './PublishButton'
import EnhancedExcelButton from './EnhancedExcelButton'
import RosterImportButton from './RosterImportButton'
import { getMonthRosterRange } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

export default async function RosterPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string }>
}) {
    const params = await searchParams
    const currentMonth = params.month || new Date().toISOString().slice(0, 7) // YYYY-MM

    // Calculate start and end dates for the selected month
    // Calculate start and end dates for the selected month using full weeks
    const { startDate, endDate } = getMonthRosterRange(currentMonth)

    const [users, departments, shifts, operatingDays, violations] = await Promise.all([
        getUsers(),
        getDepartments(),
        getShifts(startDate, endDate),
        getOperatingDays(),
        validateMonth(currentMonth)
    ])

    return (
        <div style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ margin: 0 }}>Roster</h1>
                    <MonthSelector currentMonth={currentMonth} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <PublishButton currentMonth={currentMonth} />
                    <GenerateButton currentMonth={currentMonth} />
                    <AutoSchedulerModal currentMonth={currentMonth} />
                    <ClearScheduleButton currentMonth={currentMonth} />
                    <EnhancedPdfButton users={users} shifts={shifts} currentMonth={currentMonth} />
                    <EnhancedExcelButton users={users} shifts={shifts} currentMonth={currentMonth} />
                    <RosterImportButton currentMonth={currentMonth} />
                </div>
            </div>

            <RosterGrid
                users={users}
                departments={departments}
                shifts={shifts}
                operatingDays={operatingDays}
                currentMonth={currentMonth}
                violations={violations}
                startDate={startDate}
                endDate={endDate}
            />
        </div >
    )
}
