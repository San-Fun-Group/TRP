import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CleaningSelector } from './cleaning-selector'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/constants/booking'
import { thaiDate } from '@/lib/utils/date'
import { joinRow } from '@/lib/utils/supabase'

const TABS = [
  { label: 'กำลังเข้าพัก',  value: 'staying'  },
  { label: 'เช็คอินวันนี้',  value: 'checkin'  },
  { label: 'เช็คเอาท์วันนี้', value: 'checkout' },
  { label: 'ทั้งหมด',        value: 'all'      },
]

export default async function HousekeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const activeFilter = filter ?? 'staying'

  const supabase = await createClient()
  const today    = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

  // Always fetch all non-cancelled bookings with checkout >= today for accurate tab counts.
  // Small hotel (4 rooms) so the full set is always tiny.
  const [{ data: cleaningTypes }, { data: allBookings }] = await Promise.all([
    supabase.from('cleaning_types').select('id, name'),
    supabase
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
      .gte('checkout_date', today)
      .order('checkin_date', { ascending: true }),
  ])

  const all          = allBookings ?? []
  const cleaningList = cleaningTypes ?? []

  // Counts derived from the full dataset — always accurate regardless of active tab.
  const stayingCount  = all.filter(b => b.checkin_date <= today && b.checkout_date > today).length
  const checkinCount  = all.filter(b => b.checkin_date === today).length
  const checkoutCount = all.filter(b => b.checkout_date === today).length

  // Filtered list for display only.
  const bookings =
    activeFilter === 'staying'  ? all.filter(b => b.checkin_date <= today && b.checkout_date > today) :
    activeFilter === 'checkin'  ? all.filter(b => b.checkin_date === today) :
    activeFilter === 'checkout' ? all.filter(b => b.checkout_date === today) :
    all

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

      {/* Layout: filter sidebar + content */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* Side menu with counts */}
        <aside className="w-full md:w-44 shrink-0">
          <nav className="card p-1.5 flex md:flex-col flex-row gap-0.5 overflow-x-auto">
            {TABS.map(tab => {
              const isActive = activeFilter === tab.value
              const count =
                tab.value === 'staying'  ? stayingCount :
                tab.value === 'checkin'  ? checkinCount :
                tab.value === 'checkout' ? checkoutCount :
                all.length
              return (
                <Link
                  key={tab.value}
                  href={tabHref(tab.value)}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm rounded transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    color:           isActive ? '#fff' : 'var(--text-muted)',
                    fontWeight:      isActive ? 500 : 400,
                  }}
                >
                  <span>{tab.label}</span>
                  <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold tabular-nums"
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : 'var(--border)',
                      color:           isActive ? '#fff' : 'var(--text-muted)',
                    }}>
                    {count}
                  </span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Booking cards */}
        <div className="flex-1 min-w-0">
      {!bookings.length ? (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีการจองในช่วงที่เลือก</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => {
            const roomName   = joinRow<{ name: string }>(b.rooms)?.name
            const roomType   = joinRow<{ name: string }>(b.room_types)?.name ?? '—'
            const doctorName = joinRow<{ name: string }>(b.doctors)?.name
            const currentCT  = joinRow<{ id: string; name: string }>(b.cleaning_types)

            const isStaying  = b.checkin_date <= today && b.checkout_date > today
            const isCheckIn  = b.checkin_date  === today
            const isCheckOut = b.checkout_date === today

            return (
              <div key={b.id} className="card p-5 space-y-4">
                {/* Top row: room pill + guest info + badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-semibold"
                      style={{ backgroundColor: 'var(--primary)', color: '#fff',
                               fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.1rem' }}>
                      {roomName ?? '?'}
                    </div>

                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                        {b.guest_name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {roomType}{doctorName && ` · ${doctorName}`}
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
                  <p className="text-xs mb-2 font-medium tracking-wide" style={{ color: 'var(--text-light)' }}>
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
        </div>{/* end booking cards */}
      </div>{/* end flex layout */}
    </div>
  )
}
