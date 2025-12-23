import { getUsers } from '@/app/actions/users'
import { getDepartments } from '@/app/actions/departments'
import StaffList from './StaffList'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
    const users = await getUsers()
    const departments = await getDepartments()

    // Transform users to match the expected type if necessary, 
    // but Prisma return type should match mostly. 
    // We might need to ensure 'category' is string (it is in schema now).
    // And skills structure matches.

    return (
        <StaffList users={users as any} departments={departments} />
    )
}
