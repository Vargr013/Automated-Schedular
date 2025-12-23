'use client'

import { createEvents } from 'ics'
import { saveAs } from 'file-saver'
import { format, parseISO, addMinutes } from 'date-fns'

type Shift = {
    id: number
    date: string
    start_time: string
    end_time: string
    department: {
        name: string
    }
}

export default function CalendarExport({ shifts }: { shifts: Shift[] }) {

    const handleGoogleExport = () => {
        // Create a Google Calendar URL for the NEXT upcoming shift as a quick add
        // For full sync, we'd need the Google Calendar API which is complex.
        // Instead, let's just create a .ics which Google Calendar can import.
        // But the user asked for "Google Calendar" button specifically.
        // A "Add to Google Calendar" link usually only adds one event.
        // Let's stick to .ics for bulk import, but maybe label it clearly.

        // Actually, we can generate a .ics file and the user can import it to Google Calendar.
        // But for a "Google Calendar" specific button, we could try to generate a link for each shift? No, that's too many links.
        // Best approach for "Export to Google Calendar" without API auth is to provide an ICS file and instructions, 
        // OR just one button "Download Calendar File (.ics)" which works for everything.

        // However, the user asked for "Google Calendar AND Apple's Calendar".
        // Apple Calendar opens .ics files natively.
        // Google Calendar imports .ics files.

        // Let's implement the .ics download as the primary method, as it covers both.
        // But to satisfy the "Google" request, maybe we can add a specific "Add to Google" for the *next* shift?
        // Or just educate that .ics works for both.

        // Let's implement the ICS download first.
        handleIcsExport()
    }

    const handleIcsExport = async () => {
        const events = shifts.map(shift => {
            const startDateTime = parseISO(`${shift.date}T${shift.start_time}`)
            const endDateTime = parseISO(`${shift.date}T${shift.end_time}`)

            // Calculate duration
            const duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
            const durationHours = Math.floor(duration)
            const durationMinutes = Math.round((duration - durationHours) * 60)

            return {
                start: [
                    startDateTime.getFullYear(),
                    startDateTime.getMonth() + 1,
                    startDateTime.getDate(),
                    startDateTime.getHours(),
                    startDateTime.getMinutes()
                ] as [number, number, number, number, number],
                duration: { hours: durationHours, minutes: durationMinutes },
                title: `Shift: ${shift.department.name}`,
                description: `Work Shift at ${shift.department.name}`,
                location: 'Work',
                status: 'CONFIRMED',
                busyStatus: 'BUSY'
            }
        })

        createEvents(events as any, (error, value) => {
            if (error) {
                console.error(error)
                alert('Error generating calendar file')
                return
            }

            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
            saveAs(blob, 'my-shifts.ics')
        })
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
                onClick={handleIcsExport}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
                📅 Export to Calendar (Apple/Google/Outlook)
            </button>
        </div>
    )
}
