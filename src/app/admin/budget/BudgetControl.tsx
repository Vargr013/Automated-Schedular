'use client'

import { setBudget } from '@/app/actions/budget'
import { useState } from 'react'
import { format } from 'date-fns'

export default function BudgetControl({
    month,
    currentBudget
}: {
    month: string
    currentBudget: number
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [amount, setAmount] = useState(currentBudget)
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        setLoading(true)
        await setBudget(month, amount)
        setIsEditing(false)
        setLoading(false)
    }

    return (
        <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--foreground)' }}>
                Budget Target ({month})
            </h3>

            {isEditing ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>R</span>
                        <input
                            type="number"
                            className="input"
                            value={amount}
                            onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                            style={{ paddingLeft: '2rem' }}
                            autoFocus
                        />
                    </div>
                    <button className="btn" onClick={handleSave} disabled={loading}>{loading ? '...' : 'Save'}</button>
                    <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        R {currentBudget.toLocaleString()}
                    </div>
                    <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>Edit Target</button>
                </div>
            )}
        </div>
    )
}
