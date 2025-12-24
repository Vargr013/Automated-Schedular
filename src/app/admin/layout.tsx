import Link from 'next/link'
import './admin.css'
import { LayoutDashboard, Users, Briefcase, Calendar, Grid, FileText, CalendarOff } from 'lucide-react'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="admin-container">
            <aside className="admin-sidebar">
                <div style={{ paddingLeft: '0.75rem' }}>
                    <h2 style={{ paddingLeft: 0, fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.05em' }}>Scheduler<span style={{ color: 'var(--primary)' }}>.</span></h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Admin Console</p>
                </div>
                <nav>
                    <ul>
                        <li>
                            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/staff" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Users size={18} />
                                Staff Management
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/departments" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Briefcase size={18} />
                                Departments
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/templates" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FileText size={18} />
                                Shift Templates
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/base-schedule" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Calendar size={18} />
                                Base Schedule
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/calendar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Calendar size={18} />
                                Operating Calendar
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/leave" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <CalendarOff size={18} />
                                Leave Management
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/roster" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Grid size={18} />
                                Roster Grid
                            </Link>
                        </li>
                    </ul>
                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--sidebar-border)' }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted-foreground)' }}>
                            &larr; Home
                        </Link>
                    </div>
                </nav>
            </aside>
            <main className="admin-content">
                {children}
            </main>
        </div>
    )
}
