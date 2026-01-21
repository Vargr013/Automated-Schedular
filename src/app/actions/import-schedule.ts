'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { format, parseISO, eachDayOfInterval, getDay } from 'date-fns'
import { getMonthRosterRange } from '@/lib/date-utils'

// --- Types ---

export type ImportConflict = {
    type: 'RULE_VIOLATION' | 'LEAVE_CONFLICT' | 'Unknown'
    description: string
    date: string
    userId?: number
}

export type ScannedShift = {
    userId: number
    date: string
    startTime: string
    endTime: string
    departmentId: number
}

export type ImportReport = {
    success: boolean
    message: string
    shiftsToCreate: ScannedShift[]
    conflicts: ImportConflict[]
    stats: {
        totalShiftsFound: number
        usersFound: number
    }
}

// --- Helpers ---

function normalizeColor(hex: string): string {
    // DB: #RRGGBB or RRGGBB
    // Excel: FFRRGGBB
    // Return: FFRRGGBB uppercase
    let clean = hex.replace('#', '').toUpperCase()
    if (clean.length === 6) clean = 'FF' + clean
    return clean
}

function parseTimeRange(text: string): { start: string, end: string } | null {
    // Expected format: "08:00 - 17:00" or "8:00-17:00"
    // Remove all whitespace
    const clean = text.replace(/\s/g, '')
    const parts = clean.split('-')
    if (parts.length !== 2) return null

    // Simple validation of time format HH:mm
    const timeRegex = /^\d{1,2}:\d{2}$/
    if (!timeRegex.test(parts[0]) || !timeRegex.test(parts[1])) return null

    // Pad with zero if needed (e.g. 8:00 -> 08:00)
    const pad = (t: string) => t.length === 4 ? `0${t}` : t

    return {
        start: pad(parts[0]),
        end: pad(parts[1])
    }
}

// --- Main Action ---

export async function importRoster(formData: FormData): Promise<ImportReport> {
    const file = formData.get('file') as File
    if (!file) {
        return { success: false, message: 'No file uploaded', shiftsToCreate: [], conflicts: [], stats: { totalShiftsFound: 0, usersFound: 0 } }
    }

    try {
        const buffer = await file.arrayBuffer()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)
        const worksheet = workbook.getWorksheet('Roster')

        if (!worksheet) {
            return { success: false, message: 'Invalid file format: "Roster" sheet not found.', shiftsToCreate: [], conflicts: [], stats: { totalShiftsFound: 0, usersFound: 0 } }
        }

        // 1. Identify Month from Header
        // Look for cell with value "Staff Schedule: [Month] [Year]"
        let monthStr = ''
        let headerRowIdx = -1

        worksheet.eachRow((row, rowNumber) => {
            if (headerRowIdx !== -1) return
            row.eachCell((cell) => {
                if (cell.value && typeof cell.value === 'string' && cell.value.toString().startsWith('Staff Schedule:')) {
                    const text = cell.value.toString()
                    // Extract Date part
                    const datePart = text.replace('Staff Schedule:', '').trim()
                    // Try to parse "December 2025" -> "2025-12"
                    try {
                        const date = new Date(datePart) // JS Date parser is usually smart enough for "Month Year"
                        if (!isNaN(date.getTime())) {
                            monthStr = format(date, 'yyyy-MM')
                            headerRowIdx = rowNumber
                        }
                    } catch (e) { console.error(e) }
                }
            })
        })

        if (!monthStr) {
            // Fallback: Try to find simple dates in row headers
            return { success: false, message: 'Could not detect month from header (Expected "Staff Schedule: Month Year").', shiftsToCreate: [], conflicts: [], stats: { totalShiftsFound: 0, usersFound: 0 } }
        }

        // Load Context Data
        const { start: monthStart, end: monthEnd } = getMonthRosterRange(monthStr)
        const users = await prisma.user.findMany({
            include: { skills: true }
        })
        const departments = await prisma.department.findMany()
        const leaves = await prisma.leave.findMany({
            where: {
                status: 'APPROVED',
                OR: [
                    { startDate: { gte: format(monthStart, 'yyyy-MM-dd') } },
                    { endDate: { gte: format(monthStart, 'yyyy-MM-dd') } } // Rough filter
                ]
            }
        })
        const rules = await prisma.automationRule.findMany()

        // Create Color Map
        const colorMap = new Map<string, number>() // NormalizeARGB -> DeptId
        departments.forEach(d => {
            if (d.color_code) {
                colorMap.set(normalizeColor(d.color_code), d.id)
            }
        })

        // 2 & 3. Scan Rows Sequentially (Stateful Parsing)
        // The export has "Stacked Weeks". Each week has a Date Row, Day Row, then User Rows.
        // We need to update dateColMap whenever we hit a Date Row.

        let currentDateColMap = new Map<number, string>() // ColIdx -> YYYY-MM-DD
        const scannedShifts: ScannedShift[] = []
        const conflicts: ImportConflict[] = []
        const foundUserIds = new Set<number>()

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= headerRowIdx) return // Skip Main Title

            const cell1 = row.getCell(1)
            const val1 = cell1.value ? cell1.value.toString() : ''
            const cell2 = row.getCell(2)
            const val2 = cell2.value

            // CHECK: Is this a Date Row?
            // "Part Time" in col 1 AND "d-MMM" in col 2 check (or just heuristic)
            // Export structure: Col 1 = "Part Time" (or similar label), Col 2 = Date
            // CHECK: Is this a Date Row?
            // "Part Time" in col 1 AND "d-MMM" in col 2.
            // CAUTION: There is also a "Part Time" SECTION HEADER which has "Part Time" in col 1 but is merged.
            // We must ensure Col 2 has a value that looks like a date to distinguish.
            const isDateRow = (val1 === 'Part Time' || val1 === 'Full Time & Cafe') && val2 && val2.toString().includes('-')

            if (isDateRow) {
                // New Week Block Detected
                currentDateColMap.clear()

                row.eachCell((cell, colNumber) => {
                    if (colNumber < 2) return
                    const cellVal = cell.value
                    if (cellVal) {
                        const text = cellVal.toString() // "8-Dec"
                        // Try parsing with MonthStr year
                        const [day, monthShort] = text.split('-')
                        if (day && monthShort) {
                            // Determine year.
                            // If monthStr is "2025-12", and we see "Jan", it might be 2026.
                            // If monthStr is "2026-01", and we see "Dec", it might be 2025.
                            // Since the roster usually exports a single month + adjacent days, we can infer.
                            // Safety: try the year of monthStr first.
                            const baseYear = parseInt(monthStr.split('-')[0])

                            // Naive approach: Parse with baseYear. Check if it makes sense?
                            // Or utilize the date-fns logic?
                            // Let's assume the string "d-MMM" + baseYear
                            // If standard Date.parse works:
                            const parsed = new Date(`${day} ${monthShort} ${baseYear}`)

                            // Calendar Wraparound check?
                            // If we are in Dec 2025, and see "Jan", it should be 2026.
                            // If we are in Jan 2026, and see "Dec", it should be 2025.
                            // BUT: The export actually writes `format(day, 'd-MMM')`.
                            // Let's rely on standard JS date parsing which defaults to current year usually? No, we provided year.

                            if (!isNaN(parsed.getTime())) {
                                // Logic to fix Year edge cases
                                const rosterMonthIndex = parseInt(monthStr.split('-')[1]) - 1 // 0-11
                                const parsedMonthIndex = parsed.getMonth()

                                let finalYear = baseYear
                                if (rosterMonthIndex === 11 && parsedMonthIndex === 0) finalYear++ // Dec -> Jan
                                if (rosterMonthIndex === 0 && parsedMonthIndex === 11) finalYear-- // Jan -> Dec

                                parsed.setFullYear(finalYear) // Correct the year

                                currentDateColMap.set(colNumber, format(parsed, 'yyyy-MM-dd'))
                            }
                        } else if (cellVal instanceof Date) {
                            currentDateColMap.set(colNumber, format(cellVal, 'yyyy-MM-dd'))
                        }
                    }
                })
                return // Done processing Date Row
            }

            // Skip Day Name Row (Mon, Tue...) or Header/Spacer rows
            // User Row check: Name matches a user
            const user = users.find(u => u.name.toLowerCase() === val1.toLowerCase())

            if (user) {
                foundUserIds.add(user.id)
                // Use CURRENT date map
                currentDateColMap.forEach((dateStr, colIdx) => {
                    const cell = row.getCell(colIdx)
                    if (cell.value) {
                        const cellText = cell.value.toString()
                        const timeRange = parseTimeRange(cellText)

                        if (timeRange) {
                            // Correct Color Lookup
                            let deptId = user.skills[0]?.department_id || departments[0].id

                            const fill = cell.fill as ExcelJS.FillPattern
                            if (fill && fill.type === 'pattern' && fill.fgColor && fill.fgColor.argb) {
                                const argb = fill.fgColor.argb
                                const mappedId = colorMap.get(normalizeColor(argb))
                                if (mappedId) deptId = mappedId
                            }

                            scannedShifts.push({
                                userId: user.id,
                                date: dateStr,
                                startTime: timeRange.start,
                                endTime: timeRange.end,
                                departmentId: deptId
                            })
                        }
                    }
                })
            }
        })

        // 4. Validate LEAVE Conflicts
        scannedShifts.forEach(shift => {
            const userLeave = leaves.filter(l => l.userId === shift.userId)
            const isConflict = userLeave.some(l => shift.date >= l.startDate && shift.date <= l.endDate)

            if (isConflict) {
                const user = users.find(u => u.id === shift.userId)
                conflicts.push({
                    type: 'LEAVE_CONFLICT',
                    description: `User ${user?.name} is on leave on ${shift.date}`,
                    date: shift.date,
                    userId: shift.userId
                })
            }
        })

        // 5. Validate RULES (Understaffing)
        // Group Shifts by Date + Dept
        // Map<DateStr, Map<DeptId, Count>>
        const shiftCounts = new Map<string, Map<number, number>>()

        scannedShifts.forEach(s => {
            if (!shiftCounts.has(s.date)) shiftCounts.set(s.date, new Map())
            const dayMap = shiftCounts.get(s.date)!
            dayMap.set(s.departmentId, (dayMap.get(s.departmentId) || 0) + 1)
        })

        // Iterate Dates found in the import
        const importedDates = Array.from(new Set(scannedShifts.map(s => s.date)))

        importedDates.forEach(dateStr => {
            const date = parseISO(dateStr)
            const dow = getDay(date)
            const dayRules = rules.filter(r => r.day_of_week === dow)

            dayRules.forEach(rule => {
                // Check if rule is satisfied
                const matchingShiftsForRule = scannedShifts.filter(s =>
                    s.date === dateStr &&
                    s.departmentId === rule.department_id &&
                    s.startTime === rule.start_time &&
                    s.endTime === rule.end_time
                )

                if (matchingShiftsForRule.length < rule.count) {
                    const dept = departments.find(d => d.id === rule.department_id)
                    conflicts.push({
                        type: 'RULE_VIOLATION',
                        description: `Understaffed: ${dept?.name} needs ${rule.count} @ ${rule.start_time}-${rule.end_time} on ${dateStr}. Found ${matchingShiftsForRule.length}.`,
                        date: dateStr
                    })
                }
            })
        })

        return {
            success: true,
            message: 'Import processed successfully',
            shiftsToCreate: scannedShifts,
            conflicts,
            stats: {
                totalShiftsFound: scannedShifts.length,
                usersFound: foundUserIds.size
            }
        }

    } catch (error: any) {
        console.error('Import Error:', error)
        return { success: false, message: `Error processing file: ${error.message}`, shiftsToCreate: [], conflicts: [], stats: { totalShiftsFound: 0, usersFound: 0 } }
    }
}

export async function confirmRosterImport(shifts: ScannedShift[], month: string) {
    if (!shifts || shifts.length === 0) return

    // Transaction
    // 1. Delete all shifts in the range (actually, logic says "overwrite selected month")
    // Note: The "Export" includes overlaps into prev/next month (full weeks).
    // Should we delete STRICTLY within the month? Or valid range?
    // "cancel or overwrite the selected month's calendar" -> implies the Month View.
    // Safest: Delete only shifts that fall within the DATES contained in the import file?
    // Or Delete strictly the Month?
    // Let's stick to: Delete shifts in the Month Range (start-end from helper).

    const { start, end } = getMonthRosterRange(month)
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')

    // Filter new shifts to ensure we don't accidentally insert stuff way out of range (though UI should handle)
    const validShifts = shifts.filter(s => s.date >= startStr && s.date <= endStr)

    await prisma.$transaction(async (tx) => {
        // Delete
        await tx.shift.deleteMany({
            where: {
                date: {
                    gte: startStr,
                    lte: endStr
                }
            }
        })

        // Create
        if (validShifts.length > 0) {
            // Need to map to ShiftCreateInput
            // Note: Shift model has `user_id`, `department_id` (snake_case in some schemas?)
            // Checking schema from view_file earlier:
            // model Shift { user_id, department_id, ... }

            await tx.shift.createMany({
                data: validShifts.map(s => ({
                    user_id: s.userId,
                    department_id: s.departmentId,
                    date: s.date,
                    start_time: s.startTime,
                    end_time: s.endTime,
                    is_smod: false // Default, logic to infer SMOD? 
                    // Export logic says: "SMOD" row or "SMOD" dept?
                    // We mapped dept based on color.
                    // If Dept Name is "Shift Manager (SMOD)", then ok.
                }))
            })
        }
    })

    revalidatePath('/admin/roster')
}
