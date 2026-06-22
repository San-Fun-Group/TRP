import { describe, it, expect } from 'vitest'
import { buildRoomRows } from './pms'
import type { HomePmsBooking } from '@/app/(main)/home/home-pms'

function makeBooking(overrides: Partial<HomePmsBooking> & { checkin_date: string; checkout_date: string; room_id: string }): HomePmsBooking {
  return {
    id: 'b1',
    guest_name: 'Test Guest',
    nights: 1,
    total_price: 1000,
    status: 'checked_in',
    payment_status: 'paid',
    room_type_id: 'rt1',
    room_name: '401',
    room_type_name: 'Deluxe',
    ...overrides,
  }
}

const DAYS = ['2025-06-01', '2025-06-02', '2025-06-03', '2025-06-04', '2025-06-05']
const ROOM = { id: 'r1', name: '401', typeName: 'Deluxe' }

describe('buildRoomRows — empty room', () => {
  it('produces all empty cells when no bookings', () => {
    const rows = buildRoomRows([ROOM], [], DAYS)
    expect(rows).toHaveLength(1)
    expect(rows[0].cells).toHaveLength(5)
    expect(rows[0].cells.every(c => c.kind === 'empty')).toBe(true)
  })
})

describe('buildRoomRows — single booking', () => {
  it('creates a booking cell with correct span for a 3-night stay', () => {
    const b = makeBooking({ room_id: 'r1', checkin_date: '2025-06-02', checkout_date: '2025-06-05' })
    const rows = buildRoomRows([ROOM], [b], DAYS)
    const cells = rows[0].cells

    // Day 1 (Jun 1) → empty
    expect(cells[0].kind).toBe('empty')
    // Day 2 (Jun 2) → booking cell, span=3
    expect(cells[1].kind).toBe('booking')
    if (cells[1].kind === 'booking') {
      expect(cells[1].span).toBe(3)
      expect(cells[1].arriving).toBe(true)
    }
    // Days 3 & 4 are consumed by the span, so only 3 cells total
    expect(cells).toHaveLength(3)
  })

  it('flags arriving=true only on checkin day', () => {
    const b = makeBooking({ room_id: 'r1', checkin_date: '2025-06-01', checkout_date: '2025-06-03' })
    const rows = buildRoomRows([ROOM], [b], DAYS)
    const first = rows[0].cells[0]
    expect(first.kind).toBe('booking')
    if (first.kind === 'booking') expect(first.arriving).toBe(true)
  })

  it('does not flag arriving when booking started before the window', () => {
    // Booking started May 30, still ongoing into the window
    const b = makeBooking({ room_id: 'r1', checkin_date: '2025-05-30', checkout_date: '2025-06-03' })
    const rows = buildRoomRows([ROOM], [b], DAYS)
    const first = rows[0].cells[0]
    expect(first.kind).toBe('booking')
    if (first.kind === 'booking') expect(first.arriving).toBe(false)
  })

  it('ignores checkout day — room is free on checkout', () => {
    // Checkout on Jun 03 means Jun 01–02 are occupied, Jun 03 is free
    const b = makeBooking({ room_id: 'r1', checkin_date: '2025-06-01', checkout_date: '2025-06-03' })
    const rows = buildRoomRows([ROOM], [b], DAYS)
    const cells = rows[0].cells
    // booking cell (span 2) then empty cells for Jun 03, 04, 05
    expect(cells[0].kind).toBe('booking')
    if (cells[0].kind === 'booking') expect(cells[0].span).toBe(2)
    expect(cells[1].kind).toBe('empty')
    expect(cells[2].kind).toBe('empty')
  })
})

describe('buildRoomRows — consecutive bookings', () => {
  it('handles back-to-back bookings with no gap', () => {
    const b1 = makeBooking({ id: 'b1', room_id: 'r1', checkin_date: '2025-06-01', checkout_date: '2025-06-03' })
    const b2 = makeBooking({ id: 'b2', room_id: 'r1', checkin_date: '2025-06-03', checkout_date: '2025-06-05' })
    const rows = buildRoomRows([ROOM], [b1, b2], DAYS)
    const cells = rows[0].cells
    expect(cells[0].kind).toBe('booking') // Jun 1–2
    expect(cells[1].kind).toBe('booking') // Jun 3–4
    if (cells[1].kind === 'booking') expect(cells[1].arriving).toBe(true)
  })
})

describe('buildRoomRows — multiple rooms', () => {
  it('only assigns bookings to the correct room', () => {
    const room2 = { id: 'r2', name: '402', typeName: 'Deluxe' }
    const b = makeBooking({ room_id: 'r2', checkin_date: '2025-06-01', checkout_date: '2025-06-05' })
    const rows = buildRoomRows([ROOM, room2], [b], DAYS)

    // r1 should be all empty
    expect(rows[0].cells.every(c => c.kind === 'empty')).toBe(true)
    // r2 should have the booking
    expect(rows[1].cells[0].kind).toBe('booking')
  })
})
