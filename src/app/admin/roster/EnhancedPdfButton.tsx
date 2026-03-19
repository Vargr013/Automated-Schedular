'use client'

import { useState } from 'react'

export default function EnhancedPdfButton({
    currentMonth
}: {
    currentMonth: string
}) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)

        try {
            const response = await fetch(`/api/roster-print/pdf?month=${encodeURIComponent(currentMonth)}`, {
                method: 'GET'
            })

            if (!response.ok) {
                let message = 'Failed to export PDF.'
                try {
                    const error = await response.json() as { error?: string }
                    if (error.error) message = error.error
                } catch {}
                throw new Error(message)
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `Roster_${currentMonth}.pdf`
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            URL.revokeObjectURL(url)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to export PDF.'
            alert(message)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <button
            onClick={handleExport}
            className="btn btn-secondary"
            disabled={isExporting}
            style={{ marginLeft: '10px', backgroundColor: '#b30b00', color: 'white' }}
        >
            {isExporting ? 'Exporting PDF...' : 'Export PDF (Enhanced)'}
        </button>
    )
}
