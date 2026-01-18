'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// --- Types ---
export type AutomationRuleData = {
    id?: number
    department_id: number
    day_of_week: number
    start_time: string
    end_time: string
    count: number
    required_type?: string | null // "FULL_TIME", "PART_TIME"
    is_smod: boolean
    tolerance: number // Minutes
}

// --- CRUD ---

export async function getRules() {
    return await prisma.automationRule.findMany({
        include: {
            department: true
        },
        orderBy: [
            { day_of_week: 'asc' },
            { start_time: 'asc' }
        ]
    })
}

export async function createRule(data: AutomationRuleData) {
    await prisma.automationRule.create({
        data: {
            department_id: data.department_id,
            day_of_week: data.day_of_week,
            start_time: data.start_time,
            end_time: data.end_time,
            count: data.count,
            required_type: data.required_type || null,
            is_smod: data.is_smod,
            tolerance: data.tolerance
        }
    })
    revalidatePath('/admin/rules')
}

export async function updateRule(id: number, data: AutomationRuleData) {
    await prisma.automationRule.update({
        where: { id },
        data: {
            department_id: data.department_id,
            day_of_week: data.day_of_week,
            start_time: data.start_time,
            end_time: data.end_time,
            count: data.count,
            required_type: data.required_type || null,
            is_smod: data.is_smod,
            tolerance: data.tolerance
        }
    })
    revalidatePath('/admin/rules')
}

export async function deleteRule(id: number) {
    await prisma.automationRule.delete({
        where: { id }
    })
    revalidatePath('/admin/rules')
}

// --- Seed Logic ---
// Imports current hardcoded rules into DB
export async function seedRules() {
    const existing = await prisma.automationRule.count()
    if (existing > 0) return { success: false, message: 'Rules already exist' }

    const depts = await prisma.department.findMany()
    const getDeptId = (name: string) => depts.find(d => d.name === name)?.id

    // Using hardcoded IDs based on typical seed order, but should be safe with lookup
    const FD_ID = getDeptId('Front Desk')
    const SHOP_ID = getDeptId('Gear Shop')
    const CAFE_ID = getDeptId('Cafe')
    const SMOD_ID = getDeptId('Shift Manager (SMOD)')

    if (!FD_ID || !SHOP_ID || !CAFE_ID || !SMOD_ID) {
        return { success: false, message: 'Missing required departments' }
    }

    const rules: any[] = []

    // Helper to add rule
    const add = (day: number, deptId: number, start: string, end: string, count: number, type: string | null = null, smod: boolean = false) => {
        rules.push({ department_id: deptId, day_of_week: day, start_time: start, end_time: end, count, required_type: type, is_smod: smod })
    }

    // --- Define Rules (from scheduler.ts) ---

    // Weekdays (1=Mon to 5=Fri)
    for (let day = 1; day <= 5; day++) {
        const isFriday = day === 5
        const closeTime = isFriday ? '18:00' : '17:00' // FT Close (Day)

        // Full Time Slots
        add(day, FD_ID, '08:30', closeTime, 3, 'FULL_TIME')
        add(day, SHOP_ID, '08:45', closeTime, 1, 'FULL_TIME')
        add(day, CAFE_ID, '12:00', isFriday ? '18:00' : '21:30', 1, 'FULL_TIME')

        // Part Time Slots (Not on Fridays)
        if (!isFriday) {
            add(day, SMOD_ID, '16:30', '22:00', 1, 'PART_TIME', true)
            add(day, FD_ID, '16:00', '22:00', 2, 'PART_TIME')
            add(day, CAFE_ID, '13:30', '21:30', 1, 'PART_TIME')
            add(day, SHOP_ID, '16:45', '22:00', 1, 'PART_TIME')
        }
    }

    // Weekends (0=Sun, 6=Sat)
    [0, 6].forEach(day => {
        add(day, SMOD_ID, '08:30', '18:00', 1, null, true)
        add(day, FD_ID, '08:45', '18:00', 4, null)
        add(day, SHOP_ID, '08:45', '18:00', 1, null)
        add(day, CAFE_ID, '08:45', '17:30', 1, null)
    })

    await prisma.automationRule.createMany({ data: rules })
    revalidatePath('/admin/rules')
    return { success: true, message: `Imported ${rules.length} rules` }
}

// --- Base Rules (User Assignments) ---

export async function getBaseRules() {
    return await prisma.userBaseRule.findMany({
        include: {
            template: {
                include: {
                    department: true
                }
            }
        }
    })
}

export async function createBaseRule(formData: FormData) {
    const user_id = Number(formData.get('user_id'))
    const template_id = Number(formData.get('template_id'))
    const day_of_week = Number(formData.get('day_of_week'))

    await prisma.userBaseRule.create({
        data: {
            user_id,
            template_id,
            day_of_week,
            recurrence_type: 'WEEKLY' // Default
        }
    })
    revalidatePath('/admin/base-schedule')
}

export async function deleteBaseRule(id: number) {
    await prisma.userBaseRule.delete({
        where: { id }
    })
    revalidatePath('/admin/base-schedule')
}

export async function moveBaseRule(ruleId: number, newUserId: number, newDayIndex: number) {
    // Check if a rule already exists for this slot? (Optional business logic, skipping for flexibility)
    await prisma.userBaseRule.update({
        where: { id: ruleId },
        data: {
            user_id: newUserId,
            day_of_week: newDayIndex
        }
    })
    revalidatePath('/admin/base-schedule')
}
