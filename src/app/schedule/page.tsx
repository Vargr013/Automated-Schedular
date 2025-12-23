import { getUsers } from '@/app/actions/users'
import { getShifts } from '@/app/actions/shifts'
import { getDepartments } from '@/app/actions/departments'
import UserSearch from './UserSearch'
import EnhancedPdfButton from '../admin/roster/EnhancedPdfButton'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ScheduleLandingPage() {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthDate = new Date(`${currentMonth}-01`)
    const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd')

    const [users, shifts, departments] = await Promise.all([
        getUsers(),
        getShifts(startDate, endDate),
        getDepartments()
    ])

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <Link href="/" style={{ textDecoration: 'none', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    &larr; Home
                </Link>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Select Your Name</h1>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <EnhancedPdfButton users={users} shifts={shifts} currentMonth={currentMonth} />
                </div>
            </div>

            <UserSearch users={users} />
        </div>
    )
}
