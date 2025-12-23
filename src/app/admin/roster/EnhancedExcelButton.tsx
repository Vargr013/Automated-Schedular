'use client'

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, getDay, addDays } from 'date-fns'

type User = {
    id: number
    name: string
    type: string // "FULL_TIME" or "PART_TIME"
    category?: string
}

type Shift = {
    id: number
    user_id: number
    date: string
    start_time: string
    end_time: string
    is_smod: boolean
    department: {
        name: string
        color_code: string
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
    const handleExport = async () => {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Roster')

        const monthDate = parseISO(`${currentMonth}-01`)
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)

        // Get all weeks covering the month
        // Start from the beginning of the week of the 1st
        let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
        const weeks = []

        while (currentWeekStart <= monthEnd) {
            const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
            const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd })
            weeks.push(daysInWeek)
            currentWeekStart = addDays(currentWeekStart, 7)
        }

        let currentRow = 1

        // Helper to convert Hex to ARGB for ExcelJS
        const getArgb = (hex: string) => {
            return 'FF' + hex.replace('#', '').toUpperCase()
        }

        // Define Border Style
        const borderStyle: Partial<ExcelJS.Borders> = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }

        for (const weekDays of weeks) {
            // --- Header Rows ---

            // 1. Date Row (e.g., "8-Dec", "9-Dec")
            const dateRow = worksheet.getRow(currentRow)
            dateRow.getCell(1).value = 'Part Time' // Placeholder label from screenshot
            dateRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
            dateRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF444444' } }

            weekDays.forEach((day, index) => {
                const cell = dateRow.getCell(index + 2)
                cell.value = format(day, 'd-MMM')
                cell.alignment = { horizontal: 'center' }
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } } // Black header
                cell.border = borderStyle
            })
            currentRow++

            // 2. Day Name Row (e.g., "Monday", "Tuesday")
            const dayNameRow = worksheet.getRow(currentRow)
            weekDays.forEach((day, index) => {
                const cell = dayNameRow.getCell(index + 2)
                cell.value = format(day, 'EEEE')
                cell.alignment = { horizontal: 'center' }
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }
                cell.border = borderStyle
            })
            currentRow++

            // --- SMOD Row ---
            const smodRow = worksheet.getRow(currentRow)
            smodRow.getCell(1).value = 'SMOD'
            smodRow.getCell(1).font = { bold: true }
            smodRow.getCell(1).border = borderStyle
            smodRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } } // Grey

            weekDays.forEach((day, index) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const smodShift = shifts.find(s => s.date === dateStr && s.is_smod)
                const cell = smodRow.getCell(index + 2)

                if (smodShift) {
                    const user = users.find(u => u.id === smodShift.user_id)
                    cell.value = user?.name || ''
                }
                cell.alignment = { horizontal: 'center' }
                cell.border = borderStyle
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } }
            })
            currentRow++

            // --- Group by Type then Category ---
            const CATEGORY_ORDER = ['Management', 'Shift Manager', 'Cafe', 'Shop', 'Front Desk']

            // Full Time Section
            const ftHeaderRow = worksheet.getRow(currentRow)
            ftHeaderRow.getCell(1).value = 'Full Time & Cafe'
            ftHeaderRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
            ftHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } } // Dark Grey
            worksheet.mergeCells(currentRow, 1, currentRow, 8)
            ftHeaderRow.getCell(1).alignment = { horizontal: 'center' }
            currentRow++

            for (const category of CATEGORY_ORDER) {
                const categoryUsers = users.filter(u => u.type === 'FULL_TIME' && (u.category || 'Front Desk') === category)

                if (categoryUsers.length === 0) continue

                // Category Header
                const headerRow = worksheet.getRow(currentRow)
                const headerLabel = category === 'Management' ? 'Management (MOD)' :
                    category === 'Shift Manager' ? 'Shift Manager (SMOD)' :
                        category

                headerRow.getCell(1).value = headerLabel
                headerRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
                headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF666666' } }

                // Merge across
                worksheet.mergeCells(currentRow, 1, currentRow, 8)
                headerRow.getCell(1).alignment = { horizontal: 'center' }
                currentRow++

                // User Rows
                for (const user of categoryUsers) {
                    const row = worksheet.getRow(currentRow)
                    row.getCell(1).value = user.name
                    row.getCell(1).font = { bold: true }
                    row.getCell(1).border = borderStyle
                    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } }

                    weekDays.forEach((day, index) => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const shift = shifts.find(s => s.user_id === user.id && s.date === dateStr)
                        const cell = row.getCell(index + 2)
                        cell.border = borderStyle

                        if (shift) {
                            cell.value = `${shift.start_time} - ${shift.end_time}`
                            cell.alignment = { horizontal: 'center', wrapText: true }
                            // Apply department color
                            if (shift.department.color_code) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getArgb(shift.department.color_code) } }
                            }
                        } else {
                            // Grey out if not in month (optional, but good for visuals)
                            if (!isSameMonth(day, monthDate)) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }
                            }
                        }
                    })
                    currentRow++
                }
            }

            // Part Time Section
            const ptHeaderRow = worksheet.getRow(currentRow)
            ptHeaderRow.getCell(1).value = 'Part Time'
            ptHeaderRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
            ptHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } } // Dark Grey
            worksheet.mergeCells(currentRow, 1, currentRow, 8)
            ptHeaderRow.getCell(1).alignment = { horizontal: 'center' }
            currentRow++

            for (const category of CATEGORY_ORDER) {
                const categoryUsers = users.filter(u => u.type !== 'FULL_TIME' && (u.category || 'Front Desk') === category)

                if (categoryUsers.length === 0) continue

                // Category Header
                const headerRow = worksheet.getRow(currentRow)
                const headerLabel = category === 'Management' ? 'Management (MOD)' :
                    category === 'Shift Manager' ? 'Shift Manager (SMOD)' :
                        category

                headerRow.getCell(1).value = headerLabel
                headerRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
                headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF666666' } }

                // Merge across
                worksheet.mergeCells(currentRow, 1, currentRow, 8)
                headerRow.getCell(1).alignment = { horizontal: 'center' }
                currentRow++

                // User Rows
                for (const user of categoryUsers) {
                    const row = worksheet.getRow(currentRow)
                    row.getCell(1).value = user.name
                    row.getCell(1).font = { bold: true }
                    row.getCell(1).border = borderStyle
                    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } }

                    weekDays.forEach((day, index) => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const shift = shifts.find(s => s.user_id === user.id && s.date === dateStr)
                        const cell = row.getCell(index + 2)
                        cell.border = borderStyle

                        if (shift) {
                            cell.value = `${shift.start_time} - ${shift.end_time}`
                            cell.alignment = { horizontal: 'center', wrapText: true }
                            // Apply department color
                            if (shift.department.color_code) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getArgb(shift.department.color_code) } }
                            }
                        } else {
                            // Grey out if not in month (optional, but good for visuals)
                            if (!isSameMonth(day, monthDate)) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }
                            }
                        }
                    })
                    currentRow++
                }
            }

            // Add spacer row
            currentRow++
        }

        // Adjust column widths
        worksheet.getColumn(1).width = 20
        for (let i = 2; i <= 8; i++) {
            worksheet.getColumn(i).width = 15
        }

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        saveAs(blob, `Roster_${currentMonth}_Enhanced.xlsx`)
    }

    return (
        <button
            onClick={handleExport}
            className="btn btn-secondary"
            style={{ marginLeft: '10px', backgroundColor: '#107c41', color: 'white' }} // Excel Green
        >
            Export Excel (Enhanced)
        </button>
    )
}
