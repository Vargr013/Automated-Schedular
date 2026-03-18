'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { getLeavesForRange } from '@/app/actions/scheduler'
import { getMonthRosterRange } from '@/lib/date-utils'
import {
    buildRosterExportModel,
    getContrastTextColor,
    getDayPairColumns,
    type ExportLeave,
    type ExportShift,
    type ExportUser,
    type WeekBlock,
    type WeekUserRow
} from './export-layout'

type User = ExportUser & {
    role?: string
}

type Shift = ExportShift

type TemplateWeekBlock = {
    startRow: number
    endRow: number
    dateRow: number
    introRow: number
    dayRow: number
    modRow: number
    smodRow: number
    fullTimeHeaderRow: number
    partTimeHeaderRow: number
    fullTimeNames: string[]
    partTimeNames: string[]
}

const TEMPLATE_URL = '/roster-template.xlsx'
const TOTAL_COLUMN = 16
const WEEKDAY_NAMES = new Set([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
])

const COLUMN_WIDTHS = [11, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 8.8, 7]
const DEFAULT_ROW_HEIGHT = 16.5
const BLACK = 'FF000000'
const WHITE = 'FFFFFFFF'
const LEAVE_FILL = 'FF000000'
const SHIFT_FONT = { name: 'Calibri', size: 11, bold: true, family: 2 }
const NAME_FONT = { name: 'Aptos Narrow', size: 11, bold: true, family: 2 }

function cloneStyle<T>(value: T): T {
    if (!value) return value
    return JSON.parse(JSON.stringify(value))
}

function cellText(cell: any) {
    if (!cell) return ''
    const value = cell.value
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number') return value.toString()
    if (value instanceof Date) return format(value, 'd-MMM')
    if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') return value.text.trim()
    return String(value).trim()
}

function isWeekdayName(value: string) {
    return WEEKDAY_NAMES.has(value)
}

function isDateCell(cell: any) {
    if (!cell) return false
    return cell.value instanceof Date || /^\d{1,2}-[A-Za-z]{3}$/.test(cellText(cell))
}

function isMergedChildCell(cell: any) {
    return Boolean(cell?.isMerged && cell?.master && cell.master.address !== cell.address)
}

function getTemplateBlocks(worksheet: any): TemplateWeekBlock[] {
    const starts: number[] = []

    for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        if (cellText(worksheet.getCell(rowNumber, 1)) === 'Part Time') {
            starts.push(rowNumber)
        }
    }

    starts.push(worksheet.rowCount + 1)

    return starts.slice(0, -1).map((startRow, index) => {
        const endRow = starts[index + 1] - 1
        let dateRow = 0
        let dayRow = 0
        let modRow = 0
        let smodRow = 0
        let fullTimeHeaderRow = 0
        let explicitPartTimeHeaderRow = 0

        for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
            const label = cellText(worksheet.getCell(rowNumber, 1))
            const secondCell = worksheet.getCell(rowNumber, 2)
            const secondValue = cellText(secondCell)

            if (!dateRow && isDateCell(secondCell)) dateRow = rowNumber
            if (!dayRow && isWeekdayName(secondValue)) dayRow = rowNumber
            if (label === 'MOD') modRow = rowNumber
            if (label === 'SMOD') smodRow = rowNumber
            if (label === 'Full time & Cafe') fullTimeHeaderRow = rowNumber
            if (label === 'Part time') explicitPartTimeHeaderRow = rowNumber
        }

        if (!dateRow && dayRow) {
            dateRow = Math.max(startRow + 1, dayRow - 3)
        }

        const fullTimeNames: string[] = []
        let cursor = fullTimeHeaderRow + 1
        while (cursor <= endRow) {
            const label = cellText(worksheet.getCell(cursor, 1))
            if (!label || ['Part Time', 'Part time', 'Full time & Cafe', 'MOD', 'SMOD'].includes(label)) break
            fullTimeNames.push(label)
            cursor += 1
        }

        const partTimeHeaderRow = explicitPartTimeHeaderRow || cursor
        const partTimeNames: string[] = []
        for (let rowNumber = partTimeHeaderRow + 1; rowNumber <= endRow; rowNumber += 1) {
            const label = cellText(worksheet.getCell(rowNumber, 1))
            if (label && !['Part Time', 'Part time', 'Full time & Cafe', 'MOD', 'SMOD'].includes(label)) {
                partTimeNames.push(label)
            }
        }

        return {
            startRow,
            endRow,
            dateRow,
            introRow: Math.max(dateRow + 2, dayRow - 1),
            dayRow,
            modRow,
            smodRow,
            fullTimeHeaderRow,
            partTimeHeaderRow,
            fullTimeNames,
            partTimeNames
        }
    })
}

function copyTemplateLayout(templateSheet: any, worksheet: any) {
    for (let columnNumber = 1; columnNumber <= TOTAL_COLUMN; columnNumber += 1) {
        worksheet.getColumn(columnNumber).width = COLUMN_WIDTHS[columnNumber - 1]
    }

    for (let rowNumber = 1; rowNumber <= templateSheet.rowCount; rowNumber += 1) {
        const templateRow = templateSheet.getRow(rowNumber)
        const row = worksheet.getRow(rowNumber)
        row.height = templateRow.height || DEFAULT_ROW_HEIGHT
        row.hidden = false
    }

    for (let rowNumber = 1; rowNumber <= templateSheet.rowCount; rowNumber += 1) {
        for (let columnNumber = 1; columnNumber <= TOTAL_COLUMN; columnNumber += 1) {
            const templateCell = templateSheet.getCell(rowNumber, columnNumber)
            const cell = worksheet.getCell(rowNumber, columnNumber)
            cell.style = cloneStyle(templateCell.style || {})
        }
    }

    const merges = templateSheet.model.merges || []
    for (const merge of merges) {
        worksheet.mergeCells(merge)
    }
}

function resetCellFromTemplate(templateSheet: any, worksheet: any, rowNumber: number, columnNumber: number) {
    const templateCell = templateSheet.getCell(rowNumber, columnNumber)
    const cell = worksheet.getCell(rowNumber, columnNumber)

    cell.value = null
    cell.style = cloneStyle(templateCell.style || {})
}

function resetPairFromTemplate(templateSheet: any, worksheet: any, rowNumber: number, dayIndex: number) {
    const { startColumn, endColumn } = getDayPairColumns(dayIndex)
    resetCellFromTemplate(templateSheet, worksheet, rowNumber, startColumn)
    resetCellFromTemplate(templateSheet, worksheet, rowNumber, endColumn)
}

function setPairTextAlignment(worksheet: any, rowNumber: number, dayIndex: number) {
    const { startColumn, endColumn } = getDayPairColumns(dayIndex)
    worksheet.getCell(rowNumber, startColumn).alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getCell(rowNumber, endColumn).alignment = { horizontal: 'center', vertical: 'middle' }
}

function writeDateRow(worksheet: any, rowNumber: number, days: Date[]) {
    days.forEach((day, dayIndex) => {
        const { startColumn, endColumn } = getDayPairColumns(dayIndex)
        try {
            worksheet.unMergeCells(rowNumber, startColumn, rowNumber, endColumn)
        } catch {}
        worksheet.mergeCells(rowNumber, startColumn, rowNumber, endColumn)

        const cell = worksheet.getCell(rowNumber, startColumn)
        cell.value = format(day, 'dd-MMM')
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
}

function writeDayRow(worksheet: any, rowNumber: number, days: Date[]) {
    days.forEach((day, dayIndex) => {
        const { startColumn } = getDayPairColumns(dayIndex)
        const cell = worksheet.getCell(rowNumber, startColumn)
        cell.value = format(day, 'EEEE')
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
}

function writeSummaryRow(worksheet: any, rowNumber: number, values: string[]) {
    values.forEach((value, dayIndex) => {
        const { startColumn } = getDayPairColumns(dayIndex)
        const cell = worksheet.getCell(rowNumber, startColumn)
        cell.value = value || null
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
}

function writeIntroRow(templateSheet: any, worksheet: any, rowNumber: number, values: string[]) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        resetPairFromTemplate(templateSheet, worksheet, rowNumber, dayIndex)

        const { startColumn, endColumn } = getDayPairColumns(dayIndex)
        const introName = values[dayIndex]

        if (!introName) continue

        const startCell = worksheet.getCell(rowNumber, startColumn)
        const endCell = worksheet.getCell(rowNumber, endColumn)
        startCell.value = 'Intro'
        endCell.value = introName
        startCell.alignment = { horizontal: 'left', vertical: 'middle' }
        endCell.alignment = { horizontal: 'center', vertical: 'middle' }
    }
}

function applyShiftPair(worksheet: any, rowNumber: number, dayIndex: number, dayCell: WeekUserRow['dayCells'][number]) {
    const { startColumn, endColumn } = getDayPairColumns(dayIndex)
    const startCell = worksheet.getCell(rowNumber, startColumn)
    const endCell = worksheet.getCell(rowNumber, endColumn)

    if (dayCell.onLeave) {
        startCell.value = dayCell.startTime || 'LEAVE'
        endCell.value = dayCell.endTime || null
        startCell.numFmt = '@'
        endCell.numFmt = '@'
        startCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LEAVE_FILL }, bgColor: { argb: LEAVE_FILL } }
        endCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LEAVE_FILL }, bgColor: { argb: LEAVE_FILL } }
        startCell.font = { ...SHIFT_FONT, color: { argb: WHITE } }
        endCell.font = { ...SHIFT_FONT, color: { argb: WHITE } }
        setPairTextAlignment(worksheet, rowNumber, dayIndex)
        return
    }

    if (!dayCell.startTime || !dayCell.endTime || !dayCell.departmentColor) {
        return
    }

    const fillArgb = `FF${dayCell.departmentColor.replace('#', '').toUpperCase()}`
    const textArgb = getContrastTextColor(dayCell.departmentColor) === 'FFFFFF' ? WHITE : BLACK

    startCell.value = dayCell.startTime
    endCell.value = dayCell.endTime
    startCell.numFmt = '@'
    endCell.numFmt = '@'
    startCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb }, bgColor: { argb: fillArgb } }
    endCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb }, bgColor: { argb: fillArgb } }
    startCell.font = { ...SHIFT_FONT, color: { argb: textArgb } }
    endCell.font = { ...SHIFT_FONT, color: { argb: textArgb } }
    setPairTextAlignment(worksheet, rowNumber, dayIndex)
}

function getShiftHours(startTime: string, endTime: string) {
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    let diffMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
    if (diffMinutes <= 0) diffMinutes += 24 * 60
    return diffMinutes / 60
}

function getTotalHours(row: WeekUserRow, isPartTime: boolean) {
    return row.dayCells.reduce((sum, dayCell, dayIndex) => {
        if (!dayCell.startTime || !dayCell.endTime) return sum
        const multiplier = isPartTime && dayIndex === 6 ? 1.5 : 1
        return sum + (getShiftHours(dayCell.startTime, dayCell.endTime) * multiplier)
    }, 0)
}

function buildWeekRowMap(week: WeekBlock, key: 'fullTimeSections' | 'partTimeSections') {
    return new Map(
        week[key]
            .flatMap((section) => section.rows)
            .map((row) => [row.user.name.toLowerCase(), row])
    )
}

function writeNamedRows({
    templateSheet,
    worksheet,
    rowStart,
    names,
    rowMap,
    isPartTime
}: {
    templateSheet: any
    worksheet: any
    rowStart: number
    names: string[]
    rowMap: Map<string, WeekUserRow>
    isPartTime: boolean
}) {
    names.forEach((name, index) => {
        const rowNumber = rowStart + index
        worksheet.getCell(rowNumber, 1).value = name
        worksheet.getCell(rowNumber, 1).font = cloneStyle(worksheet.getCell(rowNumber, 1).font || NAME_FONT)

        const rosterRow = rowMap.get(name.toLowerCase())

        for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
            resetPairFromTemplate(templateSheet, worksheet, rowNumber, dayIndex)
            const dayCell = rosterRow?.dayCells[dayIndex]
            if (dayCell) {
                applyShiftPair(worksheet, rowNumber, dayIndex, dayCell)
            }
        }

        const totalCell = worksheet.getCell(rowNumber, TOTAL_COLUMN)
        totalCell.value = rosterRow ? getTotalHours(rosterRow, isPartTime) : null
        totalCell.numFmt = '0.00'
    })
}

function hideUnusedRows(worksheet: any, startRow: number, endRow: number) {
    for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
        worksheet.getRow(rowNumber).hidden = true
    }
}

export default function EnhancedExcelButton({
    users,
    shifts,
    currentMonth
}: {
    users: User[]
    shifts: Shift[]
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

            const templateWorkbook = new ExcelJS.Workbook()
            await templateWorkbook.xlsx.load(await templateResponse.arrayBuffer())
            const templateSheet = templateWorkbook.worksheets[0]
            const templateBlocks = getTemplateBlocks(templateSheet)

            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet('Roster', {
                views: [{ showGridLines: false }]
            })
            copyTemplateLayout(templateSheet, worksheet)

            const { start, end } = getMonthRosterRange(currentMonth)
            const rosterLeaves = await getLeavesForRange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
            const model = buildRosterExportModel({
                users,
                shifts,
                leaves: rosterLeaves as ExportLeave[],
                currentMonth
            })

            templateBlocks.forEach((block, index) => {
                const week = model.weeks[index]

                if (!week) {
                    hideUnusedRows(worksheet, block.startRow, block.endRow)
                    return
                }

                worksheet.getRow(block.startRow).hidden = false
                worksheet.getCell(block.startRow, 1).value = 'Part Time'

                writeDateRow(worksheet, block.dateRow, week.days)
                writeIntroRow(templateSheet, worksheet, block.introRow, week.introNames)
                writeDayRow(worksheet, block.dayRow, week.days)
                writeSummaryRow(worksheet, block.modRow, week.modNames)
                writeSummaryRow(worksheet, block.smodRow, week.smodNames)

                worksheet.getCell(block.modRow, 1).value = 'MOD'
                worksheet.getCell(block.smodRow, 1).value = 'SMOD'
                worksheet.getCell(block.modRow, TOTAL_COLUMN).value = 'Total'
                worksheet.getCell(block.fullTimeHeaderRow, 1).value = 'Full time & Cafe'
                worksheet.getCell(block.fullTimeHeaderRow, TOTAL_COLUMN).value = 'Hrs'
                worksheet.getCell(block.partTimeHeaderRow, 1).value = 'Part time'
                worksheet.getCell(block.partTimeHeaderRow, TOTAL_COLUMN).value = null

                const fullTimeRows = buildWeekRowMap(week, 'fullTimeSections')
                const partTimeRows = buildWeekRowMap(week, 'partTimeSections')

                writeNamedRows({
                    templateSheet,
                    worksheet,
                    rowStart: block.fullTimeHeaderRow + 1,
                    names: block.fullTimeNames,
                    rowMap: fullTimeRows,
                    isPartTime: false
                })

                const partTimeRowStart = block.partTimeHeaderRow + 1
                writeNamedRows({
                    templateSheet,
                    worksheet,
                    rowStart: partTimeRowStart,
                    names: block.partTimeNames,
                    rowMap: partTimeRows,
                    isPartTime: true
                })
            })

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            saveAs(blob, `Roster_${currentMonth}.xlsx`)
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
