import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parseISO, setDate, subMonths } from 'date-fns'

export function getMonthRosterRange(month: string) {
    const date = parseISO(`${month}-01`)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    // Start from the Monday of the week containing the 1st
    // If 1st is Sunday, startOfWeek(..., {weekStartsOn: 1}) will give previous Monday.
    const start = startOfWeek(monthStart, { weekStartsOn: 1 })

    // End on the Sunday of the week containing the last day
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        start,
        end
    }
}

export function getPayrollCycleRange(month: string) {
    const date = parseISO(`${month}-01`)
    const cycleStart = setDate(subMonths(date, 1), 21)
    const cycleEnd = setDate(date, 20)

    return {
        startDate: format(cycleStart, 'yyyy-MM-dd'),
        endDate: format(cycleEnd, 'yyyy-MM-dd'),
        start: cycleStart,
        end: cycleEnd
    }
}
