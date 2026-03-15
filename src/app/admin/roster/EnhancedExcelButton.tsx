'use client'

import { format, parseISO, eachDayOfInterval, subMonths } from 'date-fns'
import { getMonthRosterRange } from '@/lib/date-utils'
import { getMultiplier } from '@/lib/holidays'
import { getShifts } from '@/app/actions/shifts'
import { getLeavesForRange } from '@/app/actions/scheduler'
import { useState } from 'react'
import {
    buildRosterExportModel,
    getContrastTextColor,
    getDayPairColumns,
    WEEK_COLUMN_COUNT,
    type ExportLeave,
    type ExportShift,
    type ExportUser,
    type WeekSection,
    type WeekUserRow
} from './export-layout'

type User = ExportUser & {
    role?: string
}

type Shift = ExportShift

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

            const workbook = new ExcelJS.Workbook()

            const currentMonthDate = parseISO(`${currentMonth}-01`)
            const prevMonthDate = subMonths(currentMonthDate, 1)
            const payrollStart = format(prevMonthDate, 'yyyy-MM-22')
            const payrollEnd = format(currentMonthDate, 'yyyy-MM-21')

            const payrollShifts = await getShifts(payrollStart, payrollEnd)
            const payrollLeaves = await getLeavesForRange(payrollStart, payrollEnd)

            const payrollSheet = workbook.addWorksheet('Payroll')
            payrollSheet.columns = [
                { header: 'Name', key: 'name', width: 20 },
                { header: 'Type', key: 'type', width: 15 },
                { header: 'Category', key: 'category', width: 15 },
                { header: 'Total Hours', key: 'hours', width: 15 }
            ]
            payrollSheet.getRow(1).font = { bold: true }

            const payrollRangeDays = eachDayOfInterval({
                start: parseISO(payrollStart),
                end: parseISO(payrollEnd)
            })

            const getHours = (start: string, end: string) => {
                const [h1, m1] = start.split(':').map(Number)
                const [h2, m2] = end.split(':').map(Number)
                const diff = (h2 + m2 / 60) - (h1 + m1 / 60)
                return diff > 0 ? diff : diff + 24
            }

            for (const user of users) {
                let totalHours = 0

                for (const day of payrollRangeDays) {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const shift = payrollShifts.find((item) => item.user_id === user.id && item.date === dateStr)
                    const onLeave = payrollLeaves.some((leave) =>
                        leave.userId === user.id &&
                        leave.startDate <= dateStr &&
                        leave.endDate >= dateStr
                    )

                    if (!shift) continue

                    const duration = getHours(shift.start_time, shift.end_time)
                    if (user.type !== 'FULL_TIME' && onLeave) continue

                    totalHours += duration * (onLeave ? 1 : getMultiplier(dateStr))
                }

                if (totalHours > 0 || user.type === 'FULL_TIME') {
                    payrollSheet.addRow({
                        name: user.name,
                        type: user.type,
                        category: user.category,
                        hours: totalHours.toFixed(2)
                    })
                }
            }

            const worksheet = workbook.addWorksheet('Roster')
            const { start, end } = getMonthRosterRange(currentMonth)
            const rosterLeaves = await getLeavesForRange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
            const model = buildRosterExportModel({
                users,
                shifts,
                leaves: rosterLeaves as ExportLeave[],
                currentMonth
            })

            const borderStyle = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            } as const

            const getPairedTimeBorder = (position: 'start' | 'end') => ({
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: position === 'start' ? undefined : { style: 'thin' }
            })

            const fillRange = (rowNumber: number, startColumn: number, endColumn: number, argb: string) => {
                for (let column = startColumn; column <= endColumn; column += 1) {
                    const cell = worksheet.getCell(rowNumber, column)
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
                    cell.border = borderStyle
                }
            }

            const mergePair = (rowNumber: number, dayIndex: number, value: string, fillArgb: string, fontArgb = 'FFFFFFFF') => {
                const { startColumn, endColumn } = getDayPairColumns(dayIndex)
                worksheet.mergeCells(rowNumber, startColumn, rowNumber, endColumn)
                const cell = worksheet.getCell(rowNumber, startColumn)
                cell.value = value
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
                cell.font = { bold: true, color: { argb: fontArgb } }
                fillRange(rowNumber, startColumn, endColumn, fillArgb)
            }

            const styleNameCell = (rowNumber: number, value: string, fillArgb: string, fontArgb = 'FFFFFFFF') => {
                const cell = worksheet.getCell(rowNumber, 1)
                cell.value = value
                cell.font = { bold: true, color: { argb: fontArgb } }
                cell.alignment = { horizontal: 'left', vertical: 'middle' }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } }
                cell.border = borderStyle
            }

            const renderSection = (startRow: number, title: string, sections: WeekSection[]) => {
                let currentRow = startRow

                worksheet.mergeCells(currentRow, 1, currentRow, WEEK_COLUMN_COUNT)
                const headerCell = worksheet.getCell(currentRow, 1)
                headerCell.value = title
                headerCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
                headerCell.alignment = { horizontal: 'center', vertical: 'middle' }
                fillRange(currentRow, 1, WEEK_COLUMN_COUNT, 'FF4A4A4A')
                worksheet.getRow(currentRow).height = 18
                currentRow += 1

                for (const section of sections) {
                    worksheet.mergeCells(currentRow, 1, currentRow, WEEK_COLUMN_COUNT)
                    const sectionCell = worksheet.getCell(currentRow, 1)
                    sectionCell.value = section.label
                    sectionCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                    sectionCell.alignment = { horizontal: 'center', vertical: 'middle' }
                    fillRange(currentRow, 1, WEEK_COLUMN_COUNT, 'FF7A7A7A')
                    worksheet.getRow(currentRow).height = 18
                    currentRow += 1

                    for (const row of section.rows) {
                        renderUserRow(currentRow, row)
                        currentRow += 1
                    }
                }

                return currentRow
            }

            const renderUserRow = (rowNumber: number, row: WeekUserRow) => {
                const excelRow = worksheet.getRow(rowNumber)
                styleNameCell(rowNumber, row.user.name, 'FF5B5B5B')
                worksheet.getCell(rowNumber, 1).alignment = { horizontal: 'right', vertical: 'middle' }
                worksheet.getCell(rowNumber, 1).font = { size: 11, name: 'Calibri', color: { argb: 'FFFFFFFF' } }

                row.dayCells.forEach((dayCell, dayIndex) => {
                    const { startColumn, endColumn } = getDayPairColumns(dayIndex)
                    const startCell = excelRow.getCell(startColumn)
                    const endCell = excelRow.getCell(endColumn)

                    startCell.value = dayCell.startTime
                    endCell.value = dayCell.endTime
                    startCell.alignment = { horizontal: 'center', vertical: 'middle' }
                    endCell.alignment = { horizontal: 'center', vertical: 'middle' }
                    startCell.border = getPairedTimeBorder('start')
                    endCell.border = getPairedTimeBorder('end')

                    if (dayCell.onLeave) {
                        const label = dayCell.startTime ? dayCell.startTime : 'LEAVE'
                        startCell.value = label
                        endCell.value = dayCell.endTime
                        startCell.font = { size: 12, name: 'Calibri', color: { argb: 'FFFFFFFF' } }
                        endCell.font = { size: 12, name: 'Calibri', color: { argb: 'FFFFFFFF' } }
                        startCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }
                        endCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }
                        return
                    }

                    if (dayCell.departmentColor) {
                        const argb = `FF${dayCell.departmentColor.replace('#', '').toUpperCase()}`
                        const fontArgb = getContrastTextColor(dayCell.departmentColor) === 'FFFFFF' ? 'FFFFFFFF' : 'FF000000'
                        startCell.font = { size: 12, name: 'Calibri', color: { argb: fontArgb } }
                        endCell.font = { size: 12, name: 'Calibri', color: { argb: fontArgb } }
                        startCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
                        endCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
                        return
                    }

                    const emptyArgb = !dayCell.isInMonth ? 'FF9A9A9A' : dayCell.isHoliday ? 'FFBDBDBD' : 'FF8A8A8A'
                    const textArgb = !dayCell.isInMonth ? 'FFDDDDDD' : 'FFCCCCCC'
                    startCell.font = { size: 11, name: 'Calibri', color: { argb: textArgb } }
                    endCell.font = { size: 11, name: 'Calibri', color: { argb: textArgb } }
                    startCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emptyArgb } }
                    endCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emptyArgb } }
                })

                excelRow.height = 22
            }

            let currentRow = 1
            worksheet.mergeCells(currentRow, 1, currentRow, WEEK_COLUMN_COUNT)
            const titleCell = worksheet.getCell(currentRow, 1)
            titleCell.value = 'CityROCK Johannesburg'
            titleCell.font = { size: 16, bold: true }
            titleCell.alignment = { horizontal: 'left' }
            currentRow += 1

            worksheet.mergeCells(currentRow, 1, currentRow, WEEK_COLUMN_COUNT)
            const subTitleCell = worksheet.getCell(currentRow, 1)
            subTitleCell.value = `Staff Schedule: ${model.monthTitle}`
            subTitleCell.font = { size: 12, bold: true }
            subTitleCell.alignment = { horizontal: 'left' }
            currentRow += 2

            for (const week of model.weeks) {
                worksheet.mergeCells(currentRow, 1, currentRow, WEEK_COLUMN_COUNT)
                const weekCell = worksheet.getCell(currentRow, 1)
                weekCell.value = week.weekLabel
                weekCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                weekCell.alignment = { horizontal: 'left', vertical: 'middle' }
                fillRange(currentRow, 1, WEEK_COLUMN_COUNT, 'FF2B2B2B')
                worksheet.getRow(currentRow).height = 18
                currentRow += 1

                styleNameCell(currentRow, 'Dates', 'FF111111')
                week.days.forEach((day, dayIndex) => {
                    const { startColumn } = getDayPairColumns(dayIndex)
                    worksheet.mergeCells(currentRow, startColumn, currentRow, startColumn + 1)
                    const cell = worksheet.getCell(currentRow, startColumn)
                    cell.value = format(day, 'd-MMM')
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                    cell.alignment = { horizontal: 'center', vertical: 'middle' }
                    const fillArgb = 'FF000000'
                    fillRange(currentRow, startColumn, startColumn + 1, fillArgb)
                })
                worksheet.getRow(currentRow).height = 20
                currentRow += 1

                styleNameCell(currentRow, 'Day', 'FF111111')
                week.days.forEach((day, dayIndex) => {
                    const { startColumn } = getDayPairColumns(dayIndex)
                    worksheet.mergeCells(currentRow, startColumn, currentRow, startColumn + 1)
                    const cell = worksheet.getCell(currentRow, startColumn)
                    cell.value = format(day, 'EEEE')
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                    cell.alignment = { horizontal: 'center', vertical: 'middle' }
                    fillRange(currentRow, startColumn, startColumn + 1, 'FF000000')
                })
                worksheet.getRow(currentRow).height = 20
                currentRow += 1

                styleNameCell(currentRow, 'Intro', 'FFF97316')
                week.introNames.forEach((name, dayIndex) => {
                    const { startColumn, endColumn } = getDayPairColumns(dayIndex)
                    const labelCell = worksheet.getCell(currentRow, startColumn)
                    const nameCell = worksheet.getCell(currentRow, endColumn)
                    labelCell.value = name ? 'Intro' : ''
                    nameCell.value = name
                    labelCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                    nameCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                    labelCell.alignment = { horizontal: 'left', vertical: 'middle' }
                    nameCell.alignment = { horizontal: 'center', vertical: 'middle' }
                    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } }
                    nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } }
                    labelCell.border = borderStyle
                    nameCell.border = borderStyle
                })
                worksheet.getRow(currentRow).height = 20
                currentRow += 1

                styleNameCell(currentRow, 'MOD', 'FFB3B3B3', 'FF000000')
                week.modNames.forEach((value, dayIndex) => mergePair(currentRow, dayIndex, value, 'FFB3B3B3', 'FF000000'))
                worksheet.getRow(currentRow).height = 18
                currentRow += 1

                styleNameCell(currentRow, 'SMOD', 'FF9F9F9F', 'FF000000')
                week.smodNames.forEach((value, dayIndex) => mergePair(currentRow, dayIndex, value, 'FF9F9F9F', 'FF000000'))
                worksheet.getRow(currentRow).height = 18
                currentRow += 1

                currentRow = renderSection(currentRow, 'Full time & Cafe', week.fullTimeSections)
                currentRow = renderSection(currentRow, 'Part time', week.partTimeSections)
                currentRow += 1
            }

            worksheet.getColumn(1).width = 18
            for (let column = 2; column <= WEEK_COLUMN_COUNT; column += 1) {
                worksheet.getColumn(column).width = 8.5
            }

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            saveAs(blob, `Roster_${currentMonth}_Enhanced.xlsx`)
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
