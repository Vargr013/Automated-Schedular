
export type ConstraintType = 'MAX_CONSECUTIVE_DAYS' | 'MAX_HOURS_ROLLING' | 'MIN_REST_PERIOD'

export interface ConstraintParams {
    limit?: number
    window?: number
    hours?: number
}

// Represents the DB Model, simplified for usage
export interface ConstraintConfig {
    id: number
    name: string
    type: string
    params: ConstraintParams | string // string if from DB, obj if parsed
    severity: string
    isActive: boolean
    department_id: number | null
}

export interface Violation {
    shiftId?: number
    userId: number
    date: string
    message: string
    severity: 'WARNING' | 'CRITICAL'
    constraintName: string
}

export interface ShiftData {
    id: number
    user_id: number
    date: string // YYYY-MM-DD
    start_time: string
    end_time: string
    department_id: number
}

export interface RuleEvaluator {
    type: ConstraintType
    evaluate: (
        shifts: ShiftData[],
        constraint: ConstraintConfig,
        targetMonth?: string
    ) => Violation[]
}
