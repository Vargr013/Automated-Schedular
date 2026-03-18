'use client'

import { useSyncExternalStore } from 'react'
import { useDroppable } from '@dnd-kit/core'

export default function DroppableCell({
    userId,
    date,
    children,
    isClosed,
    isHoliday,
    isWeekend,
    isToday,
    isSelected
}: {
    userId: number,
    date: string,
    children: React.ReactNode,
    isClosed?: boolean,
    isHoliday?: boolean,
    isWeekend?: boolean,
    isToday?: boolean,
    isSelected?: boolean
}) {
    const isMounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    )

    const { isOver, setNodeRef } = useDroppable({
        id: `${userId}|${date}`,
        data: {
            userId,
            date
        },
        disabled: isClosed
    })

    const style = {
        minHeight: '92px',
        padding: '0.5rem',
        backgroundColor: isOver
            ? 'rgba(var(--primary-rgb), 0.12)'
            : isToday
                ? 'rgba(var(--primary-rgb), 0.08)'
                : isHoliday
                    ? 'rgba(239, 68, 68, 0.08)'
                    : isClosed
                        ? 'var(--muted)'
                        : isWeekend
                            ? 'rgba(148, 163, 184, 0.08)'
                            : 'var(--background)',
        transition: 'background-color 0.2s, box-shadow 0.2s',
        height: '100%',
        position: 'relative' as const,
        boxShadow: isSelected
            ? 'inset 0 0 0 2px rgba(var(--primary-rgb), 0.55)'
            : isToday
                ? 'inset 0 0 0 1px rgba(var(--primary-rgb), 0.35)'
                : 'none'
    }

    if (!isMounted) {
        return <div style={style}>{children}</div>
    }

    return (
        <div ref={setNodeRef} style={style}>
            {children}
        </div>
    )
}
