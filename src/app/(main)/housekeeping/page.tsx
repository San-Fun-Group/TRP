import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CleaningSelector } from './cleaning-selector'

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

const TABS = [
  { label: 'กำลังเข้าพัก', value: 'staying'  },
  { label: 'เช็คอินวันนี้', value: 'checkin'  },
  { label: 'เช็คเอาท์วันนี้', value: 'checkout' },
  { label: 'ทั้งหมด',       value: 'all'      },
]

function thaiDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

export default async function HousekeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const activeFilter = filter ?? 'staying'

  const supabase = await createClient()
  const today    = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

  const [{ data: cleaningTypes }, { data: allBookings }] = await Promise.all([
    supabase.from('cleaning_types').select('id, name'),
    (async () => {
      let q = supabase
        .from('bookings')
        .select(`
          id, guest_name, checkin_date, checkout_date, nights, status,
          guest_count, needs_caretaker,
          room_types(name),
          rooms(name),
          cleaning_types(id, name),
          doctors(name)
        `)
        .neq('status', 'cancelled')
        .order('checkin_date', { ascending: true })

      if (activeFilter === 'staying') {
        q = q.lte('checkin_date', today).gt('checkout_date', today)
      } else if (activeFilter === 'checkin') {
        q = q.eq('checkin_date', today)
      } else if (activeFilter === 'checkout') {
        q = q.eq('checkout_date', today)
      }
      // 'all' — no extra filter

      return q
    })(),
  ])

  const bookings       = allBookings ?? []
  const cleaningList   = cleaningTypes ?? []

  // Quick counts for the stat chips
  const stayingCount  = bookings.filter(b =>
    b.checkin_date <= today && b.checkout_date > today
  ).length
  const checkinCount  = bookings.filter(b => b.checkin_date === today).length
  const checkoutCount = bookings.filter(b => b.checkout_date === today).length

  // For "all" filter, counts are from the full result; for others they're from filtered.
  // Re-fetch counts only when needed (use full set from 'all' query or reuse when already all)
  const tabHref = (v: string) => `/housekeeping${v === 'staying' ? '' : `?filter=${v}`}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="leading-tight mb-1"
          style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
          Housekeeping
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-light)' }}>
          {new Date().toLocaleDateString('th-TH', {
            timeZone: 'Asia/Bangkok', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Filter tabs with live counts */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const isActive = activeFilter === tab.value
          const count =
            tab.value === 'staying'  ? stayingCount :
            tab.value === 'checkin'  ? checkinCount :
            tab.value === 'checkout' ? checkoutCount :
            bookings.length

          return (
            <Link
              key={tab.value}
              href={tabHref(tab.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                color:           isActive ? '#fff' : 'var(--text-muted)',
                border:          `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {tab.label}
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                  color:           isActive ? '#fff' : 'var(--text-muted)',
                }}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Booking cards */}
      {!bookings.length ? (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีการจองในช่วงที่เลือก</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => {
            const roomName    = (b.rooms         as unknown as { name: string } | null)?.name
            const roomType    = (b.room_types    as unknown as { name: string } | null)?.name    ?? '—'
            const doctorName  = (b.doctors       as unknown as { name: string } | null)?.name
            const currentCT   = b.cleaning_types as unknown as { id: string; name: string } | null

            const isStaying   = b.checkin_date <= today && b.checkout_date > today
            const isCheckIn   = b.checkin_date  === today
            const isCheckOut  = b.checkout_date === today

            return (
              <div key={b.id} className="card p-5 space-y-4">
                {/* Top row: room + guest + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Room number pill */}
                    <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-sm font-semibold"
                      style={{ backgroundColor: 'var(--primary)', color: '#fff',
                               fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.1rem' }}>
                      {roomName ?? '?'}
                    </div>

                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                        {b.guest_name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {roomType}
                        {doctorName && ` · ${doctorName}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {thaiDate(b.checkin_date)} → {thaiDate(b.checkout_date)}
                          <span className="ml-1" style={{ color: 'var(--text-light)' }}>({b.nights} คืน)</span>
                        </span>
                        {b.guest_count > 1 && (
                          <span className="text-xs" style={{ color: 'var(--text-light)' }}>
                            {b.guest_count} ท่าน
                          </span>
                        )}
                        {b.needs_caretaker && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: '#8475BB18', color: '#8475BB' }}>
                            มีผู้ดูแล
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs px-2 py-0.5 font-medium rounded-full whitespace-nowrap"
                      style={{
                        backgroundColor: `${STATUS_COLOR[b.status] ?? '#AAA'}18`,
                        color: STATUS_COLOR[b.status] ?? '#AAA',
                      }}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    {isCheckIn && (
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: '#2E7D5E18', color: '#2E7D5E' }}>
                        เช็คอินวันนี้
                      </span>
                    )}
                    {isCheckOut && (
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: '#B8860B18', color: '#B8860B' }}>
                        เช็คเอาท์วันนี้
                      </span>
                    )}
                    {isStaying && !isCheckIn && !isCheckOut && (
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: '#4A7FA518', color: '#4A7FA5' }}>
                        กำลังเข้าพัก
                      </span>
                    )}
                  </div>
                </div>

                {/* Cleaning type selector */}
                <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '0.875rem' }}>
                  <p className="text-xs mb-2 font-medium tracking-wide"
                    style={{ color: 'var(--text-light)' }}>
                    การทำความสะอาด
                    {currentCT && (
                      <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
                        · ปัจจุบัน: {currentCT.name}
                      </span>
                    )}
                  </p>
                  <CleaningSelector
                    bookingId={b.id}
                    currentId={currentCT?.id ?? null}
                    cleaningTypes={cleaningList}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
