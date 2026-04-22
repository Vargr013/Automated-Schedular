import { getUsers } from '@/app/actions/users'
import { getDepartments } from '@/app/actions/departments'
import { getShifts } from '@/app/actions/shifts'
import { getOperatingDaysForRange } from '@/app/actions/calendar'
import { validateMonth, type RosterWarning } from '@/app/actions/constraints'
import { getLeavesForRange } from '@/app/actions/scheduler'
import RosterGrid from './RosterGrid'
import MonthSelector from './MonthSelector'
import GenerateButton from './GenerateButton'
import AutoSchedulerModal from './AutoSchedulerModal'
import ClearScheduleButton from './ClearScheduleButton'
import EnhancedPdfButton from './EnhancedPdfButton'
import PublishButton from './PublishButton'
import EnhancedExcelButton from './EnhancedExcelButton'
import RosterImportButton from './RosterImportButton'
import { getMonthRosterRange, getPayrollCycleRange } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

export default async function RosterPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string }>
}) {
    const params = await searchParams
    const currentMonth = params.month || new Date().toISOString().slice(0, 7) // YYYY-MM

    const { startDate, endDate } = getMonthRosterRange(currentMonth)
    const { startDate: payrollStartDate, endDate: payrollEndDate } = getPayrollCycleRange(currentMonth)

    const [users, departments, shifts, operatingDays, violations, leaves, payrollShifts, payrollLeaves, payrollOperatingDays] = await Promise.all([
        getUsers(),
        getDepartments(),
        getShifts(startDate, endDate),
        getOperatingDaysForRange(startDate, endDate),
        validateMonth(currentMonth),
        getLeavesForRange(startDate, endDate),
        getShifts(payrollStartDate, payrollEndDate),
        getLeavesForRange(payrollStartDate, payrollEndDate),
        getOperatingDaysForRange(payrollStartDate, payrollEndDate)
    ])

    const openDays = payrollOperatingDays.filter((day) => day.status === 'OPEN').length
    const closedDays = payrollOperatingDays.filter((day) => day.status === 'CLOSED').length
    const holidayDays = payrollOperatingDays.filter((day) => day.status === 'HOLIDAY').length
    const rosterWarnings = violations as RosterWarning[]

    return (
        <div className="roster-page-shell" style={{ height: 'calc(100dvh - var(--roster-shell-offset, 16px))', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden', marginBottom: 'var(--roster-bottom-trim, 0px)' }}>
            <div style={{ marginBottom: '20px', flex: '0 0 auto' }}>
                <div className="roster-toolbar" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <h1 style={{ margin: 0 }}>Roster</h1>
                            <p style={{ margin: '0.35rem 0 0', color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                                Build the month, spot issues quickly, then publish.
                            </p>
                        </div>
                        <MonthSelector currentMonth={currentMonth} />
                    </div>
                    <div className="roster-action-group">
                        <PublishButton currentMonth={currentMonth} />
                        <GenerateButton currentMonth={currentMonth} />
                        <AutoSchedulerModal currentMonth={currentMonth} />
                    </div>
                </div>

                <div className="roster-toolbar">
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                        <span>Payroll cycle: {payrollStartDate} to {payrollEndDate}</span>
                        <span>{openDays} open days</span>
                        <span>{closedDays} closed days</span>
                        <span>{holidayDays} holidays</span>
                    </div>
                    <div className="roster-action-group">
                        <ClearScheduleButton currentMonth={currentMonth} />
                        <EnhancedPdfButton currentMonth={currentMonth} />
                        <EnhancedExcelButton
                            users={users}
                            shifts={payrollShifts}
                            leaves={payrollLeaves}
                            operatingDays={payrollOperatingDays}
                            currentMonth={currentMonth}
                        />
                        <RosterImportButton currentMonth={currentMonth} />
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex' }}>
                <RosterGrid
                    users={users}
                    departments={departments}
                    shifts={shifts}
                    operatingDays={operatingDays}
                    violations={rosterWarnings}
                    leaves={leaves}
                    startDate={startDate}
                    endDate={endDate}
                    currentMonth={currentMonth}
                />
            </div>
        </div >
    )
}
