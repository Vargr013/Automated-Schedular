'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

type ShiftDragData = {
    id: number
    user_id: number
    date: string
}

export default function DraggableShift({
    shift,
    children,
    disabled = false
}: {
    shift: ShiftDragData
    children: React.ReactNode
    disabled?: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `shift-${shift.id}`,
        data: {
            shiftId: shift.id,
            originalUserId: shift.user_id,
            originalDate: shift.date
        },
        disabled
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} {...(disabled ? {} : listeners)} {...(disabled ? {} : attributes)}>
            {children}
        </div>
    )
}
