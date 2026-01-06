import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding 2026 Holidays...')

    // South Africa Public Holidays 2026
    const holidays = [
        { date: '2026-01-01', name: "New Year's Day" },
        { date: '2026-03-21', name: "Human Rights Day" },
        { date: '2026-04-03', name: "Good Friday" },
        { date: '2026-04-06', name: "Family Day" },
        { date: '2026-04-27', name: "Freedom Day" },
        { date: '2026-05-01', name: "Workers' Day" },
        { date: '2026-06-16', name: "Youth Day" },
        { date: '2026-08-09', name: "National Women's Day" },
        { date: '2026-08-10', name: "Public Holiday (Monday after Women's Day)" }, // Observed
        { date: '2026-09-24', name: "Heritage Day" },
        { date: '2026-12-16', name: "Day of Reconciliation" },
        { date: '2026-12-25', name: "Christmas Day" },
        { date: '2026-12-26', name: "Day of Goodwill" },
    ]

    for (const h of holidays) {
        await prisma.operatingDay.upsert({
            where: { date: h.date },
            update: {
                status: 'HOLIDAY',
                event_note: h.name
            },
            create: {
                date: h.date,
                status: 'HOLIDAY',
                event_note: h.name
            }
        })
        console.log(`Added/Updated: ${h.date} - ${h.name}`)
    }

    console.log('Finished seeding holidays.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
