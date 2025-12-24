import { format, getDay, parseISO } from 'date-fns'

export const SOUTH_AFRICAN_HOLIDAYS = [
    // 2024
    '2024-01-01', '2024-03-21', '2024-03-29', '2024-04-01', '2024-04-27',
    '2024-05-01', '2024-06-16', '2024-06-17', '2024-08-09', '2024-09-24',
    '2024-12-16', '2024-12-25', '2024-12-26',
    // 2025
    '2025-01-01', // New Year
    '2025-03-21', // Human Rights Day
    '2025-04-18', // Good Friday
    '2025-04-21', // Family Day
    '2025-04-27', // Freedom Day
    '2025-04-28', // Freedom Day observed
    '2025-05-01', // Workers Day
    '2025-06-16', // Youth Day
    '2025-08-09', // Women's Day
    '2025-09-24', // Heritage Day
    '2025-12-16', // Reconciliation Day
    '2025-12-25', // Christmas
    '2025-12-26', // Goodwill Day
    // 2026
    '2026-01-01', // New Year
    '2026-03-21', // Human Rights Day
    '2026-04-03', // Good Friday
    '2026-04-06', // Family Day
    '2026-04-27', // Freedom Day
    '2026-05-01', // Workers Day
    '2026-06-16', // Youth Day
    '2026-08-09', // Women's Day
    '2026-08-10', // Women's Day observed (falls on Sunday)
    '2026-09-24', // Heritage Day
    '2026-12-16', // Reconciliation Day
    '2026-12-25', // Christmas
    '2026-12-26', // Day of Goodwill
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
