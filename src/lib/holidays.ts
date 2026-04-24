import { addDays, format, getDay, parseISO } from 'date-fns'

export type PublicHoliday = {
    date: string
    name: string
}

function toDateString(year: number, month: number, day: number): string {
    return format(new Date(year, month - 1, day), 'yyyy-MM-dd')
}

function getEasterSunday(year: number): Date {
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const month = Math.floor((h + l - 7 * m + 114) / 31)
    const day = ((h + l - 7 * m + 114) % 31) + 1

    return new Date(year, month - 1, day)
}

export function getSouthAfricanPublicHolidays(year: number): PublicHoliday[] {
    const easterSunday = getEasterSunday(year)
    const holidays: PublicHoliday[] = [
        { date: toDateString(year, 1, 1), name: "New Year's Day" },
        { date: toDateString(year, 3, 21), name: 'Human Rights Day' },
        { date: format(addDays(easterSunday, -2), 'yyyy-MM-dd'), name: 'Good Friday' },
        { date: format(addDays(easterSunday, 1), 'yyyy-MM-dd'), name: 'Family Day' },
        { date: toDateString(year, 4, 27), name: 'Freedom Day' },
        { date: toDateString(year, 5, 1), name: "Workers' Day" },
        { date: toDateString(year, 6, 16), name: 'Youth Day' },
        { date: toDateString(year, 8, 9), name: "National Women's Day" },
        { date: toDateString(year, 9, 24), name: 'Heritage Day' },
        { date: toDateString(year, 12, 16), name: 'Day of Reconciliation' },
        { date: toDateString(year, 12, 25), name: 'Christmas Day' },
        { date: toDateString(year, 12, 26), name: 'Day of Goodwill' },
    ]

    const observedHolidays = holidays
        .filter((holiday) => getDay(parseISO(holiday.date)) === 0)
        .map((holiday) => ({
            date: format(addDays(parseISO(holiday.date), 1), 'yyyy-MM-dd'),
            name: `Public Holiday (Monday after ${holiday.name})`,
        }))

    const holidaysByDate = new Map<string, PublicHoliday>()

    for (const holiday of [...holidays, ...observedHolidays]) {
        const existing = holidaysByDate.get(holiday.date)
        holidaysByDate.set(holiday.date, {
            date: holiday.date,
            name: existing ? `${existing.name} / ${holiday.name}` : holiday.name,
        })
    }

    return [...holidaysByDate.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
}

export const SOUTH_AFRICAN_HOLIDAYS = [
    ...getSouthAfricanPublicHolidays(2024).map((holiday) => holiday.date),
    ...getSouthAfricanPublicHolidays(2025).map((holiday) => holiday.date),
    ...getSouthAfricanPublicHolidays(2026).map((holiday) => holiday.date),
]

export function isPublicHoliday(dateStr: string): boolean {
    return SOUTH_AFRICAN_HOLIDAYS.includes(dateStr)
}

export function isSunday(dateStr: string): boolean {
    const date = parseISO(dateStr)
    return getDay(date) === 0
}

export function getMultiplier(dateStr: string): number {
    if (isPublicHoliday(dateStr)) return 2.0
    if (isSunday(dateStr)) return 1.5
    return 1.0
}
