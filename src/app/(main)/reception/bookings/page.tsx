import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { PaymentStatus } from '@/lib/actions/bookings'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/constants/booking'
import { thaiDate } from '@/lib/utils/date'
import { joinRow } from '@/lib/utils/supabase'
import { UPDATE_ROLES } from '@/lib/constants/roles'
import { InlineSelect } from './inline-selects'

async function handleUpdateStatus(formData: FormData): Promise<void> {
  'use server'
  const id     = formData.get('id')     as string
  const status = formData.get('status') as string
  if (!id || !status) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return

  const patch: Record<string, unknown> = { status, updated_by: null }
  if (status === 'checked_out') patch.cleaning_type_id = null

  await supabase.from('bookings').update(patch).eq('id', id)
  revalidatePath('/reception')
  revalidatePath('/reception/bookings')
  revalidatePath('/housekeeping')
}

async function handleUpdatePayment(formData: FormData): Promise<void> {
  'use server'
  const id            = formData.get('id')             as string
  const paymentStatus = formData.get('payment_status') as PaymentStatus
  if (!id || !paymentStatus) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return

  await supabase.from('bookings').update({ payment_status: paymentStatus, updated_by: null }).eq('id', id)
  revalidatePath('/reception')
  revalidatePath('/reception/bookings')
}

async function handleUpdateExtraBeds(formData: FormData): Promise<void> {
  'use server'
  const id         = formData.get('id')         as string
  const extra_beds = parseInt(formData.get('extra_beds') as string, 10)
  if (!id || isNaN(extra_beds)) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return

  await supabase.from('bookings').update({ extra_beds, updated_by: null }).eq('id', id)
  revalidatePath('/reception')
  revalidatePath('/reception/bookings')
}

async function handleUpdateCleaning(formData: FormData): Promise<void> {
  'use server'
  const id               = formData.get('id')               as string
  const cleaning_type_id = formData.get('cleaning_type_id') as string
  if (!id) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!UPDATE_ROLES.has(role ?? '')) return

  await supabase.from('bookings')
    .update({ cleaning_type_id: cleaning_type_id || null, updated_by: null })
    .eq('id', id)
  revalidatePath('/reception')
  revalidatePath('/reception/bookings')
  revalidatePath('/housekeeping')
}

const TABS = [
  { label: 'ทั้งหมด',     value: 'all' },
  { label: 'ใหม่',        value: 'new' },
  { label: 'เช็คอินแล้ว', value: 'checked_in' },
  { label: 'เช็คเอาท์',   value: 'checked_out' },
  { label: 'ยกเลิก',     value: 'cancelled' },
]

export default async function AdminBookingsPage({
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

  const [{ data: roomTypes }, { data: cleaningTypes }] = await Promise.all([
    supabase.from('room_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('cleaning_types').select('id, name').order('name'),
  ])

  let query = supabase
    .from('bookings')
    .select(`
      id, guest_name, checkin_date, checkout_date, nights,
      total_price, status, payment_status, room_type_id,
      extra_beds, cleaning_type_id,
      room_types(name), rooms(name), cleaning_types(name)
    `)
    .order('created_at', { ascending: false })
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
    return `/reception/bookings${qs ? `?${qs}` : ''}`
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
            จัดการการจอง
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
      <form method="get" action="/reception/bookings" className="card p-4 space-y-3">
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
                  {['ชื่อผู้เข้าพัก', 'ห้อง', 'เช็คอิน', 'เช็คเอาท์', 'ราคารวม', 'สถานะ', 'เตียงเสริม', 'แม่บ้าน', 'ชำระเงิน', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-3 font-medium text-xs tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const roomName = joinRow<{ name: string }>(b.rooms)?.name
                    ?? joinRow<{ name: string }>(b.room_types)?.name ?? '—'
                  const isActive = b.status === 'new' || b.status === 'checked_in'

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      {/* Name */}
                      <td className="py-3 pr-3">
                        <Link href={`/reception/bookings/${b.id}`}
                          className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </Link>
                      </td>

                      {/* Room */}
                      <td className="py-3 pr-3 text-xs" style={{ color: 'var(--text)' }}>{roomName}</td>

                      {/* Dates */}
                      <td className="py-3 pr-3 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkin_date)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>

                      {/* Price */}
                      <td className="py-3 pr-3 font-medium whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </td>

                      {/* Status — editable dropdown */}
                      <td className="py-3 pr-3">
                        <InlineSelect
                          name="status"
                          defaultValue={b.status}
                          options={Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))}
                          hiddenFields={{ id: b.id }}
                          action={handleUpdateStatus}
                          colorMap={STATUS_COLOR}
                          className="text-xs px-2 py-1 rounded-full font-medium"
                        />
                      </td>

                      {/* Extra beds */}
                      <td className="py-3 pr-3">
                        {isActive ? (
                          <InlineSelect
                            name="extra_beds"
                            defaultValue={b.extra_beds}
                            options={[
                              { value: 0, label: '0' },
                              { value: 1, label: '1' },
                              { value: 2, label: '2' },
                            ]}
                            hiddenFields={{ id: b.id }}
                            action={handleUpdateExtraBeds}
                            className="text-xs px-2 py-1 rounded"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', width: '60px' }}
                          />
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.extra_beds}</span>
                        )}
                      </td>

                      {/* Cleaning type */}
                      <td className="py-3 pr-3">
                        <InlineSelect
                          name="cleaning_type_id"
                          defaultValue={b.cleaning_type_id ?? ''}
                          options={[
                            { value: '', label: '— ไม่ระบุ —' },
                            ...(cleaningTypes?.map(ct => ({ value: ct.id, label: ct.name })) ?? []),
                          ]}
                          hiddenFields={{ id: b.id }}
                          action={handleUpdateCleaning}
                          className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', minWidth: '90px', maxWidth: '120px' }}
                        />
                      </td>

                      {/* Payment — editable dropdown */}
                      <td className="py-3 pr-3">
                        <InlineSelect
                          name="payment_status"
                          defaultValue={b.payment_status}
                          options={[
                            { value: 'pending', label: 'รอชำระ' },
                            { value: 'paid',    label: 'ชำระแล้ว' },
                          ]}
                          hiddenFields={{ id: b.id }}
                          action={handleUpdatePayment}
                          colorMap={{ pending: '#AAA', paid: '#2E7D5E' }}
                          className="text-xs px-2 py-1 rounded-full font-medium"
                        />
                      </td>

                      {/* Detail link */}
                      <td className="py-3">
                        <Link href={`/reception/bookings/${b.id}`}
                          className="text-xs font-medium"
                          style={{ color: 'var(--text-light)' }}>
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
              const roomName     = (b.rooms         as unknown as { name: string } | null)?.name
                ?? (b.room_types as unknown as { name: string } | null)?.name ?? '—'
              const cleaningName = (b.cleaning_types as unknown as { name: string } | null)?.name ?? null
              const isActive     = b.status === 'new' || b.status === 'checked_in'

              return (
                <div key={b.id} className="card p-4 space-y-3"
                  style={{ borderLeft: `3px solid ${STATUS_COLOR[b.status] ?? '#AAA'}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/reception/bookings/${b.id}`}
                      className="font-medium text-sm hover:underline" style={{ color: 'var(--primary)' }}>
                      {b.guest_name}
                    </Link>
                    <Link href={`/reception/bookings/${b.id}`} className="text-xs" style={{ color: 'var(--text-light)' }}>→</Link>
                  </div>
                  <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{thaiDate(b.checkin_date)} – {thaiDate(b.checkout_date)}</span>
                    <span>{b.nights} คืน · {roomName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      {b.total_price?.toLocaleString()} ฿
                    </span>
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>สถานะ</p>
                      <InlineSelect
                        name="status"
                        defaultValue={b.status}
                        options={Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))}
                        hiddenFields={{ id: b.id }}
                        action={handleUpdateStatus}
                        colorMap={STATUS_COLOR}
                        className="w-full text-xs px-2 py-1 rounded-full font-medium"
                      />
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>ชำระเงิน</p>
                      <InlineSelect
                        name="payment_status"
                        defaultValue={b.payment_status}
                        options={[
                          { value: 'pending', label: 'รอชำระ' },
                          { value: 'paid',    label: 'ชำระแล้ว' },
                        ]}
                        hiddenFields={{ id: b.id }}
                        action={handleUpdatePayment}
                        colorMap={{ pending: '#AAA', paid: '#2E7D5E' }}
                        className="w-full text-xs px-2 py-1 rounded-full font-medium"
                      />
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>เตียงเสริม</p>
                      {isActive ? (
                        <InlineSelect
                          name="extra_beds"
                          defaultValue={b.extra_beds}
                          options={[
                            { value: 0, label: '0 เตียง' },
                            { value: 1, label: '1 เตียง' },
                            { value: 2, label: '2 เตียง' },
                          ]}
                          hiddenFields={{ id: b.id }}
                          action={handleUpdateExtraBeds}
                          className="w-full text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                        />
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{b.extra_beds} เตียง</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>แม่บ้าน</p>
                      <InlineSelect
                        name="cleaning_type_id"
                        defaultValue={b.cleaning_type_id ?? ''}
                        options={[
                          { value: '', label: '— ไม่ระบุ —' },
                          ...(cleaningTypes?.map(ct => ({ value: ct.id, label: ct.name })) ?? []),
                        ]}
                        hiddenFields={{ id: b.id }}
                        action={handleUpdateCleaning}
                        className="w-full text-xs px-2 py-1 rounded"
                        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                      />
                    </div>
                  </div>
                </div>
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


