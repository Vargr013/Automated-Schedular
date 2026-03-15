'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { getLeavesForRange } from '@/app/actions/scheduler'
import { getMonthRosterRange } from '@/lib/date-utils'
import {
    buildRosterExportModel,
    getContrastTextColor,
    hexToRgb,
    type ExportLeave,
    type ExportShift,
    type ExportUser,
    type WeekSection,
    type WeekUserRow
} from './export-layout'

type User = ExportUser
type Shift = ExportShift

type AutoTableCell = {
    content: string
    colSpan?: number
    styles?: {
        fillColor?: [number, number, number]
        textColor?: [number, number, number]
        fontStyle?: 'normal' | 'bold'
        halign?: 'left' | 'center' | 'right'
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
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)

        try {
            const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable')
            ])

            const { start, end } = getMonthRosterRange(currentMonth)
            const leaves = await getLeavesForRange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
            const model = buildRosterExportModel({
                users,
                shifts,
                leaves: leaves as ExportLeave[],
                currentMonth
            })

            const doc = new jsPDF('l', 'mm', 'a4')
            const pageWidth = doc.internal.pageSize.getWidth()
            const marginLeft = 10
            const marginRight = 10
            const usableWidth = pageWidth - marginLeft - marginRight
            const nameColumnWidth = 26
            const dayColumnWidth = (usableWidth - nameColumnWidth) / 14

            const sectionHeaderRow = (label: string): AutoTableCell[] => [
                {
                    content: label,
                    colSpan: 15,
                    styles: {
                        fillColor: [74, 74, 74],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        halign: 'center'
                    }
                }
            ]

            const categoryHeaderRow = (label: string): AutoTableCell[] => [
                {
                    content: label,
                    colSpan: 15,
                    styles: {
                        fillColor: [122, 122, 122],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        halign: 'center'
                    }
                }
            ]

            const summaryRow = (label: string, values: string[], fillColor: [number, number, number], textColor: [number, number, number]): AutoTableCell[] => {
                const row: AutoTableCell[] = [{
                    content: label,
                    styles: {
                        fillColor,
                        textColor,
                        fontStyle: 'bold',
                        halign: 'left'
                    }
                }]

                values.forEach((value) => {
                    row.push({
                        content: value,
                        colSpan: 2,
                        styles: {
                            fillColor,
                            textColor,
                            fontStyle: 'bold',
                            halign: 'center'
                        }
                    })
                })

                return row
            }

            const introRow = (values: string[]): AutoTableCell[] => {
                const row: AutoTableCell[] = [{
                    content: 'Intro',
                    styles: {
                        fillColor: [249, 115, 22],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        halign: 'left'
                    }
                }]

                values.forEach((value) => {
                    row.push({
                        content: value ? 'Intro' : '',
                        styles: {
                            fillColor: [249, 115, 22],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            halign: 'left'
                        }
                    })
                    row.push({
                        content: value,
                        styles: {
                            fillColor: [249, 115, 22],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            halign: 'center'
                        }
                    })
                })

                return row
            }

            const userRow = (row: WeekUserRow): AutoTableCell[] => {
                const cells: AutoTableCell[] = [{
                    content: row.user.name,
                    styles: {
                        fillColor: [91, 91, 91],
                        textColor: [255, 255, 255],
                        fontStyle: 'normal',
                        halign: 'right'
                    }
                }]

                row.dayCells.forEach((dayCell) => {
                    if (dayCell.onLeave) {
                        cells.push({
                            content: dayCell.startTime || 'LEAVE',
                            styles: {
                                fillColor: [0, 0, 0],
                                textColor: [255, 255, 255],
                                fontStyle: 'normal',
                                halign: 'center'
                            }
                        })
                        cells.push({
                            content: dayCell.endTime,
                            styles: {
                                fillColor: [0, 0, 0],
                                textColor: [255, 255, 255],
                                fontStyle: 'normal',
                                halign: 'center'
                            }
                        })
                        return
                    }

                    if (dayCell.departmentColor) {
                        const { r, g, b } = hexToRgb(dayCell.departmentColor)
                        const textColor = getContrastTextColor(dayCell.departmentColor) === 'FFFFFF'
                            ? [255, 255, 255]
                            : [0, 0, 0]

                        cells.push({
                            content: dayCell.startTime,
                            styles: {
                                fillColor: [r, g, b],
                                textColor: textColor as [number, number, number],
                                fontStyle: 'normal',
                                halign: 'center'
                            }
                        })
                        cells.push({
                            content: dayCell.endTime,
                            styles: {
                                fillColor: [r, g, b],
                                textColor: textColor as [number, number, number],
                                fontStyle: 'normal',
                                halign: 'center'
                            }
                        })
                        return
                    }

                    const emptyFill: [number, number, number] = !dayCell.isInMonth
                        ? [154, 154, 154]
                        : dayCell.isHoliday
                            ? [189, 189, 189]
                            : [138, 138, 138]

                    cells.push({
                        content: '',
                        styles: {
                            fillColor: emptyFill,
                            textColor: [220, 220, 220],
                            halign: 'center'
                        }
                    })
                    cells.push({
                        content: '',
                        styles: {
                            fillColor: emptyFill,
                            textColor: [220, 220, 220],
                            halign: 'center'
                        }
                    })
                })

                return cells
            }

            const pushSection = (body: AutoTableCell[][], title: string, sections: WeekSection[]) => {
                body.push(sectionHeaderRow(title))
                sections.forEach((section) => {
                    body.push(categoryHeaderRow(section.label))
                    section.rows.forEach((row) => body.push(userRow(row)))
                })
            }

            doc.setFontSize(18)
            doc.text('CityROCK Johannesburg', marginLeft, 12)
            doc.setFontSize(11)
            doc.text(`Staff Schedule: ${model.monthTitle}`, marginLeft, 18)
            doc.setLineWidth(0.5)
            doc.line(marginLeft, 20, pageWidth - marginRight, 20)

            let startY = 24

            model.weeks.forEach((week, index) => {
                if (index > 0) {
                    doc.addPage()
                    startY = 14
                }

                doc.setFontSize(10)
                doc.setTextColor(255, 255, 255)
                doc.setFillColor(43, 43, 43)
                doc.rect(marginLeft, startY, usableWidth, 7, 'F')
                doc.text(week.weekLabel, marginLeft + 2, startY + 4.7)
                doc.setTextColor(0, 0, 0)

                const head: AutoTableCell[][] = [[
                    {
                        content: 'Dates',
                        styles: {
                            fillColor: [17, 17, 17],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            halign: 'left'
                        }
                    },
                    ...week.days.map((day) => ({
                        content: format(day, 'd-MMM'),
                        colSpan: 2,
                        styles: {
                            fillColor: [0, 0, 0] as [number, number, number],
                            textColor: [255, 255, 255] as [number, number, number],
                            fontStyle: 'bold' as const,
                            halign: 'center' as const
                        }
                    }))
                ], [
                    {
                        content: 'Day',
                        styles: {
                            fillColor: [17, 17, 17],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            halign: 'left'
                        }
                    },
                    ...week.days.map((day) => ({
                        content: format(day, 'EEEE'),
                        colSpan: 2,
                        styles: {
                            fillColor: [0, 0, 0] as [number, number, number],
                            textColor: [255, 255, 255] as [number, number, number],
                            fontStyle: 'bold' as const,
                            halign: 'center' as const
                        }
                    }))
                ]]

                const body: AutoTableCell[][] = [
                    introRow(week.introNames),
                    summaryRow('MOD', week.modNames, [179, 179, 179], [0, 0, 0]),
                    summaryRow('SMOD', week.smodNames, [159, 159, 159], [0, 0, 0])
                ]

                pushSection(body, 'Full time & Cafe', week.fullTimeSections)
                pushSection(body, 'Part time', week.partTimeSections)

                autoTable(doc, {
                    startY: startY + 7,
                    head,
                    body,
                    theme: 'grid',
                    margin: { left: marginLeft, right: marginRight },
                    styles: {
                        font: 'helvetica',
                        fontSize: 8,
                        cellPadding: 1.35,
                        overflow: 'linebreak',
                        halign: 'center',
                        valign: 'middle',
                        lineWidth: 0.1,
                        lineColor: [0, 0, 0]
                    },
                    columnStyles: {
                        0: { cellWidth: nameColumnWidth, halign: 'right' },
                        1: { cellWidth: dayColumnWidth },
                        2: { cellWidth: dayColumnWidth },
                        3: { cellWidth: dayColumnWidth },
                        4: { cellWidth: dayColumnWidth },
                        5: { cellWidth: dayColumnWidth },
                        6: { cellWidth: dayColumnWidth },
                        7: { cellWidth: dayColumnWidth },
                        8: { cellWidth: dayColumnWidth },
                        9: { cellWidth: dayColumnWidth },
                        10: { cellWidth: dayColumnWidth },
                        11: { cellWidth: dayColumnWidth },
                        12: { cellWidth: dayColumnWidth },
                        13: { cellWidth: dayColumnWidth },
                        14: { cellWidth: dayColumnWidth }
                    },
                    didParseCell(data) {
                        const raw = data.cell.raw as AutoTableCell | string
                        if (typeof raw === 'object' && raw.styles) {
                            if (raw.styles.fillColor) data.cell.styles.fillColor = raw.styles.fillColor
                            if (raw.styles.textColor) data.cell.styles.textColor = raw.styles.textColor
                            if (raw.styles.fontStyle) data.cell.styles.fontStyle = raw.styles.fontStyle
                            if (raw.styles.halign) data.cell.styles.halign = raw.styles.halign
                        }

                        if (data.section === 'body' && data.column.index > 0) {
                            const dayColumnOffset = (data.column.index - 1) % 2
                            if (dayColumnOffset === 0) {
                                data.cell.styles.lineWidth = { top: 0.1, right: 0, bottom: 0.1, left: 0.1 }
                            } else {
                                data.cell.styles.lineWidth = { top: 0.1, right: 0.1, bottom: 0.1, left: 0 }
                            }
                        }
                    }
                })
            })

            doc.save(`roster-${currentMonth}-enhanced.pdf`)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <button
            onClick={handleExport}
            className="btn btn-secondary"
            disabled={isExporting}
            style={{ marginLeft: '10px', backgroundColor: '#b30b00', color: 'white' }}
        >
            {isExporting ? 'Exporting PDF...' : 'Export PDF (Enhanced)'}
        </button>
    )
}
