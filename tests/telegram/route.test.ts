import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET, POST } from '../../src/app/api/telegram/route'

test('Telegram Route Handler: GET returns healthcheck status', async () => {
  const req = new NextRequest('http://localhost:3000/api/telegram')
  const res = await GET(req)
  assert.equal(res.status, 200)

  const data = await res.json()
  assert.equal(data.ok, true)
  assert.equal(data.status, 'healthy')
})

test('Telegram Route Handler: POST rejects request with missing or invalid secret token', async () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = 'secret_webhook_token_xyz'

  try {
    // Missing secret token header
    const reqWithoutSecret = new NextRequest('http://localhost:3000/api/telegram', {
      method: 'POST',
      body: JSON.stringify({ update_id: 999 }),
    })
    const resWithoutSecret = await POST(reqWithoutSecret)
    assert.equal(resWithoutSecret.status, 401)

    // Invalid secret token header
    const reqWithBadSecret = new NextRequest('http://localhost:3000/api/telegram', {
      method: 'POST',
      headers: {
        'x-telegram-bot-api-secret-token': 'wrong_secret',
      },
      body: JSON.stringify({ update_id: 999 }),
    })
    const resWithBadSecret = await POST(reqWithBadSecret)
    assert.equal(resWithBadSecret.status, 401)

  } finally {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
  }
})

test('Telegram Route Handler: POST handles valid update with matching secret token', async () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = 'valid_secret_123'

  try {
    const validReq = new NextRequest('http://localhost:3000/api/telegram', {
      method: 'POST',
      headers: {
        'x-telegram-bot-api-secret-token': 'valid_secret_123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        update_id: 100,
        message: {
          message_id: 100,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 555, type: 'private' },
          text: '/start',
          entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
      }),
    })

    const res = await POST(validReq)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.ok, true)

  } finally {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
  }
})
