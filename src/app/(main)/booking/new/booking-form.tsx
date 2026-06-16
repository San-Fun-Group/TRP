'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBooking } from '@/lib/actions/bookings'
import { DateRangePicker } from './date-range-picker'
import { thaiDateLong } from '@/lib/utils/date'

interface RoomType    { id: string; name: string; price_per_night: number; extra_bed_price: number }
interface Staff       { id: string; name: string }
interface Discount    { id: string; label: string; percent: number }
interface Doctor      { id: string; name: string }
interface Availability{ available: number; capacity: number }

interface Props {
  roomTypes: RoomType[]
  staff:     Staff[]
  discounts: Discount[]
  doctors:   Doctor[]
}

function calcTotal(price: number, extraPrice: number, extraBeds: number, nights: number, discPct: number) {
  return Math.floor((price + extraPrice * extraBeds) * nights * (100 - discPct) / 100)
}

export function BookingForm({ roomTypes, staff, discounts, doctors }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step,         setStep]         = useState<'form' | 'confirm'>('form')
  const [confirmedKey, setConfirmedKey] = useState('')

  const [checkin,  setCheckin]  = useState('')
  const [checkout, setCheckout] = useState('')

  const [avail,        setAvail]        = useState<Record<string, Availability>>({})
  const [availLoading, setAvailLoading] = useState(false)
  const [availError,   setAvailError]   = useState<string | null>(null)

  const [roomTypeId,     setRoomTypeId]     = useState(roomTypes[0]?.id ?? '')
  const [guestName,      setGuestName]      = useState('')
  const [email,          setEmail]          = useState('')
  const [guestCount,     setGuestCount]     = useState(1)
  const [staffId,        setStaffId]        = useState(staff[0]?.id ?? '')
  const [doctorId,       setDoctorId]       = useState(doctors[0]?.id ?? '')

  const [discountId,     setDiscountId]     = useState(discounts.find(d => d.percent === 0)?.id ?? discounts[0]?.id ?? '')
  const [extraBeds,      setExtraBeds]      = useState(0)
  const [needsCaretaker, setNeedsCaretaker] = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState(false)

  const roomType  = roomTypes.find(r => r.id === roomTypeId)
  const nights    = checkin && checkout
    ? Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 0
  const discount  = discounts.find(d => d.id === discountId)
  const total     = roomType && nights > 0
    ? calcTotal(roomType.price_per_night, roomType.extra_bed_price, extraBeds, nights, discount?.percent ?? 0)
    : 0
  const roomAvail = avail[roomTypeId]
  const isFull    = roomAvail !== undefined && roomAvail.available <= 0

  const formKey    = `${checkin}|${checkout}|${roomTypeId}|${guestName}|${staffId}|${doctorId}|${discountId}|${extraBeds}|${guestCount}|${needsCaretaker}`
  const datesValid = !!(checkin && checkout && checkout > checkin)
  const canProceed = datesValid && !availLoading && roomAvail !== undefined && !isFull
  const formReady  = canProceed && guestName.trim().length > 0 && doctorId.length > 0

  const selectedStaff  = staff.find(s => s.id === staffId)
  const selectedDoctor = doctors.find(d => d.id === doctorId)

  useEffect(() => {
    if (!checkin || !checkout || checkout <= checkin) return
    let cancelled = false
    setAvailLoading(true)
    setAvailError(null)
    fetch(`/api/availability?checkin=${checkin}&checkout=${checkout}`)
      .then(r => {
        if (!r.ok) throw new Error('ตรวจสอบห้องว่างไม่ได้')
        return r.json()
      })
      .then(data => {
        if (!cancelled) {
          if (data.error) {
            setAvailError('ตรวจสอบห้องว่างไม่ได้ กรุณาลองใหม่')
            setAvail({})
          } else {
            setAvail(data)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailError('ตรวจสอบห้องว่างไม่ได้ กรุณาลองใหม่')
          setAvail({})
        }
      })
      .finally(() => { if (!cancelled) setAvailLoading(false) })
    return () => {
      cancelled = true
      setAvail({})
      setAvailLoading(false)
      setAvailError(null)
    }
  }, [checkin, checkout])

  async function handleSubmit() {
    if (!roomType || nights <= 0 || isFull) return
    setError(null)
    startTransition(async () => {
      const result = await createBooking({
        room_type_id: roomTypeId, staff_id: staffId, doctor_id: doctorId,
        discount_id: discountId || null, guest_name: guestName, email: email || null,
        guest_count: guestCount, checkin_date: checkin, checkout_date: checkout,
        extra_beds: extraBeds, needs_caretaker: needsCaretaker,
      })
      if (result.error) { setError(result.error); setStep('form') }
      else { setSuccess(true); setTimeout(() => router.push('/home'), 1800) }
    })
  }

  // ── Success ──────────────────────────────────────────────────
  if (success) {
    return (
      <div className="card p-8 text-center" style={{ borderLeft: '3px solid var(--success)' }}>
        <p className="text-lg mb-1 font-medium" style={{ color: 'var(--success)' }}>จองสำเร็จ ✓</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>กลับหน้าหลัก…</p>
      </div>
    )
  }

  // ── Confirm step ─────────────────────────────────────────────
  if (step === 'confirm' && formKey === confirmedKey) {
    return (
      <div className="space-y-6 fade-in">
        <div className="card p-6 space-y-3">
          <h3 className="text-xs font-medium tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-light)' }}>ทบทวนรายละเอียดการจอง</h3>

          <ConfirmRow label="ผู้เข้าพัก"
            value={`${guestName}${email ? ` · ${email}` : ''} (${guestCount} คน)`} />
          <ConfirmRow label="เช็คอิน"      value={thaiDateLong(checkin)} />
          <ConfirmRow label="เช็คเอาท์"    value={thaiDateLong(checkout)} />
          <ConfirmRow label="จำนวนคืน"     value={`${nights} คืน`} />
          <ConfirmRow label="ประเภทห้อง"   value={roomType?.name ?? '—'} />
          {extraBeds > 0    && <ConfirmRow label="เตียงเสริม"   value={`${extraBeds} เตียง`} />}
          {needsCaretaker   && <ConfirmRow label="ผู้ดูแล"     value="ต้องการผู้ดูแล" />}
          <ConfirmRow label="พนักงานขาย" value={selectedStaff?.name ?? '—'} />
          <ConfirmRow label="แพทย์เจ้าของไข้" value={selectedDoctor?.name ?? '—'} />
          {(discount?.percent ?? 0) > 0 && (
            <ConfirmRow label="ส่วนลด" value={discount!.label} muted />
          )}

          <div className="flex justify-between items-baseline pt-4"
            style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ราคารวม</span>
            {/* Gold only here — the money figure is the luxury accent */}
            <span style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--gold)' }}>
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
          <button type="button" onClick={() => setStep('form')}
            className="flex-1 py-3 text-sm font-medium tracking-widest uppercase transition-all rounded-lg"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--surface)' }}>
            แก้ไข
          </button>
          {/* Single gold action */}
          <button type="button" onClick={handleSubmit} disabled={isPending}
            className="flex-1 py-3 text-sm font-medium tracking-widest uppercase text-white transition-all disabled:opacity-60 rounded-lg"
            style={{ backgroundColor: 'var(--gold)', cursor: isPending ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!isPending) e.currentTarget.style.backgroundColor = 'var(--gold-hover)' }}
            onMouseLeave={e => { if (!isPending) e.currentTarget.style.backgroundColor = 'var(--gold)' }}>
            {isPending ? 'กำลังบันทึก…' : 'ยืนยันการจอง'}
          </button>
        </div>
      </div>
    )
  }

  // ── Form step ────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── 1. Dates & Room Type ── */}
      <section className="card p-5 space-y-4">
        <SectionTitle step={1}>วันที่และประเภทห้อง</SectionTitle>
        <DateRangePicker
          checkin={checkin}
          checkout={checkout}
          onCheckin={setCheckin}
          onCheckout={setCheckout}
        />

        {roomTypes.length > 1 && (
          <Field label="ประเภทห้อง *">
            <Select value={roomTypeId} onChange={setRoomTypeId}>
              {roomTypes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
        )}

        {datesValid && (
          <div>
            {availLoading ? (
              <span className="text-xs" style={{ color: 'var(--text-light)' }}>กำลังตรวจสอบ…</span>
            ) : availError ? (
              <span className="inline-block text-xs px-3 py-1 font-medium rounded-full"
                style={{ backgroundColor: '#C0392B12', color: '#C0392B' }}>
                ⚠ {availError}
              </span>
            ) : roomAvail !== undefined ? (
              <span className="inline-block text-xs px-3 py-1 font-medium rounded-full"
                style={{
                  backgroundColor: isFull ? '#C0392B12' : '#2E7D5E12',
                  color: isFull ? '#C0392B' : '#2E7D5E',
                }}>
                {isFull
                  ? `ห้องเต็ม — ${roomAvail.capacity}/${roomAvail.capacity} ห้อง`
                  : `ว่าง ${roomAvail.available}/${roomAvail.capacity} ห้อง · ${nights} คืน`}
              </span>
            ) : null}
          </div>
        )}
      </section>

      {canProceed && (
        <>
          {/* ── 2. Guest info ── */}
          <section className="card p-5 space-y-4 fade-in">
            <SectionTitle step={2}>ข้อมูลผู้เข้าพัก</SectionTitle>
            <Field label="ชื่อผู้เข้าพัก *">
              <input type="text" required value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="ชื่อ-นามสกุล" className={inputCls} />
            </Field>
            <Field label="อีเมล">
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ไม่บังคับ" className={inputCls} />
            </Field>
            <Field label="จำนวนผู้เข้าพัก">
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <ToggleBtn key={n} active={guestCount === n} onClick={() => setGuestCount(n)}>
                    {n}
                  </ToggleBtn>
                ))}
              </div>
            </Field>
          </section>

          {/* ── 3. Booking info ── */}
          <section className="card p-5 space-y-4 fade-in">
            <SectionTitle step={3}>ข้อมูลการจอง</SectionTitle>
            <Field label="พนักงานขาย *">
              <Select value={staffId} onChange={setStaffId}>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="แพทย์เจ้าของไข้ *">
              <Select value={doctorId} onChange={setDoctorId}>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="ต้องการผู้ดูแล">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={needsCaretaker}
                  onChange={e => setNeedsCaretaker(e.target.checked)}
                  className="w-4 h-4" style={{ accentColor: 'var(--primary)' }} />
                <span className="text-sm" style={{ color: 'var(--text)' }}>ต้องการผู้ดูแลผู้ป่วย</span>
              </label>
            </Field>
          </section>

          {/* ── 4. Pricing ── */}
          <section className="card p-5 space-y-4 fade-in">
            <SectionTitle step={4}>ราคาและส่วนลด</SectionTitle>
            <Field label="ส่วนลด">
              <Select value={discountId} onChange={setDiscountId}>
                {discounts.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="เตียงเสริม">
              <div className="flex gap-2">
                {[0, 1, 2].map(n => (
                  <ToggleBtn key={n} active={extraBeds === n} onClick={() => setExtraBeds(n)}>
                    {n}
                  </ToggleBtn>
                ))}
              </div>
            </Field>

            {nights > 0 && roomType && (
              <div className="pt-4 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                <PriceLine label={`ห้อง ${roomType.name} · ${roomType.price_per_night.toLocaleString()} × ${nights} คืน`}
                  value={roomType.price_per_night * nights} />
                {extraBeds > 0 && (
                  <PriceLine label={`เตียงเสริม · ${roomType.extra_bed_price.toLocaleString()} × ${extraBeds} × ${nights} คืน`}
                    value={roomType.extra_bed_price * extraBeds * nights} />
                )}
                {(discount?.percent ?? 0) > 0 && (
                  <PriceLine label={`ส่วนลด ${discount!.label}`}
                    value={-Math.floor(
                      (roomType.price_per_night * nights + roomType.extra_bed_price * extraBeds * nights)
                      * discount!.percent / 100
                    )} red />
                )}
                <div className="flex justify-between items-baseline pt-3"
                  style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ราคารวม</span>
                  {/* Gold here only — the price total is the luxury signal */}
                  <span style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--gold)' }}>
                    {total.toLocaleString()} ฿
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Single gold CTA */}
          <div>
            <button type="button"
              onClick={() => { setStep('confirm'); setConfirmedKey(formKey) }}
              disabled={!formReady}
              className="w-full py-3 text-sm font-medium tracking-widest uppercase text-white transition-all disabled:opacity-40 rounded-lg"
              style={{ backgroundColor: 'var(--gold)', cursor: formReady ? 'pointer' : 'not-allowed' }}
              onMouseEnter={e => { if (formReady) e.currentTarget.style.backgroundColor = 'var(--gold-hover)' }}
              onMouseLeave={e => { if (formReady) e.currentTarget.style.backgroundColor = 'var(--gold)' }}>
              ทบทวนการจอง →
            </button>
            {!formReady && (
              <p className="mt-2 text-xs text-center" style={{ color: 'var(--text-light)' }}>
                {!guestName.trim() ? 'กรุณาระบุชื่อผู้เข้าพัก' : 'กรุณากรอกข้อมูลให้ครบถ้วน'}
              </p>
            )}
          </div>
        </>
      )}

      {!datesValid && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-light)' }}>
          เลือกวันเช็คอินและเช็คเอาท์เพื่อดำเนินการต่อ
        </p>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 text-sm border outline-none transition-colors bg-white rounded-lg'

function SectionTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 text-xs font-medium flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: 'var(--primary)', borderRadius: '50%' }}>
        {step}
      </span>
      <h3 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
        {children}
      </h3>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={inputCls} style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
      {children}
    </select>
  )
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="w-10 h-10 text-sm font-medium transition-all rounded-lg"
      style={{
        backgroundColor: active ? 'var(--primary)' : 'var(--bg)',
        color:           active ? '#fff' : 'var(--text-muted)',
        border:          `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
      }}>
      {children}
    </button>
  )
}

function PriceLine({ label, value, red }: { label: string; value: number; red?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: 'var(--text-light)' }}>{label}</span>
      <span style={{ color: red ? 'var(--error)' : 'var(--text)' }}>{value.toLocaleString()} ฿</span>
    </div>
  )
}

function ConfirmRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span style={{ color: 'var(--text-light)' }}>{label}</span>
      <span className="text-right font-medium" style={{ color: muted ? 'var(--text-muted)' : 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}
