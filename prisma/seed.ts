import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // 1. Departments
    const departments = [
        { name: 'Management (MOD)', color_code: '#ef4444' }, // Red
        { name: 'Shift Manager (SMOD)', color_code: '#f97316' }, // Orange
        { name: 'Cafe', color_code: '#eab308' }, // Yellow
        { name: 'Front Desk', color_code: '#22c55e' }, // Green
        { name: 'Gear Shop', color_code: '#3b82f6' }, // Blue
        { name: 'Intro Classes', color_code: '#a855f7' }, // Purple
    ]

    const deptMap = new Map()

    for (const dept of departments) {
        const existing = await prisma.department.findFirst({ where: { name: dept.name } })
        if (existing) {
            deptMap.set(dept.name, existing.id)
        } else {
            const newDept = await prisma.department.create({ data: dept })
            deptMap.set(dept.name, newDept.id)
        }
    }

    // 2. Staff
    const staffData = [
        // 6.1 Management & SMOD Pool
        { name: 'Roald', email: 'roald@example.com', type: 'FULL_TIME', category: 'Management', roles: ['Management (MOD)'] },
        { name: 'Tyler', email: 'tyler@example.com', type: 'FULL_TIME', category: 'Management', roles: ['Management (MOD)'] },
        { name: 'Angie', email: 'angie@example.com', type: 'FULL_TIME', category: 'Management', roles: ['Management (MOD)', 'Front Desk'] },
        { name: 'Kirsty', email: 'kirsty@example.com', type: 'FULL_TIME', category: 'Management', roles: ['Management (MOD)', 'Front Desk'] },
        { name: 'Gillian', email: 'gillian@example.com', type: 'FULL_TIME', category: 'Management', roles: ['Management (MOD)', 'Shift Manager (SMOD)', 'Gear Shop', 'Intro Classes'] },
        { name: 'Xander', email: 'xander@example.com', type: 'PART_TIME', category: 'Shift Manager', roles: ['Shift Manager (SMOD)', 'Front Desk', 'Gear Shop'] },
        { name: 'Jeff', email: 'jeff@example.com', type: 'PART_TIME', category: 'Shift Manager', roles: ['Shift Manager (SMOD)', 'Front Desk'] },
        { name: 'Thomas', email: 'thomas@example.com', type: 'PART_TIME', category: 'Shift Manager', roles: ['Shift Manager (SMOD)', 'Front Desk'] },
        { name: 'Chloe', email: 'chloe@example.com', type: 'PART_TIME', category: 'Shift Manager', roles: ['Shift Manager (SMOD)', 'Intro Classes'] },

        // 6.2 Full-Time & Cafe Staff
        { name: 'Eliza', email: 'eliza@example.com', type: 'FULL_TIME', category: 'Cafe', roles: ['Cafe', 'Front Desk'] },
        { name: 'Hein', email: 'hein@example.com', type: 'FULL_TIME', category: 'Shop', roles: ['Gear Shop'] },
        { name: 'Ryan', email: 'ryan@example.com', type: 'FULL_TIME', category: 'Shop', roles: ['Gear Shop'] },
        { name: 'Kgomotso', email: 'kgomotso@example.com', type: 'FULL_TIME', category: 'Cafe', roles: ['Cafe'] },

        // 6.3 Part-Time Staff
        { name: 'Tanielle', email: 'tanielle@example.com', type: 'PART_TIME', category: 'Cafe', roles: ['Cafe', 'Front Desk'] },
        { name: 'Ricardo', email: 'ricardo@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Michael M', email: 'michael.m@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Bailey', email: 'bailey@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Keegan', email: 'keegan@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Michael C', email: 'michael.c@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Kim', email: 'kim@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Andrea', email: 'andrea@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Kirara', email: 'kirara@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Iliana', email: 'iliana@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Skye', email: 'skye@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Tasha', email: 'tasha@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
        { name: 'Heimer', email: 'heimer@example.com', type: 'PART_TIME', category: 'Front Desk', roles: ['Front Desk'] },
    ]

    for (const staff of staffData) {
        const user = await prisma.user.upsert({
            where: { email: staff.email },
            update: {},
            create: {
                name: staff.name,
                email: staff.email,
                type: staff.type,
                category: staff.category,
                max_weekly_hours: staff.type === 'FULL_TIME' ? 40 : 20,
            },
        })

        // Assign Skills
        for (const roleName of staff.roles) {
            const deptId = deptMap.get(roleName)
            if (deptId) {
                // Check if skill exists
                const existingSkill = await prisma.userSkill.findUnique({
                    where: {
                        user_id_department_id: {
                            user_id: user.id,
                            department_id: deptId,
                        },
                    },
                })

                if (!existingSkill) {
                    await prisma.userSkill.create({
                        data: {
                            user_id: user.id,
                            department_id: deptId,
                        },
                    })
                }
            }
        }
    }

    console.log('Seeding finished.')
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
