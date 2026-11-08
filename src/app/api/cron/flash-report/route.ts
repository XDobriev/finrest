import { NextRequest, NextResponse } from 'next/server'
import { sendEveningFlashReports } from '@/lib/telegram/flash-report'

export async function GET(req: NextRequest) {
  return handleCron(req)
}

export async function POST(req: NextRequest) {
  return handleCron(req)
}

async function handleCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    const querySecret = req.nextUrl.searchParams.get('secret')
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await sendEveningFlashReports()
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to dispatch flash reports'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
