'use server'

import { createClient } from '@/lib/supabase/server'

const BOOKING_ROLES = new Set(['super_admin', 'admin', 'reception', 'agent'])

// Price snapshot fields are intentionally excluded — the server re-fetches
// authoritative values from the DB so clients cannot manipulate pricing.
// doctor_id and cleaning_type_id are assigned post-booking by reception/housekeeping
interface BookingPayload {
  room_type_id:    string
  staff_id:        string
  discount_id:     string | null
  guest_name:      string
  email:           string | null
  guest_count:     number
  checkin_date:    string
  checkout_date:   string
  extra_beds:      number
  needs_caretaker: boolean
}

export async function createBooking(payload: BookingPayload): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  // 2. Role check (defense-in-depth — RLS also enforces this at the DB layer)
  const role = user.app_metadata?.role as string | undefined
  if (!BOOKING_ROLES.has(role ?? '')) return { error: 'ไม่มีสิทธิ์สร้างการจอง' }

  // 3. Re-fetch authoritative prices from DB — never trust client-supplied values
  const [{ data: roomType }, { data: discount }] = await Promise.all([
    supabase
      .from('room_types')
      .select('price_per_night, extra_bed_price')
      .eq('id', payload.room_type_id)
      .single(),
    payload.discount_id
      ? supabase.from('discounts').select('percent').eq('id', payload.discount_id).single()
      : Promise.resolve({ data: null }),
  ])

  if (!roomType) return { error: 'ไม่พบประเภทห้องพัก' }

  // 4. Insert with server-computed price snapshots
  const { error } = await supabase.from('bookings').insert({
    ...payload,
    room_price_at_booking:       roomType.price_per_night,
    extra_bed_price_at_booking:  roomType.extra_bed_price,
    discount_percent_at_booking: discount?.percent ?? 0,
    status:                      'new',
    payment_status:              'pending',
    created_by:                  null,
    updated_by:                  null,
  })

  if (error) {
    if (error.message.includes('No rooms available') || error.code === 'P0001') {
      return { error: 'ห้องเต็มสำหรับช่วงวันที่นี้ กรุณาเลือกวันอื่น' }
    }
    return { error: error.message }
  }

  return { error: null }
}
