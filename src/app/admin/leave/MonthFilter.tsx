'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MonthFilter({ currentMonth, currentTab, currentType }: { currentMonth: string, currentTab: string, currentType: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        const params = new URLSearchParams(searchParams)
        if (value) {
            params.set('month', value)
        } else {
            params.delete('month')
        }
        router.push(`?${params.toString()}`)
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
                type="month"
                value={currentMonth}
                onChange={handleMonthChange}
                style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--muted)',
                    color: 'var(--foreground)'
                }}
            />
            {currentMonth && (
                <Link
                    href={`/admin/leave?tab=${currentTab}${currentType ? `&type=${currentType}` : ''}`}
                    style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', textDecoration: 'underline' }}
                >
                    Clear
                </Link>
            )}
        </div>
    )
}
