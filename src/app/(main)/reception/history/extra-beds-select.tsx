'use client'

import { useTransition } from 'react'
import { updateExtraBeds } from '@/lib/actions/bookings'

export function ExtraBedsSelect({ bookingId, value }: { bookingId: string; value: number }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      defaultValue={value}
      disabled={isPending}
      onChange={e => {
        const beds = parseInt(e.target.value, 10)
        startTransition(async () => { await updateExtraBeds(bookingId, beds) })
      }}
      className="text-xs px-2 py-1 rounded"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        width: '3.5rem',
        opacity: isPending ? 0.5 : 1,
      }}
    >
      <option value={0}>0</option>
      <option value={1}>1</option>
      <option value={2}>2</option>
    </select>
  )
}
