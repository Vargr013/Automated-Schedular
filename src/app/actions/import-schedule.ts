'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import prisma from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { eachDayOfInterval, format, parseISO, getDay } from 'date-fns'
import { getMonthRosterRange } from '@/lib/date-utils'
import { getValidationMonthTag } from '@/lib/validation/cache-tags'
import { requireAdmin } from '@/lib/admin-auth'
import {
    DAY_COLUMN_START,
    DAY_PAIR_WIDTH,
    ROSTER_METADATA_SHEET,
    ROSTER_META_SHIFT_HEADER_ROW,
    ROSTER_ROW_KIND_COLUMN,
    ROSTER_ROW_KIND_SMOD,
    ROSTER_ROW_USER_ID_COLUMN,
    WEEK_COLUMN_COUNT
} from '@/app/admin/roster/export-layout'
import {
    normaliseColour,
    parseHumanRosterWorksheet,
    selectHumanScheduleSheet,
    type HumanRosterParseResult,
    type HumanRosterRecord,
    type HumanRosterWarnings
} from './human-roster-import'
import { DEFAULT_HUMAN_ROSTER_IMPORT_CONFIG } from './roster-import-config'

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
    isSmod: boolean
}

export type DepartmentOption = {
    id: number
    name: string
    colorCode: string
}

export type ColourResolution = {
    sourceColor: string
    category: string
    recordCount: number
    timeRecordCount: number
    mappedDepartmentId: number | null
    mappedDepartmentName: string | null
    isUnknown: boolean
    samples: {
        staffName: string | null
        date: string
        rawValue: string
        sourceCell: string
    }[]
}

export type ColourMappingInput = {
    sourceColor: string
    departmentId: number
}

export type ImportReport = {
    success: boolean
    message: string
    detectedMonth: string
    coveredDates: string[]
    shiftsToCreate: ScannedShift[]
    conflicts: ImportConflict[]
    stats: {
        totalShiftsFound: number
        usersFound: number
    }
    source?: HumanRosterParseResult['source']
    records?: HumanRosterRecord[]
    staff?: string[]
    categories?: string[]
    warnings?: HumanRosterWarnings
    departmentOptions?: DepartmentOption[]
    colourResolutions?: ColourResolution[]
}

type MetadataShift = {
    userId: number
    date: string
    startTime: string
    endTime: string
    departmentId: number
    isSmod: boolean
}

type WorkbookMetadata = {
    month: string
    coveredDates: string[]
    shiftsByUserDate: Map<string, MetadataShift[]>
}

function emptyReport(message: string): ImportReport {
    return {
        success: false,
        message,
        detectedMonth: '',
        coveredDates: [],
        shiftsToCreate: [],
        conflicts: [],
        stats: {
            totalShiftsFound: 0,
            usersFound: 0
        }
    }
}

function normalizeColor(hex: string): string {
    let clean = hex.replace('#', '').toUpperCase()
    if (clean.length === 6) clean = `FF${clean}`
    return clean
}

function parseTimeRange(text: string): { start: string, end: string } | null {
    const clean = text.replace(/\s/g, '')
    const parts = clean.split('-')
    if (parts.length !== 2) return null

    const timeRegex = /^\d{1,2}:\d{2}$/
    if (!timeRegex.test(parts[0]) || !timeRegex.test(parts[1])) return null

    const pad = (time: string) => (time.length === 4 ? `0${time}` : time)
    return {
        start: pad(parts[0]),
        end: pad(parts[1])
    }
}

function parseSingleTime(text: string): string | null {
    const clean = text.trim()
    if (!/^\d{1,2}:\d{2}$/.test(clean)) return null
    return clean.length === 4 ? `0${clean}` : clean
}

function cellText(cellValue: ExcelJS.CellValue | undefined | null): string {
    if (cellValue === null || cellValue === undefined) return ''
    if (typeof cellValue === 'string') return cellValue
    if (typeof cellValue === 'number') return cellValue.toString()
    if (cellValue instanceof Date) return format(cellValue, 'HH:mm')
    if (typeof cellValue === 'object' && 'text' in cellValue && typeof cellValue.text === 'string') {
        return cellValue.text
    }
    return String(cellValue)
}

function looksLikeExportDate(text: string): boolean {
    return /^\d{1,2}-[A-Za-z]{3}$/.test(text.trim())
}

function parseNames(text: string): string[] {
    return text
        .split(/\/|,|\n/)
        .map((name) => name.trim())
        .filter(Boolean)
}

function deriveMonthFromDates(worksheet: ExcelJS.Worksheet): string {
    const monthCounts = new Map<string, number>()

    worksheet.eachRow((row) => {
        for (let colNumber = DAY_COLUMN_START; colNumber <= WEEK_COLUMN_COUNT; colNumber += DAY_PAIR_WIDTH) {
            const cellValue = row.getCell(colNumber).value
            if (!(cellValue instanceof Date)) continue

            const key = format(cellValue, 'yyyy-MM')
            monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
        }
    })

    let derivedMonth = ''
    let highestCount = 0
    monthCounts.forEach((count, key) => {
        if (count > highestCount) {
            highestCount = count
            derivedMonth = key
        }
    })

    return derivedMonth
}

function getWorkbookMetadata(workbook: ExcelJS.Workbook): WorkbookMetadata {
    const metadataSheet = workbook.getWorksheet(ROSTER_METADATA_SHEET)
    if (!metadataSheet) {
        return {
            month: '',
            coveredDates: [],
            shiftsByUserDate: new Map()
        }
    }

    const info = new Map<string, string>()
    for (let rowNumber = 1; rowNumber < ROSTER_META_SHIFT_HEADER_ROW; rowNumber += 1) {
        const key = cellText(metadataSheet.getCell(rowNumber, 1).value).trim()
        const value = cellText(metadataSheet.getCell(rowNumber, 2).value).trim()
        if (key && value) {
            info.set(key, value)
        }
    }

    const shiftsByUserDate = new Map<string, MetadataShift[]>()
    for (let rowNumber = ROSTER_META_SHIFT_HEADER_ROW + 1; rowNumber <= metadataSheet.rowCount; rowNumber += 1) {
        const userId = parseInt(cellText(metadataSheet.getCell(rowNumber, 1).value), 10)
        const date = cellText(metadataSheet.getCell(rowNumber, 2).value).trim()
        const startTime = cellText(metadataSheet.getCell(rowNumber, 3).value).trim()
        const endTime = cellText(metadataSheet.getCell(rowNumber, 4).value).trim()
        const departmentId = parseInt(cellText(metadataSheet.getCell(rowNumber, 5).value), 10)
        const isSmod = cellText(metadataSheet.getCell(rowNumber, 6).value).trim().toLowerCase() === 'true'

        if (!Number.isFinite(userId) || !date || !startTime || !endTime || !Number.isFinite(departmentId)) continue

        const key = `${userId}|${date}`
        const entry: MetadataShift = {
            userId,
            date,
            startTime,
            endTime,
            departmentId,
            isSmod
        }

        const existing = shiftsByUserDate.get(key)
        if (existing) {
            existing.push(entry)
        } else {
            shiftsByUserDate.set(key, [entry])
        }
    }

    const rangeStart = info.get('rangeStart')
    const rangeEnd = info.get('rangeEnd')
    const coveredDates =
        rangeStart && rangeEnd
            ? eachDayOfInterval({ start: parseISO(rangeStart), end: parseISO(rangeEnd) }).map((day) => format(day, 'yyyy-MM-dd'))
            : []

    return {
        month: info.get('month') || '',
        coveredDates,
        shiftsByUserDate
    }
}

function getRowMetadata(row: ExcelJS.Row) {
    const kind = cellText(row.getCell(ROSTER_ROW_KIND_COLUMN).value).trim()
    const userIdText = cellText(row.getCell(ROSTER_ROW_USER_ID_COLUMN).value).trim()
    const userId = userIdText ? parseInt(userIdText, 10) : NaN

    return {
        kind,
        userId: Number.isFinite(userId) ? userId : null
    }
}

function findMetadataShift(
    shiftsByUserDate: Map<string, MetadataShift[]>,
    userId: number,
    date: string,
    startTime: string,
    endTime: string
) {
    const candidates = shiftsByUserDate.get(`${userId}|${date}`) || []
    return (
        candidates.find((candidate) => candidate.startTime === startTime && candidate.endTime === endTime) ||
        [...candidates].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime))[0] ||
        null
    )
}

type ImportDepartment = Awaited<ReturnType<typeof prisma.department.findMany>>[number]
type ImportUser = Awaited<ReturnType<typeof prisma.user.findMany>>[number]
type ImportLeave = Awaited<ReturnType<typeof prisma.leave.findMany>>[number]
type ImportRule = Awaited<ReturnType<typeof prisma.automationRule.findMany>>[number]
type SavedColourMapping = {
    sourceColor: string
    departmentId: number
    label: string | null
    department: ImportDepartment
}

function getDepartmentOptions(departments: ImportDepartment[]): DepartmentOption[] {
    return departments
        .map((department) => ({
            id: department.id,
            name: department.name,
            colorCode: department.color_code
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

function buildSavedMappingMap(savedMappings: SavedColourMapping[]) {
    return new Map(savedMappings.map((mapping) => [normaliseColour(mapping.sourceColor), mapping]))
}

function getDepartmentMatch(
    record: HumanRosterRecord,
    departments: ImportDepartment[],
    savedMappings: SavedColourMapping[] = []
) {
    const savedMapping = buildSavedMappingMap(savedMappings).get(record.sourceColor)
    if (savedMapping) return savedMapping.department

    const byName = new Map(departments.map((department) => [department.name.trim().toLowerCase(), department]))
    const byColour = new Map(
        departments
            .filter((department) => department.color_code)
            .map((department) => [normaliseColour(department.color_code), department])
    )

    const directCategoryMatch = byName.get(record.category.trim().toLowerCase())
    if (directCategoryMatch) return directCategoryMatch

    const alias = DEFAULT_HUMAN_ROSTER_IMPORT_CONFIG.categoryDepartmentAliases[record.category]
    if (alias) {
        const aliasMatch = byName.get(alias.trim().toLowerCase())
        if (aliasMatch) return aliasMatch
    }

    return byColour.get(record.sourceColor) || null
}

function applyColourMappingsToRecords(
    records: HumanRosterRecord[],
    savedMappings: SavedColourMapping[]
) {
    const savedMappingMap = buildSavedMappingMap(savedMappings)

    return records.map((record) => {
        const savedMapping = savedMappingMap.get(record.sourceColor)
        if (!savedMapping) return record

        return {
            ...record,
            category: savedMapping.department.name
        }
    })
}

function resolveWarningsForMappings(
    warnings: HumanRosterWarnings | undefined,
    savedMappings: SavedColourMapping[]
) {
    if (!warnings) return warnings

    const mappedColours = new Set(savedMappings.map((mapping) => normaliseColour(mapping.sourceColor)))
    return {
        ...warnings,
        unknownColours: warnings.unknownColours.filter((warning) =>
            !warning.sourceColor || !mappedColours.has(normaliseColour(warning.sourceColor))
        )
    }
}

function buildColourResolutions({
    records,
    departments,
    savedMappings
}: {
    records: HumanRosterRecord[]
    departments: ImportDepartment[]
    savedMappings: SavedColourMapping[]
}): ColourResolution[] {
    const groups = new Map<string, ColourResolution>()

    records
        .filter((record) => record.sourceColor !== 'NO_FILL' && record.sourceColor !== '#FFFFFF')
        .forEach((record) => {
            const existing = groups.get(record.sourceColor)
            const department = getDepartmentMatch(record, departments, savedMappings)
            const base: ColourResolution = existing || {
                sourceColor: record.sourceColor,
                category: record.category,
                recordCount: 0,
                timeRecordCount: 0,
                mappedDepartmentId: department?.id || null,
                mappedDepartmentName: department?.name || null,
                isUnknown: record.category === 'Unknown' && !department,
                samples: []
            }

            base.recordCount += 1
            if (record.staffName && record.startTime && record.endTime) {
                base.timeRecordCount += 1
            }
            if (!base.mappedDepartmentId && department) {
                base.mappedDepartmentId = department.id
                base.mappedDepartmentName = department.name
                base.isUnknown = false
            }
            if (base.samples.length < 3) {
                base.samples.push({
                    staffName: record.staffName,
                    date: record.date,
                    rawValue: record.rawValue,
                    sourceCell: record.sourceCell
                })
            }

            groups.set(record.sourceColor, base)
        })

    return Array.from(groups.values()).sort((a, b) => {
        if (a.isUnknown !== b.isUnknown) return a.isUnknown ? -1 : 1
        return b.recordCount - a.recordCount
    })
}

function buildHumanScannedShifts({
    records,
    users,
    departments,
    savedMappings = []
}: {
    records: HumanRosterRecord[]
    users: ImportUser[]
    departments: ImportDepartment[]
    savedMappings?: SavedColourMapping[]
}) {
    const usersByName = new Map<string, typeof users>()
    users.forEach((user) => {
        const key = user.name.trim().toLowerCase()
        const existing = usersByName.get(key)
        if (existing) {
            existing.push(user)
        } else {
            usersByName.set(key, [user])
        }
    })

    const scannedShifts: ScannedShift[] = []
    const foundUserIds = new Set<number>()

    records.forEach((record) => {
        if (!record.staffName || !record.startTime || !record.endTime) return

        const matches = usersByName.get(record.staffName.trim().toLowerCase()) || []
        if (matches.length !== 1) return

        const department = getDepartmentMatch(record, departments, savedMappings)
        if (!department) return

        foundUserIds.add(matches[0].id)
        scannedShifts.push({
            userId: matches[0].id,
            date: record.date,
            startTime: record.startTime,
            endTime: record.endTime,
            departmentId: department.id,
            isSmod: record.section === 'SMOD' || record.role === 'SMOD'
        })
    })

    return { scannedShifts, foundUserIds }
}

function buildShiftConflicts({
    scannedShifts,
    users,
    leaves,
    rules,
    departments
}: {
    scannedShifts: ScannedShift[]
    users: ImportUser[]
    leaves: ImportLeave[]
    rules: ImportRule[]
    departments: ImportDepartment[]
}) {
    const conflicts: ImportConflict[] = []
    const usersById = new Map(users.map((user) => [user.id, user]))

    scannedShifts.forEach((shift) => {
        const userLeave = leaves.filter((leave) => leave.userId === shift.userId)
        const isConflict = userLeave.some((leave) => shift.date >= leave.startDate && shift.date <= leave.endDate)

        if (isConflict) {
            const user = usersById.get(shift.userId)
            conflicts.push({
                type: 'LEAVE_CONFLICT',
                description: `User ${user?.name} is on leave on ${shift.date}`,
                date: shift.date,
                userId: shift.userId
            })
        }
    })

    const importedDates = Array.from(new Set(scannedShifts.map((shift) => shift.date)))

    importedDates.forEach((dateStr) => {
        const date = parseISO(dateStr)
        const dow = getDay(date)
        const dayRules = rules.filter((rule) => rule.day_of_week === dow)

        dayRules.forEach((rule) => {
            const matchingShiftsForRule = scannedShifts.filter((shift) =>
                shift.date === dateStr &&
                shift.departmentId === rule.department_id &&
                shift.startTime === rule.start_time &&
                shift.endTime === rule.end_time &&
                (!rule.is_smod || shift.isSmod)
            )

            if (matchingShiftsForRule.length < rule.count) {
                const department = departments.find((candidate) => candidate.id === rule.department_id)
                conflicts.push({
                    type: 'RULE_VIOLATION',
                    description: `Understaffed: ${department?.name} needs ${rule.count} @ ${rule.start_time}-${rule.end_time} on ${dateStr}. Found ${matchingShiftsForRule.length}.`,
                    date: dateStr
                })
            }
        })
    })

    return conflicts
}

async function buildHumanImportReport(
    workbook: ExcelJS.Workbook,
    workbookName: string
): Promise<ImportReport> {
    const selection = selectHumanScheduleSheet(workbook)
    if (!selection) {
        return emptyReport('Invalid file format: no app "Roster" sheet and no human schedule sheet could be detected.')
    }

    const parsed = parseHumanRosterWorksheet({
        worksheet: selection.worksheet,
        workbookName,
        config: DEFAULT_HUMAN_ROSTER_IMPORT_CONFIG
    })

    if (!parsed.detectedMonth) {
        return {
            ...emptyReport('Could not detect month from human schedule dates.'),
            source: parsed.source,
            records: parsed.records,
            staff: parsed.staff,
            categories: parsed.categories,
            warnings: parsed.warnings
        }
    }

    const { start: monthStart } = getMonthRosterRange(parsed.detectedMonth)
    const users = await prisma.user.findMany({
        include: { skills: true }
    })
    const departments = await prisma.department.findMany()
    const savedMappings = await prisma.rosterImportColourMapping.findMany({
        include: { department: true }
    })
    const leaves = await prisma.leave.findMany({
        where: {
            status: 'APPROVED',
            OR: [
                { startDate: { gte: format(monthStart, 'yyyy-MM-dd') } },
                { endDate: { gte: format(monthStart, 'yyyy-MM-dd') } }
            ]
        }
    })
    const rules = await prisma.automationRule.findMany()

    const resolvedRecords = applyColourMappingsToRecords(parsed.records, savedMappings)
    const resolvedWarnings = resolveWarningsForMappings(parsed.warnings, savedMappings)

    const { scannedShifts, foundUserIds } = buildHumanScannedShifts({
        records: resolvedRecords,
        users,
        departments,
        savedMappings
    })
    const conflicts = buildShiftConflicts({
        scannedShifts,
        users,
        leaves,
        rules,
        departments
    })

    return {
        success: true,
        message: `Human schedule import processed from "${selection.worksheet.name}" (${selection.reason})`,
        detectedMonth: parsed.detectedMonth,
        coveredDates: parsed.coveredDates,
        shiftsToCreate: scannedShifts,
        conflicts,
        stats: {
            totalShiftsFound: scannedShifts.length,
            usersFound: foundUserIds.size
        },
        source: parsed.source,
        records: resolvedRecords,
        staff: parsed.staff,
        categories: Array.from(new Set(resolvedRecords.map((record) => record.category))).sort(),
        warnings: resolvedWarnings,
        departmentOptions: getDepartmentOptions(departments),
        colourResolutions: buildColourResolutions({
            records: resolvedRecords,
            departments,
            savedMappings
        })
    }
}

export async function importRoster(formData: FormData): Promise<ImportReport> {
    await requireAdmin()

    const file = formData.get('file') as File
    if (!file) {
        return emptyReport('No file uploaded')
    }

    try {
        const buffer = await file.arrayBuffer()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)
        const worksheet = workbook.getWorksheet('Roster')

        if (!worksheet) {
            return buildHumanImportReport(workbook, file.name || 'Uploaded workbook')
        }

        const workbookMetadata = getWorkbookMetadata(workbook)
        let monthStr = workbookMetadata.month
        let headerRowIdx = -1

        if (!monthStr) {
            worksheet.eachRow((row, rowNumber) => {
                if (headerRowIdx !== -1) return
                row.eachCell((cell) => {
                    if (cell.value && typeof cell.value === 'string' && cell.value.toString().startsWith('Staff Schedule:')) {
                        const text = cell.value.toString()
                        const datePart = text.replace('Staff Schedule:', '').trim()
                        const date = new Date(datePart)
                        if (!isNaN(date.getTime())) {
                            monthStr = format(date, 'yyyy-MM')
                            headerRowIdx = rowNumber
                        }
                    }
                })
            })
        }

        if (!monthStr) {
            monthStr = deriveMonthFromDates(worksheet)
        }

        if (!monthStr) {
            return emptyReport('Could not detect month from workbook dates.')
        }

        const { start: monthStart } = getMonthRosterRange(monthStr)
        const users = await prisma.user.findMany({
            include: { skills: true }
        })
        const departments = await prisma.department.findMany()
        const leaves = await prisma.leave.findMany({
            where: {
                status: 'APPROVED',
                OR: [
                    { startDate: { gte: format(monthStart, 'yyyy-MM-dd') } },
                    { endDate: { gte: format(monthStart, 'yyyy-MM-dd') } }
                ]
            }
        })
        const rules = await prisma.automationRule.findMany()

        const usersById = new Map(users.map((user) => [user.id, user]))
        const usersByName = new Map<string, typeof users>()
        users.forEach((user) => {
            const key = user.name.trim().toLowerCase()
            const existing = usersByName.get(key)
            if (existing) {
                existing.push(user)
            } else {
                usersByName.set(key, [user])
            }
        })

        const colorMap = new Map<string, number>()
        departments.forEach((department) => {
            if (department.color_code) {
                colorMap.set(normalizeColor(department.color_code), department.id)
            }
        })

        let currentDateColMap = new Map<number, string>()
        const coveredDates = new Set(workbookMetadata.coveredDates)
        const scannedShifts: ScannedShift[] = []
        const conflicts: ImportConflict[] = []
        const foundUserIds = new Set<number>()
        const smodFlags = new Set<string>()

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= headerRowIdx) return

            const label = cellText(row.getCell(1).value).trim()
            const rowMetadata = getRowMetadata(row)

            const detectedDateCols = new Map<number, string>()
            for (let colNumber = DAY_COLUMN_START; colNumber <= WEEK_COLUMN_COUNT; colNumber += DAY_PAIR_WIDTH) {
                const cell = row.getCell(colNumber)
                const text = cellText(cell.value).trim()
                const cellVal = cell.value

                if (!text && !(cellVal instanceof Date)) continue

                if (looksLikeExportDate(text)) {
                    const [day, monthShort] = text.split('-')
                    const baseYear = parseInt(monthStr.split('-')[0], 10)
                    const parsed = new Date(`${day} ${monthShort} ${baseYear}`)

                    if (!isNaN(parsed.getTime())) {
                        const rosterMonthIndex = parseInt(monthStr.split('-')[1], 10) - 1
                        const parsedMonthIndex = parsed.getMonth()

                        let finalYear = baseYear
                        if (rosterMonthIndex === 11 && parsedMonthIndex === 0) finalYear += 1
                        if (rosterMonthIndex === 0 && parsedMonthIndex === 11) finalYear -= 1

                        parsed.setFullYear(finalYear)
                        const dateStr = format(parsed, 'yyyy-MM-dd')
                        detectedDateCols.set(colNumber, dateStr)
                    }
                } else if (cellVal instanceof Date) {
                    detectedDateCols.set(colNumber, format(cellVal, 'yyyy-MM-dd'))
                }
            }

            if (detectedDateCols.size >= 5) {
                currentDateColMap = detectedDateCols
                detectedDateCols.forEach((dateStr) => coveredDates.add(dateStr))
                return
            }

            const isSmodRow = rowMetadata.kind === ROSTER_ROW_KIND_SMOD || label.toUpperCase() === 'SMOD'
            if (isSmodRow) {
                currentDateColMap.forEach((dateStr, startColIdx) => {
                    parseNames(cellText(row.getCell(startColIdx).value)).forEach((name) => {
                        const matches = usersByName.get(name.toLowerCase()) || []
                        if (matches.length === 1) {
                            smodFlags.add(`${matches[0].id}|${dateStr}`)
                        }
                    })
                })
                return
            }

            const user =
                (rowMetadata.userId ? usersById.get(rowMetadata.userId) : null) ||
                (() => {
                    const matches = usersByName.get(label.toLowerCase()) || []
                    return matches.length === 1 ? matches[0] : null
                })()

            if (!user) return

            foundUserIds.add(user.id)
            currentDateColMap.forEach((dateStr, startColIdx) => {
                const startCell = row.getCell(startColIdx)
                const endCell = row.getCell(startColIdx + 1)

                const startText = cellText(startCell.value)
                const endText = cellText(endCell.value)
                const pairedStart = parseSingleTime(startText)
                const pairedEnd = parseSingleTime(endText)
                const combinedRange = parseTimeRange(startText)

                let parsedStart: string | null = null
                let parsedEnd: string | null = null

                if (pairedStart && pairedEnd) {
                    parsedStart = pairedStart
                    parsedEnd = pairedEnd
                } else if (combinedRange) {
                    parsedStart = combinedRange.start
                    parsedEnd = combinedRange.end
                }

                if (!parsedStart || !parsedEnd) return

                const metadataShift = findMetadataShift(
                    workbookMetadata.shiftsByUserDate,
                    user.id,
                    dateStr,
                    parsedStart,
                    parsedEnd
                )

                let departmentId = metadataShift?.departmentId || user.skills[0]?.department_id || departments[0]?.id
                for (const candidateCell of [startCell, endCell]) {
                    const fill = candidateCell.fill as ExcelJS.FillPattern
                    if (fill?.type === 'pattern' && fill.fgColor?.argb) {
                        const mappedId = colorMap.get(normalizeColor(fill.fgColor.argb))
                        if (mappedId) {
                            departmentId = mappedId
                            break
                        }
                    }
                }

                if (!departmentId) return

                const key = `${user.id}|${dateStr}`
                scannedShifts.push({
                    userId: user.id,
                    date: dateStr,
                    startTime: parsedStart,
                    endTime: parsedEnd,
                    departmentId,
                    isSmod: smodFlags.has(key) || metadataShift?.isSmod || false
                })
            })
        })

        scannedShifts.forEach((shift) => {
            const userLeave = leaves.filter((leave) => leave.userId === shift.userId)
            const isConflict = userLeave.some((leave) => shift.date >= leave.startDate && shift.date <= leave.endDate)

            if (isConflict) {
                const user = usersById.get(shift.userId)
                conflicts.push({
                    type: 'LEAVE_CONFLICT',
                    description: `User ${user?.name} is on leave on ${shift.date}`,
                    date: shift.date,
                    userId: shift.userId
                })
            }
        })

        const importedDates = Array.from(new Set(scannedShifts.map((shift) => shift.date)))

        importedDates.forEach((dateStr) => {
            const date = parseISO(dateStr)
            const dow = getDay(date)
            const dayRules = rules.filter((rule) => rule.day_of_week === dow)

            dayRules.forEach((rule) => {
                const matchingShiftsForRule = scannedShifts.filter((shift) =>
                    shift.date === dateStr &&
                    shift.departmentId === rule.department_id &&
                    shift.startTime === rule.start_time &&
                    shift.endTime === rule.end_time &&
                    (!rule.is_smod || shift.isSmod)
                )

                if (matchingShiftsForRule.length < rule.count) {
                    const department = departments.find((candidate) => candidate.id === rule.department_id)
                    conflicts.push({
                        type: 'RULE_VIOLATION',
                        description: `Understaffed: ${department?.name} needs ${rule.count} @ ${rule.start_time}-${rule.end_time} on ${dateStr}. Found ${matchingShiftsForRule.length}.`,
                        date: dateStr
                    })
                }
            })
        })

        return {
            success: true,
            message: 'Import processed successfully',
            detectedMonth: monthStr,
            coveredDates: Array.from(coveredDates).sort(),
            shiftsToCreate: scannedShifts,
            conflicts,
            stats: {
                totalShiftsFound: scannedShifts.length,
                usersFound: foundUserIds.size
            }
        }
    } catch (error: unknown) {
        console.error('Import Error:', error)
        const message = error instanceof Error ? error.message : 'Unknown import error'
        return emptyReport(`Error processing file: ${message}`)
    }
}

export async function resolveRosterImportColours(
    report: ImportReport,
    mappings: ColourMappingInput[],
    persist = true
): Promise<ImportReport> {
    await requireAdmin()

    if (!report.records || report.records.length === 0) {
        return report
    }

    const normalizedMappings = mappings
        .map((mapping) => ({
            sourceColor: normaliseColour(mapping.sourceColor),
            departmentId: Number(mapping.departmentId)
        }))
        .filter((mapping) => mapping.sourceColor && mapping.sourceColor !== 'NO_FILL' && Number.isFinite(mapping.departmentId))

    if (normalizedMappings.length === 0) {
        return report
    }

    const departments = await prisma.department.findMany()
    const validDepartmentIds = new Set(departments.map((department) => department.id))
    const invalidMapping = normalizedMappings.find((mapping) => !validDepartmentIds.has(mapping.departmentId))
    if (invalidMapping) {
        throw new Error(`Invalid department selected for ${invalidMapping.sourceColor}`)
    }

    if (persist) {
        await prisma.$transaction(
            normalizedMappings.map((mapping) => {
                const department = departments.find((candidate) => candidate.id === mapping.departmentId)
                return prisma.rosterImportColourMapping.upsert({
                    where: { sourceColor: mapping.sourceColor },
                    update: {
                        departmentId: mapping.departmentId,
                        label: department?.name || null
                    },
                    create: {
                        sourceColor: mapping.sourceColor,
                        departmentId: mapping.departmentId,
                        label: department?.name || null
                    }
                })
            })
        )
    }

    const persistedMappings = persist
        ? await prisma.rosterImportColourMapping.findMany({ include: { department: true } })
        : []
    const transientMappings: SavedColourMapping[] = persist
        ? []
        : normalizedMappings
            .flatMap((mapping) => {
                const department = departments.find((candidate) => candidate.id === mapping.departmentId)
                if (!department) return []
                return [{
                    sourceColor: mapping.sourceColor,
                    departmentId: mapping.departmentId,
                    label: department.name,
                    department
                }]
            })
    const savedMappings: SavedColourMapping[] = [...persistedMappings, ...transientMappings]

    const users = await prisma.user.findMany({
        include: { skills: true }
    })
    const month = report.detectedMonth || report.coveredDates[0]?.slice(0, 7) || ''
    const { start: monthStart } = month ? getMonthRosterRange(month) : { start: new Date() }
    const leaves = await prisma.leave.findMany({
        where: {
            status: 'APPROVED',
            OR: [
                { startDate: { gte: format(monthStart, 'yyyy-MM-dd') } },
                { endDate: { gte: format(monthStart, 'yyyy-MM-dd') } }
            ]
        }
    })
    const rules = await prisma.automationRule.findMany()

    const resolvedRecords = applyColourMappingsToRecords(report.records, savedMappings)
    const resolvedWarnings = resolveWarningsForMappings(report.warnings, savedMappings)
    const { scannedShifts, foundUserIds } = buildHumanScannedShifts({
        records: resolvedRecords,
        users,
        departments,
        savedMappings
    })
    const conflicts = buildShiftConflicts({
        scannedShifts,
        users,
        leaves,
        rules,
        departments
    })

    return {
        ...report,
        message: persist ? 'Colour mappings saved and import recalculated.' : 'Colour mappings applied to this import.',
        records: resolvedRecords,
        categories: Array.from(new Set(resolvedRecords.map((record) => record.category))).sort(),
        warnings: resolvedWarnings,
        shiftsToCreate: scannedShifts,
        conflicts,
        stats: {
            totalShiftsFound: scannedShifts.length,
            usersFound: foundUserIds.size
        },
        departmentOptions: getDepartmentOptions(departments),
        colourResolutions: buildColourResolutions({
            records: resolvedRecords,
            departments,
            savedMappings
        })
    }
}

export async function confirmRosterImport(
    shifts: ScannedShift[],
    month: string,
    coveredDates: string[] = []
) {
    await requireAdmin()

    if ((!shifts || shifts.length === 0) && coveredDates.length === 0) return

    const uniqueCoveredDates = Array.from(new Set(coveredDates)).sort()
    const coveredDateSet = new Set(uniqueCoveredDates)

    let validShifts = shifts
    let deleteWhere: { date: { in: string[] } | { gte: string, lte: string } }
    let affectedMonths: string[]

    if (uniqueCoveredDates.length > 0) {
        validShifts = shifts.filter((shift) => coveredDateSet.has(shift.date))
        deleteWhere = {
            date: {
                in: uniqueCoveredDates
            }
        }
        affectedMonths = Array.from(new Set(uniqueCoveredDates.map((date) => date.slice(0, 7))))
    } else {
        const { start, end } = getMonthRosterRange(month)
        const startStr = format(start, 'yyyy-MM-dd')
        const endStr = format(end, 'yyyy-MM-dd')

        validShifts = shifts.filter((shift) => shift.date >= startStr && shift.date <= endStr)
        deleteWhere = {
            date: {
                gte: startStr,
                lte: endStr
            }
        }
        affectedMonths = Array.from(new Set([startStr.slice(0, 7), endStr.slice(0, 7), month]))
    }

    await prisma.$transaction(async (tx) => {
        await tx.shift.deleteMany({
            where: deleteWhere
        })

        if (validShifts.length > 0) {
            await tx.shift.createMany({
                data: validShifts.map((shift) => ({
                    user_id: shift.userId,
                    department_id: shift.departmentId,
                    date: shift.date,
                    start_time: shift.startTime,
                    end_time: shift.endTime,
                    is_smod: shift.isSmod
                }))
            })
        }
    })

    revalidatePath('/admin/roster')
    affectedMonths.forEach((affectedMonth) => {
        revalidateTag(getValidationMonthTag(affectedMonth), 'max')
    })
}
