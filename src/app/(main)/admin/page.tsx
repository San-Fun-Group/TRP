import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { PaymentStatus } from '@/lib/actions/bookings'

const ALLOWED_ROLES = ['super_admin', 'admin', 'reception']

async function handleUpdatePayment(formData: FormData): Promise<void> {
  'use server'
  const id            = formData.get('id')             as string
  const paymentStatus = formData.get('payment_status') as PaymentStatus
  if (!id || !paymentStatus) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!ALLOWED_ROLES.includes(role ?? '')) return

  await supabase.from('bookings').update({ payment_status: paymentStatus, updated_by: null }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
}

async function handleCheckout(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!ALLOWED_ROLES.includes(role ?? '')) return

  await supabase.from('bookings')
    .update({ status: 'checked_out', cleaning_type_id: null, updated_by: null })
    .eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  revalidatePath('/housekeeping')
}

function thaiDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

export default async function AdminPage() {
  const supabase = await createClient()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

  const [
    { count: totalBookings },
    { count: checkInsToday },
    { count: checkOutsToday },
    { count: pendingPayments },
    { data: arrivingToday },
    { data: unpaidConfirmed },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('checkin_date', today).neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('checkout_date', today).in('status', ['confirmed', 'new']),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending').neq('status', 'cancelled'),
    // Today's arrivals — need active attention from front desk
    supabase.from('bookings')
      .select('id, guest_name, checkin_date, checkout_date, nights, total_price, payment_status, room_types(name), rooms(name)')
      .eq('checkin_date', today)
      .neq('status', 'cancelled')
      .order('guest_name', { ascending: true })
      .limit(20),
    // Confirmed but unpaid — need payment follow-up
    supabase.from('bookings')
      .select('id, guest_name, checkin_date, checkout_date, nights, total_price, status, room_types(name)')
      .eq('status', 'confirmed')
      .eq('payment_status', 'pending')
      .order('checkin_date', { ascending: true })
      .limit(15),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="leading-tight mb-1"
            style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
            Admin
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>
            {new Date().toLocaleDateString('th-TH', {
              timeZone: 'Asia/Bangkok', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link href="/admin/bookings"
            className="text-xs px-4 py-2 font-medium tracking-widest uppercase border transition-colors"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            จัดการการจอง
          </Link>
          <Link href="/booking/new"
            className="btn-gold inline-flex items-center gap-1 px-4 py-2 text-xs font-medium tracking-widest uppercase">
            + จอง IPD
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="การจองทั้งหมด"   value={totalBookings  ?? 0} accent="#8475BB"        href="/admin/bookings" />
        <StatCard label="เช็คอินวันนี้"    value={checkInsToday  ?? 0} accent="var(--success)" href={`/admin/bookings?checkin=${today}`} />
        <StatCard label="เช็คเอาท์วันนี้"  value={checkOutsToday ?? 0} accent="var(--gold)"    href={`/admin/bookings?checkout=${today}`} />
        <StatCard label="รอชำระเงิน"      value={pendingPayments ?? 0} accent="#C0392B"        href="/admin/bookings?payment=pending" />
      </div>

      {/* Today's arrivals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
            เช็คอินวันนี้
          </h2>
          <Link href="/admin/bookings" className="text-xs" style={{ color: 'var(--primary)' }}>
            ดูทั้งหมด →
          </Link>
        </div>

        {!arrivingToday?.length ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีผู้เข้าพักวันนี้</p>
        ) : (
          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อผู้เข้าพัก', 'ประเภทห้อง', 'ห้อง', 'เช็คเอาท์', 'คืน', 'ราคารวม', 'ชำระเงิน', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 font-medium text-xs tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arrivingToday.map(b => {
                  const roomTypeName = (b.room_types as unknown as { name: string } | null)?.name ?? '—'
                  const roomName     = (b.rooms      as unknown as { name: string } | null)?.name ?? '—'
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td className="py-3 pr-4">
                        <Link href={`/admin/bookings/${b.id}`}
                          className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text)' }}>{roomTypeName}</td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text)' }}>{roomName}</td>
                      <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-muted)' }}>{b.nights}</td>
                      <td className="py-3 pr-4 font-medium" style={{ color: 'var(--primary)' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </td>
                      <td className="py-3 pr-4">
                        <PayBadge paid={b.payment_status === 'paid'} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {b.payment_status === 'pending' && (
                            <form action={handleUpdatePayment}>
                              <input type="hidden" name="id"             value={b.id} />
                              <input type="hidden" name="payment_status" value="paid" />
                              <button type="submit" className="text-xs px-3 py-1 rounded font-medium"
                                style={{ backgroundColor: '#2E7D5E18', color: '#2E7D5E' }}>
                                บันทึกชำระ
                              </button>
                            </form>
                          )}
                          <form action={handleCheckout}>
                            <input type="hidden" name="id" value={b.id} />
                            <button type="submit" className="text-xs px-3 py-1 rounded font-medium"
                              style={{ backgroundColor: '#C4A26A18', color: '#C4A26A' }}>
                              เช็คเอาท์
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Unpaid confirmed bookings */}
      {!!unpaidConfirmed?.length && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
              ยืนยันแล้ว — รอชำระเงิน
            </h2>
            <Link href="/admin/bookings" className="text-xs" style={{ color: 'var(--primary)' }}>
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อผู้เข้าพัก', 'ประเภทห้อง', 'เช็คอิน', 'เช็คเอาท์', 'คืน', 'ราคารวม', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 font-medium text-xs tracking-wide"
                      style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unpaidConfirmed.map(b => {
                  const roomTypeName = (b.room_types as unknown as { name: string } | null)?.name ?? '—'
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td className="py-3 pr-4">
                        <Link href={`/admin/bookings/${b.id}`}
                          className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text)' }}>{roomTypeName}</td>
                      <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkin_date)}</td>
                      <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-muted)' }}>{b.nights}</td>
                      <td className="py-3 pr-4 font-medium" style={{ color: '#C0392B' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </td>
                      <td className="py-3">
                        <form action={handleUpdatePayment}>
                          <input type="hidden" name="id"             value={b.id} />
                          <input type="hidden" name="payment_status" value="paid" />
                          <button type="submit" className="text-xs px-3 py-1 rounded font-medium"
                            style={{ backgroundColor: '#2E7D5E18', color: '#2E7D5E' }}>
                            บันทึกชำระ
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  label, value, accent, href,
}: {
  label: string; value: number; accent: string; href: string
}) {
  return (
    <Link href={href} className="card p-5 block transition-opacity hover:opacity-80"
      style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="text-3xl font-light mb-1"
        style={{ fontFamily: 'var(--font-cormorant, serif)', color: accent }}>{value}</div>
      <div className="text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </Link>
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
