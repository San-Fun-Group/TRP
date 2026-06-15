import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './booking-form'

export default async function NewBookingPage() {
  const supabase = await createClient()

  const [
    { data: roomTypes },
    { data: staff },
    { data: discounts },
    { data: bookingTypes },
  ] = await Promise.all([
    supabase.from('room_types').select('id, name, price_per_night, extra_bed_price').eq('is_active', true),
    supabase.from('staff').select('id, name').eq('is_active', true).order('name'),
    supabase.from('discounts').select('id, label, percent').eq('is_active', true).order('percent'),
    supabase.from('booking_types').select('id, name'),
  ])

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1
          className="mb-1"
          style={{
            fontFamily: 'var(--font-cormorant, serif)',
            fontSize: '2rem',
            fontWeight: 400,
            color: 'var(--primary)',
          }}
        >
          จอง IPD
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          New IPD Hotel Reservation
        </p>
      </div>

      <BookingForm
        roomTypes={roomTypes ?? []}
        staff={staff ?? []}
        discounts={discounts ?? []}
        bookingTypes={bookingTypes ?? []}
      />
    </div>
  )
}
