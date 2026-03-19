export function getContrastTextColor(hex: string | null | undefined) {
    if (!hex) return '000000'

    const clean = hex.replace('#', '')
    if (clean.length !== 6) return '000000'

    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000

    return brightness > 140 ? '000000' : 'FFFFFF'
}

export function getContrastCssTextColor(hex: string | null | undefined) {
    return getContrastTextColor(hex) === 'FFFFFF' ? '#fff' : '#000'
}
