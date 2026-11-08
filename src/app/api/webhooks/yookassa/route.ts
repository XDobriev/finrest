import { NextRequest, NextResponse } from 'next/server'
import { YooKassaClient } from '@/lib/billing/yookassa'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const client = new YooKassaClient()
    const result = await client.handleWebhook(body)

    if (result.handled) {
      return NextResponse.json({ ok: true, result })
    }

    return NextResponse.json({ ok: true, message: 'Ignored or unhandled event' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
