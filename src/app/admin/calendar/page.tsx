import { getOperatingDays, deleteOperatingDay } from '@/app/actions/calendar'
import AddHolidayForm from './AddHolidayForm'
import EditOperatingDayModal from './EditOperatingDayModal'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
    const days = await getOperatingDays()

    return (
        <div>
            <h1 style={{ marginBottom: '20px' }}>Operating Calendar & Holidays</h1>

            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Note</th>
                            <th>Hours</th>
                            <th style={{ width: '100px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {days.map((day) => (
                            <tr key={day.id}>
                                <td>{day.date}</td>
                                <td>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: day.status === 'HOLIDAY' ? 'rgba(239, 68, 68, 0.1)' : day.status === 'CLOSED' ? 'var(--muted)' : 'rgba(34, 197, 94, 0.1)',
                                        color: day.status === 'HOLIDAY' ? 'var(--destructive)' : day.status === 'CLOSED' ? 'var(--muted-foreground)' : 'var(--primary)'
                                    }}>
                                        {day.status}
                                    </span>
                                </td>
                                <td>{day.event_note || '-'}</td>
                                <td>
                                    {day.open_time && day.close_time ? (
                                        <span style={{ fontSize: '0.875rem' }}>{day.open_time} - {day.close_time}</span>
                                    ) : (
                                        <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Default</span>
                                    )}
                                </td>
                                <td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <EditOperatingDayModal day={day} />
                                            <form action={deleteOperatingDay}>
                                                <input type="hidden" name="id" value={day.id} />
                                                <button type="submit" className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem' }}>Delete</button>
                                            </form>
                                        </div>
                                    </td>
                                </td>
                            </tr>
                        ))}
                        {days.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>No exceptions found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AddHolidayForm />
        </div>
    )
}
