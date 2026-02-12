'use client'

import { useState } from 'react'
import { updateLeaveStatus } from '@/app/actions/leave'
import { Check, X, Pencil } from 'lucide-react'
import EditLeaveModal from './EditLeaveModal'

export default function LeaveRowActions({ request, isPending }: { request: any, isPending: boolean }) {
    const [isEditing, setIsEditing] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    async function handleStatusUpdate(status: 'APPROVED' | 'DECLINED') {
        if (!confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return
        setIsProcessing(true)
        try {
            await updateLeaveStatus(request.id, status)
        } catch (error) {
            console.error(error)
            alert('Failed to update status')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
                onClick={() => setIsEditing(true)}
                style={{
                    padding: '0.5rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title="Edit Details"
            >
                <Pencil size={16} />
            </button>

            {isPending && (
                <>
                    <button
                        onClick={() => handleStatusUpdate('APPROVED')}
                        disabled={isProcessing}
                        style={{
                            padding: '0.5rem',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Approve"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        onClick={() => handleStatusUpdate('DECLINED')}
                        disabled={isProcessing}
                        style={{
                            padding: '0.5rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Decline"
                    >
                        <X size={16} />
                    </button>
                </>
            )}

            {isEditing && (
                <EditLeaveModal
                    request={request}
                    onClose={() => setIsEditing(false)}
                />
            )}
        </div>
    )
}
