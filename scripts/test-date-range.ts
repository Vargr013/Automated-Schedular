
import { getMonthRosterRange } from '../src/lib/date-utils' // Adjust path if needed, but ts-node might struggle with aliases.
// We will mock it or copy it for the test to avoid alias issues if not configured.

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parseISO } from 'date-fns'

function getRange(month: string) {
    const date = parseISO(`${month}-01`)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const start = startOfWeek(monthStart, { weekStartsOn: 1 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 })

    console.log(`Month: ${month}`)
    console.log(`Start of Month: ${format(monthStart, 'yyyy-MM-dd')}`)
    console.log(`End of Month:   ${format(monthEnd, 'yyyy-MM-dd')}`)
    console.log(`Full Start:     ${format(start, 'yyyy-MM-dd')}`)
    console.log(`Full End:       ${format(end, 'yyyy-MM-dd')}`)
}

getRange('2025-05') // Starts Thu
getRange('2025-12') // Starts Mon (test case)
