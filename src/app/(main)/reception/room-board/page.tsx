import { createClient } from '@/lib/supabase/server'
import { RoomBoard } from '@/app/(main)/home/_drafts/reception-room-board'

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default async function RoomBoardPage() {
  const supabase = await createClient()

  const today      = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  const WINDOW_DAYS = 30
  const endWindow  = addDays(today, WINDOW_DAYS)

  const [
    { data: roomTypes },
    { data: rooms },
    { data: occ },
  ] = await Promise.all([
    supabase.from('room_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('rooms').select('id, name, room_type_id').eq('is_active', true).order('name'),
    supabase.from('bookings')
      .select('guest_name, room_id, checkin_date, checkout_date')
      .neq('status', 'cancelled')
      .not('room_id', 'is', null)
      .lt('checkin_date', endWindow)
      .gt('checkout_date', today),
  ])

  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="leading-tight mb-1"
          style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
          แผนห้องพัก
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-light)' }}>
          {new Date().toLocaleDateString('th-TH', {
            timeZone: 'Asia/Bangkok', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      <RoomBoard
        types={(roomTypes ?? []) as { id: string; name: string }[]}
        rooms={(rooms   ?? []) as { id: string; name: string; room_type_id: string }[]}
        occ={(occ       ?? []) as { guest_name: string; room_id: string; checkin_date: string; checkout_date: string }[]}
        days={days}
        today={today}
      />
    </div>
  )
}
