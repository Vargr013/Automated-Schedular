'use server'

import { getLeaveRequests } from '@/app/actions/leave'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import LeaveRowActions from './LeaveRowActions'
import MonthFilter from './MonthFilter'

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ tab?: string, type?: string, month?: string }> }) {
    const { tab, type, month } = await searchParams
    const currentTab = tab || 'PENDING'
    const currentType = type || ''
    const currentMonth = month || format(new Date(), 'yyyy-MM')

    const requests = await getLeaveRequests(currentTab, currentType, currentMonth)

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

            {/* Main Tabs (Status) */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                borderBottom: '1px solid var(--border)',
                marginBottom: '1rem'
            }}>
                {['PENDING', 'APPROVED', 'DECLINED'].map(status => (
                    <Link
                        key={status}
                        href={`/admin/leave?tab=${status}${currentType ? `&type=${currentType}` : ''}${currentMonth ? `&month=${currentMonth}` : ''}`}
                        style={{
                            padding: '0.5rem 1rem',
                            borderBottom: currentTab === status ? '2px solid var(--primary)' : '2px solid transparent',
                            color: currentTab === status ? 'var(--primary)' : 'var(--muted-foreground)',
                            fontWeight: '600',
                            textDecoration: 'none'
                        }}
                    >
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                    </Link>
                ))}
            </div>

            {/* Sub Filters (Type & Month) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                        { label: 'All Types', value: '' },
                        { label: 'Paid', value: 'PAID' },
                        { label: 'Unpaid', value: 'UNPAID' }
                    ].map(t => (
                        <Link
                            key={t.value}
                            href={`/admin/leave?tab=${currentTab}${t.value ? `&type=${t.value}` : ''}${currentMonth ? `&month=${currentMonth}` : ''}`}
                            style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '1rem',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                backgroundColor: currentType === t.value ? 'var(--primary)' : 'var(--muted)',
                                color: currentType === t.value ? 'white' : 'var(--foreground)',
                                border: '1px solid var(--border)'
                            }}
                        >
                            {t.label}
                        </Link>
                    ))}
                </div>

                <MonthFilter
                    currentMonth={currentMonth}
                    currentTab={currentTab}
                    currentType={currentType}
                />
            </div>

            {/* List */}
            <div className="card" style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--muted)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem', fontWeight: '600' }}>Staff</th>
                            <th style={{ padding: '0.75rem', fontWeight: '600' }}>Dates</th>
                            <th style={{ padding: '0.75rem', fontWeight: '600' }}>Type</th>
                            <th style={{ padding: '0.75rem', fontWeight: '600' }}>Reason</th>
                            <th style={{ padding: '0.75rem', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                    No {currentTab.toLowerCase()} requests found{currentMonth ? ` in ${currentMonth}` : ''}.
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
                                    <td style={{ padding: '0.75rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: req.leaveType === 'PAID' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                            color: req.leaveType === 'PAID' ? '#3b82f6' : '#6b7280',
                                            fontWeight: '600'
                                        }}>
                                            {req.leaveType}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{req.reason || '-'}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                        <LeaveRowActions
                                            request={req}
                                            isPending={currentTab === 'PENDING'}
                                        />
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
