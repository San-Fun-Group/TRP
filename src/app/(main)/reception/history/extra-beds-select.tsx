'use client'

import { useState, useTransition } from 'react'
import { updateExtraBeds } from '@/lib/actions/bookings'

export function ExtraBedsSelect({ bookingId, value }: { bookingId: string; value: number }) {
  const [current, setCurrent] = useState(value)
  const [isPending, startTransition] = useTransition()

  function pick(n: number) {
    setCurrent(n)
    startTransition(async () => { await updateExtraBeds(bookingId, n) })
  }

  return (
    <div className="flex gap-1" style={{ opacity: isPending ? 0.5 : 1 }}>
      {[0, 1, 2].map(n => (
        <button key={n} type="button" onClick={() => pick(n)} disabled={isPending}
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
