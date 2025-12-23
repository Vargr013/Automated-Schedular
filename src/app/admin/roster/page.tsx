import { getUsers } from '@/app/actions/users'
import { getDepartments } from '@/app/actions/departments'
import { getShifts } from '@/app/actions/shifts'
import { getOperatingDays } from '@/app/actions/calendar'
import RosterGrid from './RosterGrid'
import MonthSelector from './MonthSelector'
import GenerateButton from './GenerateButton'
import AutoSchedulerModal from './AutoSchedulerModal'
import ClearScheduleButton from './ClearScheduleButton'
import EnhancedPdfButton from './EnhancedPdfButton'
import EnhancedExcelButton from './EnhancedExcelButton'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function RosterPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string }>
}) {
    const params = await searchParams
    const currentMonth = params.month || new Date().toISOString().slice(0, 7) // YYYY-MM

    // Calculate start and end dates for the selected month
    const date = new Date(`${currentMonth}-01`)
    const startDate = format(startOfMonth(date), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(date), 'yyyy-MM-dd')

    const [users, departments, shifts, operatingDays] = await Promise.all([
        getUsers(),
        getDepartments(),
        getShifts(startDate, endDate),
        getOperatingDays()
    ])

    return (
        <div style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ margin: 0 }}>Roster</h1>
                    <MonthSelector currentMonth={currentMonth} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <GenerateButton currentMonth={currentMonth} />
                    <AutoSchedulerModal currentMonth={currentMonth} />
                    <ClearScheduleButton currentMonth={currentMonth} />
                    <EnhancedPdfButton users={users} shifts={shifts} currentMonth={currentMonth} />
                    <EnhancedExcelButton users={users} shifts={shifts} currentMonth={currentMonth} />
                </div>
            </div>

            <RosterGrid
                users={users}
                departments={departments}
                shifts={shifts}
                operatingDays={operatingDays}
                currentMonth={currentMonth}
            />
        </div >
    )
}
