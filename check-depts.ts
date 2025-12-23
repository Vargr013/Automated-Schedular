import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const depts = await prisma.department.findMany()
    console.log('Departments:', depts)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
