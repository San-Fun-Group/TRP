import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BookingActions } from './booking-actions'
import type { BookingStatus, PaymentStatus } from '@/lib/actions/bookings'
import { thaiDateLong } from '@/lib/utils/date'
import { joinRow } from '@/lib/utils/supabase'

function thaiDateTime(d: string) {
  return new Date(d).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value ?? '—'}</p>
    </div>
  )
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: booking },
    { data: doctors },
  ] = await Promise.all([
    supabase.from('bookings')
      .select(`
        id, guest_name, email, guest_count,
        checkin_date, checkout_date, nights,
        extra_beds, needs_caretaker,
        room_price_at_booking, extra_bed_price_at_booking, discount_percent_at_booking, total_price,
        status, payment_status,
        created_at, updated_at,
        room_type_id, room_id, doctor_id,
        room_types(id, name),
        rooms(id, name),
        staff(name),
        doctors(name),
        discounts(label)
      `)
      .eq('id', id)
      .single(),
    supabase.from('doctors').select('id, name').eq('is_active', true).order('name'),
  ])

  if (!booking) notFound()

  // Rooms for this booking's room type
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('room_type_id', booking.room_type_id)
    .eq('is_active', true)
    .order('name')

  const roomTypeName  = joinRow<{ name: string }>(booking.room_types)?.name ?? '—'
  const roomName      = joinRow<{ name: string }>(booking.rooms)?.name
  const staffName     = joinRow<{ name: string }>(booking.staff)?.name ?? '—'
  const doctorName    = joinRow<{ name: string }>(booking.doctors)?.name
  const discountLabel = joinRow<{ label: string }>(booking.discounts)?.label ?? 'ไม่มีส่วนลด'

  const nightlyRate = booking.room_price_at_booking + booking.extra_bed_price_at_booking * booking.extra_beds

  return (
    <div className="space-y-6">
      {/* Back */}
      <div>
        <Link href="/reception/history" className="text-xs" style={{ color: 'var(--text-light)' }}>
          ← การจองทั้งหมด
        </Link>
      </div>

      {/* Heading */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--primary)' }}>
          {booking.guest_name}
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
          ID: {id.slice(0, 8).toUpperCase()}
          {' · '}สร้างเมื่อ {thaiDateTime(booking.created_at)}
          {booking.updated_at !== booking.created_at && ` · แก้ไขเมื่อ ${thaiDateTime(booking.updated_at)}`}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">

        {/* Left: booking details */}
        <div className="card px-5 py-2">
          <p className="text-xs font-medium tracking-widest uppercase py-3 mb-1" style={{ color: 'var(--text-light)' }}>
            ข้อมูลผู้เข้าพัก
          </p>
          <Field label="ชื่อผู้เข้าพัก"   value={booking.guest_name} />
          <Field label="อีเมล"             value={booking.email} />
          <Field label="จำนวนผู้เข้าพัก"   value={`${booking.guest_count} ท่าน`} />
          <Field label="เตียงเสริม"        value={booking.extra_beds > 0 ? `${booking.extra_beds} เตียง` : 'ไม่มี'} />
          <Field label="ต้องการผู้ดูแล"    value={booking.needs_caretaker ? 'ต้องการ' : 'ไม่ต้องการ'} />

          <p className="text-xs font-medium tracking-widest uppercase py-3 mt-3" style={{ color: 'var(--text-light)' }}>
            วัน & ห้องพัก
          </p>
          <Field label="ประเภทห้อง"  value={roomTypeName} />
          <Field label="ห้องพักจริง" value={roomName ?? '(ยังไม่ได้กำหนด)'} />
          <Field label="วันเช็คอิน"  value={thaiDateLong(booking.checkin_date)} />
          <Field label="วันเช็คเอาท์" value={thaiDateLong(booking.checkout_date)} />
          <Field label="จำนวนคืน"    value={`${booking.nights} คืน`} />

          <p className="text-xs font-medium tracking-widest uppercase py-3 mt-3" style={{ color: 'var(--text-light)' }}>
            บุคลากร
          </p>
          <Field label="เจ้าหน้าที่" value={staffName} />
          <Field label="แพทย์"       value={doctorName} />

          <p className="text-xs font-medium tracking-widest uppercase py-3 mt-3" style={{ color: 'var(--text-light)' }}>
            ราคา
          </p>
          <Field label="ราคาห้องต่อคืน"    value={`${booking.room_price_at_booking.toLocaleString()} ฿`} />
          {booking.extra_beds > 0 && (
            <Field label="เตียงเสริม × คืน"
              value={`${booking.extra_bed_price_at_booking.toLocaleString()} ฿ × ${booking.extra_beds} × ${booking.nights}`} />
          )}
          <Field label="ราคารวมต่อคืน"     value={`${nightlyRate.toLocaleString()} ฿`} />
          <Field label="ส่วนลด"            value={discountLabel} />
          <div className="py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>ราคารวมทั้งหมด</p>
            <p style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: '1.75rem',
              fontWeight: 400,
              color: 'var(--primary)',
            }}>
              {booking.total_price?.toLocaleString()} ฿
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="card px-5 py-5">
          <BookingActions
            bookingId={id}
            status={booking.status as BookingStatus}
            paymentStatus={booking.payment_status as PaymentStatus}
            roomId={booking.room_id}
            doctorId={booking.doctor_id}
            rooms={rooms ?? []}
            doctors={doctors ?? []}
            guestName={booking.guest_name}
            email={booking.email}
            guestCount={booking.guest_count}
            extraBeds={booking.extra_beds}
            needsCaretaker={booking.needs_caretaker}
          />
        </div>
      </div>
    </div>
  )
}
