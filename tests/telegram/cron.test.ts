import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET, POST } from '../../src/app/api/cron/flash-report/route'

test('Cron Route Handler: rejects unauthorized requests when CRON_SECRET is configured', async () => {
  process.env.CRON_SECRET = 'secret_cron_123'

  try {
    const reqWithoutAuth = new NextRequest('http://localhost:3000/api/cron/flash-report')
    const res = await GET(reqWithoutAuth)
    assert.equal(res.status, 401)

    const reqWithBadAuth = new NextRequest('http://localhost:3000/api/cron/flash-report', {
      headers: { authorization: 'Bearer wrong_token' },
    })
    const resBad = await GET(reqWithBadAuth)
    assert.equal(resBad.status, 401)
  } finally {
    delete process.env.CRON_SECRET
  }
})

test('Cron Route Handler: GET and POST execute with valid authorization', async () => {
  process.env.CRON_SECRET = 'cron_valid_token'

  try {
    const validReq = new NextRequest('http://localhost:3000/api/cron/flash-report', {
      headers: { authorization: 'Bearer cron_valid_token' },
    })

    const res = await GET(validReq)
    assert.equal(res.status, 200)

    const json = await res.json()
    assert.equal(json.ok, true)
    assert.equal(typeof json.sentCount, 'number')

    // Test POST via query param secret
    const postReq = new NextRequest('http://localhost:3000/api/cron/flash-report?secret=cron_valid_token', {
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
