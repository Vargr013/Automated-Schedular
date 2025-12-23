'use client'

import { generateSchedule } from '@/app/actions/shifts'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function GenerateButton({ currentMonth }: { currentMonth: string }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    async function handleGenerate() {
        if (!confirm(`Are you sure you want to generate the schedule for ${currentMonth}? This will create shifts based on the Base Schedule rules. Existing shifts will NOT be overwritten.`)) {
            return
        }

        setIsLoading(true)
        try {
            const result = await generateSchedule(currentMonth)
            alert(`Schedule generated! Created ${result.count} new shifts.`)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('Failed to generate schedule.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleGenerate}
            className="btn"
            disabled={isLoading}
            style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                opacity: isLoading ? 0.7 : 1
            }}
        >
            {isLoading ? 'Generating...' : 'Generate Schedule'}
        </button>
    )
}
