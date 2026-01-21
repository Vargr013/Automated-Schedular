'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, startOfWeek, endOfWeek, addDays, subDays, isSameMonth } from 'date-fns'
import { getMonthRosterRange } from '@/lib/date-utils'
import { User, Shift, UserSkill, Department, Prisma } from '@prisma/client'

type EligibleStaffUser = Prisma.UserGetPayload<{
    include: {
        skills: { include: { department: true } }
        leave: true
        shifts: true
    }
}>

// --- Leave Actions ---

export async function addLeave(data: { userId: number, startDate: string, endDate: string, reason?: string }) {
    // 1. Delete conflicting shifts
    await prisma.shift.deleteMany({
        where: {
            user_id: data.userId,
            date: {
                gte: data.startDate,
                lte: data.endDate
            }
        }
    })

    // 2. Create Leave
    await prisma.leave.create({
        data: {
            userId: data.userId,
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason
        }
    })
    revalidatePath('/admin/schedule')
    revalidatePath('/admin/roster')
}

export async function deleteLeave(id: number) {
    await prisma.leave.delete({
        where: { id }
    })
    revalidatePath('/admin/schedule')
    revalidatePath('/admin/roster')
}

export async function getLeavesForMonth(month: string) {
    const startDate = `${month}-01`
    const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd')

    return await prisma.leave.findMany({
        where: {
            OR: [
                { startDate: { gte: startDate, lte: endDate } },
                { endDate: { gte: startDate, lte: endDate } },
                { startDate: { lte: startDate }, endDate: { gte: endDate } } // Spanning entire month
            ]
        },
        include: {
            user: { select: { name: true } }
        }
    })
}


// --- Auto Scheduler Logic ---

type SchedulerParams = {
    month: string // "YYYY-MM"
}

function calculateShiftHours(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const startDate = new Date(0, 0, 0, startH, startM)
    const endDate = new Date(0, 0, 0, endH, endM)
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    return diff > 0 ? diff : diff + 24 // Handle overnight if needed
}

// --- Clear Schedule ---

export async function clearSchedule(month: string) {
    // month format: YYYY-MM
    const { startDate, endDate } = getMonthRosterRange(month)
    const startStr = startDate
    const endStr = endDate

    // Delete all shifts in this range
    await prisma.shift.deleteMany({
        where: {
            date: {
                gte: startStr,
                lte: endStr
            }
        }
    })

    revalidatePath('/admin/roster')
}

export async function generateSchedule({ month }: SchedulerParams) {
    const { startDate, endDate, start, end } = getMonthRosterRange(month)
    const monthStart = start
    const monthEnd = end
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Fetch Full Weeks Range for accurate weekly hours
    const queryStart = startDate
    const queryEnd = endDate

    // 1. Fetch Users (Eligible Staff)
    // We treat "partTimeStaff" as all eligible staff (including Full-Time who have auto_schedule on)
    const eligibleStaff: EligibleStaffUser[] = await prisma.user.findMany({
        where: {
            auto_schedule: true
        },
        include: {
            skills: { include: { department: true } },
            leave: {
                where: {
                    status: 'APPROVED',
                    OR: [
                        { startDate: { gte: queryStart, lte: queryEnd } },
                        { endDate: { gte: queryStart, lte: queryEnd } },
                        { startDate: { lte: queryStart }, endDate: { gte: queryEnd } }
                    ]
                }
            },
            shifts: {
                where: {
                    date: { gte: queryStart, lte: queryEnd }
                }
            }
        }
    })

    // 2. Fetch ALL Existing Shifts (For SMOD Protection & Blocking)
    const allExistingShifts = await prisma.shift.findMany({
        where: {
            date: {
                gte: format(monthStart, 'yyyy-MM-dd'),
                lte: format(monthEnd, 'yyyy-MM-dd')
            }
        },
        include: { user: true }
    })

    // Fetch Departments
    const departments = await prisma.department.findMany()
    const getDeptId = (name: string) => departments.find(d => d.name === name)?.id
    const SHOP_ID = getDeptId('Gear Shop')
    const SMOD_ID = getDeptId('Shift Manager (SMOD)')
    const CAFE_ID = getDeptId('Cafe')
    const FD_ID = getDeptId('Front Desk')
    if (!SHOP_ID || !SMOD_ID || !CAFE_ID || !FD_ID) throw new Error('Required departments not found')

    // Fetch ALL Rules for the month (optimization)
    const allRules = await prisma.automationRule.findMany()

    type ShiftInput = {
        user_id: number
        department_id: number
        date: string
        start_time: string
        end_time: string
        is_smod: boolean
    }

    const newShifts: ShiftInput[] = []
    const blockedDates = new Map<number, Set<string>>() // UserId -> Set<YYYY-MM-DD>

    // Weekend Tracker: userId -> Set of weekIndices (format: "YYYY-Www")
    // Initialize with existing
    const userWeekendsWorked: Record<number, Set<string>> = {}
    eligibleStaff.forEach((user) => {
        userWeekendsWorked[user.id] = new Set()
        if (user.shifts) {
            user.shifts.forEach((shift) => {
                const date = parseISO(shift.date)
                const dayIndex = getDay(date)
                if (dayIndex === 0 || dayIndex === 6) { // Sat or Sun
                    const weekStr = format(date, 'yyyy-Iw')
                    userWeekendsWorked[user.id].add(weekStr)
                }
            })
        }
    })

    // Helper: Sort function (Fisher-Yates)
    function shuffle<T>(array: T[]): T[] {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    // Helper: Check availability
    const isAvailable = (user: EligibleStaffUser, date: Date, shiftHours: number) => {
        const dateStr = format(date, 'yyyy-MM-dd')

        // Check Leave
        if (user.leave) {
            const onLeave = user.leave.some((l) => l.startDate <= dateStr && l.endDate >= dateStr)
            if (onLeave) return false
        }

        // Check Existing Manual Shifts
        const hasShift = (user.shifts && user.shifts.some((s) => s.date === dateStr))
        if (hasShift) return false

        // Check New Shifts (Already assigned in this run)
        const hasNewShift = newShifts.some(s => s.user_id === user.id && s.date === dateStr)
        if (hasNewShift) return false

        return true
    }

    // Helper: Convert time string to minutes
    const getMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number)
        return h * 60 + m
    }

    // Helper: Check if shift matches rule with tolerance
    const isTimeMatch = (ruleStart: string, ruleEnd: string, shiftStart: string, shiftEnd: string, tolerance: number) => {
        const rStart = getMinutes(ruleStart)
        const rEnd = getMinutes(ruleEnd)
        const sStart = getMinutes(shiftStart)
        const sEnd = getMinutes(shiftEnd)

        // If tolerance is 0, strict match (within reasonable epsilon? No, exact minutes)
        // Check Start
        if (Math.abs(sStart - rStart) > tolerance) return false
        // Check End
        if (Math.abs(sEnd - rEnd) > tolerance) return false

        return true
    }

    // --- HELPER: Process Single Day ---
    const processDay = (day: Date, isPhase1Weekend: boolean) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayOfWeek = getDay(day) // 0=Sun, 1=Mon...

        // Pre-calc who worked yesterday (optimization)
        const yesterdayStr = format(addDays(day, -1), 'yyyy-MM-dd')
        const workedYesterdayIds = new Set<number>()
        newShifts.filter(s => s.date === yesterdayStr).forEach(s => workedYesterdayIds.add(s.user_id))
        allExistingShifts.filter(s => s.date === yesterdayStr).forEach(s => workedYesterdayIds.add(s.user_id))

        // Blockers: Check if any slots are blocked manually or by logic
        const existingSmodShift = allExistingShifts.find((s) => s.date === dateStr && s.department_id === SMOD_ID)
        const isSmodFilled = !!existingSmodShift

        // Get Rules
        const dailyRules = allRules.filter(r => r.day_of_week === dayOfWeek)
        if (dailyRules.length === 0) return

        // Define Slots
        const slotsNeeded: { deptId: number, count: number, start: string, end: string, isSmod?: boolean, requiredType?: string, tolerance: number }[] = []

        for (const rule of dailyRules) {
            if (rule.is_smod && isSmodFilled) continue
            slotsNeeded.push({
                deptId: rule.department_id,
                count: rule.count,
                start: rule.start_time,
                end: rule.end_time,
                isSmod: rule.is_smod,
                requiredType: rule.required_type || undefined,
                tolerance: rule.tolerance
            })
        }

        // Sort: SMOD first
        slotsNeeded.sort((a, b) => (a.isSmod ? -1 : 1))

        const assignedUserIdsToday = new Set<number>()

        // Reduce Slots based on Existing Shifts
        const dailyExistingShifts = allExistingShifts.filter((s) => s.date === dateStr)
        const claimedShiftIds = new Set<number>()

        for (const slot of slotsNeeded) {
            // Count Existing Matches
            const matchingExisting = dailyExistingShifts.filter((s: any) =>
                s.department_id === slot.deptId &&
                !claimedShiftIds.has(s.id) &&
                isTimeMatch(slot.start, slot.end, s.start_time, s.end_time, slot.tolerance) &&
                (slot.requiredType ? s.user.type === slot.requiredType : true)
            )

            let matchesFound = 0
            for (const match of matchingExisting) {
                if (matchesFound < slot.count) {
                    claimedShiftIds.add(match.id)
                    matchesFound++
                }
            }

            // Count New Shifts Matches
            const matchingNew = newShifts.filter(s =>
                s.date === dateStr &&
                s.department_id === slot.deptId &&
                isTimeMatch(slot.start, slot.end, s.start_time, s.end_time, slot.tolerance)
            )
            matchesFound += matchingNew.length
            matchingNew.forEach(s => assignedUserIdsToday.add(s.user_id))

            const actualNeeded = slot.count - matchesFound
            if (actualNeeded <= 0) continue

            const shiftHours = calculateShiftHours(slot.start, slot.end)

            for (let i = 0; i < actualNeeded; i++) {
                // Find Candidates
                let candidates = eligibleStaff.filter((user) => {
                    if (assignedUserIdsToday.has(user.id)) return false

                    // CHECK BLOCK LIST (Fri/Mon rule)
                    if (blockedDates.has(user.id) && blockedDates.get(user.id)?.has(dateStr)) {
                        return false
                    }

                    if (slot.requiredType && user.type !== slot.requiredType) return false
                    if (!isAvailable(user, day, shiftHours)) return false

                    // Skill Check
                    const hasSkill = user.skills.some((s) => s.department.id === slot.deptId)
                    if (!hasSkill) return false

                    return true
                })

                if (candidates.length === 0) continue

                // Shuffle & Sort
                candidates = shuffle(candidates)

                candidates.sort((a, b) => {
                    // 1. Weekend Continuity (Sunday Priority - PACKAGE DEAL)
                    // If scheduling Sunday, prefer those who worked Saturday regardless of other scores
                    if (dayOfWeek === 0) {
                        const aWorked = workedYesterdayIds.has(a.id)
                        const bWorked = workedYesterdayIds.has(b.id)

                        // Strict Preference: Worked > Not Worked
                        if (aWorked && !bWorked) return -1
                        if (!aWorked && bWorked) return 1
                    }

                    // 2. Priority Score (SMOD / FD Tiers)
                    const getPriorityScore = (user: EligibleStaffUser, deptId: number) => {
                        // Check if user is effectively a SMOD (Category or Skill)
                        // Note: We use the SMOD_ID from the outer scope
                        const isSmod = user.category === 'Shift Manager' || user.skills.some((s) => s.department.id === SMOD_ID)
                        const skillCount = user.skills.length

                        // --- SHIFT MOD SHIFTS ---
                        if (deptId === SMOD_ID) {
                            if (isSmod) return 100
                            return 0
                        }

                        // --- FRONT DESK SHIFTS ---
                        if (deptId === FD_ID) {
                            const hasFdSkill = user.skills.some((s) => s.department.id === FD_ID)

                            // Safety: Should be filtered already, but safe to check
                            if (!hasFdSkill) return -1

                            // Priority 3: SMODs (Last Resort)
                            if (isSmod) return 10

                            // Priority 1: Dedicated FD (Only 1 Skill)
                            if (skillCount === 1) return 50

                            // Priority 2: General FD (FD + Other Skills, but not SMOD)
                            return 30
                        }

                        // --- CAFE SHIFTS ---
                        if (deptId === CAFE_ID) {
                            const hasCafeSkill = user.skills.some((s) => s.department.id === CAFE_ID)
                            if (!hasCafeSkill) return -1

                            if (isSmod) return 10
                            if (skillCount === 1) return 50 // Dedicated Cafe
                            return 30 // General Cafe
                        }

                        // --- GEAR SHOP SHIFTS ---
                        if (deptId === SHOP_ID) {
                            const hasShopSkill = user.skills.some((s) => s.department.id === SHOP_ID)
                            if (!hasShopSkill) return -1

                            if (isSmod) return 10
                            if (skillCount === 1) return 50 // Dedicated Shop
                            return 30 // General Shop
                        }

                        return 0
                    }

                    const scoreA = getPriorityScore(a, slot.deptId)
                    const scoreB = getPriorityScore(b, slot.deptId)

                    if (scoreA !== scoreB) {
                        return scoreB - scoreA // Descending Sort (Higher score first)
                    }

                    // 3. Weekend Fairness (Max 2 Weekends Rule)
                    // Prefer: Count < 2
                    // Then: Count Ascending (0 better than 1)
                    if (dayOfWeek === 0 || dayOfWeek === 6) { // Only applies when scheduling weekends
                        const aCount = userWeekendsWorked[a.id]?.size || 0
                        const bCount = userWeekendsWorked[b.id]?.size || 0

                        const aSafe = aCount < 2
                        const bSafe = bCount < 2

                        if (aSafe && !bSafe) return -1
                        if (!aSafe && bSafe) return 1

                        // If both are safe (or both unsafe), prefer lower count
                        if (aCount !== bCount) return aCount - bCount

                        // 4. Consecutive Weekend Avoidance
                        // Did they work the previous weekend?
                        const prevWeekDate = subDays(day, 7)
                        const prevWeekStr = format(prevWeekDate, 'yyyy-Iw')

                        const aConsec = userWeekendsWorked[a.id]?.has(prevWeekStr)
                        const bConsec = userWeekendsWorked[b.id]?.has(prevWeekStr)

                        if (aConsec && !bConsec) return 1 // a worked last weekend (bad)
                        if (!aConsec && bConsec) return -1 // b worked last weekend (bad)
                    }

                    return 0
                })

                const candidate = candidates[0]
                if (candidate) {
                    newShifts.push({
                        user_id: candidate.id,
                        department_id: slot.deptId,
                        date: dateStr,
                        start_time: slot.start,
                        end_time: slot.end,
                        is_smod: slot.isSmod || false
                    })
                    assignedUserIdsToday.add(candidate.id)

                    // Track Weekend
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        const weekStr = format(day, 'yyyy-Iw')
                        userWeekendsWorked[candidate.id].add(weekStr)
                    }

                    // NOTE: Removed "Look ahead book Sunday" logic from inside the loop
                    // because we are now running Phase 1 which explicitly calls processDay(Sun) right after.
                    // The "Weekend Continuity" sort above handles picking the same person.
                }
            }
        }
    }

    // --- PHASE 1: WEEKENDS FIRST ---

    // Identify Saturdays in the month
    const saturdays = daysInMonth.filter(d => getDay(d) === 6)

    for (const sat of saturdays) {
        // 1. Schedule Saturday
        processDay(sat, true)

        // 2. Schedule Sunday (only if in month)
        const sun = addDays(sat, 1)
        if (daysInMonth.find(d => isSameDay(d, sun))) {
            processDay(sun, true)
        }

        // 3. APPLY BLOCKING RULE (Sat + Sun = Block Fri & Mon)
        // Check new shifts for this weekend + existing shifts
        const satStr = format(sat, 'yyyy-MM-dd')
        const sunStr = format(sun, 'yyyy-MM-dd')

        // Get Set of users working Sat
        const workersSat = new Set([
            ...newShifts.filter(s => s.date === satStr).map(s => s.user_id),
            ...allExistingShifts.filter((s) => s.date === satStr).map((s) => s.user_id)
        ])

        // Get Set of users working Sun
        const workersSun = new Set([
            ...newShifts.filter(s => s.date === sunStr).map(s => s.user_id),
            ...allExistingShifts.filter((s) => s.date === sunStr).map((s) => s.user_id)
        ])

        // Intersect
        const fullWeekendWorkers = Array.from(workersSat).filter(id => workersSun.has(id))

        // Block adjacent days
        const friStr = format(addDays(sat, -1), 'yyyy-MM-dd')
        const monStr = format(addDays(sun, 1), 'yyyy-MM-dd')

        for (const uid of fullWeekendWorkers) {
            const user = eligibleStaff.find(u => u.id === uid)
            // Rule applies to FULL_TIME only -- AS REQUESTED
            if (user && user.type === 'FULL_TIME') {
                if (!blockedDates.has(uid)) blockedDates.set(uid, new Set())
                blockedDates.get(uid)!.add(friStr)
                blockedDates.get(uid)!.add(monStr)
            }
        }
    }

    // --- PHASE 2: WEEKDAYS ---

    for (const day of daysInMonth) {
        const dow = getDay(day)

        // Skip Weekends (already done)
        if (dow === 0 || dow === 6) continue

        processDay(day, false)
    }

    // Save to DB
    if (newShifts.length > 0) {
        await prisma.shift.createMany({
            data: newShifts
        })
    }

    revalidatePath('/admin/roster')
}
