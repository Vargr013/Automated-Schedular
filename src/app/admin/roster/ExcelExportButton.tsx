'use client'

import * as XLSX from 'xlsx'
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'

type User = {
    id: number
    name: string
}

type Shift = {
    id: number
    user_id: number
    date: string
    start_time: string
    end_time: string
    department: {
        name: string
        color_code: string
    }
}

export default function ExcelExportButton({
    users,
    shifts,
    currentMonth
}: {
    users: User[]
    shifts: Shift[]
    currentMonth: string
}) {
    const handleExport = () => {
        const monthDate = parseISO(`${currentMonth}-01`)
        const daysInMonth = eachDayOfInterval({
            start: startOfMonth(monthDate),
            end: endOfMonth(monthDate)
        })

        // Prepare Data
        // Header Row
        const header = ['Staff Member', ...daysInMonth.map(d => format(d, 'yyyy-MM-dd (EEE)'))]

        // Data Rows
        const data = users.map(user => {
            const row: string[] = [user.name]
            daysInMonth.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const userShifts = shifts.filter(s => s.user_id === user.id && s.date === dateStr)

                if (userShifts.length > 0) {
                    // Combine multiple shifts
                    const text = userShifts.map(s => `${s.start_time}-${s.end_time} (${s.department.name})`).join('; ')
                    row.push(text)
                } else {
                    row.push('')
                }
            })
            return row
        })

        // Create Worksheet
        const ws = XLSX.utils.aoa_to_sheet([header, ...data])

        // Set column widths
        const wscols = [{ wch: 20 }] // Staff column
        daysInMonth.forEach(() => wscols.push({ wch: 25 })) // Day columns
        ws['!cols'] = wscols

        // Create Workbook
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Roster')

        // Save File
        XLSX.writeFile(wb, `roster-${currentMonth}.xlsx`)
    }

    return (
        <button
            onClick={handleExport}
            className="btn btn-secondary"
            style={{ marginLeft: '10px' }}
        >
            Export Excel
        </button>
    )
}
