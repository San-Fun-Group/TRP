import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { BookingStatus } from '@/lib/actions/bookings'

// Inline server action — 'use server' in function body makes this a server action.
// Using FormData hidden fields instead of .bind() avoids the void-return-type mismatch.
async function handleUpdateStatus(formData: FormData): Promise<void> {
  'use server'
  const id     = formData.get('id')     as string
  const status = formData.get('status') as BookingStatus
  if (!id || !status) return

  const { createClient: mkClient } = await import('@/lib/supabase/server')
  const supabase = await mkClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!['super_admin', 'admin', 'reception'].includes(role ?? '')) return

  await supabase.from('bookings').update({ status, updated_by: null }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
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
    { count: newCount },
    { count: checkInsToday },
    { count: checkOutsToday },
    { count: pendingPayments },
    { data: actionNeeded },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('checkin_date', today).neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('checkout_date', today).in('status', ['confirmed', 'new']),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending').neq('status', 'cancelled'),
    supabase.from('bookings')
      .select('id, guest_name, checkin_date, checkout_date, nights, total_price, payment_status, room_types(name)')
      .eq('status', 'new')
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
        <StatCard label="การจองใหม่"     value={newCount ?? 0}       accent="#8475BB"         href="/admin/bookings?status=new" />
        <StatCard label="เช็คอินวันนี้"   value={checkInsToday ?? 0}  accent="var(--success)"  href={`/admin/bookings?checkin=${today}`} />
        <StatCard label="เช็คเอาท์วันนี้" value={checkOutsToday ?? 0} accent="var(--gold)"     href={`/admin/bookings?checkout=${today}`} />
        <StatCard label="รอชำระเงิน"     value={pendingPayments ?? 0} accent="#C0392B"         href="/admin/bookings?payment=pending" />
      </div>

      {/* Action-needed bookings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
            รอการยืนยัน
          </h2>
          <Link href="/admin/bookings?status=new" className="text-xs" style={{ color: 'var(--primary)' }}>
            ดูทั้งหมด →
          </Link>
        </div>

        {!actionNeeded?.length ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีการจองที่รอยืนยัน</p>
        ) : (
          <div className="card overflow-x-auto px-5 pt-2 pb-1">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อผู้เข้าพัก', 'ประเภทห้อง', 'เช็คอิน', 'เช็คเอาท์', 'คืน', 'ราคารวม', 'ชำระเงิน', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 font-medium text-xs tracking-wide"
                      style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actionNeeded.map(b => {
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
                      <td className="py-3 pr-4" style={{ color: 'var(--text)' }}>{thaiDate(b.checkin_date)}</td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-muted)' }}>{b.nights}</td>
                      <td className="py-3 pr-4 font-medium" style={{ color: 'var(--primary)' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </td>
                      <td className="py-3 pr-4">
                        <PayBadge paid={b.payment_status === 'paid'} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <form action={handleUpdateStatus}>
                            <input type="hidden" name="id"     value={b.id} />
                            <input type="hidden" name="status" value="confirmed" />
                            <button type="submit" className="text-xs px-3 py-1 rounded font-medium"
                              style={{ backgroundColor: '#2E7D5E18', color: '#2E7D5E' }}>
                              ยืนยัน
                            </button>
                          </form>
                          <form action={handleUpdateStatus}>
                            <input type="hidden" name="id"     value={b.id} />
                            <input type="hidden" name="status" value="cancelled" />
                            <button type="submit" className="text-xs px-3 py-1 rounded font-medium"
                              style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
                              ยกเลิก
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
