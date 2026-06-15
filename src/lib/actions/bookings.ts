'use server'

import { createClient } from '@/lib/supabase/server'

interface BookingPayload {
  room_type_id:               string
  staff_id:                   string
  doctor_id:                  string
  booking_type_id:            string
  discount_id:                string | null
  cleaning_type_id:           string | null
  guest_name:                 string
  email:                      string | null
  guest_count:                number
  checkin_date:               string
  checkout_date:              string
  extra_beds:                 number
  needs_caretaker:            boolean
  room_price_at_booking:      number
  extra_bed_price_at_booking: number
  discount_percent_at_booking: number
}

export async function createBooking(payload: BookingPayload): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { error } = await supabase.from('bookings').insert({
    ...payload,
    status:         'new',
    payment_status: 'pending',
    created_by:     null,
    updated_by:     null,
  })

  if (error) {
    // Availability trigger raises a human-readable exception
    if (error.message.includes('No rooms available') || error.code === 'P0001') {
      return { error: 'ห้องเต็มสำหรับช่วงวันที่นี้ กรุณาเลือกวันอื่น' }
    }
    return { error: error.message }
  }

  return { error: null }
}
