'use client'

import { useState } from 'react'
import LeaveRequestModal from './LeaveRequestModal'
import { Plus, Clock, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'

type LeaveRequest = {
    id: number
    startDate: string
    endDate: string
    reason: string | null
    status: string
}

export default function LeaveSection({ userId, requests }: { userId: number, requests: LeaveRequest[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isListExpanded, setIsListExpanded] = useState(false)

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} />
                    Request Leave
                </button>
            </div>

            {requests.length > 0 && (
                <div className="card" style={{ padding: 0 }}>
                    <button
                        onClick={() => setIsListExpanded(!isListExpanded)}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--foreground)'
                        }}
                    >
                        <span style={{ fontWeight: '600' }}>My Leave Requests ({requests.length})</span>
                        {isListExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isListExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                            {requests.map(req => (
                                <div key={req.id} style={{
                                    padding: '0.75rem 1rem',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.875rem'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>
                                            {format(parseISO(req.startDate), 'MMM d')} - {format(parseISO(req.endDate), 'MMM d, yyyy')}
                                        </div>
                                        {req.reason && <div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{req.reason}</div>}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor:
                                            req.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' :
                                                req.status === 'DECLINED' ? 'rgba(239, 68, 68, 0.1)' :
                                                    'rgba(234, 179, 8, 0.1)',
                                        color:
                                            req.status === 'APPROVED' ? '#10b981' :
                                                req.status === 'DECLINED' ? '#ef4444' :
                                                    '#eab308'
                                    }}>
                                        {req.status === 'APPROVED' && <Check size={12} />}
                                        {req.status === 'DECLINED' && <X size={12} />}
                                        {req.status === 'PENDING' && <Clock size={12} />}
                                        {req.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && <LeaveRequestModal userId={userId} onClose={() => setIsModalOpen(false)} />}
        </div>
    )
}
