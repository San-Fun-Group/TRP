import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/constants/booking'
import { thaiDate } from '@/lib/utils/date'
import { joinRow } from '@/lib/utils/supabase'
import { OccupancyView } from './occupancy-view'

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default async function HomePage() {
  const supabase = await createClient()

  // today must be computed inside the component (stale-at-midnight gotcha)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  const WINDOW_DAYS  = 90   // client cursor navigates within this window
  const RECENT_LIMIT = 8    // only the latest few bookings
  const endWindow = addDays(today, WINDOW_DAYS)

  const [
    { data: roomTypes },
    { data: rooms },
    { data: typeBookings },
    { data: currentOcc },
    { data: recentBookings },
  ] = await Promise.all([
    supabase.from('room_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('rooms').select('id, name, room_type_id').eq('is_active', true).order('name'),
    // aggregate occupancy by room TYPE across the window (section 1)
    supabase.from('bookings')
      .select('room_type_id, checkin_date, checkout_date')
      .neq('status', 'cancelled')
      .lt('checkin_date', endWindow)
      .gt('checkout_date', today),
    // who is in each room RIGHT NOW (section 2) — incl. guests leaving today
    supabase.from('bookings')
      .select('guest_name, room_id, checkout_date')
      .neq('status', 'cancelled')
      .not('room_id', 'is', null)
      .lte('checkin_date', today)
      .gte('checkout_date', today),
    supabase.from('bookings')
      .select(`id, guest_name, checkin_date, checkout_date, nights, total_price, status, payment_status, room_types(name), rooms(name)`)
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT),
  ])

  const days  = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i))
  const roomList = (rooms ?? []) as { id: string; name: string; room_type_id: string }[]

  // Section 1 — available count per room TYPE across days
  const typeRows = (roomTypes ?? []).map(t => {
    const cap = roomList.filter(r => r.room_type_id === t.id).length
    const occ = days.map(day =>
      (typeBookings ?? []).filter(b =>
        b.room_type_id === t.id && b.checkin_date <= day && b.checkout_date > day
      ).length
    )
    return { id: t.id, name: t.name, cap, occ }
  }).filter(r => r.cap > 0)

  // Section 2 — current occupant per room id (guests leaving today are flagged)
const occByRoom: Record<string, { guest_name: string; checkout_date: string; leavingToday: boolean }> = {}
  for (const o of currentOcc ?? []) {
    if (!o.room_id) continue
    const leavingToday = o.checkout_date === today
    const existing = occByRoom[o.room_id]
    // prefer a staying guest over one who is leaving today (room turnover edge case)
    if (!existing || (existing.leavingToday && !leavingToday)) {
      occByRoom[o.room_id] = { guest_name: o.guest_name, checkout_date: o.checkout_date, leavingToday }
    }
  }

  return (
    <div className="space-y-8">

      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="leading-tight mb-1"
            style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
            หน้าหลัก
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>
            {new Date().toLocaleDateString('th-TH', {
              timeZone: 'Asia/Bangkok', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <Link href="/booking/new"
          className="btn-gold inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium tracking-widest uppercase self-start sm:self-auto">
          + จอง IPD
        </Link>
      </div>

      {/* Sections 1 & 2 — type availability board + room cards for selected type */}
      <OccupancyView
        typeRows={typeRows}
        rooms={roomList}
        occByRoom={occByRoom}
        days={days}
        today={today}
      />

      {/* ── Section 3 — recent bookings ────────────────────────────── */}
      <section>
        <div className="rounded-lg px-4 py-2.5 mb-3 flex items-center justify-between gap-2"
          style={{ background: 'rgba(147,136,176,0.18)' }}>
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--primary)' }}>
            การจองล่าสุด
          </h2>
          <Link href="/reception/history"
            className="text-[11px] px-3 py-1 rounded-full font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--primary)', border: '1px solid var(--border-soft)' }}>
            ประวัติการจอง →
          </Link>
        </div>

        {!recentBookings?.length ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีการจอง</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card hidden md:block overflow-x-auto px-5 pt-2 pb-1">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['ชื่อผู้เข้าพัก','เช็คอิน','เช็คเอาท์','คืน','ห้อง','ราคารวม','สถานะ','ชำระเงิน'].map(h => (
                      <th key={h} className="text-left pb-2 pr-6 font-medium text-xs tracking-wide"
                        style={{ color: 'var(--text-light)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(b => {
                    const roomName = joinRow<{ name: string }>(b.rooms)?.name
                      ?? joinRow<{ name: string }>(b.room_types)?.name ?? '—'
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}
                        className="hover:bg-white transition-colors">
                        <td className="py-3 pr-6 font-medium" style={{ color: 'var(--primary)' }}>{b.guest_name}</td>
                        <td className="py-3 pr-6" style={{ color: 'var(--text)' }}>{thaiDate(b.checkin_date)}</td>
                        <td className="py-3 pr-6" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>
                        <td className="py-3 pr-6" style={{ color: 'var(--text-muted)' }}>{b.nights}</td>
                        <td className="py-3 pr-6" style={{ color: 'var(--text)' }}>{roomName}</td>
                        <td className="py-3 pr-6 font-medium" style={{ color: 'var(--primary)' }}>
                          {b.total_price?.toLocaleString()} ฿
                        </td>
                        <td className="py-3 pr-6"><StatusBadge status={b.status} /></td>
                        <td className="py-3"><PayBadge paid={b.payment_status === 'paid'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {recentBookings.map(b => {
                const roomName = (b.rooms as unknown as { name: string } | null)?.name
                  ?? (b.room_types as unknown as { name: string } | null)?.name ?? '—'
                return (
                  <div key={b.id} className="card p-4 space-y-2"
                    style={{ borderLeft: `3px solid ${STATUS_COLOR[b.status] ?? '#AAA'}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>{b.guest_name}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-muted)' }}>
                      <span>{thaiDate(b.checkin_date)} – {thaiDate(b.checkout_date)}</span>
                      <span>{b.nights} คืน · ห้อง {roomName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </span>
                      <PayBadge paid={b.payment_status === 'paid'} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="text-xs px-2 py-0.5 font-medium whitespace-nowrap rounded-full"
      style={{ backgroundColor: `${STATUS_COLOR[status] ?? '#AAA'}18`, color: STATUS_COLOR[status] ?? '#AAA' }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function PayBadge({ paid }: { paid: boolean }) {
  return (
    <span className="text-xs px-2 py-0.5 whitespace-nowrap rounded-full"
      style={{ backgroundColor: paid ? '#2E7D5E18' : '#AAA3', color: paid ? '#2E7D5E' : '#AAA' }}>
      {paid ? 'ชำระแล้ว' : 'รอชำระ'}
    </span>
  )
}
