'use client'

import { useState } from 'react'
import { updateLeaveDetails } from '@/app/actions/leave'
import { X } from 'lucide-react'

type LeaveRequest = {
    id: number
    startDate: string
    endDate: string
    leaveType: string
    reason: string | null
    userId: number
    user: { name: string }
}

export default function EditLeaveModal({ request, onClose }: { request: LeaveRequest, onClose: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        try {
            const startDate = formData.get('startDate') as string
            const endDate = formData.get('endDate') as string
            const leaveType = formData.get('leaveType') as string
            const reason = formData.get('reason') as string

            await updateLeaveDetails(request.id, { startDate, endDate, leaveType, reason })
            onClose()
        } catch (error) {
            console.error('Failed to update leave', error)
            alert('Failed to update leave details')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
        }}>
            <div style={{
                backgroundColor: '#1f2937', // Dark mode bg matching existing theme
                padding: '2rem',
                borderRadius: '0.75rem',
                width: '100%',
                maxWidth: '500px',
                color: 'white',
                border: '1px solid #374151'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Edit Leave: {request.user.name}</h2>
                    <button onClick={onClose} style={{ color: '#9ca3af' }}><X size={20} /></button>
                </div>

                <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Start Date</label>
                        <input
                            name="startDate"
                            type="date"
                            defaultValue={request.startDate}
                            required
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                backgroundColor: '#374151',
                                border: '1px solid #4b5563',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>End Date</label>
                        <input
                            name="endDate"
                            type="date"
                            defaultValue={request.endDate}
                            required
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                backgroundColor: '#374151',
                                border: '1px solid #4b5563',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Type</label>
                        <select
                            name="leaveType"
                            defaultValue={request.leaveType}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                backgroundColor: '#374151',
                                border: '1px solid #4b5563',
                                color: 'white'
                            }}
                        >
                            <option value="PAID">PAID</option>
                            <option value="UNPAID">UNPAID</option>
                            <option value="SICK">SICK</option>
                            <option value="FAMILY">FAMILY</option>
                            <option value="STUDY">STUDY</option>
                            <option value="MATERNITY">MATERNITY</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Reason</label>
                        <textarea
                            name="reason"
                            defaultValue={request.reason || ''}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                backgroundColor: '#374151',
                                border: '1px solid #4b5563',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                color: 'white',
                                backgroundColor: 'transparent',
                                border: '1px solid #4b5563'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                color: 'white',
                                backgroundColor: '#3b82f6',
                                border: 'none',
                                opacity: isSubmitting ? 0.7 : 1
                            }}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
