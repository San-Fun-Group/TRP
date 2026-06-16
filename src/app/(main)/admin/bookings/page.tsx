import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { BookingStatus, PaymentStatus } from '@/lib/actions/bookings'

const ALLOWED_UPDATE_ROLES = ['super_admin', 'admin', 'reception']

async function handleUpdateStatus(formData: FormData): Promise<void> {
  'use server'
  const id     = formData.get('id')     as string
  const status = formData.get('status') as BookingStatus
  if (!id || !status) return

  const { createClient: mkClient } = await import('@/lib/supabase/server')
  const supabase = await mkClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!ALLOWED_UPDATE_ROLES.includes(role ?? '')) return

  await supabase.from('bookings').update({ status, updated_by: null }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
}

async function handleUpdatePayment(formData: FormData): Promise<void> {
  'use server'
  const id            = formData.get('id')             as string
  const paymentStatus = formData.get('payment_status') as PaymentStatus
  if (!id || !paymentStatus) return

  const { createClient: mkClient } = await import('@/lib/supabase/server')
  const supabase = await mkClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!ALLOWED_UPDATE_ROLES.includes(role ?? '')) return

  await supabase.from('bookings').update({ payment_status: paymentStatus, updated_by: null }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
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
  searchParams: Promise<{ status?: string; q?: string; checkin?: string; checkout?: string; payment?: string }>
}) {
  const { status, q, checkin, checkout, payment } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('bookings')
    .select('id, guest_name, checkin_date, checkout_date, nights, total_price, status, payment_status, room_types(name), rooms(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const activeStatus = status && status !== 'all' ? status : null
  if (activeStatus) query = query.eq('status', activeStatus)
  if (q)            query = query.ilike('guest_name', `%${q}%`)
  if (checkin)      query = query.eq('checkin_date', checkin)
  if (checkout)     query = query.eq('checkout_date', checkout)
  if (payment)      query = query.eq('payment_status', payment)

  const { data: bookings } = await query

  const tabHref = (v: string) => {
    const params = new URLSearchParams()
    if (v !== 'all') params.set('status', v)
    if (q) params.set('q', q)
    const qs = params.toString()
    return `/admin/bookings${qs ? `?${qs}` : ''}`
  }

  const currentTab = status && status !== 'all' ? status : 'all'

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
        <Link href="/booking/new"
          className="btn-gold inline-flex items-center gap-1 px-4 py-2 text-xs font-medium tracking-widest uppercase shrink-0">
          + จอง IPD
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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

        <form method="get" action="/admin/bookings" className="flex gap-2 ml-auto">
          {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="ค้นหาชื่อผู้เข้าพัก..."
            className="text-sm px-3 py-1.5 rounded"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              outline: 'none',
              width: '200px',
            }}
          />
          <button type="submit" className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
            ค้นหา
          </button>
          {q && (
            <Link href={tabHref(currentTab)} className="text-xs px-3 py-1.5 rounded font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              ล้าง
            </Link>
          )}
        </form>
      </div>

      {/* Result count */}
      <p className="text-xs" style={{ color: 'var(--text-light)' }}>
        {bookings?.length ?? 0} รายการ
        {q && ` · ค้นหา "${q}"`}
        {checkin  && ` · เช็คอิน ${thaiDate(checkin)}`}
        {checkout && ` · เช็คเอาท์ ${thaiDate(checkout)}`}
        {payment === 'pending' && ' · รอชำระเงิน'}
      </p>

      {/* Table */}
      {!bookings?.length ? (
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีการจองที่ตรงกับตัวกรอง</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="card hidden md:block overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อผู้เข้าพัก', 'ห้อง', 'เช็คอิน', 'เช็คเอาท์', 'คืน', 'ราคารวม', 'สถานะ', 'ชำระเงิน', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 font-medium text-xs tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const roomName = (b.rooms as unknown as { name: string } | null)?.name
                    ?? (b.room_types as unknown as { name: string } | null)?.name ?? '—'
                  return (
                    <tr key={b.id} className="group" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td className="py-3 pr-4">
                        <Link href={`/admin/bookings/${b.id}`}
                          className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text)' }}>{roomName}</td>
                      <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkin_date)}</td>
                      <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-muted)' }}>{b.nights}</td>
                      <td className="py-3 pr-4 font-medium whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </td>
                      <td className="py-3 pr-4"><StatusBadge status={b.status} /></td>
                      <td className="py-3 pr-4"><PayBadge paid={b.payment_status === 'paid'} /></td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          {b.status === 'new' && (
                            <form action={handleUpdateStatus}>
                              <input type="hidden" name="id"     value={b.id} />
                              <input type="hidden" name="status" value="confirmed" />
                              <ActionBtn color="#2E7D5E" label="ยืนยัน" />
                            </form>
                          )}
                          {b.status === 'confirmed' && (
                            <form action={handleUpdateStatus}>
                              <input type="hidden" name="id"     value={b.id} />
                              <input type="hidden" name="status" value="checked_out" />
                              <ActionBtn color="var(--gold)" label="เช็คเอาท์" />
                            </form>
                          )}
                          {(b.status === 'new' || b.status === 'confirmed') && (
                            <form action={handleUpdateStatus}>
                              <input type="hidden" name="id"     value={b.id} />
                              <input type="hidden" name="status" value="cancelled" />
                              <ActionBtn color="#C0392B" label="ยกเลิก" />
                            </form>
                          )}
                          {b.payment_status === 'pending' && b.status !== 'cancelled' && (
                            <form action={handleUpdatePayment}>
                              <input type="hidden" name="id"             value={b.id} />
                              <input type="hidden" name="payment_status" value="paid" />
                              <ActionBtn color="var(--primary)" label="บันทึกชำระ" />
                            </form>
                          )}
                          {b.payment_status === 'paid' && (
                            <form action={handleUpdatePayment}>
                              <input type="hidden" name="id"             value={b.id} />
                              <input type="hidden" name="payment_status" value="pending" />
                              <ActionBtn color="#AAA" label="ยกเลิกชำระ" />
                            </form>
                          )}
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
              const roomName = (b.rooms as unknown as { name: string } | null)?.name
                ?? (b.room_types as unknown as { name: string } | null)?.name ?? '—'
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
                  <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: '1px solid var(--border-soft)' }}>
                    {b.status === 'new' && (
                      <form action={handleUpdateStatus}>
                        <input type="hidden" name="id"     value={b.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <ActionBtn color="#2E7D5E" label="ยืนยัน" />
                      </form>
                    )}
                    {b.status === 'confirmed' && (
                      <form action={handleUpdateStatus}>
                        <input type="hidden" name="id"     value={b.id} />
                        <input type="hidden" name="status" value="checked_out" />
                        <ActionBtn color="var(--gold)" label="เช็คเอาท์" />
                      </form>
                    )}
                    {(b.status === 'new' || b.status === 'confirmed') && (
                      <form action={handleUpdateStatus}>
                        <input type="hidden" name="id"     value={b.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <ActionBtn color="#C0392B" label="ยกเลิก" />
                      </form>
                    )}
                    {b.payment_status === 'pending' && b.status !== 'cancelled' && (
                      <form action={handleUpdatePayment}>
                        <input type="hidden" name="id"             value={b.id} />
                        <input type="hidden" name="payment_status" value="paid" />
                        <ActionBtn color="var(--primary)" label="บันทึกชำระ" />
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
