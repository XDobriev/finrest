import { NextRequest, NextResponse } from 'next/server'
import { syncAllActiveBankConnections } from '@/lib/bank/sync'

export async function GET(req: NextRequest) {
  return handleBankCron(req)
}

export async function POST(req: NextRequest) {
  return handleBankCron(req)
}

async function handleBankCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    const querySecret = req.nextUrl.searchParams.get('secret')
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await syncAllActiveBankConnections()
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to execute bank sync cron'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
