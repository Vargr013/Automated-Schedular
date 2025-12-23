import Link from 'next/link'
import { Users, Calendar, Briefcase, Grid, FileText } from 'lucide-react'

export default function AdminDashboard() {
    return (
        <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Welcome to the Scheduler Admin Panel. Select a module to get started.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <Link href="/admin/staff" className="card" style={{
                    textDecoration: 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Staff Management</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Manage users, assign roles, and update skills.</p>
                    </div>
                </Link>

                <Link href="/admin/departments" className="card" style={{
                    textDecoration: 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        color: '#a855f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Departments</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Configure departments, roles, and color codes.</p>
                    </div>
                </Link>

                <Link href="/admin/templates" className="card" style={{
                    textDecoration: 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Shift Templates</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Define standard shift patterns and rules.</p>
                    </div>
                </Link>

                <Link href="/admin/base-schedule" className="card" style={{
                    textDecoration: 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Base Schedule</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Assign recurring weekly shifts to staff.</p>
                    </div>
                </Link>

                <Link href="/admin/calendar" className="card" style={{
                    textDecoration: 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Operating Calendar</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Set holidays, closed days, and special hours.</p>
                    </div>
                </Link>

                <Link href="/admin/roster" className="card" style={{
                    textDecoration: 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Grid size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Roster Grid</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>View the master schedule and manage shifts.</p>
                    </div>
                </Link>
            </div>
        </div>
    )
}
