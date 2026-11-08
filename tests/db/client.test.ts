import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeConnectionString } from '../../src/lib/db/client'

test('DB Client: normalizeConnectionString replaces sslmode=require with sslmode=verify-full', () => {
  const neonUrl = 'postgresql://user:pass@ep-host.aws.neon.tech/neondb?sslmode=require'
  const normalized = normalizeConnectionString(neonUrl)
  assert.equal(normalized, 'postgresql://user:pass@ep-host.aws.neon.tech/neondb?sslmode=verify-full')
})

test('DB Client: normalizeConnectionString preserves other ssl modes', () => {
  const localUrl = 'postgresql://localhost:5432/finrest_dev?schema=public'
  const normalized = normalizeConnectionString(localUrl)
  assert.equal(normalized, localUrl)
})
