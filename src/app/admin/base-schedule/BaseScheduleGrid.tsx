'use client'

import { useState } from 'react'
import { createBaseRule, deleteBaseRule, moveBaseRule, updateBaseRule } from '@/app/actions/rules'
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { getContrastCssTextColor } from '../roster/color-utils'
import DraggableBaseRule from './DraggableBaseRule'
import DroppableBaseCell from './DroppableBaseCell'

type User = {
    id: number
    name: string
}

type Template = {
    id: number
    name: string
    start_time: string
    end_time: string
    department: {
        id: number
        name: string
        color_code: string
    }
}

type BaseRule = {
    id: number
    user_id: number
    day_of_week: number
    template_id: number
    template: Template
}

type BaseScheduleEditorState = {
    mode: 'create' | 'edit'
    userId: number
    dayIndex: number
    ruleId?: number
    templateId?: number
}

const WEEK_DAYS = [
    { name: 'Monday', id: 1 },
    { name: 'Tuesday', id: 2 },
    { name: 'Wednesday', id: 3 },
    { name: 'Thursday', id: 4 },
    { name: 'Friday', id: 5 },
    { name: 'Saturday', id: 6 },
    { name: 'Sunday', id: 0 },
]

export default function BaseScheduleGrid({
    users,
    templates,
    rules
}: {
    users: User[]
    templates: Template[]
    rules: BaseRule[]
}) {
    const [editor, setEditor] = useState<BaseScheduleEditorState | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const ruleId = active.data.current?.ruleId
            const [userIdStr, dayIndexStr] = (over.id as string).split('|')
            const userId = parseInt(userIdStr)
            const dayIndex = parseInt(dayIndexStr)

            if (ruleId && userId && !isNaN(dayIndex)) {
                await moveBaseRule(ruleId, userId, dayIndex)
            }
        }
    }

    const getRuleForCell = (userId: number, dayIndex: number) => {
        return rules.find(r => r.user_id === userId && r.day_of_week === dayIndex)
    }

    const getDayName = (dayIndex: number) => {
        return WEEK_DAYS.find(d => d.id === dayIndex)?.name || 'Unknown'
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `200px repeat(7, minmax(140px, 1fr))` }}>
                        <div style={{
                            padding: '1rem',
                            fontWeight: '600',
                            borderBottom: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            background: 'var(--background)',
                            position: 'sticky',
                            left: 0
                        }}>Staff Member</div>
                        {WEEK_DAYS.map((day, index) => (
                            <div key={day.id} style={{
                                padding: '1rem',
                                textAlign: 'center',
                                fontWeight: '600',
                                borderBottom: '1px solid var(--border)',
                                borderRight: index === 6 ? 'none' : '1px solid var(--border)',
                                background: 'var(--muted)',
                                color: 'var(--muted-foreground)'
                            }}>
                                {day.name}
                            </div>
                        ))}

                        {users.map(user => (
                            <div key={user.id} style={{ display: 'contents' }}>
                                <div style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--border)',
                                    borderRight: '1px solid var(--border)',
                                    background: 'var(--background)',
                                    position: 'sticky',
                                    left: 0,
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    {user.name}
                                </div>
                                {WEEK_DAYS.map((day, index) => {
                                    const rule = getRuleForCell(user.id, day.id)
                                    const pillTextColor = rule ? getContrastCssTextColor(rule.template.department.color_code) : '#fff'
                                    const useDarkForegroundAccent = pillTextColor === '#000'

                                    return (
                                        <div
                                            key={`${user.id}-${day.id}`}
                                            onClick={() => {
                                                if (!rule) {
                                                    setEditor({
                                                        mode: 'create',
                                                        userId: user.id,
                                                        dayIndex: day.id
                                                    })
                                                }
                                            }}
                                            style={{
                                                borderBottom: '1px solid var(--border)',
                                                borderRight: index === 6 ? 'none' : '1px solid var(--border)',
                                                position: 'relative',
                                            }}
                                        >
                                            <DroppableBaseCell userId={user.id} dayIndex={day.id}>
                                                {rule ? (
                                                    <DraggableBaseRule key={rule.id} rule={rule}>
                                                        <div
                                                            onClick={(event) => {
                                                                event.stopPropagation()
                                                                setEditor({
                                                                    mode: 'edit',
                                                                    userId: user.id,
                                                                    dayIndex: day.id,
                                                                    ruleId: rule.id,
                                                                    templateId: rule.template_id
                                                                })
                                                            }}
                                                            style={{
                                                                backgroundColor: rule.template.department.color_code,
                                                                color: pillTextColor,
                                                                padding: '6px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                                position: 'relative',
                                                                border: useDarkForegroundAccent ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.18)'
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: '600' }}>{rule.template.name}</div>
                                                            <div style={{ opacity: 0.9 }}>{rule.template.start_time} - {rule.template.end_time}</div>
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    if (confirm('Remove base rule?')) deleteBaseRule(rule.id)
                                                                }}
                                                                onPointerDown={(event) => event.stopPropagation()}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '4px',
                                                                    right: '4px',
                                                                    background: useDarkForegroundAccent ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)',
                                                                    border: useDarkForegroundAccent ? '1px solid rgba(0,0,0,0.16)' : '1px solid rgba(255,255,255,0.18)',
                                                                    color: pillTextColor,
                                                                    cursor: 'pointer',
                                                                    fontSize: '10px',
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                x
                                                            </button>
                                                        </div>
                                                    </DraggableBaseRule>
                                                ) : (
                                                    <div
                                                        style={{ height: '100%', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}
                                                        onMouseEnter={(event) => event.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={(event) => event.currentTarget.style.opacity = '0'}
                                                    >
                                                        <span style={{ fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>+</span>
                                                    </div>
                                                )}
                                            </DroppableBaseCell>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {editor && (
                    <div className="modal-overlay" onClick={() => setEditor(null)}>
                        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem' }}>{editor.mode === 'edit' ? 'Edit Base Shift' : 'Assign Base Shift'}</h3>
                                <button onClick={() => setEditor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>&times;</button>
                            </div>

                            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Staff:</span>
                                    <span style={{ fontWeight: '600' }}>{users.find(u => u.id === editor.userId)?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Day:</span>
                                    <span style={{ fontWeight: '600' }}>{getDayName(editor.dayIndex)}</span>
                                </div>
                            </div>

                            <form
                                key={`${editor.mode}-${editor.ruleId ?? 'new'}-${editor.userId}-${editor.dayIndex}-${editor.templateId ?? 'none'}`}
                                action={async (formData) => {
                                    if (editor.mode === 'edit' && editor.ruleId) {
                                        await updateBaseRule(editor.ruleId, formData)
                                    } else {
                                        await createBaseRule(formData)
                                    }
                                    setEditor(null)
                                }}
                            >
                                <input type="hidden" name="user_id" value={editor.userId} />
                                <input type="hidden" name="day_of_week" value={editor.dayIndex} />

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Select Template</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                        {templates.map(template => (
                                            <label
                                                key={template.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    padding: '0.75rem',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="template-option"
                                            >
                                                <input
                                                    type="radio"
                                                    name="template_id"
                                                    value={template.id}
                                                    required
                                                    defaultChecked={editor.templateId === template.id}
                                                    style={{ accentColor: 'var(--primary)' }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {template.name}
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            padding: '2px 6px',
                                                            borderRadius: '10px',
                                                            backgroundColor: `${template.department.color_code}20`,
                                                            color: template.department.color_code
                                                        }}>
                                                            {template.department.name}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                                        {template.start_time} - {template.end_time}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditor(null)}>Cancel</button>
                                    <button type="submit" className="btn" style={{ flex: 1 }}>{editor.mode === 'edit' ? 'Save' : 'Assign'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DndContext>
    )
}
