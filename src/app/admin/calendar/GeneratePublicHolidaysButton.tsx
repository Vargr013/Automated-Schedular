'use client'

import { useState, useTransition } from 'react'
import { generateCurrentYearPublicHolidays } from '@/app/actions/calendar'

export default function GeneratePublicHolidaysButton() {
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState<string | null>(null)

    return (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Public holidays</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0 }}>
                    Generate South African public holidays for the current year.
                </p>
                {message && (
                    <p style={{ color: 'var(--primary)', fontSize: '0.875rem', marginTop: '0.75rem' }}>{message}</p>
                )}
            </div>
            <button
                type="button"
                className="btn"
                disabled={isPending}
                onClick={() => {
                    setMessage(null)
                    startTransition(async () => {
                        try {
                            const result = await generateCurrentYearPublicHolidays()
                            setMessage(`Generated ${result.count} holidays for ${result.year}.`)
                        } catch {
                            setMessage('Could not generate public holidays. Please try again.')
                        }
                    })
                }}
            >
                {isPending ? 'Generating...' : 'Generate Current Year'}
            </button>
        </div>
    )
}
