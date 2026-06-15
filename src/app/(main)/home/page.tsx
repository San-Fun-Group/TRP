import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  new:          'ใหม่',
  confirmed:    'ยืนยันแล้ว',
  checked_out:  'เช็คเอาท์',
  cancelled:    'ยกเลิก',
}

const STATUS_COLOR: Record<string, string> = {
  new:          'var(--mauve)',
  confirmed:    'var(--success)',
  checked_out:  '#888',
  cancelled:    'var(--error)',
}

function thaiDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

export default async function HomePage() {
  const supabase = await createClient()

  // Bangkok date (avoids UTC vs local date mismatch)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, name, price_per_night')
    .eq('is_active', true)

  const { count: totalRooms } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: occupiedToday } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'cancelled')
    .lte('checkin_date', today)
    .gt('checkout_date', today)

  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(`
      id, guest_name, checkin_date, checkout_date,
      nights, total_price, status, payment_status,
      room_types ( name ),
      rooms ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  const capacity  = totalRooms ?? 0
  const occupied  = occupiedToday ?? 0
  const available = capacity - occupied

  void roomTypes // suppress unused warning

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1
          className="leading-tight mb-1"
          style={{
            fontFamily: 'var(--font-cormorant, serif)',
            fontSize: '2rem',
            fontWeight: 400,
            color: 'var(--primary)',
          }}
        >
          หน้าหลัก
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('th-TH', {
            timeZone: 'Asia/Bangkok',
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Occupancy cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="ห้องทั้งหมด"  value={capacity}  color="var(--primary)" />
        <StatCard label="มีผู้เข้าพัก" value={occupied}  color="var(--error)" />
        <StatCard label="ว่างวันนี้"   value={available} color="var(--success)" />
      </div>

      {/* Quick action */}
      <div>
        <Link
          href="/booking/new"
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium tracking-widest uppercase text-white"
        >
          <span>+ จอง IPD</span>
        </Link>
      </div>

      {/* Recent bookings */}
      <section>
        <h2
          className="mb-4 text-xs font-medium tracking-widest uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          การจองล่าสุด
        </h2>

        {!recentBookings?.length ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีการจอง</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['ชื่อผู้เข้าพัก', 'เช็คอิน', 'เช็คเอาท์', 'คืน', 'ห้อง', 'ราคารวม', 'สถานะ', 'ชำระเงิน'].map(h => (
                      <th
                        key={h}
                        className="text-left pb-2 pr-6 font-medium text-xs tracking-wide"
                        style={{ color: 'var(--text-light)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(b => {
                    const roomName = (b.rooms as unknown as { name: string } | null)?.name
                      ?? (b.room_types as unknown as { name: string } | null)?.name
                      ?? '—'
                    return (
                      <tr
                        key={b.id}
                        style={{ borderBottom: '1px solid var(--border-soft)' }}
                        className="hover:bg-white transition-colors"
                      >
                        <td className="py-3 pr-6 font-medium" style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </td>
                        <td className="py-3 pr-6" style={{ color: 'var(--text)' }}>{thaiDate(b.checkin_date)}</td>
                        <td className="py-3 pr-6" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>
                        <td className="py-3 pr-6" style={{ color: 'var(--text-muted)' }}>{b.nights}</td>
                        <td className="py-3 pr-6" style={{ color: 'var(--text)' }}>{roomName}</td>
                        <td className="py-3 pr-6 font-medium" style={{ color: 'var(--primary)' }}>
                          {b.total_price?.toLocaleString()} ฿
                        </td>
                        <td className="py-3 pr-6">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="py-3">
                          <PayBadge paid={b.payment_status === 'paid'} />
                        </td>
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
                  ?? (b.room_types as unknown as { name: string } | null)?.name
                  ?? '—'
                return (
                  <div key={b.id} className="bg-white p-4 space-y-2"
                    style={{ borderLeft: `3px solid ${STATUS_COLOR[b.status] ?? '#888'}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                        {b.guest_name}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-muted)' }}>
                      <span>{thaiDate(b.checkin_date)} – {thaiDate(b.checkout_date)}</span>
                      <span>{b.nights} คืน</span>
                      <span>ห้อง {roomName}</span>
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-5 bg-white" style={{ borderLeft: `3px solid ${color}` }}>
      <div
        className="text-3xl font-light mb-1"
        style={{ fontFamily: 'var(--font-cormorant, serif)', color }}
      >
        {value}
      </div>
      <div className="text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 font-medium whitespace-nowrap"
      style={{
        backgroundColor: `${STATUS_COLOR[status] ?? '#888'}1A`,
        color: STATUS_COLOR[status] ?? '#888',
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function PayBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className="text-xs px-2 py-0.5 whitespace-nowrap"
      style={{
        backgroundColor: paid ? '#2E7D5E1A' : '#8888881A',
        color: paid ? 'var(--success)' : '#888',
      }}
    >
      {paid ? 'ชำระแล้ว' : 'รอชำระ'}
    </span>
  )
}
