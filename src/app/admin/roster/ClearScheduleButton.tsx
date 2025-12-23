'use client'

import { useState } from 'react'
import { clearSchedule } from '@/app/actions/scheduler'
import { Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function ClearScheduleButton({ currentMonth }: { currentMonth: string }) {
    const [isLoading, setIsLoading] = useState(false)

    const handleClear = async () => {
        if (!confirm(`Are you sure you want to delete ALL shifts for ${format(new Date(currentMonth + '-01'), 'MMMM yyyy')}? This cannot be undone.`)) {
            return
        }

        setIsLoading(true)
        try {
            await clearSchedule(currentMonth)
            alert('Schedule cleared successfully.')
        } catch (error) {
            console.error(error)
            alert('Failed to clear schedule.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleClear}
            className="btn btn-danger"
            disabled={isLoading}
            style={{
                marginLeft: '10px',
                backgroundColor: '#ef4444',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}
            title="Clear Schedule"
        >
            {isLoading ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
            Clear
        </button>
    )
}
