'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBooking } from '@/lib/actions/bookings'

interface RoomType    { id: string; name: string; price_per_night: number; extra_bed_price: number }
interface Staff       { id: string; name: string }
interface Discount    { id: string; label: string; percent: number }
interface BookingType { id: string; name: string }
interface Availability{ available: number; capacity: number }

interface Props {
  roomTypes:    RoomType[]
  staff:        Staff[]
  discounts:    Discount[]
  bookingTypes: BookingType[]
}

const BOOKING_TYPE_HINT: Record<string, string> = {
  'normal':   'อัตราปกติสำหรับผู้ป่วยทั่วไป',
  'staff':    'อัตราพิเศษสำหรับบุคลากรโรงพยาบาล',
  'VIP comp': 'ให้พักโดยไม่คิดค่าใช้จ่าย',
}

function calcTotal(price: number, extraPrice: number, extraBeds: number, nights: number, discPct: number): number {
  return Math.floor((price + extraPrice * extraBeds) * nights * (100 - discPct) / 100)
}

function thaiDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function BookingForm({ roomTypes, staff, discounts, bookingTypes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Step: 'form' → fill in details, 'confirm' → review before submit
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  // Dates
  const [checkin,  setCheckin]  = useState('')
  const [checkout, setCheckout] = useState('')

  // Availability
  const [avail,        setAvail]        = useState<Record<string, Availability>>({})
  const [availLoading, setAvailLoading] = useState(false)

  // Room type
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? '')
  const roomType = roomTypes.find(r => r.id === roomTypeId)

  // Form fields
  const [guestName,      setGuestName]      = useState('')
  const [email,          setEmail]          = useState('')
  const [guestCount,     setGuestCount]     = useState(1)
  const [staffId,        setStaffId]        = useState(staff[0]?.id ?? '')
  const [bookingTypeId,  setBookingTypeId]  = useState(bookingTypes[0]?.id ?? '')
  const [discountId,     setDiscountId]     = useState(discounts.find(d => d.percent === 0)?.id ?? discounts[0]?.id ?? '')
  const [extraBeds,      setExtraBeds]      = useState(0)
  const [needsCaretaker, setNeedsCaretaker] = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState(false)

  // Derived
  const nights   = checkin && checkout
    ? Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 0
  const discount  = discounts.find(d => d.id === discountId)
  const total     = roomType && nights > 0
    ? calcTotal(roomType.price_per_night, roomType.extra_bed_price, extraBeds, nights, discount?.percent ?? 0)
    : 0
  const roomAvail = avail[roomTypeId]
  const isFull    = roomAvail !== undefined && roomAvail.available <= 0

  const datesValid  = !!(checkin && checkout && checkout > checkin)
  const canProceed  = datesValid && !availLoading && roomAvail !== undefined && !isFull
  const formReady   = canProceed && guestName.trim().length > 0

  const selectedBookingType = bookingTypes.find(t => t.id === bookingTypeId)
  const selectedStaff       = staff.find(s => s.id === staffId)

  // Fetch availability when dates or room type change
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

  // Reset to form step if key fields change
  useEffect(() => {
    if (step === 'confirm') setStep('form')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkin, checkout, roomTypeId, guestName, staffId, bookingTypeId, discountId, extraBeds, guestCount, needsCaretaker])

  async function handleSubmit() {
    if (!roomType || nights <= 0 || isFull) return
    setError(null)

    startTransition(async () => {
      const result = await createBooking({
        room_type_id:    roomTypeId,
        staff_id:        staffId,
        booking_type_id: bookingTypeId,
        discount_id:     discountId || null,
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
        setStep('form')
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/home'), 1800)
      }
    })
  }

  // ── Success ──────────────────────────────────────────────────
  if (success) {
    return (
      <div className="p-8 text-center bg-white" style={{ borderLeft: '3px solid var(--success)' }}>
        <p className="text-lg mb-1 font-medium" style={{ color: 'var(--success)' }}>จองสำเร็จ ✓</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>กลับหน้าหลัก…</p>
      </div>
    )
  }

  // ── Confirm step ─────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="space-y-6 fade-in">
        <div className="bg-white p-6 space-y-4" style={{ borderLeft: '3px solid var(--primary)' }}>
          <h3 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
            ทบทวนการจอง
          </h3>

          <ConfirmRow label="ผู้เข้าพัก"    value={`${guestName}${email ? ` · ${email}` : ''} (${guestCount} คน)`} />
          <ConfirmRow label="เช็คอิน"       value={thaiDate(checkin)} />
          <ConfirmRow label="เช็คเอาท์"     value={thaiDate(checkout)} />
          <ConfirmRow label="จำนวนคืน"      value={`${nights} คืน`} />
          <ConfirmRow label="ประเภทห้อง"    value={roomType?.name ?? '—'} />
          {extraBeds > 0 && <ConfirmRow label="เตียงเสริม" value={`${extraBeds} เตียง`} />}
          {needsCaretaker && <ConfirmRow label="ผู้ดูแล" value="ต้องการผู้ดูแลผู้ป่วย" />}
          <ConfirmRow label="พนักงานขาย"    value={selectedStaff?.name ?? '—'} />
          <ConfirmRow label="ประเภทการจอง"  value={selectedBookingType?.name ?? '—'} />
          {(discount?.percent ?? 0) > 0 && <ConfirmRow label="ส่วนลด" value={discount!.label} accent />}

          <div
            className="flex justify-between items-center pt-4 font-medium"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span style={{ color: 'var(--primary)' }}>ราคารวม</span>
            <span style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.5rem', color: 'var(--primary)' }}>
              {total.toLocaleString()} ฿
            </span>
          </div>
        </div>

        {error && (
          <p className="text-sm flex items-center gap-2" style={{ color: 'var(--error)' }}>
            <span>⚠</span> {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button" onClick={() => setStep('form')}
            className="flex-1 py-3 text-sm font-medium tracking-widest uppercase transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--primary)', backgroundColor: 'var(--surface)' }}
          >
            แก้ไข
          </button>
          <button
            type="button" onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-3 text-sm font-medium tracking-widest uppercase text-white transition-all disabled:opacity-60"
            style={{ backgroundColor: 'var(--primary)' }}
            onMouseEnter={e => { if (!isPending) e.currentTarget.style.backgroundColor = 'var(--primary-hover)' }}
            onMouseLeave={e => { if (!isPending) e.currentTarget.style.backgroundColor = 'var(--primary)' }}
          >
            {isPending ? 'กำลังบันทึก…' : 'ยืนยันการจอง'}
          </button>
        </div>
      </div>
    )
  }

  // ── Form step ────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── 1. Dates & Room Type ── */}
      <section className="bg-white p-5 space-y-4">
        <SectionTitle step={1}>วันที่และประเภทห้อง</SectionTitle>

        <div className="grid grid-cols-2 gap-4">
          <Field label="เช็คอิน *">
            <input type="date" required value={checkin}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setCheckin(e.target.value); if (checkout && e.target.value >= checkout) setCheckout('') }}
              className={inputCls}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </Field>
          <Field label="เช็คเอาท์ *">
            <input type="date" required value={checkout}
              min={checkin || new Date().toISOString().split('T')[0]}
              onChange={e => setCheckout(e.target.value)}
              className={inputCls}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </Field>
        </div>

        {roomTypes.length > 1 && (
          <Field label="ประเภทห้อง *">
            <Select value={roomTypeId} onChange={setRoomTypeId}>
              {roomTypes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
        )}

        {/* Availability status */}
        {datesValid && (
          <div className="pt-1">
            {availLoading ? (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>กำลังตรวจสอบห้องว่าง…</span>
            ) : roomAvail !== undefined ? (
              <span
                className="inline-block text-xs px-3 py-1 font-medium"
                style={{
                  backgroundColor: isFull ? 'var(--error)1A' : 'var(--success)1A',
                  color: isFull ? 'var(--error)' : 'var(--success)',
                }}
              >
                {isFull
                  ? `ห้องเต็ม — ${roomAvail.capacity}/${roomAvail.capacity} ห้องถูกจองแล้ว`
                  : `ว่าง ${roomAvail.available} จาก ${roomAvail.capacity} ห้อง · ${nights} คืน`}
              </span>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Progressive gate ── */}
      {canProceed && (
        <>
          {/* ── 2. Guest info ── */}
          <section className="bg-white p-5 space-y-4 fade-in">
            <SectionTitle step={2}>ข้อมูลผู้เข้าพัก</SectionTitle>

            <Field label="ชื่อผู้เข้าพัก *">
              <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className={inputCls}
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </Field>
            <Field label="อีเมล">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ไม่บังคับ"
                className={inputCls}
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </Field>
            <Field label="จำนวนผู้เข้าพัก">
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button key={n} type="button"
                    onClick={() => setGuestCount(n)}
                    className="w-10 h-10 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: guestCount === n ? 'var(--primary)' : 'var(--bg)',
                      color: guestCount === n ? '#fff' : 'var(--primary)',
                      border: `1px solid ${guestCount === n ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          {/* ── 3. Booking info ── */}
          <section className="bg-white p-5 space-y-4 fade-in">
            <SectionTitle step={3}>ข้อมูลการจอง</SectionTitle>

            <Field label="พนักงานขาย *">
              <Select value={staffId} onChange={setStaffId}>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>

            <div>
              <Field label="ประเภทการจอง *">
                <Select value={bookingTypeId} onChange={setBookingTypeId}>
                  {bookingTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
              {selectedBookingType && BOOKING_TYPE_HINT[selectedBookingType.name] && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {BOOKING_TYPE_HINT[selectedBookingType.name]}
                </p>
              )}
            </div>

            <Field label="ต้องการผู้ดูแล">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={needsCaretaker}
                  onChange={e => setNeedsCaretaker(e.target.checked)}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text)' }}>ต้องการผู้ดูแลผู้ป่วย</span>
              </label>
            </Field>
          </section>

          {/* ── 4. Room & pricing ── */}
          <section className="bg-white p-5 space-y-4 fade-in">
            <SectionTitle step={4}>ราคาและส่วนลด</SectionTitle>

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
                      backgroundColor: extraBeds === n ? 'var(--primary)' : 'var(--bg)',
                      color: extraBeds === n ? '#fff' : 'var(--primary)',
                      border: `1px solid ${extraBeds === n ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>

            {/* Price summary */}
            {nights > 0 && roomType && (
              <div className="pt-4 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                <PriceLine
                  label={`ห้อง ${roomType.name} (${roomType.price_per_night.toLocaleString()} × ${nights} คืน)`}
                  value={roomType.price_per_night * nights}
                />
                {extraBeds > 0 && (
                  <PriceLine
                    label={`เตียงเสริม (${roomType.extra_bed_price.toLocaleString()} × ${extraBeds} × ${nights} คืน)`}
                    value={roomType.extra_bed_price * extraBeds * nights}
                  />
                )}
                {(discount?.percent ?? 0) > 0 && (
                  <PriceLine
                    label={`ส่วนลด ${discount!.label}`}
                    value={-Math.floor((roomType.price_per_night * nights + roomType.extra_bed_price * extraBeds * nights) * discount!.percent / 100)}
                    accent
                  />
                )}
                <div className="flex justify-between items-center pt-2 font-medium"
                  style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--primary)' }}>ราคารวม</span>
                  <span style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.25rem', color: 'var(--primary)' }}>
                    {total.toLocaleString()} ฿
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ── Review button ── */}
          <div>
            <button
              type="button"
              onClick={() => setStep('confirm')}
              disabled={!formReady}
              className="w-full py-3 text-sm font-medium tracking-widest uppercase text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: 'var(--primary)', cursor: formReady ? 'pointer' : 'not-allowed' }}
              onMouseEnter={e => { if (formReady) e.currentTarget.style.backgroundColor = 'var(--primary-hover)' }}
              onMouseLeave={e => { if (formReady) e.currentTarget.style.backgroundColor = 'var(--primary)' }}
            >
              ทบทวนการจอง →
            </button>
            {!formReady && (
              <p className="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {!guestName.trim() ? 'กรุณาระบุชื่อผู้เข้าพัก' : 'กรุณากรอกข้อมูลให้ครบถ้วน'}
              </p>
            )}
          </div>
        </>
      )}

      {/* Hint when dates not yet selected */}
      {!datesValid && (
        <p className="text-xs text-center" style={{ color: 'var(--text-light)' }}>
          เลือกวันเช็คอินและเช็คเอาท์เพื่อดำเนินการต่อ
        </p>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 text-sm border outline-none transition-colors bg-white'

function SectionTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        {step}
      </span>
      <h3 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
        {children}
      </h3>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--primary)' }}>{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={inputCls}
      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      {children}
    </select>
  )
}

function PriceLine({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: accent ? 'var(--error)' : 'var(--text)' }}>{value.toLocaleString()} ฿</span>
    </div>
  )
}

function ConfirmRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-right font-medium" style={{ color: accent ? 'var(--error)' : 'var(--text)' }}>{value}</span>
    </div>
  )
}
