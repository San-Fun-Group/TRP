import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  new:         'ใหม่',
  confirmed:   'ยืนยันแล้ว',
  checked_out: 'เช็คเอาท์',
  cancelled:   'ยกเลิก',
}

const STATUS_COLOR: Record<string, string> = {
  new:         '#8475BB',
  confirmed:   '#2E7D5E',
  checked_out: '#AAA',
  cancelled:   '#C0392B',
}

function thaiDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default async function HomePage() {
  const supabase = await createClient()

  const today    = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  const end14    = addDays(today, 14)

  const [
    { count: totalRooms },
    { count: occupiedToday },
    { data: recentBookings },
    { data: roomTypesWithCount },
    { data: upcomingBookings },
  ] = await Promise.all([
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .neq('status', 'cancelled').lte('checkin_date', today).gt('checkout_date', today),
    supabase.from('bookings')
      .select(`id, guest_name, checkin_date, checkout_date, nights, total_price, status, payment_status, room_types(name), rooms(name)`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('room_types')
      .select('id, name, rooms(id)')
      .eq('is_active', true)
      .order('name'),
    supabase.from('bookings')
      .select('room_type_id, checkin_date, checkout_date')
      .neq('status', 'cancelled')
      .lt('checkin_date', end14)
      .gt('checkout_date', today),
  ])

  const capacity  = totalRooms ?? 0
  const occupied  = occupiedToday ?? 0
  const available = capacity - occupied

  // Build 14-day occupancy grid per room type
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  const calRows = (roomTypesWithCount ?? []).map(rt => {
    const cap = (rt.rooms as unknown as { id: string }[] | null)?.length ?? 0
    const occ = days.map(day =>
      (upcomingBookings ?? []).filter(b =>
        b.room_type_id === rt.id && b.checkin_date <= day && b.checkout_date > day
      ).length
    )
    return { id: rt.id, name: rt.name, cap, occ }
  }).filter(r => r.cap > 0)

  return (
    <div className="space-y-8">

      {/* Page heading */}
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

      {/* Occupancy cards — purple identity, not gold */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="ห้องทั้งหมด"  value={capacity}  accent="var(--primary)" />
        <StatCard label="มีผู้เข้าพัก" value={occupied}  accent="#C0392B" />
        <StatCard label="ว่างวันนี้"   value={available} accent="var(--success)" />
      </div>

      {/* Single gold CTA */}
      <div>
        <Link href="/booking/new"
          className="btn-gold inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium tracking-widest uppercase">
          + จอง IPD
        </Link>
      </div>

      {/* 14-day occupancy calendar */}
      {calRows.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
            ความจุ 14 วัน
          </h2>
          <div className="card overflow-x-auto p-4">
            <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
              <thead>
                <tr>
                  <th className="text-left pr-3 pb-2 font-medium whitespace-nowrap" style={{ color: 'var(--text-light)', minWidth: '90px' }}>
                    ประเภทห้อง
                  </th>
                  {days.map(d => {
                    const dt = new Date(d + 'T12:00:00Z')
                    const isToday = d === today
                    return (
                      <th key={d} className="pb-2 text-center font-medium" style={{ minWidth: '32px', color: isToday ? 'var(--primary)' : 'var(--text-light)' }}>
                        <div>{dt.toLocaleDateString('th-TH', { weekday: 'narrow' })}</div>
                        <div style={{ fontWeight: isToday ? 700 : 400 }}>{dt.getUTCDate()}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {calRows.map(row => (
                  <tr key={row.id}>
                    <td className="pr-3 py-0.5 font-medium whitespace-nowrap" style={{ color: 'var(--text)' }}>
                      {row.name}
                      <span className="ml-1 font-normal" style={{ color: 'var(--text-light)' }}>/{row.cap}</span>
                    </td>
                    {row.occ.map((count, i) => {
                      const pct  = row.cap > 0 ? count / row.cap : 0
                      const full = count >= row.cap
                      const bg   = full      ? '#C0392B' :
                                   pct >= .75 ? '#E67E22' :
                                   pct >= .5  ? '#C4A26A' :
                                   pct > 0    ? '#2E7D5E' : 'var(--border)'
                      const fg   = pct > 0 ? '#fff' : 'var(--text-light)'
                      return (
                        <td key={i} className="text-center py-0.5">
                          <div className="inline-flex items-center justify-center rounded text-xs"
                            style={{ backgroundColor: bg, color: fg, width: '28px', height: '22px', fontSize: '10px' }}>
                            {count > 0 ? count : ''}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
              {[['#2E7D5E','1–49%'],['#C4A26A','50–74%'],['#E67E22','75–99%'],['#C0392B','100% (เต็ม)']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-4 h-3 rounded" style={{ backgroundColor: c }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent bookings */}
      <section>
        <h2 className="mb-4 text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
          การจองล่าสุด
        </h2>

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
                    const roomName = (b.rooms as unknown as { name: string } | null)?.name
                      ?? (b.room_types as unknown as { name: string } | null)?.name ?? '—'
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

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card p-5" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="text-3xl font-light mb-1"
        style={{ fontFamily: 'var(--font-cormorant, serif)', color: accent }}>{value}</div>
      <div className="text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
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
