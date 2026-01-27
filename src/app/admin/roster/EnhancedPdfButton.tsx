'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns'
import { getMonthRosterRange } from '@/lib/date-utils'
import { isPublicHoliday } from '@/lib/holidays'
import { getLeavesForRange } from '@/app/actions/scheduler'

type User = {
    id: number
    name: string
    type: string
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
    user: {
        name: string
        category?: string
    }
}

export default function EnhancedPdfButton({
    users,
    shifts,
    currentMonth
}: {
    users: User[]
    shifts: Shift[]
    currentMonth: string
}) {
    const handleExport = async () => {
        const doc = new jsPDF('l', 'mm', 'a4') // Landscape

        const monthDate = parseISO(`${currentMonth}-01`)
        const { start, end } = getMonthRosterRange(currentMonth)

        // Fetch leaves
        const startStr = format(start, 'yyyy-MM-dd')
        const endStr = format(end, 'yyyy-MM-dd')
        const leaves = await getLeavesForRange(startStr, endStr)

        // Get all weeks
        let currentWeekStart = start
        const weeks = []

        while (currentWeekStart < end) {
            const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
            const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd })
            weeks.push(daysInWeek)
            currentWeekStart = addDays(currentWeekStart, 7)
        }

        let finalY = 25 // Start Y position lower to make space for header

        // Full Header
        doc.setFontSize(18)
        doc.setTextColor(0, 0, 0)
        doc.text('CityROCK Johannesburg', 14, 12)
        doc.setFontSize(12)
        doc.text(`Staff Schedule: ${format(monthDate, 'MMMM yyyy')}`, 14, 18)
        doc.setLineWidth(0.5)
        doc.line(14, 20, 283, 20) // Header separator

        weeks.forEach((weekDays, weekIndex) => {
            // Check if we need a new page
            if (finalY > 180) {
                doc.addPage()
                finalY = 15
            }

            const body = []

            // 1. Date Row
            const dateRow = ['Staff Member', ...weekDays.map(d => format(d, 'd-MMM'))]

            // 2. Day Name Row
            const dayNameRow = ['', ...weekDays.map(d => format(d, 'EEEE'))]

            // 3. MOD Row
            const modRow = ['MOD']
            weekDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const modShifts = shifts.filter(s => s.date === dateStr && s.department.name === 'Management (MOD)')
                if (modShifts.length > 0) {
                    const uniqueNames = Array.from(new Set(modShifts.map(s => s.user.name)))
                    modRow.push(uniqueNames.join('/'))
                } else {
                    modRow.push('')
                }
            })
            body.push(modRow)

            // 4. SMOD Row
            const smodRow = ['SMOD']
            weekDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const smodShifts = shifts.filter(s => s.date === dateStr && (s.department.name === 'Shift Manager (SMOD)' || s.is_smod))
                if (smodShifts.length > 0) {
                    const uniqueNames = Array.from(new Set(smodShifts.map(s => s.user.name)))
                    smodRow.push(uniqueNames.join('/'))
                } else {
                    smodRow.push('')
                }
            })
            body.push(smodRow)

            // 4. Group by Type then Category
            const CATEGORY_ORDER = ['Management', 'Shift Manager', 'Cafe', 'Shop', 'Front Desk']

            // Full Time Section
            body.push(['Full Time & Cafe', '', '', '', '', '', '', ''])

            CATEGORY_ORDER.forEach(category => {
                const categoryUsers = users.filter(u => u.type === 'FULL_TIME' && (u.category || 'Front Desk') === category)

                if (categoryUsers.length === 0) return

                // Category Header
                const headerLabel = category === 'Management' ? 'Management (MOD)' :
                    category === 'Shift Manager' ? 'Shift Manager (SMOD)' :
                        category

                body.push([headerLabel, '', '', '', '', '', '', ''])

                // User Rows
                categoryUsers.forEach(user => {
                    const row = [user.name]
                    weekDays.forEach(day => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const shift = shifts.find(s => s.user_id === user.id && s.date === dateStr)
                        if (shift) {
                            row.push(`${shift.start_time} - ${shift.end_time}`)
                        } else {
                            row.push('')
                        }
                    })
                    body.push(row)
                })
            })

            // Part Time Section
            body.push(['Part Time', '', '', '', '', '', '', ''])

            CATEGORY_ORDER.forEach(category => {
                const categoryUsers = users.filter(u => u.type !== 'FULL_TIME' && (u.category || 'Front Desk') === category)

                if (categoryUsers.length === 0) return

                // Category Header
                const headerLabel = category === 'Management' ? 'Management (MOD)' :
                    category === 'Shift Manager' ? 'Shift Manager (SMOD)' :
                        category

                body.push([headerLabel, '', '', '', '', '', '', ''])

                // User Rows
                categoryUsers.forEach(user => {
                    const row = [user.name]
                    weekDays.forEach(day => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const shift = shifts.find(s => s.user_id === user.id && s.date === dateStr)
                        if (shift) {
                            row.push(`${shift.start_time} - ${shift.end_time}`)
                        } else {
                            row.push('')
                        }
                    })
                    body.push(row)
                })
            })

            // Fetch leaves for the range
            const startStr = format(start, 'yyyy-MM-dd')
            const endStr = format(end, 'yyyy-MM-dd')
            // Note: Since handleExport is sync/async, we need to handle the promise.
            // But jsPDF generation is synchronous usually.
            // We need to make handleExport async to fetch data.
            // Then wait for it.

            // Refactor handleExport to async

            autoTable(doc, {
                startY: finalY,
                head: [dateRow, dayNameRow],
                body: body,
                theme: 'grid',
                styles: {
                    fontSize: 7,
                    cellPadding: 1,
                    overflow: 'linebreak',
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.1,
                    lineColor: [0, 0, 0]
                },
                columnStyles: {
                    0: { cellWidth: 25, fontStyle: 'bold', halign: 'left' }
                },
                didParseCell: function (data) {
                    const rowIndex = data.row.index
                    const colIndex = data.column.index
                    const rawRow = data.row.raw as string[]
                    const section = data.section
                    const date = colIndex > 0 ? weekDays[colIndex - 1] : null
                    const isHoliday = date ? isPublicHoliday(format(date, 'yyyy-MM-dd')) : false

                    // --- Header Styling ---
                    if (section === 'head') {
                        // Date Row (Row 0)
                        if (rowIndex === 0) {
                            if (colIndex === 0) {
                                data.cell.styles.fillColor = [68, 68, 68] // Dark Grey
                                data.cell.styles.textColor = [255, 255, 255]
                            } else {
                                if (isHoliday) {
                                    data.cell.styles.fillColor = [185, 28, 28] // Holiday Red
                                } else {
                                    data.cell.styles.fillColor = [0, 0, 0] // Black
                                }
                                data.cell.styles.textColor = [255, 255, 255]
                                data.cell.styles.fontStyle = 'bold'
                            }
                        }
                        // Day Name Row (Row 1)
                        if (rowIndex === 1) {
                            if (colIndex > 0) {
                                if (isHoliday) {
                                    data.cell.styles.fillColor = [185, 28, 28] // Holiday Red
                                } else {
                                    data.cell.styles.fillColor = [0, 0, 0] // Black
                                }
                                data.cell.styles.textColor = [255, 255, 255]
                                data.cell.styles.fontStyle = 'bold'
                            } else {
                                data.cell.styles.fillColor = [255, 255, 255]
                            }
                        }
                    }

                    // --- Body Styling ---
                    if (section === 'body') {
                        // MOD & SMOD Rows (Row 0 and 1)
                        if (rowIndex === 0 || rowIndex === 1) {
                            data.cell.styles.fillColor = [204, 204, 204] // Light Grey
                            if (colIndex === 0) data.cell.styles.fontStyle = 'bold'
                        }

                        // Section Headers
                        const CATEGORY_HEADERS = ['Management (MOD)', 'Shift Manager (SMOD)', 'Cafe', 'Shop', 'Front Desk']
                        const MAIN_HEADERS = ['Full Time & Cafe', 'Part Time']

                        if (MAIN_HEADERS.includes(rawRow[0])) {
                            data.cell.styles.fillColor = [51, 51, 51] // Dark Grey
                            data.cell.styles.textColor = [255, 255, 255]
                            data.cell.styles.fontStyle = 'bold'
                            if (colIndex === 0) {
                                data.cell.colSpan = 8
                            }
                        } else if (CATEGORY_HEADERS.includes(rawRow[0])) {
                            data.cell.styles.fillColor = [102, 102, 102] // Medium Grey
                            data.cell.styles.textColor = [255, 255, 255]
                            data.cell.styles.fontStyle = 'bold'
                            if (colIndex === 0) {
                                data.cell.colSpan = 8
                            }
                        }

                        // User Rows
                        const isUserRow = rowIndex > 0 && !CATEGORY_HEADERS.includes(rawRow[0]) && !MAIN_HEADERS.includes(rawRow[0])

                        if (isUserRow) {
                            // Name Column
                            if (colIndex === 0) {
                                data.cell.styles.fillColor = [221, 221, 221] // Very Light Grey
                                data.cell.styles.fontStyle = 'bold'
                            }
                            // Shift Columns
                            else if (date) {
                                const dateStr = format(date, 'yyyy-MM-dd')
                                const userName = rawRow[0]
                                const user = users.find(u => u.name === userName)

                                if (user) {
                                    const onLeave = leaves.some((l: any) => l.userId === user.id && l.startDate <= dateStr && l.endDate >= dateStr)
                                    const shift = shifts.find(s => s.user_id === user.id && s.date === dateStr)

                                    if (onLeave) {
                                        data.cell.styles.fillColor = [0, 0, 0] // Black
                                        data.cell.styles.textColor = [255, 255, 255]
                                        // Text is already set in body construction
                                    } else if (shift && shift.department.color_code) {
                                        const hex = shift.department.color_code.replace('#', '')
                                        const r = parseInt(hex.substring(0, 2), 16)
                                        const g = parseInt(hex.substring(2, 4), 16)
                                        const b = parseInt(hex.substring(4, 6), 16)
                                        data.cell.styles.fillColor = [r, g, b]
                                        data.cell.styles.textColor = [255, 255, 255]
                                    } else if (isHoliday) {
                                        data.cell.styles.fillColor = [254, 242, 242] // Lighter red
                                    } else if (!isSameMonth(date, monthDate)) {
                                        data.cell.styles.fillColor = [238, 238, 238]
                                    }
                                }
                            }
                        }
                    }
                }
            })

            finalY = (doc as any).lastAutoTable.finalY + 10
        })

        doc.save(`roster-${currentMonth}-enhanced.pdf`)
    }

    return (
        <button
            onClick={handleExport}
            className="btn btn-secondary"
            style={{ marginLeft: '10px', backgroundColor: '#b30b00', color: 'white' }} // PDF Red
        >
            Export PDF (Enhanced)
        </button>
    )
}
