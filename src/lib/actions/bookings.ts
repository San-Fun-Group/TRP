'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { BOOKING_ROLES, UPDATE_ROLES } from '@/lib/constants/roles'

export type BookingStatus  = 'new' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
export type PaymentStatus  = 'pending' | 'paid'

// Price snapshot fields are intentionally excluded — the server re-fetches
// authoritative values from the DB so clients cannot manipulate pricing.
// cleaning_type_id is assigned post-booking by housekeeping
interface BookingPayload {
  room_type_id:    string
  staff_id:        string
  doctor_id:       string
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

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const role = user.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return { error: 'ไม่มีสิทธิ์' }

  // Reset cleaning status when guest checks out so housekeeping knows the room needs cleaning
  const patch: Record<string, unknown> = { status, updated_by: null }
  if (status === 'checked_out') patch.cleaning_type_id = null

  const { error } = await supabase.from('bookings')
    .update(patch)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/reception')
  revalidatePath('/reception/bookings')
  revalidatePath(`/reception/bookings/${id}`)
  revalidatePath('/housekeeping')
  return { error: null }
}

export async function updateGuestInfo(
  id: string,
  data: {
    guest_name: string
    email: string | null
    guest_count: number
    extra_beds: number
    needs_caretaker: boolean
  },
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const role = user.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return { error: 'ไม่มีสิทธิ์' }

  const { error } = await supabase.from('bookings')
    .update({ ...data, updated_by: null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/reception/bookings')
  revalidatePath(`/reception/bookings/${id}`)
  return { error: null }
}

export async function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const role = user.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return { error: 'ไม่มีสิทธิ์' }

  const { error } = await supabase.from('bookings')
    .update({ payment_status: paymentStatus, updated_by: null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/reception')
  revalidatePath('/reception/bookings')
  revalidatePath(`/reception/bookings/${id}`)
  return { error: null }
}

export async function assignRoom(
  id: string,
  roomId: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const role = user.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return { error: 'ไม่มีสิทธิ์' }

  const { error } = await supabase.from('bookings')
    .update({ room_id: roomId, updated_by: null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/reception/bookings')
  revalidatePath(`/reception/bookings/${id}`)
  return { error: null }
}

export async function checkInBooking(
  id: string,
  roomId: string,
): Promise<{ error: string | null }> {
  if (!roomId) return { error: 'กรุณาเลือกห้อง' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const role = user.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return { error: 'ไม่มีสิทธิ์' }

  // The trigger only enforces room_type-level capacity, not a specific
  // physical room — guard against double-assigning an occupied room here.
  const { count: occupied } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .eq('status', 'checked_in')
    .neq('id', id)

  if (occupied && occupied > 0) return { error: 'ห้องนี้มีผู้เข้าพักอยู่แล้ว' }

  const { error } = await supabase.from('bookings')
    .update({ status: 'checked_in', room_id: roomId, updated_by: null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/reception')
  revalidatePath('/reception/bookings')
  revalidatePath(`/reception/bookings/${id}`)
  revalidatePath('/housekeeping')
  return { error: null }
}

export async function assignDoctor(
  id: string,
  doctorId: string,
): Promise<{ error: string | null }> {
  if (!doctorId) return { error: 'กรุณาเลือกแพทย์' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const role = user.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return { error: 'ไม่มีสิทธิ์' }

  const { error } = await supabase.from('bookings')
    .update({ doctor_id: doctorId, updated_by: null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/reception/bookings')
  revalidatePath(`/reception/bookings/${id}`)
  return { error: null }
}
