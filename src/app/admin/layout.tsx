import Link from 'next/link'
import './admin.css'
import { Users, Calendar, Grid, FileText, CalendarOff, Settings, DollarSign, ShieldAlert } from 'lucide-react'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const primaryLinks = [
        { href: '/admin/roster', label: 'Roster', icon: Grid },
        { href: '/admin/leave', label: 'Leave', icon: CalendarOff },
        { href: '/admin/staff', label: 'Staff', icon: Users },
        { href: '/admin/calendar', label: 'Calendar', icon: Calendar },
    ]

    const advancedLinks = [
        { href: '/admin/base-schedule', label: 'Base Schedule', icon: Calendar },
        { href: '/admin/templates', label: 'Shift Templates', icon: FileText },
        { href: '/admin/rules', label: 'Automation Rules', icon: Settings },
        { href: '/admin/budget', label: 'Budget', icon: DollarSign },
    ]

    return (
        <div className="admin-container">
            <aside className="admin-sidebar">
                <div style={{ paddingLeft: '0.75rem' }}>
                    <h2 style={{ paddingLeft: 0, fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.05em' }}>Scheduler<span style={{ color: 'var(--primary)' }}>.</span></h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Roster-first admin</p>
                </div>
                <nav>
                    <ul>
                        <li className="admin-nav-label">Daily workflow</li>
                        {primaryLinks.map(({ href, label, icon: Icon }) => (
                            <li key={href}>
                                <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Icon size={18} />
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <ul className="admin-nav-advanced">
                        <li className="admin-nav-label">Advanced setup</li>
                        {advancedLinks.map(({ href, label, icon: Icon }) => (
                            <li key={href}>
                                <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Icon size={18} />
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--sidebar-border)' }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted-foreground)' }}>
                            &larr; Home
                        </Link>
                        <form action={async () => {
                            'use server';
                            const { signOut } = await import('@/auth');
                            await signOut();
                        }}>
                            <button
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    color: 'var(--muted-foreground)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 'inherit',
                                    width: '100%',
                                    marginTop: '0.75rem',
                                    padding: 0
                                }}
                            >
                                <span style={{ display: 'flex', gap: '0.75rem' }}>
                                    <ShieldAlert size={18} /> Sign Out
                                </span>
                            </button>
                        </form>
                    </div>
                </nav>
            </aside>
            <main className="admin-content">
                {children}
            </main>
        </div>
    )
}
