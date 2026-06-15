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

  // For each room type, count capacity and overlapping bookings
  const results: Record<string, { available: number; capacity: number }> = {}

  await Promise.all(
    roomTypes.map(async rt => {
      const [{ count: capacity }, { count: booked }] = await Promise.all([
        supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('room_type_id', rt.id)
          .eq('is_active', true),
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('room_type_id', rt.id)
          .neq('status', 'cancelled')
          .lt('checkin_date', checkout)
          .gt('checkout_date', checkin),
      ])

      const cap = capacity ?? 0
      const bkd = booked ?? 0
      results[rt.id] = { capacity: cap, available: Math.max(0, cap - bkd) }
    })
  )

  return NextResponse.json(results)
}
