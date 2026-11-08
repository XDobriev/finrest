import test from 'node:test'
import assert from 'node:assert/strict'

test('Venue Selection Logic: selects active venue if present in user venues', () => {
  const venues = [
    { id: 'v1', name: 'Кафе Уют' },
    { id: 'v2', name: 'Ресторан Восток' },
  ]
  const savedVenueId = 'v2'

  const activeId =
    savedVenueId && venues.some((v) => v.id === savedVenueId)
      ? savedVenueId
      : venues[0]?.id || ''

  assert.equal(activeId, 'v2')
})

test('Venue Selection Logic: falls back to first venue when saved ID is not found', () => {
  const venues = [
    { id: 'v1', name: 'Кафе Уют' },
    { id: 'v2', name: 'Ресторан Восток' },
  ]
  const savedVenueId = 'v-non-existent'

  const activeId =
    savedVenueId && venues.some((v) => v.id === savedVenueId)
      ? savedVenueId
      : venues[0]?.id || ''

  assert.equal(activeId, 'v1')
})

test('Venue Selection Logic: resolves to empty string when venues array is empty', () => {
  const venues: Array<{ id: string; name: string }> = []
  const savedVenueId = 'v1'

  const activeId =
    savedVenueId && venues.some((v) => v.id === savedVenueId)
      ? savedVenueId
      : venues[0]?.id || ''

  assert.equal(activeId, '')
})
