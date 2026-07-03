'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/constants/booking'
import { thaiDate } from '@/lib/utils/date'
import {
  updateBookingStatus,
  updatePaymentStatus,
  checkInBooking,
} from '@/lib/actions/bookings'

// ── Shared types (exported so page.tsx can build them) ─────────────────────────

export type HomePmsBooking = {
  id: string
  guest_name: string
  checkin_date: string
  checkout_date: string
  nights: number
  total_price: number
  status: string
  payment_status: string
  room_id: string | null
  room_type_id: string
  room_name: string
  room_type_name: string
}

export type PmsRoom = {
  id: string
  name: string
  room_type_id: string
  typeName: string
}

export type PmsCell =
  | { kind: 'booking'; booking: HomePmsBooking; span: number; arriving: boolean }
  | { kind: 'empty' }

export type PmsRoomRow = {
  id: string
  name: string
  typeName: string
  cells: PmsCell[]
}

interface Props {
  today: string
  days: string[]
  roomRows: PmsRoomRow[]
  todayArrivals: HomePmsBooking[]
  todayDepartures: HomePmsBooking[]
  allRooms: PmsRoom[]
  gridBookings: HomePmsBooking[]
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HomePms({
  today, days, roomRows, todayArrivals, todayDepartures, allRooms, gridBookings,
}: Props) {
  const [selected, setSelected] = useState<HomePmsBooking | null>(null)
  const [pendingRoomId, setPendingRoomId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function openBooking(b: HomePmsBooking) {
    setSelected(b)
    setPendingRoomId(b.room_id ?? '')
    setError(null)
  }

  function closeModal() { setSelected(null); setError(null) }

  function act(fn: () => Promise<{ error: string | null }>) {
    setError(null)
    startTransition(async () => {
      const r = await fn()
      if (r.error) { setError(r.error); return }
      router.refresh()
      closeModal()
    })
  }

  // Rooms available for check-in: correct type, not currently occupied by another booking
  const occupiedNow = new Set(
    gridBookings
      .filter(b => b.status === 'checked_in' && b.id !== selected?.id)
      .map(b => b.room_id)
      .filter((id): id is string => id !== null)
  )
  const availableRooms = selected
    ? allRooms.filter(r => r.room_type_id === selected.room_type_id && !occupiedNow.has(r.id))
    : []

  const canCheckIn   = selected ? ['new', 'confirmed'].includes(selected.status) : false
  const canCheckOut  = selected?.status === 'checked_in'
  const needsPayment = selected?.payment_status !== 'paid'
  const needsRoom    = canCheckIn && !selected?.room_id

  return (
    <>
      {/* ── Arrival / Departure strips ── */}
      <div className="grid grid-cols-2 gap-3">
        <StripCard title="เช็คอินวันนี้" count={todayArrivals.length} accent="#2E7D5E">
          {!todayArrivals.length
            ? <span className="text-xs" style={{ color: 'var(--text-light)' }}>ไม่มี</span>
            : todayArrivals.map(b => (
                <GuestChip key={b.id} booking={b} bg="rgba(46,125,94,0.10)" color="#2E7D5E" border="rgba(46,125,94,0.22)" onClick={() => openBooking(b)} />
              ))}
        </StripCard>

        <StripCard title="เช็คเอาท์วันนี้" count={todayDepartures.length} accent="#C4A26A">
          {!todayDepartures.length
            ? <span className="text-xs" style={{ color: 'var(--text-light)' }}>ไม่มี</span>
            : todayDepartures.map(b => (
                <GuestChip key={b.id} booking={b} bg="rgba(196,162,106,0.12)" color="#9A7430" border="rgba(196,162,106,0.30)" onClick={() => openBooking(b)} />
              ))}
        </StripCard>
      </div>

      {/* ── PMS Grid ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '680px' }}>
            <colgroup>
              <col style={{ width: '88px' }} />
              {days.map((_, i) => <col key={i} />)}
            </colgroup>

            <thead>
              <tr style={{ backgroundColor: 'rgba(82,58,133,0.04)', borderBottom: '2px solid var(--border-soft)' }}>
                <th className="text-left py-2 px-3"
                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: '1px solid var(--border-soft)' }}>
                  ห้อง
                </th>
                {days.map(d => {
                  const dt = new Date(d + 'T12:00:00Z')
                  const isToday = d === today
                  return (
                    <th key={d} className="text-center py-2"
                      style={{
                        fontSize: '11px', fontWeight: isToday ? 700 : 500,
                        color: isToday ? 'var(--primary)' : 'var(--text-muted)',
                        backgroundColor: isToday ? 'rgba(82,58,133,0.07)' : undefined,
                        borderLeft: '1px solid var(--border-soft)',
                      }}>
                      <div style={{ fontSize: '10px', fontWeight: 400 }}>{dt.toLocaleDateString('th-TH', { weekday: 'narrow' })}</div>
                      <div>{dt.getUTCDate()}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {roomRows.map((row, ri) => (
                <tr key={row.id}
                  style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: ri % 2 === 1 ? 'rgba(82,58,133,0.012)' : undefined }}>
                  <td className="px-3 py-1.5" style={{ borderRight: '1px solid var(--border-soft)', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{row.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '1px' }}>{row.typeName}</div>
                  </td>

                  {row.cells.map((cell, ci) => {
                    if (cell.kind === 'empty') {
                      return <td key={ci} style={{ height: '40px', borderLeft: '1px solid var(--border-soft)' }} />
                    }
                    const c = STATUS_COLOR[cell.booking.status] ?? '#8475BB'
                    return (
                      <td key={ci} colSpan={cell.span}
                        style={{ height: '40px', padding: '3px', borderLeft: '1px solid var(--border-soft)' }}>
                        <button
                          type="button"
                          onClick={() => openBooking(cell.booking)}
                          className="flex items-center h-full w-full rounded overflow-hidden transition-opacity hover:opacity-75 text-left"
                          style={{ backgroundColor: c + '22', border: `1px solid ${c}44`, paddingLeft: '6px', paddingRight: '5px', gap: '4px', cursor: 'pointer' }}
                        >
                          {cell.arriving && <span style={{ fontSize: '9px', color: c, flexShrink: 0, fontWeight: 800 }}>IN</span>}
                          <span className="truncate" style={{ fontSize: '11px', fontWeight: 600, color: c, flex: 1 }}>
                            {cell.booking.guest_name}
                          </span>
                          {cell.booking.payment_status !== 'paid' && (
                            <span style={{ fontSize: '9px', color: '#C0392B', flexShrink: 0, fontWeight: 700 }}>฿</span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {!roomRows.length && (
                <tr>
                  <td colSpan={15} className="py-10 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                    ยังไม่มีห้องพักในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5"
          style={{ borderTop: '1px solid var(--border-soft)', backgroundColor: 'rgba(82,58,133,0.02)' }}>
          {(['new', 'confirmed', 'checked_in'] as const).map(s => {
            const lbl: Record<string, string> = { new: 'ใหม่', confirmed: 'ยืนยันแล้ว', checked_in: 'เช็คอินแล้ว' }
            const c = STATUS_COLOR[s]
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: c + '30', border: `1px solid ${c}55` }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lbl[s]}</span>
              </div>
            )
          })}
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>IN</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>เช็คอินวันนั้น</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#C0392B' }}>฿</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ค้างชำระ</span>
          </div>
        </div>
      </div>

      {/* ── Action Modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={closeModal}
            style={{ backgroundColor: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }}
          />
          <div
            className="relative card w-full max-w-sm"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(82,58,133,0.07)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>{selected.guest_name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {selected.room_name !== '—' ? selected.room_name : selected.room_type_name}
                  {' · '}{selected.nights} คืน
                </p>
              </div>
              <button onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: '20px', lineHeight: 1, padding: '2px 4px', borderRadius: '4px' }}>
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">

              {/* Dates + price */}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {thaiDate(selected.checkin_date)} – {thaiDate(selected.checkout_date)}
                </span>
                <span style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.2rem', fontWeight: 500, color: 'var(--primary)' }}>
                  ฿{selected.total_price?.toLocaleString()}
                </span>
              </div>

              {/* Status + payment */}
              <div className="flex gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${STATUS_COLOR[selected.status] ?? '#6B7280'}22`,
                    color: STATUS_COLOR[selected.status] ?? '#6B7280',
                    border: `1px solid ${STATUS_COLOR[selected.status] ?? '#6B7280'}55`,
                  }}>
                  {STATUS_LABEL[selected.status] ?? selected.status}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: selected.payment_status === 'paid' ? '#16A34A22' : '#CA8A0422',
                    color: selected.payment_status === 'paid' ? '#16A34A' : '#CA8A04',
                    border: `1px solid ${selected.payment_status === 'paid' ? '#16A34A60' : '#CA8A0460'}`,
                  }}>
                  {selected.payment_status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                </span>
              </div>

              {/* Room selector (check-in without assigned room) */}
              {needsRoom && availableRooms.length > 0 && (
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                    เลือกห้อง
                  </label>
                  <select
                    value={pendingRoomId}
                    onChange={e => setPendingRoomId(e.target.value)}
                    style={{
                      width: '100%', border: '1px solid var(--border)', borderRadius: '8px',
                      padding: '8px 12px', fontSize: '13px', color: 'var(--text)', background: 'var(--bg)',
                    }}
                  >
                    <option value="">— เลือกห้อง —</option>
                    {availableRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}

              {needsRoom && availableRooms.length === 0 && (
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(192,57,43,0.08)', color: '#C0392B' }}>
                  ไม่มีห้องว่างในประเภทนี้
                </p>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(192,57,43,0.08)', color: '#C0392B' }}>
                  {error}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-1">
                {/* Pay */}
                {needsPayment && (
                  <button
                    disabled={pending}
                    onClick={() => act(() => updatePaymentStatus(selected.id, 'paid'))}
                    className="w-full py-2.5 text-sm font-medium rounded-lg transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#2E7D5E', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {pending ? 'กำลังบันทึก…' : '✓ รับชำระเงิน'}
                  </button>
                )}

                {/* Check-in */}
                {canCheckIn && (
                  <button
                    disabled={pending || (needsRoom && !pendingRoomId) || (needsRoom && availableRooms.length === 0)}
                    onClick={() => act(() => checkInBooking(selected.id, selected.room_id ?? pendingRoomId))}
                    className="w-full py-2.5 text-sm font-medium rounded-lg transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {pending ? 'กำลังบันทึก…' : '→ เช็คอิน'}
                  </button>
                )}

                {/* Check-out */}
                {canCheckOut && (
                  <button
                    disabled={pending}
                    onClick={() => act(() => updateBookingStatus(selected.id, 'checked_out'))}
                    className="w-full py-2.5 text-sm font-medium rounded-lg transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#C4A26A', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {pending ? 'กำลังบันทึก…' : '← เช็คเอาท์'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StripCard({ title, count, accent, children }: {
  title: string; count: number; accent: string; children: React.ReactNode
}) {
  return (
    <div className="card px-4 py-3" style={{ borderTop: `2px solid ${accent}` }}>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: accent }}>{title}</p>
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${accent}1A`, color: accent }}>
          {count}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function GuestChip({ booking, bg, color, border, onClick }: {
  booking: HomePmsBooking; bg: string; color: string; border: string; onClick: () => void
}) {
  const roomLabel = booking.room_name !== '—' ? booking.room_name : booking.room_type_name
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-opacity hover:opacity-75"
      style={{ backgroundColor: bg, color, border: `1px solid ${border}`, cursor: 'pointer' }}
    >
      <span className="font-semibold">{booking.guest_name}</span>
      <span style={{ opacity: 0.65 }}>· {roomLabel}</span>
      {booking.payment_status !== 'paid' && (
        <span style={{ color: '#C0392B', marginLeft: '2px', fontWeight: 700 }}>฿</span>
      )}
    </button>
  )
}
