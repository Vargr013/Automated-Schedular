'use client'

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { addDays, addWeeks, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { AlertCircle, AlertTriangle, CalendarPlus, ClipboardPaste, Copy, Pencil, Plus, Repeat, Save, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createShift, deleteShift, generateScheduleForUserInRange, moveShift, updateShift } from '@/app/actions/shifts'
import { getContrastCssTextColor } from './color-utils'
import DraggableShift from './DraggableShift'
import DroppableCell from './DroppableCell'

type User = {
    id: number
    name: string
    type: string
    category: string
    max_weekly_hours: number
    skills: {
        department: {
            id: number
            color_code: string
        }
    }[]
}

type Department = {
    id: number
    name: string
    color_code: string
}

type Shift = {
    id: number
    user_id: number
    department_id: number
    date: string
    start_time: string
    end_time: string
    is_smod: boolean
    department: {
        color_code: string
        name: string
    }
}

type OperatingDay = {
    id: number
    date: string
    status: string
    event_note: string | null
}

type Leave = {
    userId: number
    startDate: string
    endDate: string
    status: string
}

type RosterWarning = {
    type: 'LEAVE_CONFLICT' | 'UNDERSTAFFED'
    date: string
    message: string
    shiftId?: number
    userId?: number
    departmentId?: number
    startTime?: string
    endTime?: string
}

type EditorState = {
    mode: 'create' | 'edit'
    shiftId?: number
    userId: number
    date: string
    department_id: number
    start_time: string
    end_time: string
    is_smod: boolean
}

type CopiedShift = {
    department_id: number
    start_time: string
    end_time: string
    is_smod: boolean
    departmentName: string
}

type RepeatState = {
    frequency: 'daily' | 'weekly'
    occurrences: number
    skipExisting: boolean
    skipLeave: boolean
    skipClosedDays: boolean
}

const CATEGORY_ORDER = ['Management', 'Shift Manager', 'Cafe', 'Shop', 'Front Desk'] as const

type ShiftSnapshot = {
    id: number
    user_id: number
    department_id: number
    date: string
    start_time: string
    end_time: string
    is_smod: boolean
}

type HistoryAction =
    | { type: 'create', shift: ShiftSnapshot }
    | { type: 'delete', shift: ShiftSnapshot }
    | { type: 'update', before: ShiftSnapshot, after: ShiftSnapshot }
    | { type: 'move', before: ShiftSnapshot, after: ShiftSnapshot }
    | { type: 'batch_create', shifts: ShiftSnapshot[] }

export default function RosterGrid({
    users,
    departments,
    shifts,
    operatingDays,
    violations = [],
    leaves = [],
    startDate,
    endDate,
    currentMonth
}: {
    users: User[]
    departments: Department[]
    shifts: Shift[]
    operatingDays: OperatingDay[]
    violations?: RosterWarning[]
    leaves?: Leave[]
    startDate: string
    endDate: string
    currentMonth: string
}) {
    const router = useRouter()
    const [selectedCell, setSelectedCell] = useState<{ userId: number, date: string } | null>(null)
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
    const [editor, setEditor] = useState<EditorState | null>(null)
    const [copiedShift, setCopiedShift] = useState<CopiedShift | null>(null)
    const [repeatState, setRepeatState] = useState<RepeatState | null>(null)
    const [baseScheduleTarget, setBaseScheduleTarget] = useState<User | null>(null)
    const [isGeneratingBaseSchedule, setIsGeneratingBaseSchedule] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [history, setHistory] = useState<HistoryAction[]>([])
    const gridScrollRef = useRef<HTMLDivElement | null>(null)
    const bottomScrollRef = useRef<HTMLDivElement | null>(null)
    const activeScrollSyncRef = useRef<'grid' | 'bottom' | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const daysInMonth = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
    })
    const rosterTableMinWidth = `${200 + daysInMonth.length * 120}px`

    const shiftsByCell = useMemo(() => {
        const map = new Map<string, Shift[]>()
        for (const shift of shifts) {
            const key = `${shift.user_id}|${shift.date}`
            const current = map.get(key)
            if (current) {
                current.push(shift)
            } else {
                map.set(key, [shift])
            }
        }
        return map
    }, [shifts])

    const operatingDayByDate = useMemo(() => {
        const map = new Map<string, OperatingDay>()
        for (const day of operatingDays) {
            map.set(day.date, day)
        }
        return map
    }, [operatingDays])

    const approvedLeaveLookup = useMemo(() => {
        const set = new Set<string>()
        for (const leave of leaves) {
            if (leave.status !== 'APPROVED') continue
            for (const day of daysInMonth) {
                const dateStr = format(day, 'yyyy-MM-dd')
                if (leave.startDate <= dateStr && leave.endDate >= dateStr) {
                    set.add(`${leave.userId}|${dateStr}`)
                }
            }
        }
        return set
    }, [daysInMonth, leaves])

    const violationsByShiftId = useMemo(() => {
        const map = new Map<number, RosterWarning[]>()
        for (const violation of violations) {
            if (!violation.shiftId) continue
            const current = map.get(violation.shiftId)
            if (current) {
                current.push(violation)
            } else {
                map.set(violation.shiftId, [violation])
            }
        }
        return map
    }, [violations])

    const violationsByDate = useMemo(() => {
        const map = new Map<string, RosterWarning[]>()
        for (const violation of violations) {
            const current = map.get(violation.date)
            if (current) {
                current.push(violation)
            } else {
                map.set(violation.date, [violation])
            }
        }
        return map
    }, [violations])

    const conflicts = useMemo(() => {
        const results = new Set<number>()

        const getMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number)
            return h * 60 + m
        }

        for (const cellShifts of shiftsByCell.values()) {
            for (let index = 0; index < cellShifts.length; index += 1) {
                const shift = cellShifts[index]
                const start1 = getMinutes(shift.start_time)
                const end1 = getMinutes(shift.end_time)

                for (let otherIndex = index + 1; otherIndex < cellShifts.length; otherIndex += 1) {
                    const other = cellShifts[otherIndex]
                    const start2 = getMinutes(other.start_time)
                    const end2 = getMinutes(other.end_time)

                    if (Math.max(start1, start2) < Math.min(end1, end2)) {
                        results.add(shift.id)
                        results.add(other.id)
                    }
                }
            }
        }

        return results
    }, [shiftsByCell])

    const shiftsPerDay = useMemo(() => {
        const counts: Record<string, number> = {}
        shifts.forEach((shift) => {
            counts[shift.date] = (counts[shift.date] || 0) + 1
        })
        return counts
    }, [shifts])

    const approvedLeavePerDay = useMemo(() => {
        const counts: Record<string, number> = {}
        leaves
            .filter((leave) => leave.status === 'APPROVED')
            .forEach((leave) => {
                daysInMonth.forEach((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    if (leave.startDate <= dateStr && leave.endDate >= dateStr) {
                        counts[dateStr] = (counts[dateStr] || 0) + 1
                    }
                })
            })
        return counts
    }, [daysInMonth, leaves])

    const alertCountPerDay = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const [date, dayViolations] of violationsByDate.entries()) {
            counts[date] = dayViolations.filter((violation) => violation.type === 'UNDERSTAFFED').length
        }
        return counts
    }, [violationsByDate])

    const groupedUsers = useMemo(() => {
        const groups: Record<string, Record<string, User[]>> = {
            FULL_TIME: {
                Management: [],
                'Shift Manager': [],
                Cafe: [],
                Shop: [],
                'Front Desk': []
            },
            PART_TIME: {
                Management: [],
                'Shift Manager': [],
                Cafe: [],
                Shop: [],
                'Front Desk': []
            }
        }

        users.forEach((user) => {
            const type = user.type === 'FULL_TIME' ? 'FULL_TIME' : 'PART_TIME'
            const category = user.category || 'Front Desk'
            if (groups[type][category]) {
                groups[type][category].push(user)
            } else {
                groups[type]['Front Desk'].push(user)
            }
        })

        return groups
    }, [users])

    const orderedUsers = useMemo(() => {
        return [
            ...CATEGORY_ORDER.flatMap((category) => groupedUsers.FULL_TIME[category] || []),
            ...CATEGORY_ORDER.flatMap((category) => groupedUsers.PART_TIME[category] || [])
        ]
    }, [groupedUsers])

    const rosterMonthLabel = useMemo(() => format(parseISO(`${currentMonth}-01`), 'MMMM yyyy'), [currentMonth])
    const visibleRosterLabel = useMemo(() => {
        const startLabel = format(parseISO(startDate), 'd MMM')
        const endLabel = format(parseISO(endDate), 'd MMM yyyy')
        return `${startLabel} - ${endLabel}`
    }, [endDate, startDate])

    const getShiftsForCell = (userId: number, dateStr: string) => {
        return shiftsByCell.get(`${userId}|${dateStr}`) || []
    }

    const getDayStatus = (dateStr: string) => {
        return operatingDayByDate.get(dateStr)
    }

    const getApprovedLeaveForDate = (userId: number, dateStr: string) => {
        return approvedLeaveLookup.has(`${userId}|${dateStr}`)
    }

    const buildFormData = (state: EditorState) => {
        const formData = new FormData()
        formData.set('user_id', state.userId.toString())
        formData.set('date', state.date)
        formData.set('department_id', state.department_id.toString())
        formData.set('start_time', state.start_time)
        formData.set('end_time', state.end_time)
        if (state.is_smod) {
            formData.set('is_smod', 'on')
        }
        if (state.shiftId) {
            formData.set('id', state.shiftId.toString())
        }
        return formData
    }

    const buildSnapshotFormData = (shift: Omit<ShiftSnapshot, 'id'>) => {
        const formData = new FormData()
        formData.set('user_id', shift.user_id.toString())
        formData.set('date', shift.date)
        formData.set('department_id', shift.department_id.toString())
        formData.set('start_time', shift.start_time)
        formData.set('end_time', shift.end_time)
        if (shift.is_smod) {
            formData.set('is_smod', 'on')
        }
        return formData
    }

    const toShiftSnapshot = (shift: Shift | ShiftSnapshot): ShiftSnapshot => ({
        id: shift.id,
        user_id: shift.user_id,
        department_id: shift.department_id,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        is_smod: shift.is_smod
    })

    const isTypingTarget = (target: EventTarget | null) => {
        const element = target as HTMLElement | null
        if (!element) return false
        const tag = element.tagName
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable
    }

    const pushHistory = (entry: HistoryAction) => {
        setHistory((current) => [...current.slice(-19), entry])
    }

    useEffect(() => {
        if (!selectedShift) {
            setRepeatState(null)
        }
    }, [selectedShift])

    useEffect(() => {
        const gridScroll = gridScrollRef.current
        const bottomScroll = bottomScrollRef.current
        if (!gridScroll || !bottomScroll) return

        bottomScroll.scrollLeft = gridScroll.scrollLeft
    }, [rosterTableMinWidth])

    const syncHorizontalScroll = (source: 'grid' | 'bottom') => {
        const gridScroll = gridScrollRef.current
        const bottomScroll = bottomScrollRef.current
        if (!gridScroll || !bottomScroll) return

        const sourceElement = source === 'grid' ? gridScroll : bottomScroll
        const nextScrollLeft = sourceElement.scrollLeft
        const targetElement = source === 'grid' ? bottomScroll : gridScroll

        if (Math.abs(targetElement.scrollLeft - nextScrollLeft) < 1) return

        activeScrollSyncRef.current = source
        targetElement.scrollLeft = nextScrollLeft

        requestAnimationFrame(() => {
            if (activeScrollSyncRef.current === source) {
                activeScrollSyncRef.current = null
            }
        })
    }

    const handleGridScroll = () => {
        if (activeScrollSyncRef.current === 'bottom') return
        syncHorizontalScroll('grid')
    }

    const handleBottomScroll = () => {
        if (activeScrollSyncRef.current === 'grid') return
        syncHorizontalScroll('bottom')
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const shiftId = active.data.current?.shiftId
            const [userIdStr, dateStr] = (over.id as string).split('|')
            const userId = parseInt(userIdStr)

            if (shiftId && userId && dateStr) {
                const currentShift = shifts.find((shift) => shift.id === shiftId)
                if (!currentShift) return
                await moveShift(shiftId, userId, dateStr)
                pushHistory({
                    type: 'move',
                    before: toShiftSnapshot(currentShift),
                    after: {
                        ...toShiftSnapshot(currentShift),
                        user_id: userId,
                        date: dateStr
                    }
                })
            }
        }
    }

    const handleCellClick = (userId: number, date: string) => {
        setSelectedCell({ userId, date })
        if (editor?.mode !== 'create' || editor.userId !== userId || editor.date !== date) {
            setSelectedShift(null)
        }
    }

    const moveSelection = (rowDelta: number, colDelta: number) => {
        if (orderedUsers.length === 0 || daysInMonth.length === 0) return

        const fallbackDate = format(daysInMonth[0], 'yyyy-MM-dd')
        const currentUserId = selectedCell?.userId ?? orderedUsers[0].id
        const currentDate = selectedCell?.date ?? fallbackDate

        const currentRowIndex = Math.max(0, orderedUsers.findIndex((user) => user.id === currentUserId))
        const currentColIndex = Math.max(0, daysInMonth.findIndex((day) => format(day, 'yyyy-MM-dd') === currentDate))

        const nextRowIndex = Math.min(Math.max(currentRowIndex + rowDelta, 0), orderedUsers.length - 1)
        const nextColIndex = Math.min(Math.max(currentColIndex + colDelta, 0), daysInMonth.length - 1)

        setSelectedShift(null)
        setSelectedCell({
            userId: orderedUsers[nextRowIndex].id,
            date: format(daysInMonth[nextColIndex], 'yyyy-MM-dd')
        })
    }

    const handleShiftClick = (event: React.MouseEvent, shift: Shift) => {
        event.stopPropagation()
        setSelectedShift(shift)
        setSelectedCell({ userId: shift.user_id, date: shift.date })
    }

    const copyShift = (shift: Shift) => {
        setCopiedShift({
            department_id: shift.department_id,
            start_time: shift.start_time,
            end_time: shift.end_time,
            is_smod: shift.is_smod,
            departmentName: shift.department.name
        })
    }

    const startCreateEditor = (userId: number, date: string) => {
        const defaultDepartment = copiedShift?.department_id || departments[0]?.id
        if (!defaultDepartment) return

        setRepeatState(null)
        setSelectedCell({ userId, date })
        setSelectedShift(null)
        setEditor({
            mode: 'create',
            userId,
            date,
            department_id: defaultDepartment,
            start_time: copiedShift?.start_time || '08:00',
            end_time: copiedShift?.end_time || '17:00',
            is_smod: copiedShift?.is_smod || false
        })
    }

    const startEditEditor = (shift: Shift) => {
        setRepeatState(null)
        setSelectedShift(shift)
        setSelectedCell({ userId: shift.user_id, date: shift.date })
        setEditor({
            mode: 'edit',
            shiftId: shift.id,
            userId: shift.user_id,
            date: shift.date,
            department_id: shift.department_id,
            start_time: shift.start_time,
            end_time: shift.end_time,
            is_smod: shift.is_smod
        })
    }

    const saveEditor = async () => {
        if (!editor) return

        setIsSaving(true)
        try {
            const formData = buildFormData(editor)
            if (editor.mode === 'edit') {
                const existingShift = shifts.find((shift) => shift.id === editor.shiftId)
                await updateShift(formData)
                if (existingShift) {
                    pushHistory({
                        type: 'update',
                        before: toShiftSnapshot(existingShift),
                        after: {
                            id: existingShift.id,
                            user_id: editor.userId,
                            department_id: editor.department_id,
                            date: editor.date,
                            start_time: editor.start_time,
                            end_time: editor.end_time,
                            is_smod: editor.is_smod
                        }
                    })
                }
            } else {
                const createdShift = await createShift(formData)
                pushHistory({
                    type: 'create',
                    shift: toShiftSnapshot(createdShift)
                })
            }
            setEditor(null)
        } finally {
            setIsSaving(false)
        }
    }

    const startRepeatEditor = (shift: Shift) => {
        setEditor(null)
        setSelectedShift(shift)
        setSelectedCell({ userId: shift.user_id, date: shift.date })
        setRepeatState({
            frequency: 'daily',
            occurrences: 4,
            skipExisting: true,
            skipLeave: true,
            skipClosedDays: true
        })
    }

    const removeShift = async (shiftId: number) => {
        setIsSaving(true)
        try {
            const existingShift = shifts.find((shift) => shift.id === shiftId)
            await deleteShift(shiftId)
            if (existingShift) {
                pushHistory({
                    type: 'delete',
                    shift: toShiftSnapshot(existingShift)
                })
            }
            setEditor(null)
            if (selectedShift?.id === shiftId) {
                setSelectedShift(null)
            }
        } finally {
            setIsSaving(false)
        }
    }

    const pasteIntoSelectedCell = async () => {
        if (!copiedShift || !selectedCell) return

        const existingShifts = getShiftsForCell(selectedCell.userId, selectedCell.date)
        if (existingShifts.length > 0) {
            const confirmed = window.confirm('This cell already has shifts. Paste another shift here?')
            if (!confirmed) return
        }

        setIsSaving(true)
        try {
            const formData = new FormData()
            formData.set('user_id', selectedCell.userId.toString())
            formData.set('date', selectedCell.date)
            formData.set('department_id', copiedShift.department_id.toString())
            formData.set('start_time', copiedShift.start_time)
            formData.set('end_time', copiedShift.end_time)
            if (copiedShift.is_smod) {
                formData.set('is_smod', 'on')
            }
            const createdShift = await createShift(formData)
            pushHistory({
                type: 'create',
                shift: toShiftSnapshot(createdShift)
            })
        } finally {
            setIsSaving(false)
        }
    }

    const duplicateSelectedShiftIntoCell = async () => {
        if (!selectedShift || !selectedCell) return

        const existingShifts = getShiftsForCell(selectedCell.userId, selectedCell.date)
        if (existingShifts.length > 0) {
            const confirmed = window.confirm('This cell already has shifts. Duplicate another shift here?')
            if (!confirmed) return
        }

        setIsSaving(true)
        try {
            const formData = new FormData()
            formData.set('user_id', selectedCell.userId.toString())
            formData.set('date', selectedCell.date)
            formData.set('department_id', selectedShift.department_id.toString())
            formData.set('start_time', selectedShift.start_time)
            formData.set('end_time', selectedShift.end_time)
            if (selectedShift.is_smod) {
                formData.set('is_smod', 'on')
            }
            const createdShift = await createShift(formData)
            pushHistory({
                type: 'create',
                shift: toShiftSnapshot(createdShift)
            })
        } finally {
            setIsSaving(false)
        }
    }

    const updateRepeatState = <K extends keyof RepeatState>(key: K, value: RepeatState[K]) => {
        setRepeatState((current) => current ? { ...current, [key]: value } : current)
    }

    const applyRepeat = async () => {
        if (!selectedShift || !repeatState) return

        const createdShifts: ShiftSnapshot[] = []
        const skippedLabels: string[] = []

        setIsSaving(true)
        try {
            for (let index = 1; index <= repeatState.occurrences; index += 1) {
                const nextDate = format(
                    repeatState.frequency === 'daily'
                        ? addDays(parseISO(selectedShift.date), index)
                        : addWeeks(parseISO(selectedShift.date), index),
                    'yyyy-MM-dd'
                )

                const status = getDayStatus(nextDate)
                const hasExistingShifts = getShiftsForCell(selectedShift.user_id, nextDate).length > 0
                const onLeave = getApprovedLeaveForDate(selectedShift.user_id, nextDate)
                const isClosedDay = status?.status === 'CLOSED' || status?.status === 'HOLIDAY'

                if (repeatState.skipExisting && hasExistingShifts) {
                    skippedLabels.push(`${nextDate} already has a shift`)
                    continue
                }

                if (repeatState.skipLeave && onLeave) {
                    skippedLabels.push(`${nextDate} is on leave`)
                    continue
                }

                if (repeatState.skipClosedDays && isClosedDay) {
                    skippedLabels.push(`${nextDate} is closed`)
                    continue
                }

                const createdShift = await createShift(buildSnapshotFormData({
                    user_id: selectedShift.user_id,
                    department_id: selectedShift.department_id,
                    date: nextDate,
                    start_time: selectedShift.start_time,
                    end_time: selectedShift.end_time,
                    is_smod: selectedShift.is_smod
                }))

                createdShifts.push(toShiftSnapshot(createdShift))
            }

            if (createdShifts.length > 0) {
                pushHistory({
                    type: 'batch_create',
                    shifts: createdShifts
                })
            }

            if (createdShifts.length === 0 && skippedLabels.length > 0) {
                window.alert(`No repeat shifts were added.\n${skippedLabels.slice(0, 5).join('\n')}`)
                return
            }

            if (skippedLabels.length > 0) {
                window.alert(`Repeated ${createdShifts.length} shift${createdShifts.length === 1 ? '' : 's'}.\nSkipped:\n${skippedLabels.slice(0, 5).join('\n')}`)
            }

            setRepeatState(null)
        } finally {
            setIsSaving(false)
        }
    }

    const undoLastAction = async () => {
        const lastAction = history[history.length - 1]
        if (!lastAction || isSaving) return

        setIsSaving(true)
        try {
            if (lastAction.type === 'create') {
                await deleteShift(lastAction.shift.id)
            }

            if (lastAction.type === 'delete') {
                const formData = new FormData()
                formData.set('user_id', lastAction.shift.user_id.toString())
                formData.set('date', lastAction.shift.date)
                formData.set('department_id', lastAction.shift.department_id.toString())
                formData.set('start_time', lastAction.shift.start_time)
                formData.set('end_time', lastAction.shift.end_time)
                if (lastAction.shift.is_smod) {
                    formData.set('is_smod', 'on')
                }
                await createShift(formData)
            }

            if (lastAction.type === 'update') {
                const formData = new FormData()
                formData.set('id', lastAction.before.id.toString())
                formData.set('user_id', lastAction.before.user_id.toString())
                formData.set('date', lastAction.before.date)
                formData.set('department_id', lastAction.before.department_id.toString())
                formData.set('start_time', lastAction.before.start_time)
                formData.set('end_time', lastAction.before.end_time)
                if (lastAction.before.is_smod) {
                    formData.set('is_smod', 'on')
                }
                await updateShift(formData)
            }

            if (lastAction.type === 'move') {
                await moveShift(lastAction.before.id, lastAction.before.user_id, lastAction.before.date)
            }

            if (lastAction.type === 'batch_create') {
                for (const shift of lastAction.shifts) {
                    await deleteShift(shift.id)
                }
            }

            setHistory((current) => current.slice(0, -1))
            setEditor(null)
            setRepeatState(null)
        } finally {
            setIsSaving(false)
        }
    }

    const handleRosterKeyDown = useEffectEvent((event: KeyboardEvent) => {
        if (isTypingTarget(event.target) && event.key !== 'Escape') {
            return
        }

        const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c'
        const isPaste = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v'
        const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey
        const isDuplicate = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd'
        const isRepeat = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r'

        if (isUndo && history.length > 0) {
            event.preventDefault()
            void undoLastAction()
            return
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            moveSelection(0, -1)
            return
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault()
            moveSelection(0, 1)
            return
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault()
            moveSelection(-1, 0)
            return
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            moveSelection(1, 0)
            return
        }

        if (isCopy && selectedShift) {
            event.preventDefault()
            copyShift(selectedShift)
        }

        if (isPaste && copiedShift && selectedCell && !editor) {
            event.preventDefault()
            void pasteIntoSelectedCell()
        }

        if (isDuplicate && selectedShift && selectedCell) {
            event.preventDefault()
            void duplicateSelectedShiftIntoCell()
        }

        if (isRepeat && selectedShift && !editor) {
            event.preventDefault()
            startRepeatEditor(selectedShift)
        }

        if ((event.key === 'Delete' || event.key === 'Backspace') && selectedShift && !editor) {
            event.preventDefault()
            void removeShift(selectedShift.id)
        }

        if (event.key.toLowerCase() === 'n' && selectedCell && !editor) {
            event.preventDefault()
            startCreateEditor(selectedCell.userId, selectedCell.date)
        }

        if (event.key === 'F2' && selectedShift && !editor) {
            event.preventDefault()
            startEditEditor(selectedShift)
        }

        if (event.key === 'Escape') {
            setEditor(null)
            setRepeatState(null)
            if (!editor) {
                setSelectedShift(null)
                setSelectedCell(null)
            }
        }

        if (event.key === 'Enter' && editor) {
            const target = event.target as HTMLElement | null
            if (target?.tagName !== 'TEXTAREA') {
                event.preventDefault()
                void saveEditor()
            }
        }

        if (event.key === 'Enter' && repeatState) {
            event.preventDefault()
            void applyRepeat()
        }
    })

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => handleRosterKeyDown(event)
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    const updateEditor = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
        setEditor((current) => current ? { ...current, [key]: value } : current)
    }

    const renderInlineEditor = () => {
        if (!editor) return null

        return (
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    backgroundColor: 'rgba(255,255,255,0.94)',
                    border: '1px solid rgba(15, 23, 42, 0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem',
                    boxShadow: '0 8px 20px -16px rgba(15, 23, 42, 0.8)'
                }}
            >
                <select
                    className="select"
                    value={editor.department_id}
                    onChange={(event) => updateEditor('department_id', Number(event.target.value))}
                    style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem' }}
                >
                    {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <input
                        type="time"
                        className="input"
                        value={editor.start_time}
                        onChange={(event) => updateEditor('start_time', event.target.value)}
                        style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem' }}
                    />
                    <input
                        type="time"
                        className="input"
                        value={editor.end_time}
                        onChange={(event) => updateEditor('end_time', event.target.value)}
                        style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem' }}
                    />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#111827' }}>
                    <input
                        type="checkbox"
                        checked={editor.is_smod}
                        onChange={(event) => updateEditor('is_smod', event.target.checked)}
                    />
                    SMOD
                </label>

                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn" onClick={() => void saveEditor()} disabled={isSaving} style={{ padding: '0.38rem 0.5rem', fontSize: '0.72rem' }}>
                        <Save size={12} />
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditor(null)} disabled={isSaving} style={{ padding: '0.38rem 0.5rem', fontSize: '0.72rem' }}>
                        <X size={12} />
                    </button>
                    {editor.mode === 'edit' && editor.shiftId && (
                        <button
                            type="button"
                            className="btn"
                            onClick={() => void removeShift(editor.shiftId!)}
                            disabled={isSaving}
                            style={{ padding: '0.38rem 0.5rem', fontSize: '0.72rem', backgroundColor: '#ef4444', color: '#fff' }}
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        )
    }

    const renderRepeatEditor = () => {
        if (!repeatState || !selectedShift) return null

        return (
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                    backgroundColor: 'var(--background)',
                    border: '1px solid rgba(15, 23, 42, 0.12)',
                    borderRadius: '14px',
                    padding: '1rem',
                    boxShadow: '0 30px 80px -32px rgba(15, 23, 42, 0.55)',
                    minWidth: '320px',
                    maxWidth: 'min(92vw, 380px)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--foreground)', fontWeight: 700 }}>
                            Repeat Shift
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                            {selectedShift.department.name} {selectedShift.start_time}-{selectedShift.end_time}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setRepeatState(null)}
                        disabled={isSaving}
                        style={{ padding: '0.35rem 0.45rem', fontSize: '0.72rem' }}
                    >
                        <X size={12} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.45rem' }}>
                    <select
                        className="select"
                        value={repeatState.frequency}
                        onChange={(event) => updateRepeatState('frequency', event.target.value as RepeatState['frequency'])}
                        style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem' }}
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                    </select>
                    <input
                        type="number"
                        min={1}
                        max={12}
                        className="input"
                        value={repeatState.occurrences}
                        onChange={(event) => updateRepeatState('occurrences', Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
                        style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem' }}
                    />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: '#111827' }}>
                    <input
                        type="checkbox"
                        checked={repeatState.skipExisting}
                        onChange={(event) => updateRepeatState('skipExisting', event.target.checked)}
                    />
                    <span style={{ color: 'var(--foreground)', fontWeight: 500, lineHeight: 1.35 }}>
                        Skip cells that already have shifts
                    </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: '#111827' }}>
                    <input
                        type="checkbox"
                        checked={repeatState.skipLeave}
                        onChange={(event) => updateRepeatState('skipLeave', event.target.checked)}
                    />
                    <span style={{ color: 'var(--foreground)', fontWeight: 500, lineHeight: 1.35 }}>
                        Skip approved leave days
                    </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: '#111827' }}>
                    <input
                        type="checkbox"
                        checked={repeatState.skipClosedDays}
                        onChange={(event) => updateRepeatState('skipClosedDays', event.target.checked)}
                    />
                    <span style={{ color: 'var(--foreground)', fontWeight: 500, lineHeight: 1.35 }}>
                        Skip closed and holiday days
                    </span>
                </label>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setRepeatState(null)} disabled={isSaving} style={{ padding: '0.5rem 0.7rem', fontSize: '0.76rem' }}>
                        Cancel
                    </button>
                    <button type="button" className="btn" onClick={() => void applyRepeat()} disabled={isSaving} style={{ padding: '0.42rem 0.6rem', fontSize: '0.72rem' }}>
                        <Repeat size={12} />
                        Apply
                    </button>
                </div>
            </div>
        )
    }

    const generateBaseScheduleForTarget = async () => {
        if (!baseScheduleTarget) return

        setIsGeneratingBaseSchedule(true)
        try {
            const result = await generateScheduleForUserInRange(currentMonth, baseScheduleTarget.id, startDate, endDate)
            setBaseScheduleTarget(null)
            alert(`Generated ${result.count} new shift${result.count === 1 ? '' : 's'} for ${baseScheduleTarget.name}.`)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('Failed to generate the base schedule for this staff member.')
        } finally {
            setIsGeneratingBaseSchedule(false)
        }
    }

    const renderBaseScheduleModal = () => {
        if (!baseScheduleTarget) return null

        return (
            <div
                onClick={() => {
                    if (!isGeneratingBaseSchedule) {
                        setBaseScheduleTarget(null)
                    }
                }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.38)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    zIndex: 80
                }}
            >
                <div
                    onClick={(event) => event.stopPropagation()}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.8rem',
                        backgroundColor: 'var(--background)',
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        borderRadius: '14px',
                        padding: '1rem',
                        boxShadow: '0 30px 80px -32px rgba(15, 23, 42, 0.55)',
                        minWidth: '320px',
                        maxWidth: 'min(92vw, 420px)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--foreground)', fontWeight: 700 }}>
                                Generate Base Schedule
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                                Create shifts from recurring base rules for one staff member.
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setBaseScheduleTarget(null)}
                            disabled={isGeneratingBaseSchedule}
                            style={{ padding: '0.35rem 0.45rem', fontSize: '0.72rem' }}
                        >
                            <X size={12} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: '0.55rem', padding: '0.85rem', borderRadius: '10px', backgroundColor: 'rgba(var(--primary-rgb), 0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--muted-foreground)' }}>Staff member</span>
                            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{baseScheduleTarget.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--muted-foreground)' }}>Month</span>
                            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{rosterMonthLabel}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--muted-foreground)' }}>Visible roster</span>
                            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{visibleRosterLabel}</span>
                        </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                        Existing shifts for this staff member will be kept. Only missing shifts in the full visible roster window will be created.
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setBaseScheduleTarget(null)}
                            disabled={isGeneratingBaseSchedule}
                            style={{ padding: '0.5rem 0.7rem', fontSize: '0.76rem' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => void generateBaseScheduleForTarget()}
                            disabled={isGeneratingBaseSchedule}
                            style={{ padding: '0.5rem 0.8rem', fontSize: '0.76rem' }}
                        >
                            {isGeneratingBaseSchedule ? 'Generating...' : 'Generate Schedule'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderUserRows = (userList: User[]) => {
        return userList.map((user) => (
            <tr key={`row-${user.id}`}>
                <th
                    scope="row"
                    className="roster-table-staff roster-staff-name"
                    style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        fontWeight: '500',
                        color: 'var(--foreground)',
                        textAlign: 'left',
                        verticalAlign: 'top'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <span>{user.name}</span>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            title={`Generate ${user.name}'s base schedule for ${rosterMonthLabel}`}
                            onClick={(event) => {
                                event.stopPropagation()
                                setBaseScheduleTarget(user)
                            }}
                            style={{
                                padding: '0.32rem 0.42rem',
                                fontSize: '0.7rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '30px',
                                minHeight: '30px'
                            }}
                        >
                            <CalendarPlus size={13} />
                        </button>
                    </div>
                </th>
                {daysInMonth.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const cellShifts = getShiftsForCell(user.id, dateStr)
                    const status = getDayStatus(dateStr)
                    const isHoliday = status?.status === 'HOLIDAY'
                    const isClosed = status?.status === 'CLOSED'
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6
                    const isToday = isSameDay(day, new Date())
                    const onLeave = getApprovedLeaveForDate(user.id, dateStr)
                    const isSelectedCell = selectedCell?.userId === user.id && selectedCell.date === dateStr
                    const isCreateEditorCell = editor?.mode === 'create' && editor.userId === user.id && editor.date === dateStr

                    return (
                        <td
                            key={`${user.id}-${dateStr}`}
                            onClick={() => handleCellClick(user.id, dateStr)}
                            style={{
                                borderBottom: '1px solid var(--border)',
                                borderRight: '1px solid var(--border)',
                                position: 'relative',
                                padding: 0,
                                verticalAlign: 'top',
                                minWidth: '120px',
                                width: '120px'
                            }}
                        >
                            <DroppableCell
                                userId={user.id}
                                date={dateStr}
                                isClosed={isClosed}
                                isHoliday={isHoliday}
                                isWeekend={isWeekend}
                                isToday={isToday}
                                isSelected={isSelectedCell}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {isCreateEditorCell && renderInlineEditor()}

                                    {isSelectedCell && !isCreateEditorCell && (
                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: cellShifts.length ? '0.15rem' : 0 }}>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ padding: '0.35rem 0.45rem', fontSize: '0.7rem' }}
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    startCreateEditor(user.id, dateStr)
                                                }}
                                            >
                                                <Plus size={12} />
                                            </button>
                                            {copiedShift && (
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.35rem 0.45rem', fontSize: '0.7rem' }}
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        void pasteIntoSelectedCell()
                                                    }}
                                                >
                                                    <ClipboardPaste size={12} />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {onLeave && cellShifts.length === 0 && (
                                        <div style={{
                                            fontSize: '0.7rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            fontWeight: 700,
                                            color: '#111827',
                                            backgroundColor: 'rgba(0,0,0,0.08)',
                                            borderRadius: '999px',
                                            padding: '0.25rem 0.5rem',
                                            alignSelf: 'flex-start'
                                        }}>
                                            Leave
                                        </div>
                                    )}

                                    {cellShifts.map((shift) => {
                                        const isConflict = conflicts.has(shift.id)
                                        const shiftViolations = violationsByShiftId.get(shift.id) || []
                                        const hasViolation = shiftViolations.length > 0
                                        const shiftOnLeave = getApprovedLeaveForDate(user.id, shift.date)
                                        const isSelectedShift = selectedShift?.id === shift.id
                                        const isEditingShift = editor?.mode === 'edit' && editor.shiftId === shift.id
                                        const pillTextColor = shiftOnLeave ? '#fff' : getContrastCssTextColor(shift.department.color_code)
                                        const useDarkForegroundAccent = pillTextColor === '#000'
                                        const pillActionBackground = useDarkForegroundAccent ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)'
                                        const pillActionBorder = useDarkForegroundAccent ? '1px solid rgba(0,0,0,0.16)' : '1px solid rgba(255,255,255,0.18)'
                                        const pillDefaultBorder = useDarkForegroundAccent ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.2)'
                                        const pillSelectedBorder = useDarkForegroundAccent ? '2px solid rgba(0,0,0,0.48)' : '2px solid rgba(255,255,255,0.95)'

                                        return (
                                            <DraggableShift key={shift.id} shift={shift} disabled={isEditingShift}>
                                                <div
                                                    onClick={(event) => handleShiftClick(event, shift)}
                                                    style={{
                                                        backgroundColor: shiftOnLeave ? '#000000' : shift.department.color_code,
                                                        color: pillTextColor,
                                                        padding: '6px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                        position: 'relative',
                                                        border: isConflict
                                                            ? '2px solid #ef4444'
                                                            : hasViolation
                                                                ? '2px solid #f59e0b'
                                                                : isSelectedShift
                                                                    ? pillSelectedBorder
                                                                    : pillDefaultBorder,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: '600', marginBottom: '1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
                                                        {shift.department.name}
                                                        <div style={{ display: 'flex', gap: '2px' }}>
                                                            {isSelectedShift && !isEditingShift && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onPointerDown={(event) => event.stopPropagation()}
                                                                        onClick={(event) => {
                                                                            event.stopPropagation()
                                                                            copyShift(shift)
                                                                        }}
                                                                        style={{ background: pillActionBackground, border: pillActionBorder, color: pillTextColor, borderRadius: '4px', padding: '2px', display: 'inline-flex', cursor: 'pointer' }}
                                                                    >
                                                                        <Copy size={11} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onPointerDown={(event) => event.stopPropagation()}
                                                                        onClick={(event) => {
                                                                            event.stopPropagation()
                                                                            startEditEditor(shift)
                                                                        }}
                                                                        style={{ background: pillActionBackground, border: pillActionBorder, color: pillTextColor, borderRadius: '4px', padding: '2px', display: 'inline-flex', cursor: 'pointer' }}
                                                                    >
                                                                        <Pencil size={11} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onPointerDown={(event) => event.stopPropagation()}
                                                                        onClick={(event) => {
                                                                            event.stopPropagation()
                                                                            startRepeatEditor(shift)
                                                                        }}
                                                                        style={{ background: pillActionBackground, border: pillActionBorder, color: pillTextColor, borderRadius: '4px', padding: '2px', display: 'inline-flex', cursor: 'pointer' }}
                                                                    >
                                                                        <Repeat size={11} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {isConflict && <AlertTriangle size={12} color={pillTextColor} fill="#ef4444" />}
                                                            {hasViolation && (
                                                                <div title={shiftViolations.map((violation) => violation.message).join('\n')} style={{ cursor: 'help' }}>
                                                                    <AlertCircle size={12} color={pillTextColor} fill="#f59e0b" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isEditingShift ? renderInlineEditor() : (
                                                        <div style={{ opacity: 0.9 }}>{shift.start_time} - {shift.end_time}</div>
                                                    )}
                                                </div>
                                            </DraggableShift>
                                        )
                                    })}
                                </div>
                            </DroppableCell>
                        </td>
                    )
                })}
            </tr>
        ))
    }

    const renderRosterColumnGroup = () => (
        <colgroup>
            <col style={{ width: '200px' }} />
            {daysInMonth.map((day) => (
                <col key={format(day, 'yyyy-MM-dd')} style={{ width: '120px' }} />
            ))}
        </colgroup>
    )

    const renderRosterHeaderRow = () => (
        <tr>
            <th
                className="roster-table-staff roster-staff-header"
                style={{
                    padding: '1rem',
                    fontWeight: '600',
                    borderBottom: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    top: 0
                }}
            >
                Staff Member
            </th>
            {daysInMonth.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const status = getDayStatus(dateStr)
                const isHoliday = status?.status === 'HOLIDAY'
                const isClosed = status?.status === 'CLOSED'
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const isToday = isSameDay(day, new Date())
                const dayViolations = (violationsByDate.get(dateStr) || []).filter((violation) => violation.type === 'UNDERSTAFFED')
                const dayViolationMessages = dayViolations.map((violation) => violation.message).join('\n')

                return (
                    <th
                        key={dateStr}
                        className="roster-table-day"
                        style={{
                            padding: '0.75rem',
                            textAlign: 'center',
                            borderBottom: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            backgroundColor: isToday
                                ? 'rgba(var(--primary-rgb), 0.12)'
                                : isHoliday
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : isClosed
                                        ? 'var(--muted)'
                                        : isWeekend
                                            ? 'rgba(148, 163, 184, 0.08)'
                                            : 'var(--background)',
                            color: isHoliday ? 'var(--destructive)' : 'var(--foreground)',
                            minWidth: '120px',
                            top: 0,
                            boxShadow: isToday ? 'inset 0 -2px 0 rgba(var(--primary-rgb), 0.45)' : 'none'
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>{format(day, 'EEE')}</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{format(day, 'd')}</div>
                        <div style={{ fontSize: '0.65rem', marginTop: '0.3rem', color: 'var(--muted-foreground)' }}>
                            {shiftsPerDay[dateStr] || 0} shifts
                            {approvedLeavePerDay[dateStr] ? ` | ${approvedLeavePerDay[dateStr]} leave` : ''}
                        </div>
                        {alertCountPerDay[dateStr] ? (
                            <div
                                title={dayViolationMessages}
                                style={{
                                    marginTop: '0.35rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.2rem 0.45rem',
                                    borderRadius: '999px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.14)',
                                    color: '#b45309',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    cursor: 'help'
                                }}
                            >
                                <AlertCircle size={11} />
                                {alertCountPerDay[dateStr]} staffing gap{alertCountPerDay[dateStr] === 1 ? '' : 's'}
                            </div>
                        ) : null}
                        {status?.event_note && <div style={{ fontSize: '0.65rem', marginTop: '2px', fontWeight: '500' }}>{status.event_note}</div>}
                    </th>
                )
            })}
        </tr>
    )

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
                {(copiedShift || selectedCell) && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: 'rgba(var(--primary-rgb), 0.06)',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>
                            {copiedShift
                                ? `Copied shift: ${copiedShift.departmentName} ${copiedShift.start_time}-${copiedShift.end_time}. Select a cell and press Ctrl+V.`
                                : 'Select a shift to copy it, or select a cell to add a new shift quickly.'}
                            <div style={{ marginTop: '0.3rem', color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>
                                Shortcuts: Arrows move, Ctrl/Cmd+C copy, Ctrl/Cmd+V paste, Ctrl/Cmd+Z undo, Delete remove, F2 edit, N new, Ctrl/Cmd+D duplicate, Ctrl/Cmd+R repeat.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {history.length > 0 && (
                                <button type="button" className="btn btn-secondary" style={{ padding: '0.55rem 0.8rem' }} onClick={() => void undoLastAction()}>
                                    Undo Last Action
                                </button>
                            )}
                            {copiedShift && selectedCell && (
                                <button type="button" className="btn btn-secondary" style={{ padding: '0.55rem 0.8rem' }} onClick={() => void pasteIntoSelectedCell()}>
                                    Paste Into Selected Cell
                                </button>
                            )}
                            {selectedShift && (
                                <button type="button" className="btn btn-secondary" style={{ padding: '0.55rem 0.8rem' }} onClick={() => startRepeatEditor(selectedShift)}>
                                    Repeat Shift
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div
                    ref={gridScrollRef}
                    className="roster-grid-scroll"
                    onScroll={handleGridScroll}
                >
                    <table className="roster-table" style={{ minWidth: rosterTableMinWidth }}>
                        {renderRosterColumnGroup()}
                        <thead>
                            {renderRosterHeaderRow()}
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={daysInMonth.length + 1} className="roster-table-section-primary">
                                    Full Time & Cafe
                                </td>
                            </tr>
                            {CATEGORY_ORDER.flatMap((category) => {
                                const categoryUsers = groupedUsers.FULL_TIME[category]
                                if (!categoryUsers || categoryUsers.length === 0) return []

                                return [
                                    <tr key={`ft-section-${category}`}>
                                        <td colSpan={daysInMonth.length + 1} className="roster-table-section-secondary">
                                            {category === 'Management' ? 'Management (MOD)' : category === 'Shift Manager' ? 'Shift Manager (SMOD)' : category}
                                        </td>
                                    </tr>,
                                    ...renderUserRows(categoryUsers)
                                ]
                            })}

                            <tr>
                                <td colSpan={daysInMonth.length + 1} className="roster-table-section-primary">
                                    Part Time
                                </td>
                            </tr>
                            {CATEGORY_ORDER.flatMap((category) => {
                                const categoryUsers = groupedUsers.PART_TIME[category]
                                if (!categoryUsers || categoryUsers.length === 0) return []

                                return [
                                    <tr key={`pt-section-${category}`}>
                                        <td colSpan={daysInMonth.length + 1} className="roster-table-section-secondary">
                                            {category === 'Management' ? 'Management (MOD)' : category === 'Shift Manager' ? 'Shift Manager (SMOD)' : category}
                                        </td>
                                    </tr>,
                                    ...renderUserRows(categoryUsers)
                                ]
                            })}
                        </tbody>
                    </table>
                </div>
                <div
                    ref={bottomScrollRef}
                    className="roster-grid-bottom-scroll"
                    onScroll={handleBottomScroll}
                    aria-label="Roster horizontal scrollbar"
                >
                    <div className="roster-grid-bottom-scroll-inner" style={{ minWidth: rosterTableMinWidth }} />
                </div>

                {repeatState && (
                    <div
                        onClick={() => setRepeatState(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.38)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                            zIndex: 80
                        }}
                    >
                        {renderRepeatEditor()}
                    </div>
                )}
                {renderBaseScheduleModal()}
            </div>
        </DndContext>
    )
}
