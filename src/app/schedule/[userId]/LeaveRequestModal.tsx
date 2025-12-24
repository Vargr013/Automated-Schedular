'use client'

import { useState } from 'react'
import { createLeaveRequest } from '@/app/actions/leave'
import { X, Calendar } from 'lucide-react'

export default function LeaveRequestModal({ userId, onClose }: { userId: number, onClose: () => void }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} />
                        Request Leave
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} className="text-muted-foreground" />
                    </button>
                </div>

                <form action={async (formData) => {
                    await createLeaveRequest(formData)
                    onClose()
                }}>
                    <input type="hidden" name="userId" value={userId} />

                    <div className="form-group">
                        <label>Start Date</label>
                        <input type="date" name="startDate" required className="input" />
                    </div>

                    <div className="form-group">
                        <label>End Date</label>
                        <input type="date" name="endDate" required className="input" />
                    </div>

                    <div className="form-group">
                        <label>Leave Type</label>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                <input type="radio" name="leaveType" value="PAID" defaultChecked />
                                Paid Leave
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                <input type="radio" name="leaveType" value="UNPAID" />
                                Unpaid Leave
                            </label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Reason</label>
                        <textarea name="reason" rows={3} className="input" placeholder="Optional..." />
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" className="btn" style={{ flex: 1 }}>Submit Request</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
