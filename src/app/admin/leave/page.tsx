'use server'

import { getLeaveRequests, updateLeaveStatus } from '@/app/actions/leave'
import { format, parseISO } from 'date-fns'
import { Check, X } from 'lucide-react'

// Allow client components to pass actions
async function handleAction(leaveId: number, status: 'APPROVED' | 'DECLINED') {
    'use server'
    await updateLeaveStatus(leaveId, status)
}

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams
    const currentTab = tab || 'PENDING'
    const requests = await getLeaveRequests(currentTab)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Leave Management</h1>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                borderBottom: '1px solid var(--border)',
                marginBottom: '1rem'
            }}>
                {['PENDING', 'APPROVED', 'DECLINED'].map(status => (
                    <a
                        key={status}
                        href={`/admin/leave?tab=${status}`}
                        style={{
                            padding: '0.5rem 1rem',
                            borderBottom: currentTab === status ? '2px solid var(--primary)' : '2px solid transparent',
                            color: currentTab === status ? 'var(--primary)' : 'var(--muted-foreground)',
                            fontWeight: '600',
                            textDecoration: 'none'
                        }}
                    >
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                    </a>
                ))}
            </div>

            {/* List */}
            <div className="card" style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--muted)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem', fontWeight: '600' }}>Staff</th>
                            <th style={{ padding: '0.75rem', fontWeight: '600' }}>Dates</th>
                            <th style={{ padding: '0.75rem', fontWeight: '600' }}>Reason</th>
                            <th style={{ padding: '0.75rem', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                    No {currentTab.toLowerCase()} requests found.
                                </td>
                            </tr>
                        ) : (
                            (requests as any[]).map(req => (
                                <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem' }}>{req.user.name}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        {format(parseISO(req.startDate), 'MMM d, yyyy')} - {format(parseISO(req.endDate), 'MMM d, yyyy')}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                            {req.startDate === req.endDate ? '1 day' : 'Range'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{req.reason || '-'}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                        {currentTab === 'PENDING' && (
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <form action={handleAction.bind(null, req.id, 'APPROVED')}>
                                                    <button className="btn" style={{ padding: '0.5rem', backgroundColor: '#10b981' }}>
                                                        <Check size={16} />
                                                    </button>
                                                </form>
                                                <form action={handleAction.bind(null, req.id, 'DECLINED')}>
                                                    <button className="btn" style={{ padding: '0.5rem', backgroundColor: '#ef4444' }}>
                                                        <X size={16} />
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                        {currentTab !== 'PENDING' && (
                                            <span style={{
                                                fontSize: '0.875rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                background: req.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: req.status === 'APPROVED' ? '#10b981' : '#ef4444'
                                            }}>
                                                {req.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
