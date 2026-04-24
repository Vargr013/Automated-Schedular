import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import {
    calculateShiftHours,
    detectScheduleBlocks,
    getCellFillHex,
    mapColourToCategory,
    normaliseColour,
    parseHumanRosterWorksheet,
    parseShiftValue,
    selectHumanScheduleSheet
} from '../src/app/actions/human-roster-import'

async function loadWorkbook(path: string) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(path)
    return workbook
}

function buildSyntheticWorkbook(sheetName = 'June Gym') {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sheetName)

    worksheet.getCell('B1').value = new Date('2026-06-01T00:00:00.000Z')
    worksheet.getCell('C1').value = new Date('2026-06-01T00:00:00.000Z')
    worksheet.getCell('D1').value = new Date('2026-06-02T00:00:00.000Z')
    worksheet.getCell('E1').value = new Date('2026-06-02T00:00:00.000Z')
    worksheet.getCell('F1').value = new Date('2026-06-03T00:00:00.000Z')
    worksheet.getCell('G1').value = new Date('2026-06-03T00:00:00.000Z')
    worksheet.getCell('H1').value = new Date('2026-06-04T00:00:00.000Z')
    worksheet.getCell('I1').value = new Date('2026-06-04T00:00:00.000Z')
    worksheet.getCell('J1').value = new Date('2026-06-05T00:00:00.000Z')
    worksheet.getCell('K1').value = new Date('2026-06-05T00:00:00.000Z')
    worksheet.getCell('L1').value = new Date('2026-06-06T00:00:00.000Z')
    worksheet.getCell('M1').value = new Date('2026-06-06T00:00:00.000Z')
    worksheet.getCell('N1').value = new Date('2026-06-07T00:00:00.000Z')
    worksheet.getCell('O1').value = new Date('2026-06-07T00:00:00.000Z')

    ;['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach((day, index) => {
        const column = 2 + index * 2
        worksheet.getCell(2, column).value = day
        worksheet.getCell(2, column + 1).value = day
    })

    worksheet.getCell('A3').value = 'MOD'
    worksheet.getCell('P3').value = 'Total'
    worksheet.getCell('A4').value = 'SMOD'
    worksheet.getCell('A5').value = 'Full time & Cafe'
    worksheet.getCell('P5').value = 'Hrs'
    worksheet.getCell('A6').value = 'Xander'
    worksheet.getCell('B6').value = '08:00'
    worksheet.getCell('C6').value = '16:00'
    worksheet.getCell('B6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }
    worksheet.getCell('C6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }
    worksheet.getCell('P6').value = 7

    worksheet.getCell('A7').value = 'Part time'
    worksheet.getCell('A8').value = 'Chloe'
    worksheet.getCell('D8').value = 'Intro Chloe'
    worksheet.getCell('D8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123456' } }
    worksheet.getCell('F8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }

    return workbook
}

async function main() {
    assert.equal(normaliseColour('FF92D050'), '#92D050')
    assert.equal(calculateShiftHours('22:00', '06:00'), 8)
    assert.deepEqual(parseShiftValue('8:00 - 17:00'), {
        rawValue: '8:00 - 17:00',
        startTime: '08:00',
        endTime: '17:00',
        hours: 9
    })

    const synthetic = buildSyntheticWorkbook('Renamed Monthly Gym')
    const syntheticSelection = selectHumanScheduleSheet(synthetic)
    assert.equal(syntheticSelection?.worksheet.name, 'Renamed Monthly Gym')
    assert.equal(detectScheduleBlocks(syntheticSelection!.worksheet).length, 1)
    assert.equal(getCellFillHex(syntheticSelection!.worksheet.getCell('B6')), '#92D050')
    assert.equal(mapColourToCategory('#92D050', { colourCategoryMap: { '#92D050': 'Gym Floor' }, categoryDepartmentAliases: {}, trustSheetTotals: false, totalMismatchToleranceHours: 0.05 }), 'Gym Floor')
    assert.equal(mapColourToCategory('#123456'), 'Unknown')

    const syntheticParsed = parseHumanRosterWorksheet({
        worksheet: syntheticSelection!.worksheet,
        workbookName: 'synthetic.xlsx',
        config: {
            colourCategoryMap: {
                '#92D050': 'Gym Floor',
                '#FFFF00': 'Cafe',
                NO_FILL: 'Uncategorised'
            },
            categoryDepartmentAliases: {},
            trustSheetTotals: false,
            totalMismatchToleranceHours: 0.05
        }
    })
    assert.ok(syntheticParsed.records.some((record) => record.staffName === 'Xander' && record.category === 'Gym Floor'))
    assert.ok(syntheticParsed.warnings.unknownColours.some((warning) => warning.sourceColor === '#123456'))
    assert.ok(syntheticParsed.warnings.blankColouredCells.some((warning) => warning.sourceColor === '#FFFF00'))
    assert.ok(syntheticParsed.warnings.totalMismatches.some((warning) => warning.cell === 'P6'))
    assert.ok(syntheticParsed.warnings.unparsedValues.some((warning) => warning.rawValue === 'Intro Chloe'))

    const realWorkbook = await loadWorkbook('Imported/May Gym schedule.xlsx')
    const realSelection = selectHumanScheduleSheet(realWorkbook)
    assert.equal(realSelection?.worksheet.name, 'Gym May')
    const realBlocks = detectScheduleBlocks(realSelection!.worksheet)
    assert.equal(realBlocks.length, 5)
    const realParsed = parseHumanRosterWorksheet({
        worksheet: realSelection!.worksheet,
        workbookName: 'May Gym schedule.xlsx'
    })
    assert.ok(realParsed.records.some((record) => record.role === 'Event' && record.rawValue === 'Freedom Day'))
    assert.ok(realParsed.records.some((record) => record.role === 'MOD' && record.rawValue === 'Angie'))

    const renamedWorkbook = await loadWorkbook('Imported/May Gym schedule.xlsx')
    renamedWorkbook.getWorksheet('Gym May')!.name = 'July Gym'
    const renamedSelection = selectHumanScheduleSheet(renamedWorkbook)
    assert.equal(renamedSelection?.worksheet.name, 'July Gym')

    console.log('human roster import tests passed')
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
