
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Disabling auto_schedule for all FULL_TIME users...')

    // Using any cast to avoid stale type issues if present (auto_schedule new field)
    const updateResult = await (prisma as any).user.updateMany({
        where: {
            type: 'FULL_TIME'
        },
        data: {
            auto_schedule: false
        }
    })

    console.log(`Updated ${updateResult.count} full-time users.`)
}

main()
    .catch((e) => {
        console.error(e)
        プロセス.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
