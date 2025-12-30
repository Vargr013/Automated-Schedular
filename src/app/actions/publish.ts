'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import nodemailer from 'nodemailer'
import { getShifts } from './shifts'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'

export async function publishSchedule(month: string, sendEmail: boolean) {
    // month format: YYYY-MM

    // 1. Update DB
    await prisma.schedulePublish.upsert({
        where: { month },
        update: {
            publishedAt: new Date(),
        },
        create: {
            month,
            publishedAt: new Date(),
        }
    })

    if (sendEmail) {
        await sendShiftEmails(month)
    }

    revalidatePath('/admin/roster')
    revalidatePath(`/schedule`)
    return { success: true }
}

export async function isMonthPublished(month: string) {
    const record = await prisma.schedulePublish.findUnique({
        where: { month }
    })
    return !!record
}

async function sendShiftEmails(month: string) {
    // Configure Transporter (Start looking for Env Vars)
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || 'user',
            pass: process.env.SMTP_PASS || 'pass',
        },
    })

    // If no real config, maybe we shouldn't crash? 
    // For now we'll try/catch the sending loop.

    const date = parseISO(`${month}-01`)
    const startDate = format(startOfMonth(date), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(date), 'yyyy-MM-dd')

    // Get all shifts + users
    const shifts = await getShifts(startDate, endDate)
    const users = await prisma.user.findMany({
        where: {
            email: { not: '' } // Only users with email
        }
    })

    for (const user of users) {
        const userShifts = shifts.filter(s => s.user_id === user.id)
        if (userShifts.length === 0) continue

        // Construct Email
        const shiftList = userShifts.map(s =>
            `- ${s.date} (${format(parseISO(s.date), 'EEE')}): ${s.start_time} - ${s.end_time} [${s.department.name}]`
        ).join('\n')

        const mailOptions = {
            from: process.env.SMTP_FROM || '"Scheduler App" <noreply@example.com>',
            to: user.email,
            subject: `Your Schedule for ${format(date, 'MMMM yyyy')}`,
            text: `Hello ${user.name},\n\nYour schedule for ${format(date, 'MMMM yyyy')} has been published.\n\nHere are your shifts:\n\n${shiftList}\n\nView full schedule at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/schedule/${user.id}\n\nBest regards,\nManagement`
        }

        try {
            if (process.env.SMTP_HOST) {
                await transporter.sendMail(mailOptions)
            } else {
                console.log('Simulating Email Send:', mailOptions)
            }
        } catch (error) {
            console.error(`Failed to email ${user.name}:`, error)
        }
    }
}
