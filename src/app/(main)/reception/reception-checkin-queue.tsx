'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { thaiDate } from '@/lib/utils/date'
import { joinRow } from '@/lib/utils/supabase'
import { updateBookingStatus, updatePaymentStatus } from '@/lib/actions/bookings'
import { ReceptionCheckIn } from './reception-checkin'
import { ExtraBedsSelect } from './history/extra-beds-select'

interface Arrival {
  id: string
  guest_name: string
  checkin_date: string
  checkout_date: string
  payment_status: string
  extra_beds: number | null
  room_type_id: string
  room_types: { name: string } | { name: string }[] | null
}

interface VacantRoom { id: string; name: string; room_type_id: string }

export function CheckInQueue({
  arrivals,
  vacantRooms,
}: {
  arrivals: Arrival[]
  vacantRooms: VacantRoom[]
}) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  const [q, setQ] = useState('')

  const filtered = q.trim()
    ? arrivals.filter(a => a.guest_name.toLowerCase().includes(q.trim().toLowerCase()))
    : arrivals

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-light)' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="ค้นหาข้อมูล…"
          className="w-full text-xs pl-8 pr-3 py-2 rounded"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
      </div>

      {!filtered.length ? (
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่มีรายการรอเช็คอิน</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden md:block px-5 pt-3 pb-2">
            <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ชื่อ', 'ประเภทห้อง', 'เช็คอิน', 'เช็คเอาท์', 'เลือกห้อง', 'เตียงเสริม', 'การชำระเงิน', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-3 font-medium text-xs tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-light)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const roomTypeName  = joinRow<{ name: string }>(b.room_types)?.name ?? '—'
                  const availableRooms = vacantRooms.filter(r => r.room_type_id === b.room_type_id)
                  const overdue       = b.checkin_date < today
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>

                      <td className="py-3 pr-3" style={{ minWidth: '100px' }}>
                        <Link href={`/reception/history/${b.id}`}
                          className="font-medium hover:underline text-xs block truncate"
                          style={{ color: 'var(--primary)' }}>
                          {b.guest_name}
                        </Link>
                        {overdue && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
                            ค้างเช็คอิน
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-3 text-xs whitespace-nowrap" style={{ color: 'var(--text)' }}>
                        {roomTypeName}
                      </td>

                      <td className="py-3 pr-3 text-xs whitespace-nowrap" style={{ color: 'var(--text)', width: '1px' }}>
                        {thaiDate(b.checkin_date)}
                      </td>

                      <td className="py-3 pr-3 text-xs whitespace-nowrap" style={{ color: 'var(--text)', width: '1px' }}>
                        {thaiDate(b.checkout_date)}
                      </td>

                      <td className="py-3 pr-3">
                        <ReceptionCheckIn bookingId={b.id} availableRooms={availableRooms} />
                      </td>

                      <td className="py-3 pr-3">
                        <ExtraBedsSelect bookingId={b.id} value={b.extra_beds ?? 0} />
                      </td>

                      <td className="py-3 pr-3">
                        <PayToggle id={b.id} paid={b.payment_status === 'paid'} />
                      </td>

                      <td className="py-3">
                        <CancelButton id={b.id} />
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(b => {
              const roomTypeName   = joinRow<{ name: string }>(b.room_types)?.name ?? '—'
              const availableRooms = vacantRooms.filter(r => r.room_type_id === b.room_type_id)
              const overdue        = b.checkin_date < today
              return (
                <div key={b.id} className="card p-4 space-y-3">

                  {/* Guest name + payment status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/reception/history/${b.id}`}
                        className="font-medium text-sm hover:underline block truncate"
                        style={{ color: 'var(--primary)' }}>
                        {b.guest_name}
                      </Link>
                      {overdue && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#C0392B18', color: '#C0392B' }}>
                          ค้างเช็คอิน
                        </span>
                      )}
                    </div>
                    <PayToggle id={b.id} paid={b.payment_status === 'paid'} />
                  </div>

                  {/* Room type + dates */}
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {roomTypeName} · {thaiDate(b.checkin_date)} – {thaiDate(b.checkout_date)}
                  </p>

                  {/* Check-in action + extra beds */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <ReceptionCheckIn bookingId={b.id} availableRooms={availableRooms} />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs" style={{ color: 'var(--text-light)' }}>เตียง</span>
                      <ExtraBedsSelect bookingId={b.id} value={b.extra_beds ?? 0} />
                    </div>
                  </div>

                  {/* Cancel */}
                  <div className="text-right">
                    <CancelButton id={b.id} />
                  </div>

                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function PayToggle({ id, paid }: { id: string; paid: boolean }) {
  const [, startTransition] = useTransition()
  return (
    <button type="button"
      onClick={() => startTransition(async () => { await updatePaymentStatus(id, paid ? 'pending' : 'paid') })}
      className="text-xs px-2 py-0.5 whitespace-nowrap rounded-full font-medium transition-opacity hover:opacity-70 inline-flex items-center gap-1"
      style={paid
        ? { backgroundColor: '#16A34A22', color: '#16A34A', border: '1px dashed #16A34A60' }
        : { backgroundColor: '#CA8A0422', color: '#CA8A04', border: '1px dashed #CA8A0460' }
      }>
      {paid ? 'ชำระแล้ว' : 'รอชำระ'}
      <span className="opacity-50 text-[10px]">✎</span>
    </button>
  )
}

function CancelButton({ id }: { id: string }) {
  const [, startTransition] = useTransition()
  return (
    <button type="button"
      onClick={() => startTransition(async () => { await updateBookingStatus(id, 'cancelled') })}
      className="text-xs transition-opacity hover:opacity-70"
      style={{ color: 'var(--error)' }}>
      ยกเลิก
    </button>
  )
}
