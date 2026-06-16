import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/constants/booking'
import { thaiDate } from '@/lib/utils/date'
import { joinRow } from '@/lib/utils/supabase'

const TABS = [
  { label: 'ทั้งหมด',     value: 'all' },
  { label: 'ใหม่',        value: 'new' },
  { label: 'เช็คอินแล้ว', value: 'checked_in' },
  { label: 'เช็คเอาท์',   value: 'checked_out' },
  { label: 'ยกเลิก',     value: 'cancelled' },
]

// Search/lookup for any booking — past, current, or future. Editing happens
// on the Reception dashboard (active bookings) or the detail page, not here.
export default async function BookingSearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; q?: string
    checkin?: string; checkout?: string; payment?: string
    from?: string; to?: string; room_type?: string
  }>
}) {
  const { status, q, checkin, checkout, payment, from, to, room_type } = await searchParams
  const supabase = await createClient()

  const { data: roomTypes } = await supabase
    .from('room_types').select('id, name').eq('is_active', true).order('name')

  let query = supabase
    .from('bookings')
    .select(`
      id, guest_name, checkin_date, checkout_date, nights,
      total_price, status, payment_status, room_type_id,
      room_types(name), rooms(name)
    `)
    .order('checkin_date', { ascending: false })
    .limit(200)

  const activeStatus = status && status !== 'all' ? status : null
  if (activeStatus) query = query.eq('status', activeStatus)
  if (q)            query = query.ilike('guest_name', `%${q}%`)
  if (checkin)      query = query.eq('checkin_date', checkin)
  if (checkout)     query = query.eq('checkout_date', checkout)
  if (payment)      query = query.eq('payment_status', payment)
  if (room_type)    query = query.eq('room_type_id', room_type)
  if (from)         query = query.gte('checkin_date', from)
  if (to)           query = query.lte('checkin_date', to)

  const { data: bookings } = await query

  const tabHref = (v: string) => {
    const params = new URLSearchParams()
    if (v !== 'all') params.set('status', v)
    if (q)          params.set('q', q)
    if (room_type)  params.set('room_type', room_type)
    if (from)       params.set('from', from)
    if (to)         params.set('to', to)
    const qs = params.toString()
    return `/reception/history${qs ? `?${qs}` : ''}`
  }

  const exportHref = () => {
    const params = new URLSearchParams()
    if (activeStatus) params.set('status', activeStatus)
    if (q)            params.set('q', q)
    if (checkin)      params.set('checkin', checkin)
    if (checkout)     params.set('checkout', checkout)
    if (payment)      params.set('payment', payment)
    if (room_type)    params.set('room_type', room_type)
    if (from)         params.set('from', from)
    if (to)           params.set('to', to)
    const qs = params.toString()
    return `/api/bookings/export${qs ? `?${qs}` : ''}`
  }

  const currentTab  = status && status !== 'all' ? status : 'all'
  const hasFilters  = !!(q || room_type || from || to || checkin || checkout || payment)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/reception" className="text-xs mb-2 inline-block" style={{ color: 'var(--text-light)' }}>
            ← Reception
          </Link>
          <h1 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
            ค้นหาการจอง
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={exportHref()}
            className="text-xs px-3 py-2 rounded font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            ↓ CSV
          </a>
          <Link href="/booking/new"
            className="btn-gold inline-flex items-center gap-1 px-4 py-2 text-xs font-medium tracking-widest uppercase">
            + จอง IPD
          </Link>
        </div>
      </div>

      {/* Layout: status sidebar + content */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* Status side menu */}
        <aside className="w-full md:w-36 shrink-0">
          <nav className="card p-1.5 flex md:flex-col flex-row gap-0.5 overflow-x-auto">
            {TABS.map(tab => {
              const isActive = currentTab === tab.value
              return (
                <Link key={tab.value} href={tabHref(tab.value)}
                  className="flex items-center px-3 py-2.5 text-sm rounded transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    color:           isActive ? '#fff' : 'var(--text-muted)',
                    fontWeight:      isActive ? 500 : 400,
                  }}>
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Content: filter + results + table */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Filter bar */}
          <form method="get" action="/reception/history" className="card p-4 space-y-3">
            {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <input
                name="q"
                defaultValue={q ?? ''}
                placeholder="ค้นหาชื่อผู้เข้าพัก..."
                className="text-sm px-3 py-2 rounded sm:col-span-2 md:col-span-1"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              />
              <select
                name="room_type"
                defaultValue={room_type ?? ''}
                className="text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="">ทุกประเภทห้อง</option>
                {roomTypes?.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
              <input name="from" type="date" defaultValue={from ?? ''}
                className="text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
              <input name="to" type="date" defaultValue={to ?? ''}
                className="text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
              <select
                name="payment"
                defaultValue={payment ?? ''}
                className="text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="">ทุกสถานะชำระเงิน</option>
                <option value="pending">รอชำระ</option>
                <option value="paid">ชำระแล้ว</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="text-xs px-4 py-1.5 rounded font-medium"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                ค้นหา
              </button>
              {hasFilters && (
                <Link href={tabHref(currentTab)} className="text-xs px-4 py-1.5 rounded font-medium"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  ล้างตัวกรอง
                </Link>
              )}
            </div>
          </form>

          {/* Result count */}
          <p className="text-xs" style={{ color: 'var(--text-light)' }}>
            {bookings?.length ?? 0} รายการ
            {q         && ` · ค้นหา "${q}"`}
            {room_type && ` · ${roomTypes?.find(r => r.id === room_type)?.name ?? room_type}`}
            {from      && ` · เช็คอินตั้งแต่ ${thaiDate(from)}`}
            {to        && ` · ถึง ${thaiDate(to)}`}
            {checkin   && ` · เช็คอิน ${thaiDate(checkin)}`}
            {checkout  && ` · เช็คเอาท์ ${thaiDate(checkout)}`}
            {payment === 'pending' && ' · รอชำระเงิน'}
            {payment === 'paid'    && ' · ชำระแล้ว'}
          </p>

          {/* Table */}
          {!bookings?.length ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีการจองที่ตรงกับตัวกรอง</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="card hidden md:block overflow-x-auto px-5 pt-2 pb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['ชื่อผู้เข้าพัก', 'ห้อง', 'เช็คอิน', 'เช็คเอาท์', 'ราคารวม', 'สถานะ', 'ชำระเงิน', ''].map(h => (
                        <th key={h} className="text-left pb-2 pr-3 font-medium text-xs tracking-wide whitespace-nowrap"
                          style={{ color: 'var(--text-light)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => {
                      const roomName = joinRow<{ name: string }>(b.rooms)?.name
                        ?? joinRow<{ name: string }>(b.room_types)?.name ?? '—'
                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                          <td className="py-3 pr-3">
                            <Link href={`/reception/history/${b.id}`}
                              className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                              {b.guest_name}
                            </Link>
                          </td>
                          <td className="py-3 pr-3 text-xs" style={{ color: 'var(--text)' }}>{roomName}</td>
                          <td className="py-3 pr-3 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkin_date)}</td>
                          <td className="py-3 pr-3 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>
                          <td className="py-3 pr-3 font-medium whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                            {b.total_price?.toLocaleString()} ฿
                          </td>
                          <td className="py-3 pr-3">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="py-3 pr-3">
                            <PayBadge paid={b.payment_status === 'paid'} />
                          </td>
                          <td className="py-3">
                            <Link href={`/reception/history/${b.id}`}
                              className="text-xs font-medium" style={{ color: 'var(--text-light)' }}>
                              →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {bookings.map(b => {
                  const roomName = joinRow<{ name: string }>(b.rooms)?.name
                    ?? joinRow<{ name: string }>(b.room_types)?.name ?? '—'
                  return (
                    <Link key={b.id} href={`/reception/history/${b.id}`}
                      className="card p-4 space-y-2 block"
                      style={{ borderLeft: `3px solid ${STATUS_COLOR[b.status] ?? '#AAA'}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>{b.guest_name}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-muted)' }}>
                        <span>{thaiDate(b.checkin_date)} – {thaiDate(b.checkout_date)}</span>
                        <span>{b.nights} คืน · {roomName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                          {b.total_price?.toLocaleString()} ฿
                        </span>
                        <PayBadge paid={b.payment_status === 'paid'} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}

        </div>{/* end content */}
      </div>{/* end flex layout */}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#AAA'
  return (
    <span className="text-xs px-2 py-0.5 font-medium whitespace-nowrap rounded-full"
      style={{ backgroundColor: `${color}18`, color }}>
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
