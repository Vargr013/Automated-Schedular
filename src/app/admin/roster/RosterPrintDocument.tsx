import { format } from 'date-fns'
import {
    buildRosterExportModel,
    getContrastTextColor,
    type ExportLeave,
    type ExportShift,
    type ExportUser,
    type RosterExportModel,
    type WeekDayCell,
    type WeekSection
} from './export-layout'
import styles from './roster-print.module.css'

type User = ExportUser
type Shift = ExportShift
type Leave = ExportLeave

function getEmptyCellClass(dayCell: WeekDayCell) {
    if (!dayCell.isInMonth) return styles.emptyOutMonth
    if (dayCell.isHoliday) return styles.emptyHoliday
    return styles.emptyInMonth
}

function flattenRows(sections: WeekSection[]) {
    return sections.flatMap((section) => section.rows)
}

function renderShiftPair(dayCell: WeekDayCell, key: string) {
    if (dayCell.onLeave) {
        return [
            <td key={`${key}-start`} className={styles.blackFill}>LEAVE</td>,
            <td key={`${key}-end`} className={styles.blackFill}></td>
        ]
    }

    if (dayCell.departmentColor && dayCell.startTime && dayCell.endTime) {
        const textColor = getContrastTextColor(dayCell.departmentColor) === 'FFFFFF' ? '#fff' : '#000'
        const style = {
            backgroundColor: dayCell.departmentColor,
            color: textColor
        }

        return [
            <td key={`${key}-start`} style={style}>{dayCell.startTime}</td>,
            <td key={`${key}-end`} style={style}>{dayCell.endTime}</td>
        ]
    }

    const emptyClass = getEmptyCellClass(dayCell)
    return [
        <td key={`${key}-start`} className={emptyClass}></td>,
        <td key={`${key}-end`} className={emptyClass}></td>
    ]
}

function renderSummaryRow(label: string, values: string[]) {
    return (
        <tr>
            <th className={`${styles.leadCell} ${styles.greyFill}`}>{label}</th>
            {values.map((value, index) => (
                <td key={`${label}-${index}`} colSpan={2} className={styles.greyFill}>
                    {value}
                </td>
            ))}
        </tr>
    )
}

export function buildRosterPrintModel({
    users,
    shifts,
    leaves,
    currentMonth
}: {
    users: User[]
    shifts: Shift[]
    leaves: Leave[]
    currentMonth: string
}) {
    return buildRosterExportModel({
        users,
        shifts,
        leaves,
        currentMonth
    })
}

export default function RosterPrintDocument({
    model
}: {
    model: RosterExportModel
}) {
    return (
        <div className={styles.document}>
            <header className={styles.header}>
                <h1 className={styles.brand}>CityROCK Johannesburg</h1>
                <p className={styles.subtitle}>Staff Schedule: {model.monthTitle}</p>
                <hr className={styles.rule} />
            </header>

            {model.weeks.map((week, weekIndex) => {
                const fullTimeRows = flattenRows(week.fullTimeSections)
                const partTimeRows = flattenRows(week.partTimeSections)

                return (
                    <section key={`${week.weekLabel}-${weekIndex}`} className={styles.weekBlock}>
                        <div className={styles.weekLabel}>{week.weekLabel}</div>
                        <table className={styles.table}>
                            <colgroup>
                                <col className={styles.nameCol} />
                                {Array.from({ length: 14 }).map((_, index) => (
                                    <col key={index} className={styles.timeCol} />
                                ))}
                            </colgroup>
                            <tbody>
                                <tr>
                                    <th className={styles.dateFill}></th>
                                    {week.days.map((day, dayIndex) => (
                                        <th key={dayIndex} colSpan={2} className={styles.dateFill}>
                                            {format(day, 'dd-MMM')}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    <th className={styles.blackFill}></th>
                                    {week.introNames.flatMap((value, index) => (
                                        value
                                            ? [
                                                <td key={`intro-label-${index}`} className={styles.introFill}>Intro</td>,
                                                <td key={`intro-name-${index}`} className={styles.introFill}>{value}</td>
                                            ]
                                            : [
                                                <td key={`intro-empty-a-${index}`} className={styles.blackFill}></td>,
                                                <td key={`intro-empty-b-${index}`} className={styles.blackFill}></td>
                                            ]
                                    ))}
                                </tr>
                                <tr>
                                    <th className={styles.blackFill}></th>
                                    {week.days.map((day, dayIndex) => (
                                        <th key={dayIndex} colSpan={2} className={styles.blackFill}>
                                            {format(day, 'EEEE')}
                                        </th>
                                    ))}
                                </tr>
                                {renderSummaryRow('MOD', week.modNames)}
                                {renderSummaryRow('SMOD', week.smodNames)}
                                <tr>
                                    <th colSpan={15} className={styles.greyFill}>Full time &amp; Cafe</th>
                                </tr>
                                {fullTimeRows.map((row) => (
                                    <tr key={`full-${row.user.id}`}>
                                        <th className={styles.nameCell}>{row.user.name}</th>
                                        {row.dayCells.flatMap((dayCell, dayIndex) => renderShiftPair(dayCell, `full-${row.user.id}-${dayIndex}`))}
                                    </tr>
                                ))}
                                <tr>
                                    <th colSpan={15} className={styles.partTimeFill}>Part time</th>
                                </tr>
                                {partTimeRows.map((row) => (
                                    <tr key={`part-${row.user.id}`}>
                                        <th className={styles.nameCell}>{row.user.name}</th>
                                        {row.dayCells.flatMap((dayCell, dayIndex) => renderShiftPair(dayCell, `part-${row.user.id}-${dayIndex}`))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={styles.footerSpace}></div>
                    </section>
                )
            })}
        </div>
    )
}
