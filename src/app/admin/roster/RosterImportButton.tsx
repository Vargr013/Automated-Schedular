'use client'

import { useState, useRef } from 'react'
import { importRoster, confirmRosterImport, ImportReport } from '@/app/actions/import-schedule'
import { useRouter } from 'next/navigation'

export default function RosterImportButton({ currentMonth }: { currentMonth: string }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [report, setReport] = useState<ImportReport | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)
        const formData = new FormData()
        formData.append('file', file)

        const result = await importRoster(formData)
        setReport(result)
        setIsOpen(true)
        setIsProcessing(false)

        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleConfirm = async () => {
        if (!report || !report.shiftsToCreate) return

        setIsProcessing(true)
        await confirmRosterImport(report.shiftsToCreate, currentMonth)
        setIsProcessing(false)
        setIsOpen(false)
        setReport(null)
        alert('Roster overwritten successfully.')
        router.refresh()
    }

    const handleClose = () => {
        setIsOpen(false)
        setReport(null)
    }

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx"
                className="hidden"
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="btn btn-secondary flex items-center gap-2"
                style={{ marginLeft: '10px', backgroundColor: '#eab308', color: 'black' }} // Warning/Yellow color for caution
            >
                {isProcessing ? 'Processing...' : 'Import Roster'}
            </button>

            {/* MODAL */}
            {isOpen && report && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">

                        {/* Header */}
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">Import Roster Report</h2>
                            <p className="text-sm text-gray-500">Review changes before overwriting {currentMonth}</p>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {!report.success && (
                                <div className="p-4 bg-red-100 text-red-800 rounded mb-4">
                                    <strong>Error:</strong> {report.message}
                                </div>
                            )}

                            {report.success && (
                                <div className="space-y-6">
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-blue-50 rounded">
                                            <div className="text-sm text-gray-500">Shifts Found</div>
                                            <div className="text-2xl font-bold">{report.stats.totalShiftsFound}</div>
                                        </div>
                                        <div className="p-4 bg-blue-50 rounded">
                                            <div className="text-sm text-gray-500">Users Matched</div>
                                            <div className="text-2xl font-bold">{report.stats.usersFound}</div>
                                        </div>
                                    </div>

                                    {/* Conflicts */}
                                    {report.conflicts.length > 0 ? (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-2 text-red-600">Conflicts Found ({report.conflicts.length})</h3>
                                            <div className="space-y-2">
                                                {report.conflicts.map((conflict, idx) => (
                                                    <div key={idx} className="p-3 border border-red-200 bg-red-50 rounded text-sm flex gap-3">
                                                        <span className="font-bold shrink-0">
                                                            {conflict.type === 'LEAVE_CONFLICT' ? '🚫 Leave' : '⚠️ Rule'}
                                                        </span>
                                                        <span>{conflict.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-green-100 text-green-800 rounded">
                                            ✅ No conflicts found. ready to import.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing || !report.success}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-bold"
                            >
                                {isProcessing ? 'Overwriting...' : 'Overwrite Roster'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
