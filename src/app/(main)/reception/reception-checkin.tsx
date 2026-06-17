'use client'

import { useState, useTransition } from 'react'
import { checkInBooking } from '@/lib/actions/bookings'

interface Room { id: string; name: string }

export function ReceptionCheckIn({
  bookingId,
  availableRooms,
}: {
  bookingId: string
  availableRooms: Room[]
}) {
  const [roomId, setRoomId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCheckIn() {
    if (!roomId) return
    setError(null)
    startTransition(async () => {
      const res = await checkInBooking(bookingId, roomId)
      if (res.error) setError(res.error)
    })
  }

  if (!availableRooms.length) {
    return <span className="text-xs" style={{ color: '#C0392B' }}>ไม่มีห้องว่าง</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={roomId}
        onChange={e => setRoomId(e.target.value)}
        disabled={isPending}
        className="text-xs px-2 py-1 rounded"
        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
      >
        <option value="">เลือกห้อง</option>
        {availableRooms.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={isPending || !roomId}
        onClick={handleCheckIn}
        className="text-xs px-3 py-1 rounded font-medium transition-opacity disabled:opacity-40"
        style={{ backgroundColor: '#C4A26A18', color: '#C4A26A' }}
      >
        {isPending ? 'กำลังเช็คอิน…' : 'เช็คอิน'}
      </button>
      {error && <span className="text-xs" style={{ color: '#C0392B' }}>{error}</span>}
    </div>
  )
}
