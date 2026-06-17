'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateBookingStatus, updatePaymentStatus, updateExtraBeds } from '@/lib/actions/bookings'
import { thaiDate } from '@/lib/utils/date'

interface Room {
  id: string
  name: string
  room_type_id: string
}

interface InHouseBooking {
  id: string
  guest_name: string
  room_id: string | null
  checkout_date: string
  extra_beds: number | null
  payment_status: string
}

const TABS = [
  { label: 'ทั้งหมด',    value: 'all'      },
  { label: 'ห้องว่าง',   value: 'vacant'   },
  { label: 'ห้องไม่ว่าง', value: 'occupied' },
] as const

export function RoomBoard({
  rooms,
  inHouse,
}: {
  rooms: Room[]
  inHouse: InHouseBooking[]
}) {
  const [tab, setTab] = useState<'all' | 'vacant' | 'occupied'>('all')

  const occupantByRoom = new Map(
    inHouse.filter(b => b.room_id).map(b => [b.room_id!, b]),
  )

  const filtered = rooms.filter(r => {
    const occ = occupantByRoom.has(r.id)
    if (tab === 'vacant')   return !occ
    if (tab === 'occupied') return occ
    return true
  })

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
            style={tab === t.value
              ? { backgroundColor: 'var(--primary)', color: '#fff' }
              : { border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--surface)' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(r => {
          const occupant = occupantByRoom.get(r.id)
          return occupant
            ? <OccupiedCard key={r.id} roomName={r.name} booking={occupant} />
            : <VacantCard   key={r.id} roomName={r.name} />
        })}
      </div>
    </div>
  )
}

function VacantCard({ roomName }: { roomName: string }) {
  return (
    <div className="card overflow-hidden"
      style={{ borderLeft: '4px solid var(--border)', background: 'var(--surface)' }}>
      <div className="px-5 py-3 flex items-end gap-4">
        <span style={{
          fontFamily: 'var(--font-cormorant, serif)',
          fontSize: '4rem', fontWeight: 400, lineHeight: 1,
          color: 'var(--text-light)',
          marginTop: '-0.15em',
        }}>
          {roomName}
        </span>
        <div className="mb-1">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>ว่าง</p>
        </div>
      </div>
    </div>
  )
}

function OccupiedCard({ roomName, booking }: { roomName: string; booking: InHouseBooking }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function checkout() {
    startTransition(async () => {
      await updateBookingStatus(booking.id, 'checked_out')
      router.refresh()
    })
  }

  function togglePay() {
    const next = booking.payment_status === 'paid' ? 'pending' : 'paid'
    startTransition(async () => {
      await updatePaymentStatus(booking.id, next)
      router.refresh()
    })
  }

  const paid = booking.payment_status === 'paid'

  return (
    <div className="card overflow-hidden px-5 pt-4 pb-3"
      style={{ borderLeft: '4px solid var(--primary)', background: 'var(--surface)', opacity: isPending ? 0.65 : 1, transition: 'opacity 0.15s' }}>

      <div className="flex items-start justify-between">
        <span style={{
          fontFamily: 'var(--font-cormorant, serif)',
          fontSize: '4rem', fontWeight: 400, lineHeight: 1,
          color: 'var(--primary)',
          marginTop: '-0.15em',
        }}>
          {roomName}
        </span>

        <div className="text-right">
          <p className="text-xs mb-2" style={{ color: 'var(--text-light)' }}>เตียงเสริม</p>
          <BedChips bookingId={booking.id} value={booking.extra_beds ?? 0} />
        </div>
      </div>

      <div className="flex items-end justify-between mt-2 gap-3">
        <div className="min-w-0">
          <p className="truncate" style={{
            fontFamily: 'var(--font-cormorant, serif)',
            fontSize: '1.15rem', color: 'var(--primary)',
          }}>
            {booking.guest_name}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-light)' }}>
            ออก {thaiDate(booking.checkout_date)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" disabled={isPending} onClick={checkout}
            className="px-4 py-1.5 text-xs font-medium rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
            เช็คเอาท์
          </button>
          <button type="button" disabled={isPending} onClick={togglePay}
            className="px-4 py-1.5 text-xs font-medium rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
            style={paid
              ? { backgroundColor: '#2E7D5E', color: '#fff' }
              : { backgroundColor: 'var(--mauve)', color: '#fff' }
            }>
            {paid ? 'ชำระแล้ว' : 'ชำระเงิน'}
          </button>
        </div>
      </div>

    </div>
  )
}

function BedChips({ bookingId, value }: { bookingId: string; value: number }) {
  const [current, setCurrent] = useState(value)
  const [, startTransition] = useTransition()

  function select(n: number) {
    setCurrent(n)
    startTransition(async () => { await updateExtraBeds(bookingId, n) })
  }

  return (
    <div className="flex gap-1">
      {[0, 1, 2].map(n => (
        <button key={n} type="button" onClick={() => select(n)}
          className="w-6 h-6 text-[11px] font-medium rounded transition-colors"
          style={current === n
            ? { backgroundColor: 'var(--primary)', color: '#fff' }
            : { border: '1px solid var(--border)', color: 'var(--text-light)', backgroundColor: 'transparent' }
          }>
          {n}
        </button>
      ))}
    </div>
  )
}
