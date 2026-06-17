import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { RoomBoard } from './reception-room-board'
import { CheckInQueue } from './reception-checkin-queue'

export default async function ReceptionPage() {
  const supabase = await createClient()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

  const [
    { data: rooms },
    { data: inHouse },
    { data: arrivals },
  ] = await Promise.all([
    supabase.from('rooms')
      .select('id, name, room_type_id, room_types(name)')
      .eq('is_active', true)
      .order('name'),
    supabase.from('bookings')
      .select('id, guest_name, room_id, checkout_date, extra_beds, payment_status')
      .eq('status', 'checked_in')
      .order('checkout_date', { ascending: true }),
    supabase.from('bookings')
      .select('id, guest_name, checkin_date, checkout_date, payment_status, extra_beds, room_type_id, room_types(name)')
      .eq('status', 'new')
      .lte('checkin_date', today)
      .order('checkin_date', { ascending: true }),
  ])

  const occupiedRoomIds = new Set((inHouse ?? []).map(b => b.room_id).filter(Boolean))
  const vacantRooms     = (rooms ?? []).filter(r => !occupiedRoomIds.has(r.id))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="leading-tight mb-1"
            style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
            Reception
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>
            {new Date().toLocaleDateString('th-TH', {
              timeZone: 'Asia/Bangkok', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/reception/history"
            className="text-xs px-4 py-2 font-medium tracking-widest uppercase border rounded transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            ประวัติการจอง
          </Link>
          <Link href="/booking/new"
            className="btn-gold inline-flex items-center gap-1 px-4 py-2 text-xs font-medium tracking-widest uppercase">
            + จอง IPD
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">

        {/* Left — Room board */}
        <section>
          <h2 className="text-xs font-medium tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-light)' }}>
            ห้องพัก
          </h2>
          <RoomBoard
            rooms={rooms ?? []}
            inHouse={inHouse ?? []}
          />
        </section>

        {/* Right — Check-in queue */}
        <section>
          <h2 className="text-xs font-medium tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-light)' }}>
            รอการเช็คอิน
          </h2>
          <CheckInQueue
            arrivals={arrivals ?? []}
            vacantRooms={vacantRooms}
          />
        </section>

      </div>
    </div>
  )
}
