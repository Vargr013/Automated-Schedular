'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    importRoster,
    confirmRosterImport,
    resolveRosterImportColours,
    type ColourMappingInput,
    type ImportReport
} from '@/app/actions/import-schedule'
import { useRouter } from 'next/navigation'

type ImportTab = 'overview' | 'colours' | 'warnings' | 'records' | 'conflicts'

type WarningItem = {
    message: string
    sheetName: string
    cell?: string
    rowNumber?: number
    sourceColor?: string
    rawValue?: string
}

type ParsedRecord = NonNullable<ImportReport['records']>[number]
type ColourSelections = Record<string, string>

const WARNING_LABELS: Record<keyof NonNullable<ImportReport['warnings']>, string> = {
    unknownColours: 'Unknown Colours',
    unparsedValues: 'Unparsed Values',
    blankColouredCells: 'Blank Coloured Cells',
    totalMismatches: 'Total Mismatches',
    skippedCells: 'Skipped Rows',
    missingDates: 'Missing Dates',
    duplicateStaffNames: 'Duplicate Staff',
    staffRowsWithNoShifts: 'Staff Rows With No Parsed Shifts'
}

function getCoverageLabel(report: ImportReport) {
    if (report.coveredDates.length === 0) return 'No dated coverage detected'
    return `${report.coveredDates[0]} to ${report.coveredDates[report.coveredDates.length - 1]}`
}

function flattenWarnings(report: ImportReport) {
    if (!report.warnings) return []

    return Object.entries(report.warnings).flatMap(([key, warnings]) =>
        (warnings as WarningItem[]).map((warning) => ({
            type: WARNING_LABELS[key as keyof NonNullable<ImportReport['warnings']>] || key,
            ...warning
        }))
    )
}

function getWarningCount(report: ImportReport) {
    return flattenWarnings(report).length
}

function getRecordStats(records: ParsedRecord[] = []) {
    const writeable = records.filter((record) => record.startTime && record.endTime && record.staffName).length
    const events = records.filter((record) => !record.staffName || record.role === 'Event').length
    const unknown = records.filter((record) => record.category === 'Unknown').length
    const blankColoured = records.filter((record) => !record.rawValue && record.sourceColor !== 'NO_FILL' && record.sourceColor !== '#FFFFFF').length

    return { writeable, events, unknown, blankColoured }
}

function groupRecordsByColour(records: ParsedRecord[] = []) {
    const groups = new Map<string, { colour: string, category: string, count: number }>()

    records.forEach((record) => {
        const key = `${record.sourceColor}|${record.category}`
        const existing = groups.get(key)
        if (existing) {
            existing.count += 1
        } else {
            groups.set(key, {
                colour: record.sourceColor,
                category: record.category,
                count: 1
            })
        }
    })

    return Array.from(groups.values()).sort((a, b) => b.count - a.count)
}

function getInitialColourSelections(report: ImportReport): ColourSelections {
    return Object.fromEntries(
        (report.colourResolutions || [])
            .filter((resolution) => resolution.mappedDepartmentId)
            .map((resolution) => [resolution.sourceColor, String(resolution.mappedDepartmentId)])
    )
}

function getSelectedMappings(selections: ColourSelections): ColourMappingInput[] {
    return Object.entries(selections)
        .map(([sourceColor, departmentId]) => ({
            sourceColor,
            departmentId: Number(departmentId)
        }))
        .filter((mapping) => mapping.sourceColor && Number.isFinite(mapping.departmentId) && mapping.departmentId > 0)
}

function colourSwatchStyle(colour: string): React.CSSProperties {
    const isHex = /^#[0-9A-F]{6}$/i.test(colour)
    return {
        width: 14,
        height: 14,
        borderRadius: 4,
        background: isHex ? colour : 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 3px, #cbd5e1 3px, #cbd5e1 6px)',
        border: '1px solid rgba(15, 23, 42, 0.18)',
        flexShrink: 0
    }
}

function StatCard({ label, value, note, tone = 'neutral' }: {
    label: string
    value: string | number
    note?: string
    tone?: 'neutral' | 'good' | 'warn' | 'danger'
}) {
    const accent = {
        neutral: '#334155',
        good: '#047857',
        warn: '#b45309',
        danger: '#b91c1c'
    }[tone]

    return (
        <div style={{
            padding: '1rem',
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: 'var(--background)',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)'
        }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', fontWeight: 700 }}>{label}</div>
            <div style={{ marginTop: '0.35rem', fontSize: '1.75rem', fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
            {note && <div style={{ marginTop: '0.45rem', color: 'var(--muted-foreground)', fontSize: '0.8rem', lineHeight: 1.35 }}>{note}</div>}
        </div>
    )
}

function TabButton({ active, label, count, onClick }: {
    active: boolean
    label: string
    count?: number
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                border: '1px solid var(--border)',
                background: active ? '#111827' : 'var(--background)',
                color: active ? '#fff' : 'var(--foreground)',
                borderRadius: 999,
                padding: '0.55rem 0.85rem',
                cursor: 'pointer',
                fontSize: '0.83rem',
                fontWeight: 700,
                display: 'inline-flex',
                gap: '0.45rem',
                alignItems: 'center'
            }}
        >
            {label}
            {count !== undefined && (
                <span style={{
                    minWidth: 22,
                    padding: '0.08rem 0.35rem',
                    borderRadius: 999,
                    background: active ? 'rgba(255,255,255,0.18)' : 'var(--muted)',
                    fontSize: '0.72rem'
                }}>{count}</span>
            )}
        </button>
    )
}

function EmptyState({ title, detail }: { title: string, detail: string }) {
    return (
        <div style={{
            padding: '2rem',
            borderRadius: 16,
            border: '1px dashed var(--border)',
            background: 'var(--background)',
            textAlign: 'center'
        }}>
            <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>{title}</div>
            <div style={{ marginTop: '0.35rem', color: 'var(--muted-foreground)', fontSize: '0.88rem' }}>{detail}</div>
        </div>
    )
}

function OverviewPanel({ report }: { report: ImportReport }) {
    const records = report.records || []
    const recordStats = getRecordStats(records)
    const colourGroups = groupRecordsByColour(records)

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {report.detectedMonth && (
                <div style={{
                    padding: '0.9rem 1rem',
                    borderRadius: 14,
                    border: report.detectedMonth !== '' ? '1px solid #fde68a' : '1px solid var(--border)',
                    background: '#fffbeb',
                    color: '#92400e',
                    fontSize: '0.9rem',
                    lineHeight: 1.45
                }}>
                    Detected month: <strong>{report.detectedMonth}</strong>. Import coverage is <strong>{getCoverageLabel(report)}</strong>.
                </div>
            )}

            {report.source && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: 16,
                    background: '#f8fafc',
                    border: '1px solid var(--border)'
                }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Workbook</div>
                        <div style={{ marginTop: '0.25rem', fontWeight: 700 }}>{report.source.workbookName}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selected Sheet</div>
                        <div style={{ marginTop: '0.25rem', fontWeight: 700 }}>{report.source.sheetName}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Imported At</div>
                        <div style={{ marginTop: '0.25rem', fontWeight: 700 }}>{new Date(report.source.importedAt).toLocaleString()}</div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
                <StatCard label="Will Write" value={report.shiftsToCreate.length} tone={report.shiftsToCreate.length > 0 ? 'good' : 'danger'} note="Matched staff + department + times" />
                <StatCard label="Parsed Records" value={records.length || report.stats.totalShiftsFound} note="All meaningful cells found" />
                <StatCard label="Matched Users" value={report.stats.usersFound} note="Unique app staff matches" />
                <StatCard label="Warnings" value={getWarningCount(report)} tone={getWarningCount(report) > 0 ? 'warn' : 'good'} note="Review before overwrite" />
            </div>

            {records.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
                    <StatCard label="Time Records" value={recordStats.writeable} note="Parsed start/end times" />
                    <StatCard label="Events/Notes" value={recordStats.events} note="Preserved, not written" />
                    <StatCard label="Unknown Category" value={recordStats.unknown} tone={recordStats.unknown > 0 ? 'warn' : 'good'} />
                    <StatCard label="Blank Colour Cells" value={recordStats.blankColoured} tone={recordStats.blankColoured > 0 ? 'warn' : 'good'} />
                </div>
            )}

            {colourGroups.length > 0 && (
                <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 16, background: 'var(--background)' }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Colour/category map found in workbook</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                        {colourGroups.map((group) => (
                            <div key={`${group.colour}-${group.category}`} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                border: '1px solid var(--border)',
                                borderRadius: 999,
                                padding: '0.42rem 0.6rem',
                                background: '#f8fafc',
                                fontSize: '0.82rem',
                                fontWeight: 700
                            }}>
                                <span style={colourSwatchStyle(group.colour)} />
                                <span>{group.category}</span>
                                <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>{group.colour}</span>
                                <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>x{group.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function WarningsPanel({ report }: { report: ImportReport }) {
    const warnings = flattenWarnings(report)

    if (warnings.length === 0) {
        return <EmptyState title="No import warnings" detail="The parser did not report unknown colours, blank coloured cells, total mismatches, or skipped rows." />
    }

    return (
        <div style={{ display: 'grid', gap: '0.7rem' }}>
            {warnings.map((warning, index) => (
                <div key={`${warning.type}-${warning.cell || warning.rowNumber || index}`} style={{
                    display: 'grid',
                    gap: '0.4rem',
                    padding: '0.9rem',
                    border: '1px solid #fed7aa',
                    borderRadius: 14,
                    background: '#fff7ed'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#9a3412' }}>{warning.type}</strong>
                        <span style={{ color: '#9a3412', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            {warning.cell || (warning.rowNumber ? `row ${warning.rowNumber}` : warning.sheetName)}
                        </span>
                    </div>
                    <div style={{ color: '#7c2d12', lineHeight: 1.4 }}>{warning.message}</div>
                    {(warning.rawValue || warning.sourceColor) && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#9a3412' }}>
                            {warning.sourceColor && <span>Colour: <strong>{warning.sourceColor}</strong></span>}
                            {warning.rawValue && <span>Value: <strong>{warning.rawValue}</strong></span>}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

function ColoursPanel({
    report,
    selections,
    isResolving,
    onSelectionChange,
    onResolve
}: {
    report: ImportReport
    selections: ColourSelections
    isResolving: boolean
    onSelectionChange: (sourceColor: string, departmentId: string) => void
    onResolve: (persist: boolean) => void
}) {
    const colourResolutions = report.colourResolutions || []
    const departments = report.departmentOptions || []
    const selectedMappings = getSelectedMappings(selections)

    if (colourResolutions.length === 0) {
        return <EmptyState title="No workbook colours to resolve" detail="This import either came from the app export format or all meaningful cells had no fill colour." />
    }

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{
                padding: '1rem',
                borderRadius: 16,
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1e3a8a',
                lineHeight: 1.45
            }}>
                Assign a workbook colour to an existing department. Only time-based staff records become shifts; events and notes stay as reference records.
            </div>

            <div style={{ display: 'grid', gap: '0.8rem' }}>
                {colourResolutions.map((resolution) => {
                    const selectedDepartmentId = selections[resolution.sourceColor] || ''
                    return (
                        <div key={resolution.sourceColor} style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 300px)',
                            gap: '1rem',
                            padding: '1rem',
                            borderRadius: 16,
                            border: resolution.isUnknown ? '1px solid #fed7aa' : '1px solid var(--border)',
                            background: resolution.isUnknown ? '#fff7ed' : 'var(--background)'
                        }}>
                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ ...colourSwatchStyle(resolution.sourceColor), width: 24, height: 24 }} />
                                    <strong>{resolution.sourceColor}</strong>
                                    <span style={{ color: 'var(--muted-foreground)' }}>{resolution.category}</span>
                                    <span style={{
                                        borderRadius: 999,
                                        padding: '0.18rem 0.5rem',
                                        background: resolution.isUnknown ? '#fed7aa' : '#dcfce7',
                                        color: resolution.isUnknown ? '#9a3412' : '#166534',
                                        fontSize: '0.72rem',
                                        fontWeight: 800
                                    }}>
                                        {resolution.mappedDepartmentName ? `Maps to ${resolution.mappedDepartmentName}` : 'Unassigned'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', color: 'var(--muted-foreground)', fontSize: '0.84rem' }}>
                                    <span>{resolution.recordCount} records</span>
                                    <span>{resolution.timeRecordCount} time-based staff records</span>
                                </div>

                                {resolution.samples.length > 0 && (
                                    <div style={{ display: 'grid', gap: '0.35rem' }}>
                                        {resolution.samples.map((sample) => (
                                            <div key={`${resolution.sourceColor}-${sample.sourceCell}-${sample.date}`} style={{ color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
                                                <span style={{ fontFamily: 'monospace' }}>{sample.sourceCell}</span>
                                                {' '}
                                                {sample.date}
                                                {' '}
                                                {sample.staffName || 'Event'}
                                                {sample.rawValue ? `: ${sample.rawValue}` : ''}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem', alignContent: 'center' }}>
                                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Assign department
                                </label>
                                <select
                                    className="select"
                                    value={selectedDepartmentId}
                                    onChange={(event) => onSelectionChange(resolution.sourceColor, event.target.value)}
                                    disabled={isResolving}
                                >
                                    <option value="">Unassigned</option>
                                    {departments.map((department) => (
                                        <option key={department.id} value={department.id}>
                                            {department.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: '1rem',
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: '#fff'
            }}>
                <div style={{ color: 'var(--muted-foreground)', fontSize: '0.86rem', lineHeight: 1.4 }}>
                    {selectedMappings.length} colour mapping{selectedMappings.length === 1 ? '' : 's'} selected. Apply recalculates this import; Save also remembers mappings for future workbooks.
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={isResolving || selectedMappings.length === 0}
                        onClick={() => onResolve(false)}
                    >
                        {isResolving ? 'Applying...' : 'Apply to This Import'}
                    </button>
                    <button
                        type="button"
                        className="btn"
                        disabled={isResolving || selectedMappings.length === 0}
                        onClick={() => onResolve(true)}
                    >
                        {isResolving ? 'Saving...' : 'Save for Future Imports'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function RecordsPanel({ report }: { report: ImportReport }) {
    const records = report.records || []
    const visibleRecords = records.slice(0, 250)

    if (records.length === 0) {
        return <EmptyState title="No detailed records returned" detail="This is expected for legacy app-export imports. Human workbook imports return parsed record details here." />
    }

    return (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.86rem' }}>
                Showing {visibleRecords.length} of {records.length} parsed records. Records without staff names are preserved events/notes and will not be written as shifts.
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 16, background: 'var(--background)' }}>
                <table style={{ minWidth: 980, border: 'none', borderRadius: 0 }}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Staff / Role</th>
                            <th>Section</th>
                            <th>Raw Value</th>
                            <th>Time</th>
                            <th>Hours</th>
                            <th>Category</th>
                            <th>Cell</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRecords.map((record, index) => (
                            <tr key={`${record.sourceCell}-${record.date}-${index}`}>
                                <td>
                                    <div style={{ fontWeight: 700 }}>{record.date}</div>
                                    <div style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>{record.day}</div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 700 }}>{record.staffName || 'Event / note'}</div>
                                    <div style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>{record.role}</div>
                                </td>
                                <td>{record.section}</td>
                                <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>{record.rawValue || <span style={{ color: 'var(--muted-foreground)' }}>Blank coloured cell</span>}</td>
                                <td>{record.startTime && record.endTime ? `${record.startTime}-${record.endTime}` : <span style={{ color: 'var(--muted-foreground)' }}>Not time-based</span>}</td>
                                <td>{record.hours ?? '-'}</td>
                                <td>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                        <span style={colourSwatchStyle(record.sourceColor)} />
                                        <span>{record.category}</span>
                                    </span>
                                </td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>{record.sourceCell}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function ConflictsPanel({ report }: { report: ImportReport }) {
    if (report.conflicts.length === 0) {
        return <EmptyState title="No app-rule conflicts" detail="No leave conflicts or automation rule shortages were found for writeable shifts." />
    }

    return (
        <div style={{ display: 'grid', gap: '0.7rem' }}>
            {report.conflicts.map((conflict, index) => (
                <div key={`${conflict.type}-${conflict.date}-${index}`} style={{
                    padding: '0.9rem',
                    border: '1px solid #fecaca',
                    borderRadius: 14,
                    background: '#fef2f2'
                }}>
                    <div style={{ fontWeight: 800, color: '#991b1b' }}>{conflict.type === 'LEAVE_CONFLICT' ? 'Leave Conflict' : 'Rule Violation'}</div>
                    <div style={{ marginTop: '0.35rem', color: '#7f1d1d', lineHeight: 1.4 }}>{conflict.description}</div>
                    <div style={{ marginTop: '0.35rem', color: '#991b1b', fontSize: '0.8rem', fontFamily: 'monospace' }}>{conflict.date}</div>
                </div>
            ))}
        </div>
    )
}

function ImportReportModal({
    report,
    currentMonth,
    isProcessing,
    isResolving,
    activeTab,
    colourSelections,
    onTabChange,
    onColourSelectionChange,
    onResolveColours,
    onClose,
    onConfirm
}: {
    report: ImportReport
    currentMonth: string
    isProcessing: boolean
    isResolving: boolean
    activeTab: ImportTab
    colourSelections: ColourSelections
    onTabChange: (tab: ImportTab) => void
    onColourSelectionChange: (sourceColor: string, departmentId: string) => void
    onResolveColours: (persist: boolean) => void
    onClose: () => void
    onConfirm: () => void
}) {
    const warningCount = getWarningCount(report)
    const canConfirm = report.success && report.shiftsToCreate.length > 0 && !isProcessing
    const isHumanImport = Boolean(report.records)

    return (
        <div className="modal-overlay" style={{ zIndex: 9999, padding: '1rem' }}>
            <div
                className="modal-content"
                style={{
                    maxWidth: 1180,
                    width: 'min(1180px, 100%)',
                    height: 'min(88dvh, 920px)',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div style={{
                    padding: '1.25rem 1.4rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontSize: '1.45rem', letterSpacing: '-0.03em' }}>Import Review</h2>
                            <span style={{
                                borderRadius: 999,
                                padding: '0.25rem 0.55rem',
                                background: isHumanImport ? '#dbeafe' : '#dcfce7',
                                color: isHumanImport ? '#1d4ed8' : '#166534',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em'
                            }}>
                                {isHumanImport ? 'Human workbook' : 'App export'}
                            </span>
                        </div>
                        <p style={{ margin: '0.4rem 0 0', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                            Review what will be written before overwriting roster coverage for {report.detectedMonth || currentMonth}.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.6rem', color: 'var(--muted-foreground)', lineHeight: 1 }}
                        aria-label="Close import review"
                    >
                        &times;
                    </button>
                </div>

                <div style={{ padding: '0.9rem 1.4rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                    <TabButton active={activeTab === 'overview'} label="Overview" onClick={() => onTabChange('overview')} />
                    <TabButton active={activeTab === 'colours'} label="Colours" count={report.colourResolutions?.length} onClick={() => onTabChange('colours')} />
                    <TabButton active={activeTab === 'warnings'} label="Warnings" count={warningCount} onClick={() => onTabChange('warnings')} />
                    <TabButton active={activeTab === 'records'} label="Parsed Records" count={report.records?.length} onClick={() => onTabChange('records')} />
                    <TabButton active={activeTab === 'conflicts'} label="Conflicts" count={report.conflicts.length} onClick={() => onTabChange('conflicts')} />
                </div>

                <div style={{ padding: '1.2rem 1.4rem', overflowY: 'auto', flex: 1 }}>
                    {!report.success && (
                        <div style={{ padding: '1rem', borderRadius: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
                            <strong>Error:</strong> {report.message}
                        </div>
                    )}

                    {report.success && activeTab === 'overview' && <OverviewPanel report={report} />}
                    {report.success && activeTab === 'colours' && (
                        <ColoursPanel
                            report={report}
                            selections={colourSelections}
                            isResolving={isResolving}
                            onSelectionChange={onColourSelectionChange}
                            onResolve={onResolveColours}
                        />
                    )}
                    {report.success && activeTab === 'warnings' && <WarningsPanel report={report} />}
                    {report.success && activeTab === 'records' && <RecordsPanel report={report} />}
                    {report.success && activeTab === 'conflicts' && <ConflictsPanel report={report} />}
                </div>

                <div style={{
                    padding: '1rem 1.4rem',
                    borderTop: '1px solid var(--border)',
                    background: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ color: canConfirm ? 'var(--muted-foreground)' : '#991b1b', fontSize: '0.85rem', lineHeight: 1.4 }}>
                        {canConfirm
                            ? `Confirm will overwrite ${report.coveredDates.length} covered dates and write ${report.shiftsToCreate.length} matched shifts.`
                            : report.success
                                ? 'Nothing can be written yet because no matched shifts were found. Review warnings/records first.'
                                : 'Fix the import error before confirming.'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button
                            type="button"
                            className="btn"
                            onClick={onConfirm}
                            disabled={!canConfirm}
                            style={{ background: '#b91c1c', color: '#fff' }}
                        >
                            {isProcessing ? 'Overwriting...' : `Overwrite ${report.shiftsToCreate.length} Shifts`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function RosterImportButton({ currentMonth }: { currentMonth: string }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [isResolving, setIsResolving] = useState(false)
    const [report, setReport] = useState<ImportReport | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<ImportTab>('overview')
    const [colourSelections, setColourSelections] = useState<ColourSelections>({})
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const result = await importRoster(formData)
            setReport(result)
            setColourSelections(getInitialColourSelections(result))
            setActiveTab(result.success ? 'overview' : 'warnings')
            setIsOpen(true)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to import workbook'
            setReport({
                success: false,
                message,
                detectedMonth: '',
                coveredDates: [],
                shiftsToCreate: [],
                conflicts: [],
                stats: {
                    totalShiftsFound: 0,
                    usersFound: 0
                }
            })
            setActiveTab('warnings')
            setIsOpen(true)
        } finally {
            setIsProcessing(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleColourSelectionChange = (sourceColor: string, departmentId: string) => {
        setColourSelections((current) => ({
            ...current,
            [sourceColor]: departmentId
        }))
    }

    const handleResolveColours = async (persist: boolean) => {
        if (!report) return

        const mappings = getSelectedMappings(colourSelections)
        if (mappings.length === 0) return

        try {
            setIsResolving(true)
            const result = await resolveRosterImportColours(report, mappings, persist)
            setReport(result)
            setColourSelections(getInitialColourSelections(result))
            setActiveTab('overview')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to resolve colour mappings'
            alert(message)
        } finally {
            setIsResolving(false)
        }
    }

    const handleConfirm = async () => {
        if (!report || report.shiftsToCreate.length === 0) return

        try {
            setIsProcessing(true)
            await confirmRosterImport(report.shiftsToCreate, report.detectedMonth || currentMonth, report.coveredDates)
            setIsOpen(false)
            setReport(null)
            alert(`Roster overwritten successfully for ${report.detectedMonth || currentMonth}.`)
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to confirm roster import'
            alert(message)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setReport(null)
        setColourSelections({})
    }

    const portalTarget = typeof document === 'undefined' ? null : document.body

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx"
                className="hidden"
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="btn btn-secondary"
                style={{ marginLeft: '10px', backgroundColor: '#eab308', color: 'black' }}
            >
                {isProcessing ? 'Processing...' : 'Import Roster'}
            </button>

            {portalTarget && isOpen && report && createPortal(
                <ImportReportModal
                    report={report}
                    currentMonth={currentMonth}
                    isProcessing={isProcessing}
                    isResolving={isResolving}
                    activeTab={activeTab}
                    colourSelections={colourSelections}
                    onTabChange={setActiveTab}
                    onColourSelectionChange={handleColourSelectionChange}
                    onResolveColours={handleResolveColours}
                    onClose={handleClose}
                    onConfirm={handleConfirm}
                />,
                portalTarget
            )}
        </>
    )
}
