
import { ConstraintConfig, ShiftData, Violation, ConstraintParams } from './types'
import { maxDaysInWindow } from './rules/maxDaysInWindow'

const rules = {
    'MAX_CONSECUTIVE_DAYS': maxDaysInWindow,
    'MAX_DAYS_WINDOW': maxDaysInWindow // Mapping both for flexibility
    // Add other rules here
}

export function validateRoster(
    shifts: ShiftData[],
    constraints: ConstraintConfig[],
    targetMonth?: string
): Violation[] {
    let allViolations: Violation[] = []

    for (const constraint of constraints) {
        if (!constraint.isActive) continue

        const handler = rules[constraint.type as keyof typeof rules]
        if (handler) {
            // Filter shifts if constraint is scoped to department
            const relevantShifts = constraint.department_id
                ? shifts.filter(s => s.department_id === constraint.department_id)
                : shifts

            const result = handler.evaluate(relevantShifts, constraint, targetMonth)
            allViolations = [...allViolations, ...result]
        }
    }

    return allViolations
}
