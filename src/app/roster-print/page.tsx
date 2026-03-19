import { getLeavesForRange } from '@/app/actions/scheduler'
import { getShifts } from '@/app/actions/shifts'
import { getUsers } from '@/app/actions/users'
import RosterPrintDocument, { buildRosterPrintModel } from '@/app/admin/roster/RosterPrintDocument'
import styles from '@/app/admin/roster/roster-print.module.css'
import { getMonthRosterRange } from '@/lib/date-utils'
import AutoPrintClient from './AutoPrintClient'

export const dynamic = 'force-dynamic'

function isValidMonth(value: string | undefined) {
    return Boolean(value && /^\d{4}-\d{2}$/.test(value))
}

export default async function RosterPrintPage({
    searchParams
}: {
    searchParams: Promise<{ month?: string, mode?: string }>
}) {
    const params = await searchParams
    const mode = params.mode === 'pdf' ? 'pdf' : 'interactive'
    const currentMonth = isValidMonth(params.month)
        ? params.month!
        : new Date().toISOString().slice(0, 7)

    const { startDate, endDate } = getMonthRosterRange(currentMonth)
    const [users, shifts, leaves] = await Promise.all([
        getUsers(),
        getShifts(startDate, endDate),
        getLeavesForRange(startDate, endDate)
    ])

    const model = buildRosterPrintModel({
        users,
        shifts,
        leaves,
        currentMonth
    })

    return (
        <main className={styles.page}>
            {mode !== 'pdf' ? <AutoPrintClient /> : null}
            <div className={styles.container}>
                {mode !== 'pdf' ? (
                    <div className={styles.screenToolbar}>
                        <p className={styles.screenHint}>
                            The print dialog should open automatically. If it does not, use `Ctrl+P` and choose "Save as PDF".
                        </p>
                        <div className={styles.printButton}>Use Ctrl+P if needed</div>
                    </div>
                ) : null}
                <RosterPrintDocument model={model} />
            </div>
        </main>
    )
}
