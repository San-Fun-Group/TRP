import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Per-day room availability across all active room types, for previewing
// in the date picker before a room type is chosen.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!from || !to || to <= from) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 })
  }

  const supabase = await createClient()

  const [{ count: capacity }, { data: bookings }] = await Promise.all([
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('bookings')
      .select('checkin_date, checkout_date')
      .neq('status', 'cancelled')
      .lt('checkin_date', to)
      .gt('checkout_date', from),
  ])

  const cap = capacity ?? 0
  const results: Record<string, { available: number; capacity: number }> = {}

  for (let d = new Date(from + 'T00:00:00Z'); d < new Date(to + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10)
    const occupied = (bookings ?? []).filter(b => b.checkin_date <= day && b.checkout_date > day).length
    results[day] = { capacity: cap, available: Math.max(0, cap - occupied) }
  }

  return NextResponse.json(results)
}
