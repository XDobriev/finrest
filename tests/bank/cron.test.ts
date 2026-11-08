import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET, POST } from '../../src/app/api/cron/bank-sync/route'

test('Bank Sync Cron Handler: rejects unauthorized requests when CRON_SECRET is configured', async () => {
  process.env.CRON_SECRET = 'secret_bank_cron_123'

  try {
    const reqWithoutAuth = new NextRequest('http://localhost:3000/api/cron/bank-sync')
    const res = await GET(reqWithoutAuth)
    assert.equal(res.status, 401)

    const reqWithBadAuth = new NextRequest('http://localhost:3000/api/cron/bank-sync', {
      headers: { authorization: 'Bearer wrong_bank_token' },
    })
    const resBad = await GET(reqWithBadAuth)
    assert.equal(resBad.status, 401)
  } finally {
    delete process.env.CRON_SECRET
  }
})

test('Bank Sync Cron Handler: GET and POST execute with valid authorization', async () => {
  process.env.CRON_SECRET = 'bank_cron_valid_token'

  try {
    const validReq = new NextRequest('http://localhost:3000/api/cron/bank-sync', {
      headers: { authorization: 'Bearer bank_cron_valid_token' },
    })

    const res = await GET(validReq)
    assert.equal(res.status, 200)

    const json = await res.json()
    assert.equal(json.ok, true)
    assert.equal(typeof json.syncedConnections, 'number')

    // Test POST via query param secret
    const postReq = new NextRequest('http://localhost:3000/api/cron/bank-sync?secret=bank_cron_valid_token', {
      method: 'POST',
    })
    const postRes = await POST(postReq)
    assert.equal(postRes.status, 200)
    const postJson = await postRes.json()
    assert.equal(postJson.ok, true)
  } finally {
    delete process.env.CRON_SECRET
  }
})
