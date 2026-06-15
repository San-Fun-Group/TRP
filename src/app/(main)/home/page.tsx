import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  new:          'ใหม่',
  confirmed:    'ยืนยันแล้ว',
  checked_out:  'เช็คเอาท์',
  cancelled:    'ยกเลิก',
}

const STATUS_COLOR: Record<string, string> = {
  new:          '#C4A26A',
  confirmed:    '#2E7D5E',
  checked_out:  '#888',
  cancelled:    '#C0392B',
}

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Rooms occupied today
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

  // Recent 10 bookings
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
            color: '#1A3A47',
          }}
        >
          หน้าหลัก
        </h1>
        <p className="text-sm" style={{ color: '#999' }}>
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Occupancy cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="ห้องทั้งหมด"   value={capacity}  color="#1A3A47" />
        <StatCard label="มีผู้เข้าพัก"  value={occupied}  color="#C0392B" />
        <StatCard label="ว่างวันนี้"    value={available} color="#2E7D5E" />
      </div>

      {/* Quick action */}
      <div className="flex items-center gap-3">
        <Link
          href="/booking/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium tracking-widest uppercase text-white transition-colors"
          style={{ backgroundColor: '#1A3A47' }}
          onMouseEnter={undefined}
        >
          <span>+ จอง IPD</span>
        </Link>
      </div>

      {/* Recent bookings */}
      <section>
        <h2
          className="mb-4 text-xs font-medium tracking-widest uppercase"
          style={{ color: '#999' }}
        >
          การจองล่าสุด
        </h2>

        {!recentBookings?.length ? (
          <p className="text-sm" style={{ color: '#bbb' }}>ยังไม่มีการจอง</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E3DB' }}>
                  {['ชื่อผู้เข้าพัก', 'เช็คอิน', 'เช็คเอาท์', 'คืน', 'ห้อง', 'ราคารวม', 'สถานะ', 'ชำระเงิน'].map(h => (
                    <th
                      key={h}
                      className="text-left pb-2 pr-6 font-medium text-xs tracking-wide"
                      style={{ color: '#AAA' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr
                    key={b.id}
                    style={{ borderBottom: '1px solid #F0EBE3' }}
                    className="hover:bg-white transition-colors"
                  >
                    <td className="py-3 pr-6 font-medium" style={{ color: '#1A3A47' }}>
                      {b.guest_name}
                    </td>
                    <td className="py-3 pr-6" style={{ color: '#555' }}>{b.checkin_date}</td>
                    <td className="py-3 pr-6" style={{ color: '#555' }}>{b.checkout_date}</td>
                    <td className="py-3 pr-6" style={{ color: '#555' }}>{b.nights}</td>
                    <td className="py-3 pr-6" style={{ color: '#555' }}>
                      {/* @ts-expect-error supabase nested type */}
                      {b.rooms?.name ?? (b.room_types as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td className="py-3 pr-6 font-medium" style={{ color: '#1A3A47' }}>
                      {b.total_price?.toLocaleString()} ฿
                    </td>
                    <td className="py-3 pr-6">
                      <span
                        className="text-xs px-2 py-0.5 font-medium"
                        style={{
                          backgroundColor: `${STATUS_COLOR[b.status] ?? '#888'}18`,
                          color: STATUS_COLOR[b.status] ?? '#888',
                        }}
                      >
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className="text-xs px-2 py-0.5"
                        style={{
                          backgroundColor: b.payment_status === 'paid' ? '#2E7D5E18' : '#88888818',
                          color: b.payment_status === 'paid' ? '#2E7D5E' : '#888',
                        }}
                      >
                        {b.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <div className="text-xs tracking-wide" style={{ color: '#999' }}>{label}</div>
    </div>
  )
}
