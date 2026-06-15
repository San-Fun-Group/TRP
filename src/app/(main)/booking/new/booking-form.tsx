'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBooking } from '@/lib/actions/bookings'

interface RoomType    { id: string; name: string; price_per_night: number; extra_bed_price: number }
interface Staff       { id: string; name: string }
interface Doctor      { id: string; name: string }
interface Discount    { id: string; label: string; percent: number }
interface BookingType { id: string; name: string }
interface CleaningType{ id: string; name: string }
interface Availability{ available: number; capacity: number }

interface Props {
  roomTypes:     RoomType[]
  staff:         Staff[]
  doctors:       Doctor[]
  discounts:     Discount[]
  bookingTypes:  BookingType[]
  cleaningTypes: CleaningType[]
}

function calcTotal(
  pricePerNight: number,
  extraBedPrice: number,
  extraBeds: number,
  nights: number,
  discountPct: number
): number {
  return Math.floor((pricePerNight + extraBedPrice * extraBeds) * nights * (100 - discountPct) / 100)
}

export function BookingForm({ roomTypes, staff, doctors, discounts, bookingTypes, cleaningTypes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Date fields
  const [checkin,  setCheckin]  = useState('')
  const [checkout, setCheckout] = useState('')

  // Availability
  const [avail, setAvail] = useState<Record<string, Availability>>({})
  const [availLoading, setAvailLoading] = useState(false)

  // Selected room type (default to first)
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? '')
  const roomType = roomTypes.find(r => r.id === roomTypeId)

  // Form fields
  const [guestName,      setGuestName]      = useState('')
  const [email,          setEmail]          = useState('')
  const [guestCount,     setGuestCount]     = useState(1)
  const [staffId,        setStaffId]        = useState(staff[0]?.id ?? '')
  const [doctorId,       setDoctorId]       = useState(doctors[0]?.id ?? '')
  const [bookingTypeId,  setBookingTypeId]  = useState(bookingTypes[0]?.id ?? '')
  const [discountId,     setDiscountId]     = useState(discounts.find(d => d.percent === 0)?.id ?? discounts[0]?.id ?? '')
  const [extraBeds,      setExtraBeds]      = useState(0)
  const [needsCaretaker, setNeedsCaretaker] = useState(false)
  const [cleaningTypeId, setCleaningTypeId] = useState('')
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState(false)

  // Derived values
  const nights      = checkin && checkout ? Math.max(0, (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000) : 0
  const discount    = discounts.find(d => d.id === discountId)
  const total       = roomType && nights > 0
    ? calcTotal(roomType.price_per_night, roomType.extra_bed_price, extraBeds, nights, discount?.percent ?? 0)
    : 0
  const roomAvail   = avail[roomTypeId]
  const isFull      = roomAvail !== undefined && roomAvail.available <= 0

  // Check availability when dates change
  useEffect(() => {
    if (!checkin || !checkout || checkout <= checkin) {
      setAvail({})
      return
    }
    setAvailLoading(true)
    fetch(`/api/availability?checkin=${checkin}&checkout=${checkout}`)
      .then(r => r.json())
      .then(data => setAvail(data))
      .catch(() => setAvail({}))
      .finally(() => setAvailLoading(false))
  }, [checkin, checkout])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roomType || nights <= 0 || isFull) return
    setError(null)

    startTransition(async () => {
      const result = await createBooking({
        room_type_id:    roomTypeId,
        staff_id:        staffId,
        doctor_id:       doctorId,
        booking_type_id: bookingTypeId,
        discount_id:     discountId || null,
        cleaning_type_id: cleaningTypeId || null,
        guest_name:      guestName,
        email:           email || null,
        guest_count:     guestCount,
        checkin_date:    checkin,
        checkout_date:   checkout,
        extra_beds:      extraBeds,
        needs_caretaker: needsCaretaker,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/home'), 1500)
      }
    })
  }

  if (success) {
    return (
      <div className="p-8 text-center bg-white" style={{ borderLeft: '3px solid #2E7D5E' }}>
        <p className="text-lg mb-1" style={{ color: '#2E7D5E' }}>จองสำเร็จ ✓</p>
        <p className="text-sm" style={{ color: '#999' }}>กลับหน้าหลัก…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Dates ── */}
      <section className="bg-white p-5 space-y-4">
        <SectionTitle>วันที่เข้าพัก</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="เช็คอิน">
            <input type="date" required value={checkin}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setCheckin(e.target.value); if (checkout && e.target.value >= checkout) setCheckout('') }}
              className={inputCls} />
          </Field>
          <Field label="เช็คเอาท์">
            <input type="date" required value={checkout}
              min={checkin || new Date().toISOString().split('T')[0]}
              onChange={e => setCheckout(e.target.value)}
              className={inputCls} />
          </Field>
        </div>

        {/* Availability badge */}
        {checkin && checkout && checkout > checkin && (
          <div className="pt-1">
            {availLoading ? (
              <span className="text-xs" style={{ color: '#999' }}>กำลังตรวจสอบ…</span>
            ) : roomAvail !== undefined ? (
              <span
                className="text-xs px-3 py-1 font-medium"
                style={{
                  backgroundColor: isFull ? '#C0392B18' : '#2E7D5E18',
                  color: isFull ? '#C0392B' : '#2E7D5E',
                }}
              >
                {isFull
                  ? `ห้องเต็ม (${roomAvail.capacity}/${roomAvail.capacity} ห้อง)`
                  : `ว่าง ${roomAvail.available} จาก ${roomAvail.capacity} ห้อง · ${nights} คืน`}
              </span>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Guest info ── */}
      <section className="bg-white p-5 space-y-4">
        <SectionTitle>ข้อมูลผู้เข้าพัก</SectionTitle>
        <Field label="ชื่อผู้เข้าพัก *">
          <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)}
            placeholder="ชื่อ-นามสกุล" className={inputCls} />
        </Field>
        <Field label="อีเมล">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="optional" className={inputCls} />
        </Field>
        <Field label="จำนวนผู้เข้าพัก">
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button key={n} type="button"
                onClick={() => setGuestCount(n)}
                className="w-10 h-10 text-sm font-medium transition-all"
                style={{
                  backgroundColor: guestCount === n ? '#1A3A47' : '#F8F4EF',
                  color: guestCount === n ? '#fff' : '#1A3A47',
                  border: `1px solid ${guestCount === n ? '#1A3A47' : '#DDD8D0'}`,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>
      </section>

      {/* ── Medical / Staff ── */}
      <section className="bg-white p-5 space-y-4">
        <SectionTitle>ข้อมูลการรักษา</SectionTitle>
        <Field label="แพทย์ผู้ดูแล *">
          <Select value={doctorId} onChange={setDoctorId}>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="พนักงานขาย *">
          <Select value={staffId} onChange={setStaffId}>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="ประเภทการจอง *">
          <Select value={bookingTypeId} onChange={setBookingTypeId}>
            {bookingTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="ต้องการผู้ดูแล">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={needsCaretaker}
              onChange={e => setNeedsCaretaker(e.target.checked)}
              className="w-4 h-4 accent-teal-800" />
            <span className="text-sm" style={{ color: '#555' }}>ต้องการผู้ดูแลผู้ป่วย</span>
          </label>
        </Field>
      </section>

      {/* ── Room & pricing ── */}
      <section className="bg-white p-5 space-y-4">
        <SectionTitle>ห้องพักและราคา</SectionTitle>
        <Field label="ส่วนลด">
          <Select value={discountId} onChange={setDiscountId}>
            {discounts.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </Select>
        </Field>
        <Field label="เตียงเสริม">
          <div className="flex gap-2">
            {[0, 1, 2].map(n => (
              <button key={n} type="button"
                onClick={() => setExtraBeds(n)}
                className="w-10 h-10 text-sm font-medium transition-all"
                style={{
                  backgroundColor: extraBeds === n ? '#1A3A47' : '#F8F4EF',
                  color: extraBeds === n ? '#fff' : '#1A3A47',
                  border: `1px solid ${extraBeds === n ? '#1A3A47' : '#DDD8D0'}`,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>
        <Field label="การทำความสะอาด">
          <Select value={cleaningTypeId} onChange={setCleaningTypeId}>
            <option value="">— ไม่ระบุ —</option>
            {cleaningTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>

        {/* Price summary */}
        {nights > 0 && roomType && (
          <div className="mt-2 pt-4 space-y-1.5" style={{ borderTop: '1px solid #EDE8E1' }}>
            <PriceLine label={`ห้อง (${roomType.price_per_night.toLocaleString()} × ${nights} คืน)`}
              value={roomType.price_per_night * nights} />
            {extraBeds > 0 && (
              <PriceLine label={`เตียงเสริม (${roomType.extra_bed_price.toLocaleString()} × ${extraBeds} × ${nights} คืน)`}
                value={roomType.extra_bed_price * extraBeds * nights} />
            )}
            {(discount?.percent ?? 0) > 0 && (
              <PriceLine label={`ส่วนลด ${discount!.label}`}
                value={-Math.floor((roomType.price_per_night * nights + roomType.extra_bed_price * extraBeds * nights) * (discount!.percent) / 100)}
                accent />
            )}
            <div className="flex justify-between pt-2 font-medium" style={{ borderTop: '1px solid #EDE8E1' }}>
              <span style={{ color: '#1A3A47' }}>รวมทั้งสิ้น</span>
              <span style={{ color: '#1A3A47', fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.25rem' }}>
                {total.toLocaleString()} ฿
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <p className="text-sm flex items-center gap-2" style={{ color: '#C0392B' }}>
          <span>⚠</span> {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || isFull || nights <= 0 || !guestName}
        className="w-full py-3 text-sm font-medium tracking-widest uppercase text-white transition-colors disabled:opacity-40"
        style={{ backgroundColor: '#1A3A47' }}
      >
        {isPending ? 'กำลังบันทึก…' : 'ยืนยันการจอง'}
      </button>
    </form>
  )
}

// ── Small helpers ─────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 text-sm border outline-none transition-colors bg-white'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#AAA' }}>
      {children}
    </h3>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#1A3A47' }}>{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}
      style={{ borderColor: '#DDD8D0', color: '#1C1C1C' }}>
      {children}
    </select>
  )
}

function PriceLine({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: accent ? '#C0392B' : '#555' }}>{value.toLocaleString()} ฿</span>
    </div>
  )
}
