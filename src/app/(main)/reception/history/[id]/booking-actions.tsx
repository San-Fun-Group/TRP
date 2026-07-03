'use client'

import { useTransition, useState } from 'react'
import {
  updateBookingStatus,
  updatePaymentStatus,
  updateGuestInfo,
  assignRoom,
  assignDoctor,
  checkInBooking,
  type BookingStatus,
  type PaymentStatus,
} from '@/lib/actions/bookings'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/constants/booking'

interface Room   { id: string; name: string }
interface Doctor { id: string; name: string }

interface Props {
  bookingId:      string
  status:         BookingStatus
  paymentStatus:  PaymentStatus
  totalPrice:     number
  roomId:         string | null
  doctorId:       string
  rooms:          Room[]
  doctors:        Doctor[]
  guestName:      string
  email:          string | null
  guestCount:     number
  extraBeds:      number
  needsCaretaker: boolean
}

export function BookingActions({
  bookingId, status, paymentStatus, totalPrice, roomId, doctorId, rooms, doctors,
  guestName, email, guestCount, extraBeds, needsCaretaker,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)

  const [selectedRoom,   setSelectedRoom]   = useState(roomId ?? '')
  const [selectedDoctor, setSelectedDoctor] = useState(doctorId)

  // Guest info edit state
  const [editingGuest, setEditingGuest] = useState(false)
  const [editName,     setEditName]     = useState(guestName)
  const [editEmail,    setEditEmail]    = useState(email ?? '')
  const [editCount,    setEditCount]    = useState(guestCount)
  const [editBeds,     setEditBeds]     = useState(extraBeds)
  const [editCaretaker, setEditCaretaker] = useState(needsCaretaker)

  function act(fn: () => Promise<{ error: string | null }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
    })
  }

  function saveGuestInfo() {
    act(async () => {
      const res = await updateGuestInfo(bookingId, {
        guest_name:      editName.trim(),
        email:           editEmail.trim() || null,
        guest_count:     editCount,
        extra_beds:      editBeds,
        needs_caretaker: editCaretaker,
      })
      if (!res.error) setEditingGuest(false)
      return res
    })
  }

  const isClosed = status === 'checked_out' || status === 'cancelled'

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
          {error}
        </p>
      )}

      {/* Guest info edit */}
      <Section title="ข้อมูลผู้เข้าพัก">
        {editingGuest ? (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs mb-1 block" style={{ color: 'var(--text-light)' }}>ชื่อผู้เข้าพัก</span>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              />
            </label>
            <label className="block">
              <span className="text-xs mb-1 block" style={{ color: 'var(--text-light)' }}>อีเมล</span>
              <input
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                type="email"
                className="w-full text-sm px-3 py-2 rounded"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs mb-1 block" style={{ color: 'var(--text-light)' }}>จำนวนผู้เข้าพัก</span>
                <select
                  value={editCount}
                  onChange={e => setEditCount(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                >
                  {[1, 2, 3].map(n => <option key={n} value={n}>{n} ท่าน</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs mb-1 block" style={{ color: 'var(--text-light)' }}>เตียงเสริม</span>
                <select
                  value={editBeds}
                  onChange={e => setEditBeds(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                >
                  <option value={0}>ไม่มี</option>
                  <option value={1}>1 เตียง</option>
                  <option value={2}>2 เตียง</option>
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editCaretaker}
                onChange={e => setEditCaretaker(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text)' }}>ต้องการผู้ดูแล</span>
            </label>
            <div className="flex gap-2 pt-1">
              <button
                disabled={isPending || !editName.trim()}
                onClick={saveGuestInfo}
                className="text-xs px-4 py-1.5 rounded font-medium transition-opacity disabled:opacity-40"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                บันทึก
              </button>
              <button
                onClick={() => { setEditingGuest(false); setEditName(guestName); setEditEmail(email ?? ''); setEditCount(guestCount); setEditBeds(extraBeds); setEditCaretaker(needsCaretaker) }}
                className="text-xs px-4 py-1.5 rounded font-medium"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm space-y-1" style={{ color: 'var(--text)' }}>
              <p className="font-medium">{guestName}</p>
              {email && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{email}</p>}
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {guestCount} ท่าน{extraBeds > 0 ? ` · เตียงเสริม ${extraBeds}` : ''}{needsCaretaker ? ' · มีผู้ดูแล' : ''}
              </p>
            </div>
            {!isClosed && (
              <button
                onClick={() => setEditingGuest(true)}
                className="text-xs px-3 py-1 rounded shrink-0"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                แก้ไข
              </button>
            )}
          </div>
        )}
      </Section>

      {/* Status */}
      <Section title="สถานะการจอง">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs px-2.5 py-1 font-medium rounded-full"
            style={{ backgroundColor: `${STATUS_COLOR[status]}18`, color: STATUS_COLOR[status] }}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        {!isClosed && (
          <div className="flex flex-wrap items-center gap-2">
            {status === 'new' && (
              <ActionBtn
                label="เช็คอิน"
                color="#C4A26A"
                disabled={isPending || !selectedRoom}
                onClick={() => act(() => checkInBooking(bookingId, selectedRoom))}
              />
            )}
            {status === 'checked_in' && (
              <ActionBtn
                label="เช็คเอาท์"
                color="#AAA"
                disabled={isPending}
                onClick={() => act(() => updateBookingStatus(bookingId, 'checked_out'))}
              />
            )}
            <ActionBtn
              label="ยกเลิก"
              color="#C0392B"
              disabled={isPending}
              onClick={() => act(() => updateBookingStatus(bookingId, 'cancelled'))}
            />
            {status === 'new' && !selectedRoom && (
              <span className="text-xs" style={{ color: 'var(--text-light)' }}>เลือกห้องด้านล่างก่อนเช็คอิน</span>
            )}
          </div>
        )}
      </Section>

      {/* Payment */}
      <Section title="สถานะการชำระเงิน">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={paymentStatus === 'paid'
              ? { backgroundColor: '#16A34A22', color: '#16A34A', border: '1px dashed #16A34A60' }
              : { backgroundColor: '#CA8A0422', color: '#CA8A04', border: '1px dashed #CA8A0460' }
            }>
            {paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระเงิน'}
          </span>
        </div>
        {status !== 'cancelled' && (
          paymentStatus === 'pending' ? (
            <ActionBtn
              label="บันทึกรับชำระเงิน"
              color="#2E7D5E"
              disabled={isPending}
              onClick={() => setShowPayModal(true)}
            />
          ) : (
            <ActionBtn
              label="ยกเลิกการชำระ"
              color="#AAA"
              disabled={isPending}
              onClick={() => act(() => updatePaymentStatus(bookingId, 'pending'))}
            />
          )
        )}
      </Section>

      {/* Payment modal */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowPayModal(false)}
        >
          <div
            className="card w-full max-w-sm p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--primary)' }}>
              รับชำระเงิน
            </h2>
            <div className="py-4 text-center" style={{ borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>ยอดที่ต้องชำระ</p>
              <p style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2.25rem', fontWeight: 400, color: 'var(--primary)' }}>
                {totalPrice.toLocaleString()} ฿
              </p>
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              ยืนยันการรับชำระเงินจากผู้เข้าพัก
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 text-sm px-4 py-2.5 rounded font-medium"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                ยกเลิก
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  setShowPayModal(false)
                  act(() => updatePaymentStatus(bookingId, 'paid'))
                }}
                className="flex-1 text-sm px-4 py-2.5 rounded font-medium transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#2E7D5E', color: '#fff' }}
              >
                ยืนยันรับเงิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room assignment */}
      <Section title="ห้องพัก">
        <div className="flex gap-2">
          <select
            value={selectedRoom}
            onChange={e => setSelectedRoom(e.target.value)}
            className="flex-1 text-sm px-3 py-2 rounded"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="">— ยังไม่ได้กำหนด —</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            disabled={isPending}
            onClick={() => act(() => assignRoom(bookingId, selectedRoom || null))}
            className="text-xs px-3 py-2 rounded font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            บันทึก
          </button>
        </div>
      </Section>

      {/* Doctor assignment */}
      <Section title="แพทย์">
        <div className="flex gap-2">
          <select
            value={selectedDoctor}
            onChange={e => setSelectedDoctor(e.target.value)}
            className="flex-1 text-sm px-3 py-2 rounded"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
          >
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            disabled={isPending || !selectedDoctor}
            onClick={() => act(() => assignDoctor(bookingId, selectedDoctor))}
            className="text-xs px-3 py-2 rounded font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            บันทึก
          </button>
        </div>
      </Section>

      {isPending && (
        <p className="text-xs" style={{ color: 'var(--text-light)' }}>กำลังบันทึก…</p>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-5" style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--text-light)' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function ActionBtn({
  label, color, disabled, onClick,
}: { label: string; color: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="text-xs px-4 py-1.5 rounded font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {label}
    </button>
  )
}
