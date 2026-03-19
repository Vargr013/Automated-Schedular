import puppeteer from 'puppeteer'

export const runtime = 'nodejs'

function isValidMonth(value: string | null) {
    return Boolean(value && /^\d{4}-\d{2}$/.test(value))
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const month = searchParams.get('month')

    if (!isValidMonth(month)) {
        return Response.json({ error: 'A valid month query parameter is required.' }, { status: 400 })
    }

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

    try {
        browser = await puppeteer.launch()
        const page = await browser.newPage()

        await page.emulateMediaType('print')
        await page.goto(`${origin}/roster-print?month=${encodeURIComponent(month!)}&mode=pdf`, {
            waitUntil: 'networkidle0'
        })

        const pdf = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            preferCSSPageSize: true
        })

        return new Response(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Roster_${month}.pdf"`,
                'Cache-Control': 'no-store'
            }
        })
    } catch (error: unknown) {
        console.error('Roster PDF export failed:', error)
        const message = error instanceof Error ? error.message : 'Unknown PDF export error'
        return Response.json({ error: message }, { status: 500 })
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}
