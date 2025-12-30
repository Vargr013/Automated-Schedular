
import { RuleEvaluator, ShiftData, ConstraintConfig, Violation, ConstraintParams } from '../types'
import { parseISO, differenceInCalendarDays, addDays, format, isWithinInterval, subDays } from 'date-fns'

export const maxDaysInWindow: RuleEvaluator = {
    type: 'MAX_CONSECUTIVE_DAYS', // Reusing this key or we can add a new one. Sticking to generic naming for now.
    // Actually, let's call it MAX_DAYS_WINDOW in the DB, but map it here.
    // User asked for "5 days in a 7 day cycle".

    evaluate: (shifts: ShiftData[], constraint: ConstraintConfig, targetMonth?: string) => {
        const params = typeof constraint.params === 'string' ? JSON.parse(constraint.params) : constraint.params
        const limit = params.limit || 5
        const windowSize = params.window || 7

        const violations: Violation[] = []

        // Group shifts by user
        const shiftsByUser: Record<number, ShiftData[]> = {}
        shifts.forEach(s => {
            if (!shiftsByUser[s.user_id]) shiftsByUser[s.user_id] = []
            shiftsByUser[s.user_id].push(s)
        })

        // Check per user
        for (const userId in shiftsByUser) {
            const userShifts = shiftsByUser[userId].sort((a, b) => a.date.localeCompare(b.date))

            // We need to check every distinct date a shift lands on
            // For optimized checking: iterate through all days in the range covered by shifts
            if (userShifts.length === 0) continue

            const uniqueDates = Array.from(new Set(userShifts.map(s => s.date))).sort()
            const firstDate = parseISO(uniqueDates[0])
            const lastDate = parseISO(uniqueDates[uniqueDates.length - 1])

            // Iterate through every candidate end-day of a window
            // If targetMonth is provided, we only care about violations occuring IN that month
            // but the window logic requires looking back.

            // Optimization: Just check windows ending on days where the user ACTUALLY works? 
            // - If I work days 1,2,3,4,5,6. 
            // - On day 6, window [0..6] (7 days) has 6 days of work. Violation.
            // - We flag the shift on day 6.

            for (const dateStr of uniqueDates) {
                // If targetMonth set, skip dates not in month (optional optimization for display)
                if (targetMonth && !dateStr.startsWith(targetMonth)) continue;

                const currentDay = parseISO(dateStr)
                const windowStart = subDays(currentDay, windowSize - 1)

                // Count worked days in [windowStart, currentDay]
                const workedDaysInWindow = uniqueDates.filter(d => {
                    const dDate = parseISO(d)
                    return dDate >= windowStart && dDate <= currentDay
                })

                if (workedDaysInWindow.length > limit) {
                    // Create violation for the shift(s) on the currentDay
                    const problemShifts = userShifts.filter(s => s.date === dateStr)

                    problemShifts.forEach(shift => {
                        violations.push({
                            shiftId: shift.id,
                            userId: shift.user_id,
                            date: dateStr,
                            message: `${constraint.name}: Worked ${workedDaysInWindow.length} days in last ${windowSize} days (Limit: ${limit})`,
                            severity: constraint.severity as 'WARNING' | 'CRITICAL',
                            constraintName: constraint.name
                        })
                    })
                }
            }
        }

        return violations
    }
}
