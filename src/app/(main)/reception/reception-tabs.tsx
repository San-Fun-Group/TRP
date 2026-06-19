'use client'

import { useState } from 'react'
import { RoomBoard } from './reception-room-board'
import { CheckInQueue } from './reception-checkin-queue'

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

export function ReceptionTabs({
  rooms,
  inHouse,
  arrivals,
  vacantRooms,
}: {
  rooms: Room[]
  inHouse: InHouseBooking[]
  arrivals: Arrival[]
  vacantRooms: Room[]
}) {
  const [tab, setTab] = useState<'queue' | 'rooms'>('queue')

  return (
    <>
      {/* Mobile tab switcher — hidden on desktop */}
      <div className="flex lg:hidden rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <TabButton active={tab === 'queue'} onClick={() => setTab('queue')}>
          {`รอเช็คอิน${arrivals.length > 0 ? ` (${arrivals.length})` : ''}`}
        </TabButton>
        <TabButton active={tab === 'rooms'} onClick={() => setTab('rooms')}>
          ห้องพัก
        </TabButton>
      </div>

      {/* Desktop: 2-col grid. Mobile: one panel at a time via tab state */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">

        <section className={tab === 'queue' ? 'hidden lg:block' : ''}>
          <h2 className="text-xs font-medium tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-light)' }}>
            ห้องพัก
          </h2>
          <RoomBoard rooms={rooms} inHouse={inHouse} />
        </section>

        <section className={tab === 'rooms' ? 'hidden lg:block' : ''}>
          <h2 className="text-xs font-medium tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-light)' }}>
            รอการเช็คอิน
          </h2>
          <CheckInQueue arrivals={arrivals} vacantRooms={vacantRooms} />
        </section>

      </div>
    </>
  )
}

function TabButton({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 py-2.5 text-xs font-medium transition-colors"
      style={active
        ? { backgroundColor: 'var(--primary)', color: '#fff' }
        : { backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }
      }>
      {children}
    </button>
  )
}
