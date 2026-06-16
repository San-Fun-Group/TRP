import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const checkin  = searchParams.get('checkin')
  const checkout = searchParams.get('checkout')

  if (!checkin || !checkout || checkout <= checkin) {
    return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get all active room types with capacity
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id')
    .eq('is_active', true)

  if (!roomTypes?.length) return NextResponse.json({})

  // For each room type, capacity vs. the max number of bookings occupying
  // any single night within [checkin, checkout) — not a blanket overlap
  // count. Two existing bookings that don't overlap each other (e.g.
  // back-to-back with same-day turnover) can share one physical room, so
  // only the worst single night determines true availability for the stay.
  const results: Record<string, { available: number; capacity: number }> = {}

  await Promise.all(
    roomTypes.map(async rt => {
      const [{ count: capacity }, { data: bookings }] = await Promise.all([
        supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('room_type_id', rt.id)
          .eq('is_active', true),
        supabase
          .from('bookings')
          .select('checkin_date, checkout_date')
          .eq('room_type_id', rt.id)
          .neq('status', 'cancelled')
          .lt('checkin_date', checkout)
          .gt('checkout_date', checkin),
      ])

      const cap = capacity ?? 0
      let maxOccupied = 0
      for (let d = new Date(checkin + 'T00:00:00Z'); d < new Date(checkout + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
        const day = d.toISOString().slice(0, 10)
        const occupied = (bookings ?? []).filter(b => b.checkin_date <= day && b.checkout_date > day).length
        if (occupied > maxOccupied) maxOccupied = occupied
      }
      results[rt.id] = { capacity: cap, available: Math.max(0, cap - maxOccupied) }
    })
  )

  return NextResponse.json(results)
}
