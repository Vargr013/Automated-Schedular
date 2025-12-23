'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { User, Shift, UserSkill, Department } from '@prisma/client'

// --- Leave Actions ---

export async function addLeave(data: { userId: number, startDate: string, endDate: string, reason?: string }) {
    await (prisma as any).leave.create({
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
    await (prisma as any).leave.delete({
        where: { id }
    })
    revalidatePath('/admin/schedule')
    revalidatePath('/admin/roster')
}

export async function getLeavesForMonth(month: string) {
    const startDate = `${month}-01`
    const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd')

    return await (prisma as any).leave.findMany({
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
    const start = startOfMonth(parseISO(month + '-01'))
    const end = endOfMonth(start)
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')

    // Delete all shifts in this range
    await (prisma as any).shift.deleteMany({
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
    const monthDate = parseISO(`${month}-01`)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Fetch Full Weeks Range for accurate weekly hours
    const queryStart = format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const queryEnd = format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    // 1. Fetch Users (Part-Time & Auto-Schedule Enabled)
    // Cast where clause to any to avoid "auto_schedule does not exist" error
    const partTimeStaff = await prisma.user.findMany({
        where: {
            auto_schedule: true
        } as any,
        include: {
            skills: { include: { department: true } },
            leave: {
                where: {
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
        } as any // Cast include to any to avoid "leave does not exist" error
    })

    // 2. Fetch ALL Existing Shifts (For SMOD Protection)
    const allExistingShifts = await (prisma as any).shift.findMany({
        where: {
            date: {
                gte: format(monthStart, 'yyyy-MM-dd'),
                lte: format(monthEnd, 'yyyy-MM-dd')
            }
        },
        include: { user: true } // to check user type if needed, or just role
    })

    // Fetch Departments (for IDs)
    const departments = await prisma.department.findMany()
    const getDeptId = (name: string) => departments.find(d => d.name === name)?.id

    const SHOP_ID = getDeptId('Gear Shop')
    const SMOD_ID = getDeptId('Shift Manager (SMOD)')
    const CAFE_ID = getDeptId('Cafe')
    const FD_ID = getDeptId('Front Desk')

    if (!SHOP_ID || !SMOD_ID || !CAFE_ID || !FD_ID) {
        throw new Error('Required departments not found')
    }

    type ShiftInput = {
        user_id: number
        department_id: number
        date: string
        start_time: string
        end_time: string
        is_smod: boolean
    }

    const newShifts: ShiftInput[] = []

    // Weekend Tracker: userId -> Set of weekIndices (format: "YYYY-Www")
    const userWeekendsWorked: Record<number, Set<string>> = {}

    // Init with existing shifts
    partTimeStaff.forEach((user: any) => {
        userWeekendsWorked[user.id] = new Set()
        if (user.shifts) {
            user.shifts.forEach((shift: any) => {
                const date = parseISO(shift.date)
                const dayIndex = getDay(date)
                if (dayIndex === 0 || dayIndex === 6) { // Sat or Sun
                    const weekStr = format(date, 'yyyy-Iw')
                    userWeekendsWorked[user.id].add(weekStr)
                }
            })
        }
    })

    // Helper: Check availability
    const isAvailable = (user: any, date: Date, shiftHours: number) => {
        const dateStr = format(date, 'yyyy-MM-dd')

        // Check Leave (explicit any cast to avoid stale type errors)
        if (user.leave) {
            const onLeave = user.leave.some((l: any) => l.startDate <= dateStr && l.endDate >= dateStr)
            if (onLeave) return false
        }

        // Check Existing Manual Shifts for same day
        const hasShift = (user.shifts && user.shifts.some((s: any) => s.date === dateStr)) ||
            newShifts.some(s => s.user_id === user.id && s.date === dateStr)
        if (hasShift) return false

        return true
    }

    // Helper: Shuffle Array (Fisher-Yates)
    function shuffle<T>(array: T[]): T[] {
        let currentIndex = array.length, randomIndex;
        // While there remain elements to shuffle.
        while (currentIndex != 0) {
            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    // Loop Days
    for (const day of daysInMonth) {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayOfWeek = getDay(day) // 0=Sun, 1=Mon...

        // Detect Comp Day (Placeholder logic)
        // const isCompDay = checkCompDay(dateStr) 
        const isCompDay = false

        // SMOD Protection Check (Global Max 1)
        const existingSmodShift = allExistingShifts.find((s: any) => s.date === dateStr && s.department_id === SMOD_ID)
        const isSmodFilled = !!existingSmodShift

        // Define Slots Needed based on Rules
        // we use 'let' slotsNeeded so we can modify counts or push dynamically
        const slotsNeeded: { deptId: number, count: number, start: string, end: string, isSmod?: boolean }[] = []

        // Cafe Rule (Daily)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        slotsNeeded.push({
            deptId: CAFE_ID,
            count: 1,
            start: isWeekend ? '08:45' : '12:00',
            end: isWeekend ? '17:30' : '21:30'
        })

        if (isCompDay) {
            slotsNeeded.push({ deptId: SHOP_ID, count: 1, start: '09:00', end: '17:00' })
            if (!isSmodFilled) slotsNeeded.push({ deptId: SMOD_ID, count: 1, start: '08:30', end: '17:30', isSmod: true })
            slotsNeeded.push({ deptId: FD_ID, count: 5, start: '09:00', end: '17:00' })
        }
        else if (isWeekend) { // Sat + Sun
            slotsNeeded.push({ deptId: SHOP_ID, count: 1, start: '09:00', end: '17:00' })
            if (!isSmodFilled) slotsNeeded.push({ deptId: SMOD_ID, count: 1, start: '08:30', end: '17:30', isSmod: true })
            slotsNeeded.push({ deptId: FD_ID, count: 4, start: '09:00', end: '17:00' })
        }
        else if (dayOfWeek === 1 || dayOfWeek === 3) { // Mon + Wed
            slotsNeeded.push({ deptId: SHOP_ID, count: 1, start: '17:00', end: '22:00' })
            if (!isSmodFilled) slotsNeeded.push({ deptId: SMOD_ID, count: 1, start: '16:30', end: '22:30', isSmod: true })
            slotsNeeded.push({ deptId: FD_ID, count: 2, start: '17:00', end: '22:00' })
        }
        else if (dayOfWeek === 2 || dayOfWeek === 4) { // Tue + Thu
            slotsNeeded.push({ deptId: SHOP_ID, count: 1, start: '17:00', end: '22:00' })
            if (!isSmodFilled) slotsNeeded.push({ deptId: SMOD_ID, count: 1, start: '16:30', end: '22:30', isSmod: true })
            slotsNeeded.push({ deptId: FD_ID, count: 2, start: '17:00', end: '22:00' })
            slotsNeeded.push({ deptId: FD_ID, count: 1, start: '17:00', end: '21:00' })
        }
        else if (dayOfWeek === 5) { // Fri
            slotsNeeded.push({ deptId: FD_ID, count: 1, start: '12:00', end: '15:00' })
            slotsNeeded.push({ deptId: FD_ID, count: 1, start: '14:00', end: '18:00' })
        }

        // Fill Slots
        const assignedUserIdsToday = new Set<number>()

        // Sort slots: SMOD first, then others
        slotsNeeded.sort((a, b) => (a.isSmod ? -1 : 1))

        // Pre-calculate Saturday workers if today is Sunday
        const saturdayWorkers = new Set<number>()
        if (dayOfWeek === 0) { // Sunday
            // Look back 1 day
            const yesterday = new Date(day)
            yesterday.setDate(day.getDate() - 1)
            const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

            // Check newShifts for yesterday
            newShifts.forEach(s => {
                if (s.date === yesterdayStr) saturdayWorkers.add(s.user_id)
            })
            // Also check existing shifts? (User.shifts)
            partTimeStaff.forEach((u: any) => {
                if (u.shifts && u.shifts.some((s: any) => s.date === yesterdayStr)) {
                    saturdayWorkers.add(u.id)
                }
            })
        }

        // Reduce Slots based on Existing Shifts (Overlap Logic)
        const dailyExistingShifts = allExistingShifts.filter((s: any) => s.date === dateStr)
        const claimedShiftIds = new Set<number>()

        // Helper: Check Overlap
        const overlaps = (s1Start: string, s1End: string, s2Start: string, s2End: string) => {
            const s1S = parseInt(s1Start.replace(':', ''))
            const s1E = parseInt(s1End.replace(':', ''))
            const s2S = parseInt(s2Start.replace(':', ''))
            const s2E = parseInt(s2End.replace(':', ''))
            // Simple overlap check
            return Math.max(s1S, s2S) < Math.min(s1E, s2E)
        }

        for (const slot of slotsNeeded) {
            // Check existing shifts for this department
            // We need to fulfill 'slot.count'.
            // Matches if DeptID matches AND Overlaps AND not claimed.
            const matchingExisting = dailyExistingShifts.filter((s: any) =>
                s.department_id === slot.deptId &&
                !claimedShiftIds.has(s.id) &&
                overlaps(s.start_time, s.end_time, slot.start, slot.end)
            )

            // Reduce count by matches
            let matchesFound = 0
            for (const match of matchingExisting) {
                if (matchesFound < slot.count) {
                    claimedShiftIds.add(match.id)
                    matchesFound++
                } else {
                    break
                }
            }

            // Also check NEW shifts (e.g. from Saturday carry-over)
            const preBookedNewShifts = newShifts.filter(s =>
                s.date === dateStr &&
                s.department_id === slot.deptId &&
                overlaps(s.start_time, s.end_time, slot.start, slot.end)
            ).length

            // Decrement needed count
            const actualNeeded = slot.count - matchesFound - preBookedNewShifts

            if (actualNeeded <= 0) continue

            const shiftHours = calculateShiftHours(slot.start, slot.end)

            for (let i = 0; i < actualNeeded; i++) {
                // 1. Filter Valid Candidates
                let candidates = partTimeStaff.filter((user: any) => {
                    if (assignedUserIdsToday.has(user.id)) return false

                    // Check if already assigned via newShifts (e.g. strict carry over)
                    const alreadyAssignedNew = newShifts.some(s => s.date === dateStr && s.user_id === user.id)
                    if (alreadyAssignedNew) return false

                    if (!isAvailable(user, day, shiftHours)) return false

                    // Check Skill
                    const hasSkill = user.skills.some((s: any) => s.department.id === slot.deptId)
                    if (!hasSkill) return false

                    return true
                })

                if (candidates.length === 0) continue

                // 2. Randomize
                candidates = shuffle(candidates)

                // 3. Sort Candidates
                // Priority 1: Category Priority (Cafe -> Cafe, etc.)
                // Priority 2: Weekend Fairness (prefer < 2 weekends worked)
                // Priority 3: Weekend Continuity (if Sunday)

                const isCategoryPreferred = (user: any, deptId: number) => {
                    // Mapping: DeptName -> UserCategory
                    if (deptId === CAFE_ID && user.category === 'Cafe') return true
                    if (deptId === SHOP_ID && user.category === 'Shop') return true
                    if (deptId === FD_ID && user.category === 'Front Desk') return true
                    if (deptId === SMOD_ID && user.category === 'Shift Manager') return true
                    return false
                }

                candidates.sort((a, b) => {
                    // 1. Category Priority
                    const aPref = isCategoryPreferred(a, slot.deptId)
                    const bPref = isCategoryPreferred(b, slot.deptId)
                    if (aPref && !bPref) return -1
                    if (!aPref && bPref) return 1

                    // 2. Weekend Fairness (Soft Limit: 2 weekends)
                    // We only care about this if it IS a weekend shift we are scheduling
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        const aWeekends = userWeekendsWorked[a.id]?.size || 0
                        const bWeekends = userWeekendsWorked[b.id]?.size || 0

                        // Prefer those under limit (latency 2)
                        const aUnder = aWeekends < 2
                        const bUnder = bWeekends < 2

                        if (aUnder && !bUnder) return -1
                        if (!aUnder && bUnder) return 1

                        // If both under or both over, prefer FEWER weekends
                        if (aWeekends !== bWeekends) return aWeekends - bWeekends
                    }

                    // 3. Weekend Continuity (if Sunday)
                    if (dayOfWeek === 0) {
                        const aWorked = saturdayWorkers.has(a.id)
                        const bWorked = saturdayWorkers.has(b.id)
                        if (aWorked && !bWorked) return -1
                        if (!aWorked && bWorked) return 1
                    }

                    return 0
                })

                // 4. Pick Top
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

                    // Update Weekend Tracker
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        const weekStr = format(day, 'yyyy-Iw')
                        userWeekendsWorked[candidate.id].add(weekStr)
                    }

                    // SATURDAY LOOK-AHEAD: Automatically Schedule Sunday if possible
                    if (dayOfWeek === 6) {
                        const sunday = new Date(day)
                        sunday.setDate(day.getDate() + 1)
                        const sundayStr = format(sunday, 'yyyy-MM-dd')

                        // Check if they are available for SUNDAY (approx same hours)
                        if (isAvailable(candidate, sunday, shiftHours)) {
                            newShifts.push({
                                user_id: candidate.id,
                                department_id: slot.deptId,
                                date: sundayStr,
                                start_time: slot.start,
                                end_time: slot.end,
                                is_smod: slot.isSmod || false
                            })
                            // Update weekend tracker for Sunday too
                            const sundayWeekStr = format(sunday, 'yyyy-Iw')
                            userWeekendsWorked[candidate.id].add(sundayWeekStr)
                        }
                    }
                }
            }
        }
    }

    // Save to DB
    if (newShifts.length > 0) {
        await prisma.shift.createMany({
            data: newShifts
        })
    }

    revalidatePath('/admin/roster')
}
