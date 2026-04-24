import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import {
    DEFAULT_HUMAN_ROSTER_IMPORT_CONFIG,
    type RosterImportConfig
} from './roster-import-config'

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
const WEEKDAY_SET = new Set<string>(WEEKDAY_NAMES)
const SECTION_LABELS = new Set(['MOD', 'SMOD', 'Full time & Cafe', 'Part time', 'Part Time'])
const EVENT_ROW_LABELS = new Set(['MOD', 'SMOD'])
const NON_SCHEDULE_COLOURS = new Set(['NO_FILL', '#FFFFFF'])

export type HumanRosterWarnings = {
    unknownColours: HumanRosterWarning[]
    unparsedValues: HumanRosterWarning[]
    blankColouredCells: HumanRosterWarning[]
    totalMismatches: HumanRosterWarning[]
    skippedCells: HumanRosterWarning[]
    missingDates: HumanRosterWarning[]
    duplicateStaffNames: HumanRosterWarning[]
    staffRowsWithNoShifts: HumanRosterWarning[]
}

export type HumanRosterWarning = {
    message: string
    sheetName: string
    cell?: string
    rowNumber?: number
    sourceColor?: string
    rawValue?: string
    rawFill?: unknown
}

export type HumanRosterRecord = {
    date: string
    day: string
    staffName: string | null
    section: string
    role: string
    rawValue: string
    startTime: string | null
    endTime: string | null
    hours: number | null
    category: string
    sourceColor: string
    sourceSheet: string
    sourceCell: string
    rawFill?: unknown
}

export type HumanScheduleDayColumn = {
    day: string
    date: string
    weekIndex: number
    startColumn: number
    endColumn: number
    headerColumn: number
}

export type HumanScheduleBlock = {
    weekIndex: number
    startRow: number
    endRow: number
    dayHeaderRow: number
    dateRow: number
    totalColumn: number | null
    dayColumns: HumanScheduleDayColumn[]
}

export type HumanSheetSelection = {
    worksheet: ExcelJS.Worksheet
    score: number
    reason: string
}

export type ParsedShiftValue = {
    rawValue: string
    startTime: string | null
    endTime: string | null
    hours: number | null
}

export type HumanRosterParseResult = {
    source: {
        workbookName: string
        sheetName: string
        importedAt: string
    }
    records: HumanRosterRecord[]
    staff: string[]
    categories: string[]
    coveredDates: string[]
    detectedMonth: string
    warnings: HumanRosterWarnings
}

type CellColour = {
    sourceColor: string
    rawFill?: unknown
}

type SheetScore = {
    worksheet: ExcelJS.Worksheet
    score: number
    weekdayRows: number
    sections: number
    dates: number
    totals: number
}

function createWarnings(): HumanRosterWarnings {
    return {
        unknownColours: [],
        unparsedValues: [],
        blankColouredCells: [],
        totalMismatches: [],
        skippedCells: [],
        missingDates: [],
        duplicateStaffNames: [],
        staffRowsWithNoShifts: []
    }
}

function getCellText(cell: ExcelJS.Cell): string {
    const value = cell.value
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number') return value.toString()
    if (value instanceof Date) {
        if (cell.numFmt?.toLowerCase().includes('h')) return format(value, 'HH:mm')
        return format(value, 'yyyy-MM-dd')
    }
    if (typeof value === 'object' && 'result' in value) {
        const result = value.result
        if (result instanceof Date) return format(result, 'yyyy-MM-dd')
        return result === null || result === undefined ? '' : String(result).trim()
    }
    if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
        return value.text.trim()
    }
    return String(value).trim()
}

function getExcelSerialTime(value: number): string | null {
    const fraction = ((value % 1) + 1) % 1
    if (fraction === 0) return null

    const totalMinutes = Math.round(fraction * 24 * 60)
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function cellTime(cell: ExcelJS.Cell): string | null {
    const value = cell.value
    if (value instanceof Date && cell.numFmt?.toLowerCase().includes('h')) {
        return format(value, 'HH:mm')
    }
    if (typeof value === 'number') return getExcelSerialTime(value)
    if (typeof value === 'object' && value && 'result' in value) {
        if (value.result instanceof Date && cell.numFmt?.toLowerCase().includes('h')) {
            return format(value.result, 'HH:mm')
        }
        if (typeof value.result === 'number') return getExcelSerialTime(value.result)
    }
    return parseSingleTime(getCellText(cell))
}

export function normaliseColour(value: string | undefined | null): string {
    if (!value) return 'NO_FILL'

    const clean = value.replace('#', '').toUpperCase()
    if (!/^[0-9A-F]{6}$|^[0-9A-F]{8}$/.test(clean)) return value.toUpperCase()

    return `#${clean.length === 8 ? clean.slice(2) : clean}`
}

export function getCellFillHex(cell: ExcelJS.Cell): string {
    return getCellColour(cell).sourceColor
}

function getCellColour(cell: ExcelJS.Cell): CellColour {
    const fill = cell.fill
    if (!fill || fill.type !== 'pattern') return { sourceColor: 'NO_FILL' }

    const patternFill = fill as ExcelJS.FillPattern
    if (patternFill.fgColor?.argb) {
        return {
            sourceColor: normaliseColour(patternFill.fgColor.argb),
            rawFill: fill
        }
    }

    if (
        patternFill.fgColor?.theme !== undefined ||
        ('indexed' in (patternFill.fgColor || {}))
    ) {
        return {
            sourceColor: 'UNSUPPORTED_FILL',
            rawFill: fill
        }
    }

    return { sourceColor: 'NO_FILL', rawFill: fill }
}

export function mapColourToCategory(hex: string, config: RosterImportConfig = DEFAULT_HUMAN_ROSTER_IMPORT_CONFIG): string {
    return config.colourCategoryMap[normaliseColour(hex)] || (hex === 'NO_FILL' ? 'Uncategorised' : 'Unknown')
}

export function parseDateHeader(cell: ExcelJS.Cell): string | null {
    const value = cell.value
    if (value instanceof Date) return format(value, 'yyyy-MM-dd')
    if (typeof value === 'object' && value && 'result' in value && value.result instanceof Date) {
        return format(value.result, 'yyyy-MM-dd')
    }

    const text = getCellText(cell)
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

    const parsed = new Date(text)
    if (!Number.isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd')

    return null
}

function parseSingleTime(text: string): string | null {
    const match = text.trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null

    const hour = Number(match[1])
    const minute = Number(match[2])
    if (hour > 23 || minute > 59) return null

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export function calculateShiftHours(startTime: string | null, endTime: string | null): number | null {
    if (!startTime || !endTime) return null

    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    if ([startHour, startMinute, endHour, endMinute].some((part) => !Number.isFinite(part))) return null

    let minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
    if (minutes < 0) minutes += 24 * 60

    return Number((minutes / 60).toFixed(2))
}

export function parseShiftValue(value: ExcelJS.CellValue | string | number | Date | null | undefined): ParsedShiftValue {
    let rawValue = ''
    if (value instanceof Date) {
        rawValue = format(value, 'HH:mm')
    } else if (value !== null && value !== undefined) {
        rawValue = typeof value === 'object' && 'text' in value && typeof value.text === 'string'
            ? value.text
            : String(value)
    }

    const normalized = rawValue.replace(/\s+/g, ' ').trim()
    const rangeMatch = normalized.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/)
    if (!rangeMatch) {
        return {
            rawValue: normalized,
            startTime: null,
            endTime: null,
            hours: null
        }
    }

    const startTime = parseSingleTime(rangeMatch[1])
    const endTime = parseSingleTime(rangeMatch[2])
    return {
        rawValue: normalized,
        startTime,
        endTime,
        hours: calculateShiftHours(startTime, endTime)
    }
}

export function isSectionHeader(value: string): boolean {
    return SECTION_LABELS.has(value.trim())
}

export function isStaffRow(row: ExcelJS.Row, block: HumanScheduleBlock): boolean {
    const name = getCellText(row.getCell(1))
    if (!name || isSectionHeader(name) || EVENT_ROW_LABELS.has(name)) return false

    return block.dayColumns.some((dayColumn) => {
        const startCell = row.getCell(dayColumn.startColumn)
        const endCell = row.getCell(dayColumn.endColumn)
        const startColour = getCellFillHex(startCell)
        const endColour = getCellFillHex(endCell)
        return Boolean(
            getCellText(startCell) ||
            getCellText(endCell) ||
            !NON_SCHEDULE_COLOURS.has(startColour) ||
            !NON_SCHEDULE_COLOURS.has(endColour)
        )
    })
}

function findTotalColumn(row: ExcelJS.Row): number | null {
    for (let columnNumber = 1; columnNumber <= row.cellCount; columnNumber += 1) {
        const text = getCellText(row.getCell(columnNumber)).toLowerCase()
        if (text === 'total' || text === 'hrs' || text === 'total hrs') return columnNumber
    }

    return null
}

function getWeekdayColumns(row: ExcelJS.Row): { day: string, column: number }[] {
    const columns: { day: string, column: number }[] = []

    for (let columnNumber = 1; columnNumber <= row.cellCount; columnNumber += 1) {
        const text = getCellText(row.getCell(columnNumber))
        if (WEEKDAY_SET.has(text)) {
            const previous = columns[columns.length - 1]
            if (!previous || previous.day !== text) {
                columns.push({ day: text, column: columnNumber })
            }
        }
    }

    return columns
}

function findDateRow(worksheet: ExcelJS.Worksheet, dayHeaderRow: number, weekdayColumns: { day: string, column: number }[]) {
    for (let rowNumber = dayHeaderRow - 1; rowNumber >= Math.max(1, dayHeaderRow - 5); rowNumber -= 1) {
        const dates = weekdayColumns
            .map(({ column }) => parseDateHeader(worksheet.getCell(rowNumber, column)))
            .filter(Boolean)

        if (dates.length >= 5) return rowNumber
    }

    return 0
}

export function detectScheduleBlocks(worksheet: ExcelJS.Worksheet): HumanScheduleBlock[] {
    const candidates: { rowNumber: number, weekdayColumns: { day: string, column: number }[] }[] = []

    for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const weekdayColumns = getWeekdayColumns(worksheet.getRow(rowNumber))
        const uniqueDays = new Set(weekdayColumns.map((column) => column.day))
        if (uniqueDays.size >= 5 && weekdayColumns.some((column) => column.day === 'Monday')) {
            candidates.push({ rowNumber, weekdayColumns })
        }
    }

    return candidates.map((candidate, index) => {
        const dateRow = findDateRow(worksheet, candidate.rowNumber, candidate.weekdayColumns)
        const dayColumns = candidate.weekdayColumns.map((weekdayColumn, dayIndex) => {
            const nextColumn = candidate.weekdayColumns[dayIndex + 1]?.column
            const endColumn = nextColumn ? nextColumn - 1 : weekdayColumn.column + 1
            return {
                day: weekdayColumn.day,
                date: dateRow ? parseDateHeader(worksheet.getCell(dateRow, weekdayColumn.column)) || '' : '',
                weekIndex: index,
                startColumn: weekdayColumn.column,
                endColumn: Math.max(weekdayColumn.column, endColumn),
                headerColumn: weekdayColumn.column
            }
        })

        const totalColumn =
            findTotalColumn(worksheet.getRow(candidate.rowNumber + 1)) ||
            findTotalColumn(worksheet.getRow(candidate.rowNumber + 3)) ||
            null

        return {
            weekIndex: index,
            startRow: candidate.rowNumber,
            endRow: candidates[index + 1]?.rowNumber ? candidates[index + 1].rowNumber - 1 : worksheet.rowCount,
            dayHeaderRow: candidate.rowNumber,
            dateRow,
            totalColumn,
            dayColumns
        }
    }).filter((block) => block.dayColumns.filter((column) => column.date).length >= 5)
}

function scoreWorksheet(worksheet: ExcelJS.Worksheet): SheetScore {
    let weekdayRows = 0
    let sections = 0
    let dates = 0
    let totals = 0

    for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber)
        const weekdayColumns = getWeekdayColumns(row)
        if (new Set(weekdayColumns.map((column) => column.day)).size >= 5) weekdayRows += 1

        for (let columnNumber = 1; columnNumber <= row.cellCount; columnNumber += 1) {
            const cell = row.getCell(columnNumber)
            const text = getCellText(cell)
            if (isSectionHeader(text) || EVENT_ROW_LABELS.has(text)) sections += 1
            if (parseDateHeader(cell)) dates += 1
            if (['total', 'hrs', 'total hrs'].includes(text.toLowerCase())) totals += 1
        }
    }

    const nameHint = worksheet.name.toLowerCase().includes('gym') ? 5 : 0
    const sheet1Penalty = worksheet.name.toLowerCase() === 'sheet1' ? -2 : 0

    return {
        worksheet,
        score: weekdayRows * 20 + sections * 4 + Math.min(dates, 60) + totals * 3 + nameHint + sheet1Penalty,
        weekdayRows,
        sections,
        dates,
        totals
    }
}

export function selectHumanScheduleSheet(workbook: ExcelJS.Workbook): HumanSheetSelection | null {
    const scores = workbook.worksheets
        .filter((worksheet) => worksheet.state !== 'hidden' && worksheet.state !== 'veryHidden')
        .map(scoreWorksheet)
        .sort((a, b) => b.score - a.score)

    const best = scores[0]
    if (!best || best.score < 40 || best.weekdayRows === 0) return null

    return {
        worksheet: best.worksheet,
        score: best.score,
        reason: `weekdayRows=${best.weekdayRows}; sections=${best.sections}; dates=${best.dates}; totals=${best.totals}`
    }
}

function rowRawValue(row: ExcelJS.Row, dayColumn: HumanScheduleDayColumn): string {
    const startText = getCellText(row.getCell(dayColumn.startColumn))
    const endText = getCellText(row.getCell(dayColumn.endColumn))
    if (startText && endText && startText !== endText) return `${startText}-${endText}`
    return startText || endText
}

function parseRowDayShift(row: ExcelJS.Row, dayColumn: HumanScheduleDayColumn): ParsedShiftValue {
    const startCell = row.getCell(dayColumn.startColumn)
    const endCell = row.getCell(dayColumn.endColumn)
    const startTime = cellTime(startCell)
    const endTime = cellTime(endCell)

    if (startTime && endTime) {
        return {
            rawValue: `${startTime}-${endTime}`,
            startTime,
            endTime,
            hours: calculateShiftHours(startTime, endTime)
        }
    }

    return parseShiftValue(rowRawValue(row, dayColumn))
}

function isMeaningfulCell(row: ExcelJS.Row, dayColumn: HumanScheduleDayColumn): boolean {
    const rawValue = rowRawValue(row, dayColumn)
    const startColour = getCellFillHex(row.getCell(dayColumn.startColumn))
    const endColour = getCellFillHex(row.getCell(dayColumn.endColumn))

    return Boolean(rawValue || !NON_SCHEDULE_COLOURS.has(startColour) || !NON_SCHEDULE_COLOURS.has(endColour))
}

function makeCellReference(row: ExcelJS.Row, dayColumn: HumanScheduleDayColumn) {
    const startAddress = row.getCell(dayColumn.startColumn).address
    const endAddress = row.getCell(dayColumn.endColumn).address
    return startAddress === endAddress ? startAddress : `${startAddress}:${endAddress}`
}

function addEventRecords({
    worksheet,
    row,
    block,
    section,
    role,
    config,
    records,
    warnings,
    categories
}: {
    worksheet: ExcelJS.Worksheet
    row: ExcelJS.Row
    block: HumanScheduleBlock
    section: string
    role: string
    config: RosterImportConfig
    records: HumanRosterRecord[]
    warnings: HumanRosterWarnings
    categories: Set<string>
}) {
    block.dayColumns.forEach((dayColumn) => {
        if (!dayColumn.date || !isMeaningfulCell(row, dayColumn)) return

        const startCell = row.getCell(dayColumn.startColumn)
        const endCell = row.getCell(dayColumn.endColumn)
        const startColour = getCellColour(startCell)
        const endColour = getCellColour(endCell)
        const cellColour = startColour.sourceColor !== 'NO_FILL' ? startColour : endColour
        const category = mapColourToCategory(cellColour.sourceColor, config)
        const rawValue = rowRawValue(row, dayColumn)
        const sourceCell = makeCellReference(row, dayColumn)

        if (cellColour.sourceColor !== 'NO_FILL' && category === 'Unknown') {
            warnings.unknownColours.push({
                message: `Unknown event colour ${cellColour.sourceColor}`,
                sheetName: worksheet.name,
                cell: sourceCell,
                sourceColor: cellColour.sourceColor,
                rawValue,
                rawFill: cellColour.rawFill
            })
        }

        if (!rawValue && !NON_SCHEDULE_COLOURS.has(cellColour.sourceColor)) {
            warnings.blankColouredCells.push({
                message: `Blank coloured event cell`,
                sheetName: worksheet.name,
                cell: sourceCell,
                sourceColor: cellColour.sourceColor,
                rawFill: cellColour.rawFill
            })
        }

        categories.add(category)
        records.push({
            date: dayColumn.date,
            day: dayColumn.day,
            staffName: null,
            section,
            role,
            rawValue,
            startTime: null,
            endTime: null,
            hours: null,
            category,
            sourceColor: cellColour.sourceColor,
            sourceSheet: worksheet.name,
            sourceCell,
            rawFill: cellColour.rawFill
        })
    })
}

function getDetectedMonth(coveredDates: string[]) {
    const counts = new Map<string, number>()
    coveredDates.forEach((date) => {
        const month = date.slice(0, 7)
        counts.set(month, (counts.get(month) || 0) + 1)
    })

    let detectedMonth = ''
    let highestCount = 0
    counts.forEach((count, month) => {
        if (count > highestCount) {
            highestCount = count
            detectedMonth = month
        }
    })

    return detectedMonth
}

export function parseHumanRosterWorksheet({
    worksheet,
    workbookName,
    config = DEFAULT_HUMAN_ROSTER_IMPORT_CONFIG
}: {
    worksheet: ExcelJS.Worksheet
    workbookName: string
    config?: RosterImportConfig
}): HumanRosterParseResult {
    const warnings = createWarnings()
    const blocks = detectScheduleBlocks(worksheet)
    const records: HumanRosterRecord[] = []
    const staff = new Set<string>()
    const categories = new Set<string>()
    const coveredDates = new Set<string>()

    blocks.forEach((block) => {
        block.dayColumns.forEach((dayColumn) => {
            if (dayColumn.date) coveredDates.add(dayColumn.date)
            if (!dayColumn.date) {
                warnings.missingDates.push({
                    message: `Missing date for ${dayColumn.day} in week block ${block.weekIndex + 1}`,
                    sheetName: worksheet.name,
                    rowNumber: block.dayHeaderRow
                })
            }
        })

        // Human workbooks often store holidays, intros, and league notes between
        // the date row and weekday row. Preserve them as event records, never shifts.
        for (let eventRowNumber = block.dateRow + 1; eventRowNumber < block.dayHeaderRow; eventRowNumber += 1) {
            addEventRecords({
                worksheet,
                row: worksheet.getRow(eventRowNumber),
                block,
                section: 'Events',
                role: 'Event',
                config,
                records,
                warnings,
                categories
            })
        }

        let currentSection = 'Uncategorised'
        const staffNamesInBlock = new Map<string, number>()

        for (let rowNumber = block.dayHeaderRow + 1; rowNumber <= block.endRow; rowNumber += 1) {
            const row = worksheet.getRow(rowNumber)
            const label = getCellText(row.getCell(1))
            if (!label) continue

            if (EVENT_ROW_LABELS.has(label)) {
                addEventRecords({
                    worksheet,
                    row,
                    block,
                    section: label,
                    role: label,
                    config,
                    records,
                    warnings,
                    categories
                })
                continue
            }

            if (isSectionHeader(label)) {
                currentSection = label === 'Part Time' ? 'Part time' : label
                continue
            }

            if (!isStaffRow(row, block)) {
                if (!EVENT_ROW_LABELS.has(label)) {
                    warnings.skippedCells.push({
                        message: `Skipped non-staff row "${label}"`,
                        sheetName: worksheet.name,
                        rowNumber
                    })
                }
                continue
            }

            staff.add(label)
            const staffBlockKey = `${currentSection}|${label.trim().toLowerCase()}`
            const duplicateCount = (staffNamesInBlock.get(staffBlockKey) || 0) + 1
            staffNamesInBlock.set(staffBlockKey, duplicateCount)
            if (duplicateCount > 1) {
                warnings.duplicateStaffNames.push({
                    message: `Duplicate staff name "${label}" in ${currentSection} for week ${block.weekIndex + 1}`,
                    sheetName: worksheet.name,
                    rowNumber
                })
            }

            let rowShiftCount = 0
            let calculatedTotal = 0
            block.dayColumns.forEach((dayColumn) => {
                if (!dayColumn.date || !isMeaningfulCell(row, dayColumn)) return

                const startCell = row.getCell(dayColumn.startColumn)
                const endCell = row.getCell(dayColumn.endColumn)
                const startColour = getCellColour(startCell)
                const endColour = getCellColour(endCell)
                const cellColour = startColour.sourceColor !== 'NO_FILL' ? startColour : endColour
                const category = mapColourToCategory(cellColour.sourceColor, config)
                const parsedShift = parseRowDayShift(row, dayColumn)
                const rawValue = parsedShift.rawValue || rowRawValue(row, dayColumn)
                const sourceCell = makeCellReference(row, dayColumn)

                if (cellColour.sourceColor !== 'NO_FILL' && category === 'Unknown') {
                    warnings.unknownColours.push({
                        message: `Unknown schedule colour ${cellColour.sourceColor}`,
                        sheetName: worksheet.name,
                        cell: sourceCell,
                        sourceColor: cellColour.sourceColor,
                        rawValue,
                        rawFill: cellColour.rawFill
                    })
                }

                if (!rawValue && !NON_SCHEDULE_COLOURS.has(cellColour.sourceColor)) {
                    warnings.blankColouredCells.push({
                        message: `Blank coloured schedule cell`,
                        sheetName: worksheet.name,
                        cell: sourceCell,
                        sourceColor: cellColour.sourceColor,
                        rawFill: cellColour.rawFill
                    })
                }

                if (rawValue && !parsedShift.startTime && !parsedShift.endTime) {
                    warnings.unparsedValues.push({
                        message: `Could not parse shift time from "${rawValue}"`,
                        sheetName: worksheet.name,
                        cell: sourceCell,
                        sourceColor: cellColour.sourceColor,
                        rawValue
                    })
                }

                if (parsedShift.hours !== null) {
                    calculatedTotal += parsedShift.hours
                    rowShiftCount += 1
                }

                categories.add(category)
                records.push({
                    date: dayColumn.date,
                    day: dayColumn.day,
                    staffName: label,
                    section: currentSection,
                    role: currentSection === 'MOD' || currentSection === 'SMOD' ? currentSection : 'Shift',
                    rawValue,
                    startTime: parsedShift.startTime,
                    endTime: parsedShift.endTime,
                    hours: parsedShift.hours,
                    category,
                    sourceColor: cellColour.sourceColor,
                    sourceSheet: worksheet.name,
                    sourceCell,
                    rawFill: cellColour.rawFill
                })
            })

            if (rowShiftCount === 0) {
                warnings.staffRowsWithNoShifts.push({
                    message: `Staff row "${label}" has no parsed time-based shifts`,
                    sheetName: worksheet.name,
                    rowNumber
                })
            }

            if (block.totalColumn) {
                const totalText = getCellText(row.getCell(block.totalColumn))
                const sheetTotal = Number(totalText)
                if (Number.isFinite(sheetTotal) && Math.abs(sheetTotal - calculatedTotal) > config.totalMismatchToleranceHours) {
                    warnings.totalMismatches.push({
                        message: `Calculated ${calculatedTotal.toFixed(2)} hours but sheet total is ${sheetTotal.toFixed(2)}`,
                        sheetName: worksheet.name,
                        cell: row.getCell(block.totalColumn).address,
                        rowNumber,
                        rawValue: totalText
                    })
                }
            }
        }
    })

    const sortedCoveredDates = Array.from(coveredDates).sort()

    return {
        source: {
            workbookName,
            sheetName: worksheet.name,
            importedAt: new Date().toISOString()
        },
        records,
        staff: Array.from(staff).sort((a, b) => a.localeCompare(b)),
        categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
        coveredDates: sortedCoveredDates,
        detectedMonth: getDetectedMonth(sortedCoveredDates),
        warnings
    }
}
