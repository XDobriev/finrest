import { NextRequest, NextResponse } from 'next/server'
import { bot } from '@/lib/telegram/bot'

export async function GET(req?: NextRequest) {
  void req
  return NextResponse.json({
    ok: true,
    service: 'FinRest Telegram Bot Webhook Handler',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secretToken) {
    const headerSecret = req.headers.get('x-telegram-bot-api-secret-token')
    if (headerSecret !== secretToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing X-Telegram-Bot-Api-Secret-Token' },
        { status: 401 }
      )
    }
  }

  try {
    const update = await req.json()
    if (!update || typeof update !== 'object') {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 })
    }

    // Process update with grammY bot
    await bot.handleUpdate(update)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[Telegram Webhook Error]', err)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
