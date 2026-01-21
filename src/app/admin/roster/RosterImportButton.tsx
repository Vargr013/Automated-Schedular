'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { importRoster, confirmRosterImport, ImportReport } from '@/app/actions/import-schedule'
import { useRouter } from 'next/navigation'

export default function RosterImportButton({ currentMonth }: { currentMonth: string }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [report, setReport] = useState<ImportReport | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

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

    const Modal = () => (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col transform transition-all animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Import Roster Report</h2>
                        <p className="text-sm text-gray-500 mt-1">Review changes for {currentMonth}</p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    {report && !report.success && (
                        <div className="p-4 bg-red-100 text-red-800 rounded-lg mb-4 border border-red-200">
                            <strong>Error:</strong> {report.message}
                        </div>
                    )}

                    {report && report.success && (
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-white rounded-xl border shadow-sm">
                                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Shifts Found</div>
                                    <div className="text-3xl font-bold text-gray-900 mt-2">{report.stats.totalShiftsFound}</div>
                                </div>
                                <div className="p-6 bg-white rounded-xl border shadow-sm">
                                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Users Matched</div>
                                    <div className="text-3xl font-bold text-gray-900 mt-2">{report.stats.usersFound}</div>
                                </div>
                            </div>

                            {/* Conflicts */}
                            {report.conflicts.length > 0 ? (
                                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                    <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        <h3 className="text-lg font-bold text-red-700">Conflicts Found ({report.conflicts.length})</h3>
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                                        {report.conflicts.map((conflict, idx) => (
                                            <div key={idx} className="p-4 hover:bg-gray-50 flex gap-4 transition-colors">
                                                <div className="shrink-0">
                                                    {conflict.type === 'LEAVE_CONFLICT' ? (
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600">
                                                            🚫
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600">
                                                            ⚠️
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{conflict.type === 'LEAVE_CONFLICT' ? 'Leave Conflict' : 'Rule Violation'}</p>
                                                    <p className="text-sm text-gray-600 mt-1">{conflict.description}</p>
                                                    <p className="text-xs text-gray-400 mt-1 font-mono">{conflict.date}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <div>
                                        <h3 className="font-bold text-lg">Analysis Complete</h3>
                                        <p>No conflicts found. The roster is safe to import.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex justify-end gap-3 bg-white rounded-b-xl">
                    <button
                        onClick={handleClose}
                        className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing || (report ? !report.success : true)}
                        className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Overwriting...
                            </>
                        ) : 'Overwrite Roster'}
                    </button>
                </div>
            </div>
        </div>
    )

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
                style={{ marginLeft: '10px', backgroundColor: '#eab308', color: 'black' }}
            >
                {isProcessing ? 'Processing...' : 'Import Roster'}
            </button>

            {mounted && isOpen && report && createPortal(<Modal />, document.body)}
        </>
    )
}
