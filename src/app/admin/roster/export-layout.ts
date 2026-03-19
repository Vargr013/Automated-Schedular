import { addDays, eachDayOfInterval, endOfWeek, format, isSameMonth, parseISO } from 'date-fns'
import { getMonthRosterRange } from '@/lib/date-utils'
import { isPublicHoliday } from '@/lib/holidays'

export const CATEGORY_ORDER = ['Management', 'Shift Manager', 'Cafe', 'Shop', 'Front Desk'] as const
export const INTRO_DEPARTMENT_NAME = 'Intro Classes'
export const MOD_DEPARTMENT_NAME = 'Management (MOD)'
export const SMOD_DEPARTMENT_NAME = 'Shift Manager (SMOD)'
export const WEEK_COLUMN_COUNT = 15
export const DAY_COLUMN_START = 2
export const DAY_PAIR_WIDTH = 2
export const ROSTER_METADATA_SHEET = '__roster_meta'
export const ROSTER_EXPORT_VERSION = 'enhanced-roster-v1'
export const ROSTER_ROW_KIND_COLUMN = 17
export const ROSTER_ROW_USER_ID_COLUMN = 18
export const ROSTER_ROW_KIND_USER = 'USER_ROW'
export const ROSTER_ROW_KIND_DATE = 'DATE_ROW'
export const ROSTER_ROW_KIND_INTRO = 'INTRO_ROW'
export const ROSTER_ROW_KIND_MOD = 'MOD_ROW'
export const ROSTER_ROW_KIND_SMOD = 'SMOD_ROW'
export const ROSTER_ROW_KIND_FULL_TIME_HEADER = 'FULL_TIME_HEADER'
export const ROSTER_ROW_KIND_PART_TIME_HEADER = 'PART_TIME_HEADER'
export const ROSTER_META_INFO_HEADER_ROW = 1
export const ROSTER_META_SHIFT_HEADER_ROW = 6

export type ExportUser = {
    id: number
    name: string
    type: string
    category?: string
}

export type ExportShift = {
    id: number
    user_id: number
    department_id: number
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
    }
}

export type ExportLeave = {
    userId: number
    startDate: string
    endDate: string
}

export type WeekDayCell = {
    date: string
    startTime: string
    endTime: string
    departmentColor: string | null
    onLeave: boolean
    isHoliday: boolean
    isInMonth: boolean
}

export type WeekUserRow = {
    user: ExportUser
    dayCells: WeekDayCell[]
}

export type WeekSection = {
    label: string
    rows: WeekUserRow[]
}

export type WeekBlock = {
    days: Date[]
    weekLabel: string
    introNames: string[]
    modNames: string[]
    smodNames: string[]
    fullTimeSections: WeekSection[]
    partTimeSections: WeekSection[]
}

export type RosterExportModel = {
    monthDate: Date
    monthTitle: string
    weeks: WeekBlock[]
}

function sortShifts(a: ExportShift, b: ExportShift) {
    if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time)
    return a.end_time.localeCompare(b.end_time)
}

function normalizeCategory(category?: string) {
    return category || 'Front Desk'
}

function getSectionLabel(category: string) {
    if (category === 'Management') return MOD_DEPARTMENT_NAME
    if (category === 'Shift Manager') return SMOD_DEPARTMENT_NAME
    return category
}

function getPrimaryShift(shifts: ExportShift[]) {
    return [...shifts].sort(sortShifts)[0] ?? null
}

function getDayPairStartColumn(dayIndex: number) {
    return DAY_COLUMN_START + dayIndex * DAY_PAIR_WIDTH
}

export function getDayPairColumns(dayIndex: number) {
    const startColumn = getDayPairStartColumn(dayIndex)
    return {
        startColumn,
        endColumn: startColumn + 1
    }
}

export function getContrastTextColor(hex: string | null | undefined) {
    if (!hex) return '000000'
    const clean = hex.replace('#', '')
    if (clean.length !== 6) return '000000'

    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000

    return brightness > 140 ? '000000' : 'FFFFFF'
}

export function hexToRgb(hex: string) {
    const clean = hex.replace('#', '')
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16)
    }
}

export function buildRosterExportModel({
    users,
    shifts,
    leaves,
    currentMonth
}: {
    users: ExportUser[]
    shifts: ExportShift[]
    leaves: ExportLeave[]
    currentMonth: string
}): RosterExportModel {
    const monthDate = parseISO(`${currentMonth}-01`)
    const { start, end } = getMonthRosterRange(currentMonth)
    const weeks: WeekBlock[] = []

    const shiftsByDate = new Map<string, ExportShift[]>()
    const shiftsByUserDate = new Map<string, ExportShift[]>()

    for (const shift of shifts) {
        const byDate = shiftsByDate.get(shift.date)
        if (byDate) {
            byDate.push(shift)
        } else {
            shiftsByDate.set(shift.date, [shift])
        }

        const userDateKey = `${shift.user_id}|${shift.date}`
        const byUserDate = shiftsByUserDate.get(userDateKey)
        if (byUserDate) {
            byUserDate.push(shift)
        } else {
            shiftsByUserDate.set(userDateKey, [shift])
        }
    }

    const groupedUsers = {
        FULL_TIME: new Map<string, ExportUser[]>(),
        PART_TIME: new Map<string, ExportUser[]>()
    }

    for (const user of users) {
        const typeKey = user.type === 'FULL_TIME' ? 'FULL_TIME' : 'PART_TIME'
        const category = normalizeCategory(user.category)
        const target = groupedUsers[typeKey]
        const bucket = target.get(category)
        if (bucket) {
            bucket.push(user)
        } else {
            target.set(category, [user])
        }
    }

    for (const category of CATEGORY_ORDER) {
        groupedUsers.FULL_TIME.get(category)?.sort((a, b) => a.name.localeCompare(b.name))
        groupedUsers.PART_TIME.get(category)?.sort((a, b) => a.name.localeCompare(b.name))
    }

    let currentWeekStart = start
    while (currentWeekStart < end) {
        const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
        const days = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd })

        const buildUserRow = (user: ExportUser): WeekUserRow => ({
            user,
            dayCells: days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const shift = getPrimaryShift(shiftsByUserDate.get(`${user.id}|${dateStr}`) || [])
                const onLeave = leaves.some((leave) => leave.userId === user.id && leave.startDate <= dateStr && leave.endDate >= dateStr)

                return {
                    date: dateStr,
                    startTime: shift?.start_time || '',
                    endTime: shift?.end_time || '',
                    departmentColor: shift?.department.color_code || null,
                    onLeave,
                    isHoliday: isPublicHoliday(dateStr),
                    isInMonth: isSameMonth(day, monthDate)
                }
            })
        })

        const buildSections = (typeKey: 'FULL_TIME' | 'PART_TIME') =>
            CATEGORY_ORDER
                .map((category) => {
                    const rows = (groupedUsers[typeKey].get(category) || []).map(buildUserRow)
                    if (rows.length === 0) return null
                    return {
                        label: getSectionLabel(category),
                        rows
                    }
                })
                .filter((section): section is WeekSection => Boolean(section))

        const introNames = days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayShifts = shiftsByDate.get(dateStr) || []
            const names = Array.from(
                new Set(
                    dayShifts
                        .filter((shift) => shift.department.name === INTRO_DEPARTMENT_NAME)
                        .map((shift) => shift.user.name)
                )
            )
            return names.join(' / ')
        })

        const modNames = days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const names = Array.from(
                new Set(
                    (shiftsByDate.get(dateStr) || [])
                        .filter((shift) => shift.department.name === MOD_DEPARTMENT_NAME)
                        .map((shift) => shift.user.name)
                )
            )
            return names.join(' / ')
        })

        const smodNames = days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const names = Array.from(
                new Set(
                    (shiftsByDate.get(dateStr) || [])
                        .filter((shift) => shift.department.name === SMOD_DEPARTMENT_NAME || shift.is_smod)
                        .map((shift) => shift.user.name)
                )
            )
            return names.join(' / ')
        })

        weeks.push({
            days,
            weekLabel: `Week of ${format(days[0], 'd MMM')}`,
            introNames,
            modNames,
            smodNames,
            fullTimeSections: buildSections('FULL_TIME'),
            partTimeSections: buildSections('PART_TIME')
        })

        currentWeekStart = addDays(currentWeekStart, 7)
    }

    return {
        monthDate,
        monthTitle: format(monthDate, 'MMMM yyyy'),
        weeks
    }
}
