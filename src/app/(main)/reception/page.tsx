import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { PaymentStatus } from '@/lib/actions/bookings'
import { thaiDate } from '@/lib/utils/date'
import { joinRow } from '@/lib/utils/supabase'
import { UPDATE_ROLES } from '@/lib/constants/roles'
import { ReceptionCheckIn } from './reception-checkin'

async function requireUpdateUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!user || !UPDATE_ROLES.has(role ?? '')) return null
  return { supabase, user }
}

async function handleCancel(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  if (!id) return
  const ctx = await requireUpdateUser()
  if (!ctx) return

  await ctx.supabase.from('bookings').update({ status: 'cancelled', updated_by: null }).eq('id', id)
  revalidatePath('/reception')
  revalidatePath('/reception/history')
}

async function handleCheckout(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  if (!id) return
  const ctx = await requireUpdateUser()
  if (!ctx) return

  await ctx.supabase.from('bookings')
    .update({ status: 'checked_out', cleaning_type_id: null, updated_by: null })
    .eq('id', id)
  revalidatePath('/reception')
  revalidatePath('/reception/history')
  revalidatePath('/housekeeping')
}

async function handleUpdatePayment(formData: FormData): Promise<void> {
  'use server'
  const id            = formData.get('id')             as string
  const paymentStatus = formData.get('payment_status') as PaymentStatus
  if (!id || !paymentStatus) return
  const ctx = await requireUpdateUser()
  if (!ctx) return

  await ctx.supabase.from('bookings').update({ payment_status: paymentStatus, updated_by: null }).eq('id', id)
  revalidatePath('/reception')
  revalidatePath('/reception/history')
}

export default async function ReceptionPage() {
  const supabase = await createClient()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

  const [
    { data: rooms },
    { data: inHouse },
    { data: arrivals },
    { count: unpaidCount },
  ] = await Promise.all([
    // All active rooms — the room board
    supabase.from('rooms')
      .select('id, name, room_type_id, room_types(name)')
      .eq('is_active', true)
      .order('name'),
    // Currently in-house guests — occupy a room right now
    supabase.from('bookings')
      .select('id, guest_name, room_id, checkout_date, nights, total_price, payment_status, rooms(name)')
      .eq('status', 'checked_in')
      .order('checkout_date', { ascending: true }),
    // New bookings, ready for physical check-in (today or overdue) — no separate confirm step
    supabase.from('bookings')
      .select('id, guest_name, checkin_date, checkout_date, nights, total_price, payment_status, room_type_id, room_types(name)')
      .eq('status', 'new')
      .lte('checkin_date', today)
      .order('checkin_date', { ascending: true }),
    // Pending-payment count for the stat card — actual rows surface inline in the
    // check-in queue / in-house tables below rather than a separate redundant list.
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .in('status', ['new', 'checked_in']).eq('payment_status', 'pending'),
  ])

  const occupiedRoomIds = new Set((inHouse ?? []).map(b => b.room_id).filter(Boolean))
  const vacantRooms     = (rooms ?? []).filter(r => !occupiedRoomIds.has(r.id))
  const occupantByRoom  = new Map((inHouse ?? []).filter(b => b.room_id).map(b => [b.room_id, b]))
  const departuresToday = (inHouse ?? []).filter(b => b.checkout_date === today).length

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="leading-tight mb-1"
            style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
            Reception
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>
            {new Date().toLocaleDateString('th-TH', {
              timeZone: 'Asia/Bangkok', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link href="/reception/history"
            className="text-xs px-4 py-2 font-medium tracking-widest uppercase border transition-colors"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            ค้นหาการจอง
          </Link>
          <Link href="/booking/new"
            className="btn-gold inline-flex items-center gap-1 px-4 py-2 text-xs font-medium tracking-widest uppercase">
            + จอง IPD
          </Link>
        </div>
      </div>

      {/* Stats — double as jump links to the section below */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="ห้องว่าง"        value={vacantRooms.length}      accent="var(--success)" href="#rooms" />
        <StatCard label="รอเช็คอิน"       value={arrivals?.length ?? 0}   accent="#8475BB"  href="#checkin" />
        <StatCard label="เช็คเอาท์วันนี้"  value={departuresToday}         accent="#C4A26A"  href="#inhouse" />
        <StatCard label="รอชำระเงิน"      value={unpaidCount ?? 0}        accent="#C0392B"  href="/reception/history?payment=pending" />
      </div>

      {/* Room board */}
      <section id="rooms">
        <h2 className="mb-4 text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
          สถานะห้องพัก
        </h2>
        {!rooms?.length ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีห้องในระบบ</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {rooms.map(r => {
              const occupant   = occupantByRoom.get(r.id)
              const roomType   = joinRow<{ name: string }>(r.room_types)?.name ?? '—'
              const isOccupied = !!occupant
              return (
                <div key={r.id} className="card p-3"
                  style={{ borderLeft: `3px solid ${isOccupied ? '#C4A26A' : 'var(--success)'}` }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>{r.name}</p>
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-light)' }}>{roomType}</p>
                  {occupant ? (
                    <Link href={`/reception/history/${occupant.id}`}
                      className="text-xs font-medium hover:underline block truncate" style={{ color: '#C4A26A' }}>
                      {occupant.guest_name}
                    </Link>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--success)' }}>ว่าง</span>
                  )}
                  {occupant && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      ออก {thaiDate(occupant.checkout_date)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Check-in queue */}
      <section id="checkin">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#8475BB' }} />
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
            รอเช็คอิน
          </h2>
        </div>

        {!arrivals?.length ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีผู้เข้าพักรอเช็คอิน</p>
        ) : (
          <div className="card overflow-x-auto px-5 pt-2 pb-1" style={{ borderTop: '3px solid #8475BB' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อผู้เข้าพัก', 'ประเภทห้อง', 'วันที่', 'ราคารวม', 'ชำระเงิน', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 font-medium text-xs tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arrivals.map(b => {
                  const roomTypeName = joinRow<{ name: string }>(b.room_types)?.name ?? '—'
                  const overdue       = b.checkin_date < today
                  const availableRoomsForType = vacantRooms
                    .filter(r => r.room_type_id === b.room_type_id)
                    .map(r => ({ id: r.id, name: r.name }))
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td className="py-3 pr-4">
                        <Link href={`/reception/history/${b.id}`}
                          className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </Link>
                        {overdue && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
                            ค้างเช็คอิน
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text)' }}>{roomTypeName}</td>
                      <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text)' }}>
                        {thaiDate(b.checkin_date)} – {thaiDate(b.checkout_date)}
                      </td>
                      <td className="py-3 pr-4 font-medium whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </td>
                      <td className="py-3 pr-4">
                        <PayButton id={b.id} paid={b.payment_status === 'paid'} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <ReceptionCheckIn bookingId={b.id} availableRooms={availableRoomsForType} />
                          <form action={handleCancel}>
                            <input type="hidden" name="id" value={b.id} />
                            <button type="submit" className="text-xs transition-opacity hover:opacity-70"
                              style={{ color: 'var(--text-light)' }}>
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

      {/* In-house & departures */}
      <section id="inhouse">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#C4A26A' }} />
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
            ผู้เข้าพักในโรงแรม
          </h2>
        </div>

        {!inHouse?.length ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีผู้เข้าพักในโรงแรมตอนนี้</p>
        ) : (
          <div className="card overflow-x-auto px-5 pt-2 pb-1" style={{ borderTop: '3px solid #C4A26A' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อผู้เข้าพัก', 'ห้อง', 'เช็คเอาท์', 'ราคารวม', 'ชำระเงิน', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 font-medium text-xs tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inHouse.map(b => {
                  const roomName     = joinRow<{ name: string }>(b.rooms)?.name ?? '—'
                  const dueToday     = b.checkout_date === today
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td className="py-3 pr-4">
                        <Link href={`/reception/history/${b.id}`}
                          className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </Link>
                        {dueToday && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#C4A26A18', color: '#C4A26A' }}>
                            ออกวันนี้
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text)' }}>{roomName}</td>
                      <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text)' }}>{thaiDate(b.checkout_date)}</td>
                      <td className="py-3 pr-4 font-medium whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                        {b.total_price?.toLocaleString()} ฿
                      </td>
                      <td className="py-3 pr-4">
                        <PayButton id={b.id} paid={b.payment_status === 'paid'} />
                      </td>
                      <td className="py-3">
                        <form action={handleCheckout}>
                          <input type="hidden" name="id" value={b.id} />
                          <button type="submit" className="text-xs px-3 py-1 rounded font-medium transition-opacity hover:opacity-70"
                            style={{ backgroundColor: '#AAA3', color: '#AAA' }}>
                            เช็คเอาท์
                          </button>
                        </form>
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
  label: string; value: number; accent: string; href?: string
}) {
  const inner = (
    <>
      <div className="text-3xl font-light mb-1"
        style={{ fontFamily: 'var(--font-cormorant, serif)', color: accent }}>{value}</div>
      <div className="text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </>
  )
  const className = 'card p-5 block transition-opacity hover:opacity-80'
  const style = { borderLeft: `3px solid ${accent}` }
  return href
    ? <Link href={href} className={className} style={style}>{inner}</Link>
    : <div className={className} style={style}>{inner}</div>
}

// Paid is a static badge; pending is itself the action button — click to mark paid
// inline, instead of a separate redundant "unpaid bookings" list elsewhere on the page.
function PayButton({ id, paid }: { id: string; paid: boolean }) {
  if (paid) {
    return (
      <span className="text-xs px-2 py-0.5 whitespace-nowrap rounded-full"
        style={{ backgroundColor: '#2E7D5E18', color: '#2E7D5E' }}>
        ชำระแล้ว
      </span>
    )
  }
  return (
    <form action={handleUpdatePayment}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="payment_status" value="paid" />
      <button type="submit"
        className="text-xs px-2 py-0.5 whitespace-nowrap rounded-full font-medium transition-opacity hover:opacity-70"
        style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
        รอชำระ — บันทึก
      </button>
    </form>
  )
}
