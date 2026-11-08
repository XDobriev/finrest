import test from 'node:test'
import assert from 'node:assert/strict'

interface VenueItem {
  id: string
  name: string
}

function getHeaderVenueState(venues: VenueItem[], selectedId: string) {
  if (venues.length === 0) {
    return {
      hasVenues: false,
      buttonText: 'Добавить заведение',
      currentVenue: null,
    }
  }

  const current = venues.find((v) => v.id === selectedId) || venues[0]
  return {
    hasVenues: true,
    buttonText: current.name,
    currentVenue: current,
  }
}

test('Header Venue: returns empty state action when no venues exist', () => {
  const state = getHeaderVenueState([], '')
  assert.equal(state.hasVenues, false)
  assert.equal(state.buttonText, 'Добавить заведение')
  assert.equal(state.currentVenue, null)
})

test('Header Venue: displays current venue name when selected', () => {
  const venues = [
    { id: '1', name: 'Steak House' },
    { id: '2', name: 'Sushi Bar' },
  ]
  const state = getHeaderVenueState(venues, '2')
  assert.equal(state.hasVenues, true)
  assert.equal(state.buttonText, 'Sushi Bar')
  assert.equal(state.currentVenue?.id, '2')
})

test('Header Venue: falls back to first venue when selectedId is empty', () => {
  const venues = [
    { id: '1', name: 'Steak House' },
    { id: '2', name: 'Sushi Bar' },
  ]
  const state = getHeaderVenueState(venues, '')
  assert.equal(state.hasVenues, true)
  assert.equal(state.buttonText, 'Steak House')
  assert.equal(state.currentVenue?.id, '1')
})
