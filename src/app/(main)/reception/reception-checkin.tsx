'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })

  function updatePos() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    function onDown(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  function handleCheckIn() {
    if (!roomId) return
    setError(null)
    startTransition(async () => {
      const res = await checkInBooking(bookingId, roomId)
      if (res.error) setError(res.error)
    })
  }

  const selectedRoom = availableRooms.find(r => r.id === roomId)

  if (!availableRooms.length) {
    return <span className="text-xs" style={{ color: '#C0392B' }}>ไม่มีห้องว่าง</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          color: selectedRoom ? 'var(--text)' : 'var(--text-light)',
          minWidth: '90px',
        }}>
        <span className="flex-1 text-left">{selectedRoom?.name ?? 'เลือกห้อง'}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            minWidth: Math.max(dropPos.width, 100),
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
          {availableRooms.map(r => (
            <button key={r.id} type="button"
              onClick={() => { setRoomId(r.id); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:opacity-70"
              style={{
                backgroundColor: r.id === roomId ? 'rgba(82,58,133,0.09)' : 'transparent',
                color: r.id === roomId ? 'var(--primary)' : 'var(--text)',
                fontWeight: r.id === roomId ? 500 : 400,
              }}>
              {r.name}
            </button>
          ))}
        </div>,
        document.body
      )}

      <button
        type="button"
        disabled={isPending || !roomId}
        onClick={handleCheckIn}
        className="text-xs px-3 py-1.5 rounded font-medium transition-opacity disabled:opacity-40"
        style={{ backgroundColor: '#C4A26A18', color: '#C4A26A' }}>
        {isPending ? 'กำลังเช็คอิน…' : 'เช็คอิน'}
      </button>

      {error && <span className="text-xs whitespace-nowrap" style={{ color: '#C0392B' }}>{error}</span>}
    </div>
  )
}
