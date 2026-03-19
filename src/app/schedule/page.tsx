import { getUsers } from '@/app/actions/users'
import UserSearch from './UserSearch'
import EnhancedPdfButton from '../admin/roster/EnhancedPdfButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ScheduleLandingPage() {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const users = await getUsers()

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
                    <EnhancedPdfButton currentMonth={currentMonth} />
                </div>
            </div>

            <UserSearch users={users} />
        </div>
    )
}
