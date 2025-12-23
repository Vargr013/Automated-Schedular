'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

export default function ExportButton({
    users,
    shifts,
    currentMonth
}: {
    users: User[]
    shifts: Shift[]
    currentMonth: string
}) {
    const handleExport = () => {
        const doc = new jsPDF('l', 'mm', 'a4') // Landscape, mm, A4

        const monthDate = parseISO(`${currentMonth}-01`)
        const daysInMonth = eachDayOfInterval({
            start: startOfMonth(monthDate),
            end: endOfMonth(monthDate)
        })

        // Title
        doc.setFontSize(18)
        doc.text(`Roster: ${format(monthDate, 'MMMM yyyy')}`, 14, 22)

        // Prepare Table Data
        const head = [['Staff', ...daysInMonth.map(d => format(d, 'd (EEE)'))]]

        const body = users.map(user => {
            const row = [user.name]
            daysInMonth.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const userShifts = shifts.filter(s => s.user_id === user.id && s.date === dateStr)

                if (userShifts.length > 0) {
                    // Combine multiple shifts if any
                    const text = userShifts.map(s => `${s.start_time}-${s.end_time}\n${s.department.name}`).join('\n\n')
                    row.push(text)
                } else {
                    row.push('')
                }
            })
            return row
        })

        autoTable(doc, {
            head: head,
            body: body,
            startY: 30,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 1,
                overflow: 'linebreak',
                halign: 'center',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 25, fontStyle: 'bold', halign: 'left' } // Staff name column
            },
            didParseCell: function (data) {
                // Optional: Color code cells based on department?
                // It's hard to do with multiple shifts per cell in simple autotable.
                // For now, simple text is fine.
            }
        })

        doc.save(`roster-${currentMonth}.pdf`)
    }

    return (
        <button
            onClick={handleExport}
            className="btn btn-secondary"
            style={{ marginLeft: '10px' }}
        >
            Export PDF
        </button>
    )
}
