import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { PaymentStatus } from '@/lib/actions/bookings'

const ALLOWED_UPDATE_ROLES = ['super_admin', 'admin', 'reception']

async function handleUpdateStatus(formData: FormData): Promise<void> {
  'use server'
  const id     = formData.get('id')     as string
  const status = formData.get('status') as string
  if (!id || !status) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!ALLOWED_UPDATE_ROLES.includes(role ?? '')) return

  const patch: Record<string, unknown> = { status, updated_by: null }
  if (status === 'checked_out') patch.cleaning_type_id = null

  await supabase.from('bookings').update(patch).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
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
  if (!ALLOWED_UPDATE_ROLES.includes(role ?? '')) return

  await supabase.from('bookings').update({ payment_status: paymentStatus, updated_by: null }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
}

async function handleUpdateExtraBeds(formData: FormData): Promise<void> {
  'use server'
  const id         = formData.get('id')         as string
  const extra_beds = parseInt(formData.get('extra_beds') as string, 10)
  if (!id || isNaN(extra_beds)) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!ALLOWED_UPDATE_ROLES.includes(role ?? '')) return

  await supabase.from('bookings').update({ extra_beds, updated_by: null }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
}

async function handleUpdateCleaning(formData: FormData): Promise<void> {
  'use server'
  const id               = formData.get('id')               as string
  const cleaning_type_id = formData.get('cleaning_type_id') as string
  if (!id) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!ALLOWED_UPDATE_ROLES.includes(role ?? '')) return

  await supabase.from('bookings')
    .update({ cleaning_type_id: cleaning_type_id || null, updated_by: null })
    .eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  revalidatePath('/housekeeping')
}

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
  { label: 'ทั้งหมด',    value: 'all' },
  { label: 'ใหม่',       value: 'new' },
  { label: 'ยืนยันแล้ว', value: 'confirmed' },
  { label: 'เช็คเอาท์',  value: 'checked_out' },
  { label: 'ยกเลิก',    value: 'cancelled' },
]

function thaiDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

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
    return `/admin/bookings${qs ? `?${qs}` : ''}`
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
          <Link href="/admin" className="text-xs mb-2 inline-block" style={{ color: 'var(--text-light)' }}>
            ← Admin
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

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <Link key={tab.value} href={tabHref(tab.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
            style={{
              backgroundColor: currentTab === tab.value ? 'var(--primary)' : 'transparent',
              color:           currentTab === tab.value ? '#fff' : 'var(--text-muted)',
              border:          `1px solid ${currentTab === tab.value ? 'var(--primary)' : 'var(--border)'}`,
            }}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Filter bar */}
      <form method="get" action="/admin/bookings" className="card p-4 space-y-3">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="ค้นหาชื่อผู้เข้าพัก..."
            className="text-sm px-3 py-2 rounded col-span-1 sm:col-span-2 md:col-span-1"
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
          <div className="flex gap-2 items-center">
            <input name="from" type="date" defaultValue={from ?? ''}
              className="flex-1 text-sm px-3 py-2 rounded"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
            <span className="text-xs" style={{ color: 'var(--text-light)' }}>ถึง</span>
            <input name="to" type="date" defaultValue={to ?? ''}
              className="flex-1 text-sm px-3 py-2 rounded"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
          </div>
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
                  {['ชื่อผู้เข้าพัก', 'ห้อง', 'เช็คอิน', 'เช็คเอาท์', 'ราคารวม', 'สถานะ', 'เตียงเสริม', 'แม่บ้าน', 'ชำระเงิน / อื่นๆ'].map(h => (
                    <th key={h} className="text-left pb-2 pr-3 font-medium text-xs tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const roomName     = (b.rooms         as unknown as { name: string } | null)?.name
                    ?? (b.room_types as unknown as { name: string } | null)?.name ?? '—'
                  const cleaningName = (b.cleaning_types as unknown as { name: string } | null)?.name ?? null
                  const isActive     = b.status === 'new' || b.status === 'confirmed'

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      {/* Name */}
                      <td className="py-3 pr-3">
                        <Link href={`/admin/bookings/${b.id}`}
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

                      {/* Status */}
                      <td className="py-3 pr-3"><StatusBadge status={b.status} /></td>

                      {/* Extra beds */}
                      <td className="py-3 pr-3">
                        {isActive ? (
                          <form action={handleUpdateExtraBeds} className="flex gap-1 items-center">
                            <input type="hidden" name="id" value={b.id} />
                            <select name="extra_beds" defaultValue={b.extra_beds}
                              className="text-xs px-2 py-1 rounded"
                              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', width: '60px' }}>
                              <option value={0}>0</option>
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                            </select>
                            <button type="submit" className="text-xs px-1.5 py-1 rounded"
                              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>✓</button>
                          </form>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.extra_beds}</span>
                        )}
                      </td>

                      {/* Cleaning type */}
                      <td className="py-3 pr-3">
                        <form action={handleUpdateCleaning} className="flex gap-1 items-center">
                          <input type="hidden" name="id" value={b.id} />
                          <select name="cleaning_type_id" defaultValue={b.cleaning_type_id ?? ''}
                            className="text-xs px-2 py-1 rounded"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', minWidth: '90px', maxWidth: '120px' }}>
                            <option value="">— ไม่ระบุ —</option>
                            {cleaningTypes?.map(ct => (
                              <option key={ct.id} value={ct.id}>{ct.name}</option>
                            ))}
                          </select>
                          <button type="submit" className="text-xs px-1.5 py-1 rounded"
                            style={{ backgroundColor: '#2E7D5E', color: '#fff' }}>✓</button>
                        </form>
                        {cleaningName && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>{cleaningName}</p>
                        )}
                      </td>

                      {/* Payment + checkout + detail */}
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {b.status === 'confirmed' && (
                            <form action={handleUpdateStatus}>
                              <input type="hidden" name="id"     value={b.id} />
                              <input type="hidden" name="status" value="checked_out" />
                              <ActionBtn color="#C4A26A" label="เช็คเอาท์" />
                            </form>
                          )}
                          {b.payment_status === 'pending' && b.status !== 'cancelled' && (
                            <form action={handleUpdatePayment}>
                              <input type="hidden" name="id"             value={b.id} />
                              <input type="hidden" name="payment_status" value="paid" />
                              <ActionBtn color="#6B5CA8" label="บันทึกชำระ" />
                            </form>
                          )}
                          {b.payment_status === 'paid' && (
                            <form action={handleUpdatePayment}>
                              <input type="hidden" name="id"             value={b.id} />
                              <input type="hidden" name="payment_status" value="pending" />
                              <ActionBtn color="#AAA" label="ยกเลิกชำระ" />
                            </form>
                          )}
                          <PayBadge paid={b.payment_status === 'paid'} />
                          <Link href={`/admin/bookings/${b.id}`}
                            className="text-xs px-2 py-1 rounded font-medium"
                            style={{ color: 'var(--text-light)', border: '1px solid var(--border)' }}>
                            รายละเอียด
                          </Link>
                        </div>
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
              const isActive     = b.status === 'new' || b.status === 'confirmed'

              return (
                <div key={b.id} className="card p-4 space-y-3"
                  style={{ borderLeft: `3px solid ${STATUS_COLOR[b.status] ?? '#AAA'}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/bookings/${b.id}`}
                      className="font-medium text-sm hover:underline" style={{ color: 'var(--primary)' }}>
                      {b.guest_name}
                    </Link>
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

                  {/* Extra beds + cleaning row */}
                  <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>เตียงเสริม</p>
                      {isActive ? (
                        <form action={handleUpdateExtraBeds} className="flex gap-1">
                          <input type="hidden" name="id" value={b.id} />
                          <select name="extra_beds" defaultValue={b.extra_beds}
                            className="flex-1 text-xs px-2 py-1 rounded"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
                            <option value={0}>0 เตียง</option>
                            <option value={1}>1 เตียง</option>
                            <option value={2}>2 เตียง</option>
                          </select>
                          <button type="submit" className="text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>✓</button>
                        </form>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{b.extra_beds} เตียง</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>แม่บ้าน</p>
                      <form action={handleUpdateCleaning} className="flex gap-1">
                        <input type="hidden" name="id" value={b.id} />
                        <select name="cleaning_type_id" defaultValue={b.cleaning_type_id ?? ''}
                          className="flex-1 text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
                          <option value="">— ไม่ระบุ —</option>
                          {cleaningTypes?.map(ct => (
                            <option key={ct.id} value={ct.id}>{ct.name}</option>
                          ))}
                        </select>
                        <button type="submit" className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: '#2E7D5E', color: '#fff' }}>✓</button>
                      </form>
                      {cleaningName && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>{cleaningName}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: '1px solid var(--border-soft)' }}>
                    {b.status === 'confirmed' && (
                      <form action={handleUpdateStatus}>
                        <input type="hidden" name="id"     value={b.id} />
                        <input type="hidden" name="status" value="checked_out" />
                        <ActionBtn color="#C4A26A" label="เช็คเอาท์" />
                      </form>
                    )}
                    {b.payment_status === 'pending' && b.status !== 'cancelled' && (
                      <form action={handleUpdatePayment}>
                        <input type="hidden" name="id"             value={b.id} />
                        <input type="hidden" name="payment_status" value="paid" />
                        <ActionBtn color="#6B5CA8" label="บันทึกชำระ" />
                      </form>
                    )}
                    {b.payment_status === 'paid' && (
                      <form action={handleUpdatePayment}>
                        <input type="hidden" name="id"             value={b.id} />
                        <input type="hidden" name="payment_status" value="pending" />
                        <ActionBtn color="#AAA" label="ยกเลิกชำระ" />
                      </form>
                    )}
                  </div>
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

function ActionBtn({ color, label }: { color: string; label: string }) {
  return (
    <button type="submit" className="text-xs px-2.5 py-1 rounded font-medium transition-opacity hover:opacity-70"
      style={{ backgroundColor: `${color}18`, color }}>
      {label}
    </button>
  )
}
