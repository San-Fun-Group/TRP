import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/constants/booking'
import { thaiDate } from '@/lib/utils/date'
import { joinRow } from '@/lib/utils/supabase'
import { UPDATE_ROLES } from '@/lib/constants/roles'
import { HistoryFilters } from './history-filters'
import { ExtraBedsSelect } from './extra-beds-select'

async function requireUpdateUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!user || !UPDATE_ROLES.has(role ?? '')) return null
  return { supabase }
}

async function handleTogglePayment(formData: FormData): Promise<void> {
  'use server'
  const id      = formData.get('id') as string
  const current = formData.get('current') as string
  if (!id) return
  const ctx = await requireUpdateUser()
  if (!ctx) return
  const next = current === 'paid' ? 'pending' : 'paid'
  await ctx.supabase.from('bookings').update({ payment_status: next, updated_by: null }).eq('id', id)
  revalidatePath('/reception/history')
  revalidatePath('/reception')
}

async function handleCancel(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  if (!id) return
  const ctx = await requireUpdateUser()
  if (!ctx) return

  const t = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  const { data: b } = await ctx.supabase
    .from('bookings').select('status, checkout_date').eq('id', id).single()
  if (!b) return
  if (b.status !== 'new') return
  if (b.checkout_date < t) return

  await ctx.supabase.from('bookings').update({ status: 'cancelled', updated_by: null }).eq('id', id)
  revalidatePath('/reception/history')
  revalidatePath('/reception')
}

export default async function BookingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; q?: string
    from?: string; to?: string; room_type?: string; payment?: string; room?: string
  }>
}) {
  const { status, q, from, to, room_type, payment, room } = await searchParams
  const supabase = await createClient()

  const [{ data: roomTypes }, { data: allRooms }] = await Promise.all([
    supabase.from('room_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('rooms').select('id, name').eq('is_active', true).order('name'),
  ])

  let query = supabase
    .from('bookings')
    .select(`
      id, guest_name, checkin_date, checkout_date, nights,
      total_price, status, payment_status, room_type_id, extra_beds,
      room_types(name), rooms(name)
    `)
    .order('checkin_date', { ascending: false })
    .limit(200)

  const activeStatus = status ?? ''
  if (activeStatus) query = query.eq('status', activeStatus)
  if (q)            query = query.ilike('guest_name', `%${q}%`)
  if (payment)      query = query.eq('payment_status', payment)
  if (room_type)    query = query.eq('room_type_id', room_type)
  if (room)         query = query.eq('room_id', room)
  if (from)         query = query.gte('checkin_date', from)
  if (to)           query = query.lte('checkin_date', to)

  const { data: bookings } = await query
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

  const exportParams = new URLSearchParams()
  if (activeStatus) exportParams.set('status', activeStatus)
  if (q)            exportParams.set('q', q)
  if (payment)      exportParams.set('payment', payment)
  if (room_type)    exportParams.set('room_type', room_type)
  if (from)         exportParams.set('from', from)
  if (to)           exportParams.set('to', to)
  const exportHref = `/api/bookings/export${exportParams.size ? `?${exportParams}` : ''}`

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <h1 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
          จัดการการจอง
        </h1>
        <div className="flex items-center gap-2 shrink-0 pb-1">
          <a href={exportHref}
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

      {/* Filter bar */}
      <HistoryFilters roomTypes={roomTypes ?? []} allRooms={allRooms ?? []} />

      {/* Table */}
      {!bookings?.length ? (
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีการจองที่ตรงกับตัวกรอง</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="card hidden md:block overflow-x-auto px-5 pt-3 pb-3">
            <p className="text-xs pb-2 mb-1" style={{ color: 'var(--text-light)', borderBottom: '1px solid var(--border-soft)' }}>
              {bookings?.length ?? 0} รายการ
              {q            && ` · "${q}"`}
              {activeStatus && ` · ${STATUS_LABEL[activeStatus] ?? activeStatus}`}
              {from         && ` · เช็คอินตั้งแต่ ${thaiDate(from)}`}
              {to           && ` · ถึง ${thaiDate(to)}`}
              {payment === 'pending' && ' · รอชำระเงิน'}
              {payment === 'paid'    && ' · ชำระแล้ว'}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อผู้เข้าพัก', 'ห้อง', 'เช็คอิน', 'เช็คเอาท์', 'ราคารวม', 'เตียงเสริม', 'สถานะ', 'ชำระเงิน', ''].map(label => (
                    <th key={label} className="text-left pb-2 pr-3 font-medium text-xs tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-light)' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const roomName    = joinRow<{ name: string }>(b.rooms)?.name
                    ?? joinRow<{ name: string }>(b.room_types)?.name ?? '—'
                  const cancellable = b.status === 'new' && b.checkout_date >= today
                  const past        = b.status === 'checked_out' || b.status === 'cancelled'
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>

                      <td className="py-3 pr-3" style={{ minWidth: '120px', maxWidth: '160px' }}>
                        <Link href={`/reception/history/${b.id}`}
                          title={b.guest_name}
                          className="font-medium hover:underline block truncate" style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </Link>
                      </td>

                      <td className="py-3 pr-3 text-xs" style={{ color: 'var(--text)' }}>{roomName}</td>

                      <td className="py-3 pr-6 whitespace-nowrap text-xs" style={{ color: 'var(--text)', width: '1px' }}>
                        {thaiDate(b.checkin_date)}
                      </td>
                      <td className="py-3 pr-6 whitespace-nowrap text-xs" style={{ color: 'var(--text)', width: '1px' }}>
                        {thaiDate(b.checkout_date)}
                      </td>

                      <td className="py-3 pr-6 font-medium whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </td>

                      {/* Extra beds — read-only for past bookings */}
                      <td className="py-3 pr-3">
                        {past
                          ? <span className="text-xs" style={{ color: 'var(--text-light)' }}>{b.extra_beds ?? 0}</span>
                          : <ExtraBedsSelect bookingId={b.id} value={b.extra_beds ?? 0} />
                        }
                      </td>

                      <td className="py-3 pr-3">
                        <StatusBadge status={b.status} />
                      </td>

                      {/* Payment — inline toggle */}
                      <td className="py-3 pr-3">
                        <PayButton id={b.id} paid={b.payment_status === 'paid'} />
                      </td>

                      {/* Actions */}
                      <td className="py-3">
                        {cancellable && (
                          <form action={handleCancel}>
                            <input type="hidden" name="id" value={b.id} />
                            <button type="submit"
                              className="text-xs transition-opacity hover:opacity-70"
                              style={{ color: 'var(--error)' }}>
                              ยกเลิก
                            </button>
                          </form>
                        )}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <p className="md:hidden text-xs pb-1" style={{ color: 'var(--text-light)' }}>
            {bookings?.length ?? 0} รายการ
            {q            && ` · "${q}"`}
            {activeStatus && ` · ${STATUS_LABEL[activeStatus] ?? activeStatus}`}
          </p>
          <div className="md:hidden space-y-3">
            {bookings.map(b => {
              const roomName    = joinRow<{ name: string }>(b.rooms)?.name
                ?? joinRow<{ name: string }>(b.room_types)?.name ?? '—'
              const cancellable = b.status === 'new' && b.checkout_date >= today
              const past        = b.status === 'checked_out' || b.status === 'cancelled'
              return (
                <div key={b.id} className="card p-4 space-y-3"
                  style={{ borderLeft: `3px solid ${STATUS_COLOR[b.status] ?? '#AAA'}` }}>

                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/reception/history/${b.id}`}
                      className="font-medium text-sm hover:underline" style={{ color: 'var(--primary)' }}>
                      {b.guest_name}
                    </Link>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{thaiDate(b.checkin_date)} – {thaiDate(b.checkout_date)}</span>
                    <span>{b.nights} คืน · {roomName}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                      {b.total_price?.toLocaleString()} ฿
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-light)' }}>เตียง</span>
                      {past
                        ? <span className="text-xs" style={{ color: 'var(--text-light)' }}>{b.extra_beds ?? 0}</span>
                        : <ExtraBedsSelect bookingId={b.id} value={b.extra_beds ?? 0} />
                      }
                      <PayButton id={b.id} paid={b.payment_status === 'paid'} />
                    </div>
                  </div>

                  {cancellable && (
                    <form action={handleCancel}>
                      <input type="hidden" name="id" value={b.id} />
                      <button type="submit" className="text-xs transition-opacity hover:opacity-70"
                        style={{ color: '#C0392B' }}>
                        ยกเลิก
                      </button>
                    </form>
                  )}

                </div>
              )
            })}
          </div>
        </>
      )}

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

function PayButton({ id, paid }: { id: string; paid: boolean }) {
  return (
    <form action={handleTogglePayment}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="current" value={paid ? 'paid' : 'pending'} />
      <button type="submit"
        className="text-xs px-2 py-0.5 whitespace-nowrap rounded-full font-medium transition-opacity hover:opacity-70"
        style={paid
          ? { backgroundColor: '#2E7D5E18', color: '#2E7D5E', border: '1px dashed #2E7D5E50' }
          : { backgroundColor: '#C0392B18', color: '#C0392B', border: '1px dashed #C0392B60' }
        }>
        {paid ? 'ชำระแล้ว' : 'รอชำระ'}
      </button>
    </form>
  )
}
