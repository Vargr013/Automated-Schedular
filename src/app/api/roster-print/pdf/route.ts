import puppeteer from 'puppeteer'

export const runtime = 'nodejs'
export const maxDuration = 60

function isValidMonth(value: string | null) {
    return Boolean(value && /^\d{4}-\d{2}$/.test(value))
}

function buildPrintViewUrl(origin: string, month: string) {
    const printViewUrl = new URL('/roster-print', origin)
    printViewUrl.searchParams.set('month', month)
    printViewUrl.searchParams.set('mode', 'pdf')
    return printViewUrl
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const month = searchParams.get('month')

    if (!isValidMonth(month)) {
        return Response.json({ error: 'A valid month query parameter is required.' }, { status: 400 })
    }

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        })
        const page = await browser.newPage()
        const printViewUrl = buildPrintViewUrl(origin, month!)

        await page.emulateMediaType('print')
        await page.goto(printViewUrl.toString(), {
            waitUntil: 'networkidle0',
            timeout: 30000,
        })

        const pdf = await page.pdf({
            format: 'A3',
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
        return Response.json(
            {
                error: 'Server PDF export is unavailable right now. Use the browser print view instead.',
                details: message,
                fallbackUrl: buildPrintViewUrl(origin, month!).toString(),
            },
            { status: 503 }
        )
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}
