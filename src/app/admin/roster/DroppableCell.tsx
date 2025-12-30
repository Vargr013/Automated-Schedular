'use client'

import { useDroppable } from '@dnd-kit/core'

export default function DroppableCell({ userId, date, children, isClosed }: { userId: number, date: string, children: React.ReactNode, isClosed?: boolean }) {
    const { isOver, setNodeRef } = useDroppable({
        id: `${userId}|${date}`,
        data: {
            userId,
            date
        },
        disabled: isClosed
    })

    const style = {
        minHeight: '80px',
        padding: '0.5rem',
        backgroundColor: isOver ? 'var(--primary-foreground)' : (isClosed ? 'var(--muted)' : 'var(--background)'),
        transition: 'background-color 0.2s',
        height: '100%',
        position: 'relative' as const
    }

    return (
        <div ref={setNodeRef} style={style}>
            {children}
        </div>
    )
}
