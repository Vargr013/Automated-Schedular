'use client'

import { useDroppable } from '@dnd-kit/core'

export default function DroppableBaseCell({ userId, dayIndex, children }: { userId: number, dayIndex: number, children: React.ReactNode }) {
    const { isOver, setNodeRef } = useDroppable({
        id: `${userId}|${dayIndex}`,
        data: {
            userId,
            dayIndex
        }
    })

    const style = {
        minHeight: '80px',
        padding: '0.5rem',
        backgroundColor: isOver ? 'var(--primary-foreground)' : 'var(--background)',
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
