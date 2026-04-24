export type ColourCategoryMap = Record<string, string>

export type RosterImportConfig = {
    colourCategoryMap: ColourCategoryMap
    categoryDepartmentAliases: Record<string, string>
    trustSheetTotals: boolean
    totalMismatchToleranceHours: number
}

export const DEFAULT_HUMAN_ROSTER_IMPORT_CONFIG: RosterImportConfig = {
    colourCategoryMap: {
        '#B5E6A2': 'Gym Floor',
        '#FFFF00': 'Cafe',
        '#E87331': 'Intro/Event',
        '#C00000': 'Holiday/Event',
        '#808080': 'MOD/SMOD',
        '#404040': 'Unavailable',
        NO_FILL: 'Uncategorised'
    },
    categoryDepartmentAliases: {
        'Gym Floor': 'Front Desk',
        'Intro/Event': 'Intro Classes',
        'MOD/SMOD': 'Management (MOD)'
    },
    trustSheetTotals: false,
    totalMismatchToleranceHours: 0.05
}
