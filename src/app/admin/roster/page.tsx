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

    const [users, departments, shifts, operatingDays, violations, leaves] = await Promise.all([
        getUsers(),
        getDepartments(),
        getShifts(startDate, endDate),
        getOperatingDaysForRange(startDate, endDate),
        validateMonth(currentMonth),
        getLeavesForRange(startDate, endDate)
    ])

    const approvedLeaves = leaves.filter((leave) => leave.status === 'APPROVED')
    const openDays = operatingDays.filter((day) => day.status === 'OPEN').length
    const closedDays = operatingDays.filter((day) => day.status === 'CLOSED').length
    const holidayDays = operatingDays.filter((day) => day.status === 'HOLIDAY').length
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

                <div className="roster-summary-grid">
                    <div className="roster-summary-card">
                        <div className="roster-summary-label">Shift Coverage</div>
                        <div className="roster-summary-value">{shifts.length}</div>
                        <div className="roster-summary-note">Scheduled shifts in the visible roster window.</div>
                    </div>
                    <div className="roster-summary-card">
                        <div className="roster-summary-label">Staff In Roster</div>
                        <div className="roster-summary-value">{users.length}</div>
                        <div className="roster-summary-note">People available to schedule this month.</div>
                    </div>
                    <div className="roster-summary-card">
                        <div className="roster-summary-label">Approved Leave</div>
                        <div className="roster-summary-value">{approvedLeaves.length}</div>
                        <div className="roster-summary-note">Leave requests already affecting availability.</div>
                    </div>
                    <div className="roster-summary-card">
                        <div className="roster-summary-label">Roster Alerts</div>
                        <div className="roster-summary-value">{rosterWarnings.length}</div>
                        <div className="roster-summary-note">Leave conflicts and staffing gaps currently visible on the roster.</div>
                    </div>
                </div>

                <div className="roster-toolbar">
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                        <span>{openDays} open days</span>
                        <span>{closedDays} closed days</span>
                        <span>{holidayDays} holidays</span>
                    </div>
                    <div className="roster-action-group">
                        <ClearScheduleButton currentMonth={currentMonth} />
                        <EnhancedPdfButton currentMonth={currentMonth} />
                        <EnhancedExcelButton
                            users={users}
                            shifts={shifts}
                            leaves={leaves}
                            operatingDays={operatingDays}
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
