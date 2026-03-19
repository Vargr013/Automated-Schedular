'use client'

import { useState } from 'react'
import { buildEnhancedRosterWorkbook } from './enhanced-roster-workbook'
import { type ExportLeave, type ExportShift, type ExportUser } from './export-layout'

type User = ExportUser & {
    role?: string
}

type Shift = ExportShift
type Leave = ExportLeave

const TEMPLATE_URL = '/roster-template.xlsx'

export default function EnhancedExcelButton({
    users,
    shifts,
    leaves,
    currentMonth
}: {
    users: User[]
    shifts: Shift[]
    leaves: Leave[]
    currentMonth: string
}) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)

        try {
            const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
                import('exceljs'),
                import('file-saver')
            ])

            const templateResponse = await fetch(TEMPLATE_URL, { cache: 'no-store' })
            if (!templateResponse.ok) {
                throw new Error('Failed to load the Excel template workbook.')
            }

            const { workbook } = await buildEnhancedRosterWorkbook({
                ExcelJS,
                templateBuffer: await templateResponse.arrayBuffer(),
                users,
                shifts,
                leaves,
                currentMonth
            })

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            saveAs(blob, `Roster_${currentMonth}.xlsx`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to export the Excel workbook.'
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
            style={{ marginLeft: '10px', backgroundColor: '#107c41', color: 'white' }}
        >
            {isExporting ? 'Exporting Excel...' : 'Export Excel (Enhanced)'}
        </button>
    )
}
