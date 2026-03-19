'use client'

import { useState } from 'react'

function getPrintViewHref(month: string) {
    return `/roster-print?month=${encodeURIComponent(month)}`
}

export default function EnhancedPdfButton({
    currentMonth
}: {
    currentMonth: string
}) {
    const [isExporting, setIsExporting] = useState(false)
    const printViewHref = getPrintViewHref(currentMonth)

    const openPrintView = (fallbackUrl?: string) => {
        window.open(fallbackUrl || printViewHref, '_blank', 'noopener,noreferrer')
    }

    const handleExport = async () => {
        setIsExporting(true)

        try {
            const response = await fetch(`/api/roster-print/pdf?month=${encodeURIComponent(currentMonth)}`, {
                method: 'GET'
            })

            if (!response.ok) {
                let message = 'Failed to export PDF.'
                let fallbackUrl = printViewHref
                try {
                    const error = await response.json() as { error?: string, fallbackUrl?: string }
                    if (error.error) message = error.error
                    if (error.fallbackUrl) fallbackUrl = error.fallbackUrl
                } catch {}
                openPrintView(fallbackUrl)
                throw new Error(`${message}\n\nThe browser print view has been opened as a fallback. Use Ctrl+P and choose "Save as PDF".`)
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
        <>
            <button
                onClick={handleExport}
                className="btn btn-secondary"
                disabled={isExporting}
                style={{ marginLeft: '10px', backgroundColor: '#b30b00', color: 'white' }}
            >
                {isExporting ? 'Exporting PDF...' : 'Export PDF (Enhanced)'}
            </button>
            <a
                href={printViewHref}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ marginLeft: '10px' }}
            >
                Open Print View
            </a>
        </>
    )
}
