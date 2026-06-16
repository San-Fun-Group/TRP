'use client'

import { useTransition, useState } from 'react'
import {
  updateBookingStatus,
  updatePaymentStatus,
  assignRoom,
  assignDoctor,
  type BookingStatus,
  type PaymentStatus,
} from '@/lib/actions/bookings'

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

interface Room   { id: string; name: string }
interface Doctor { id: string; name: string }

interface Props {
  bookingId:          string
  status:             BookingStatus
  paymentStatus:      PaymentStatus
  roomId:             string | null
  doctorId:           string | null
  rooms:              Room[]
  doctors:            Doctor[]
}

export function BookingActions({
  bookingId, status, paymentStatus, roomId, doctorId, rooms, doctors,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)

  const [selectedRoom,   setSelectedRoom]   = useState(roomId   ?? '')
  const [selectedDoctor, setSelectedDoctor] = useState(doctorId ?? '')

  function act(fn: () => Promise<{ error: string | null }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
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

      {/* Status */}
      <Section title="สถานะการจอง">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs px-2.5 py-1 font-medium rounded-full"
            style={{ backgroundColor: `${STATUS_COLOR[status]}18`, color: STATUS_COLOR[status] }}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        {!isClosed && (
          <div className="flex flex-wrap gap-2">
            {status === 'new' && (
              <ActionBtn
                label="ยืนยันการจอง"
                color="#2E7D5E"
                disabled={isPending}
                onClick={() => act(() => updateBookingStatus(bookingId, 'confirmed'))}
              />
            )}
            {status === 'confirmed' && (
              <ActionBtn
                label="เช็คเอาท์"
                color="var(--gold)"
                disabled={isPending}
                onClick={() => act(() => updateBookingStatus(bookingId, 'checked_out'))}
              />
            )}
            <ActionBtn
              label="ยกเลิกการจอง"
              color="#C0392B"
              disabled={isPending}
              onClick={() => act(() => updateBookingStatus(bookingId, 'cancelled'))}
            />
          </div>
        )}
      </Section>

      {/* Payment */}
      <Section title="สถานะการชำระเงิน">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: paymentStatus === 'paid' ? '#2E7D5E18' : '#AAA3',
              color:           paymentStatus === 'paid' ? '#2E7D5E'   : '#AAA',
            }}>
            {paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระเงิน'}
          </span>
        </div>
        {status !== 'cancelled' && (
          paymentStatus === 'pending' ? (
            <ActionBtn
              label="บันทึกรับชำระเงิน"
              color="#2E7D5E"
              disabled={isPending}
              onClick={() => act(() => updatePaymentStatus(bookingId, 'paid'))}
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
            <option value="">— ยังไม่ได้กำหนด —</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            disabled={isPending}
            onClick={() => act(() => assignDoctor(bookingId, selectedDoctor || null))}
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
