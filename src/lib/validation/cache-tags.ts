import { addMonths, format, parseISO, startOfMonth } from 'date-fns'

export const VALIDATION_RULES_TAG = 'validation-rules'

export function getValidationMonthTag(month: string) {
    return `validation-month-${month}`
}

export function getValidationMonthsForRange(startDate: string, endDate: string) {
    const months: string[] = []
    let current = startOfMonth(parseISO(startDate))
    const end = startOfMonth(parseISO(endDate))

    while (current <= end) {
        months.push(format(current, 'yyyy-MM'))
        current = addMonths(current, 1)
    }

    return months
}
