'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MonthFilter({ currentMonth, currentTab, currentType }: { currentMonth: string, currentTab: string, currentType: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Parse initial values from currentMonth (YYYY-MM)
    const [year, setYear] = useState('')
    const [month, setMonth] = useState('')

    useEffect(() => {
        if (currentMonth) {
            const [y, m] = currentMonth.split('-')
            setYear(y)
            setMonth(m)
        } else {
            const now = new Date()
            setYear(now.getFullYear().toString())
            setMonth((now.getMonth() + 1).toString().padStart(2, '0'))
        }
    }, [currentMonth])

    const handleFilterChange = (newYear: string, newMonth: string) => {
        const params = new URLSearchParams(searchParams)
        if (newYear && newMonth) {
            params.set('month', `${newYear}-${newMonth}`)
        } else {
            params.delete('month')
        }
        router.push(`?${params.toString()}`)
    }

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i) // 5 years range
    const months = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ]

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
                value={month}
                onChange={(e) => {
                    setMonth(e.target.value)
                    if (year) handleFilterChange(year, e.target.value)
                }}
                style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--muted)',
                    color: 'var(--foreground)'
                }}
            >
                {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                ))}
            </select>

            <select
                value={year}
                onChange={(e) => {
                    setYear(e.target.value)
                    if (month) handleFilterChange(e.target.value, month)
                }}
                style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--muted)',
                    color: 'var(--foreground)'
                }}
            >
                {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>

            {searchParams.get('month') && (
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
