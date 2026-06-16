'use client'

import { useTransition, useState } from 'react'
import { updateCleaningType } from '@/lib/actions/housekeeping'

interface CleaningType { id: string; name: string }

interface Props {
  bookingId:    string
  currentId:    string | null
  cleaningTypes: CleaningType[]
}

// Visual accent per cleaning type name — makes status scannable at a glance.
const TYPE_COLOR: Record<string, string> = {
  'Cleaned':          '#2E7D5E',
  'Out of order':     '#C0392B',
  'Full Cleaning':    '#B8860B',
  'Mini Cleaning':    '#8475BB',
  'Amenity in room':  '#4A7FA5',
}

export function CleaningSelector({ bookingId, currentId, cleaningTypes }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected]      = useState(currentId)
  const [error, setError]            = useState<string | null>(null)

  function handleSelect(id: string) {
    if (id === selected || isPending) return
    setError(null)
    const prev = selected
    setSelected(id)
    startTransition(async () => {
      const res = await updateCleaningType(bookingId, id)
      if (res.error) {
        setSelected(prev)
        setError(res.error)
      }
    })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {cleaningTypes.map(ct => {
          const isActive = selected === ct.id
          const accent   = TYPE_COLOR[ct.name] ?? 'var(--text-muted)'
          return (
            <button
              key={ct.id}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(ct.id)}
              className="text-xs px-2.5 py-1.5 rounded font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: isActive ? accent : 'transparent',
                color:           isActive ? '#fff' : 'var(--text-muted)',
                border:          `1px solid ${isActive ? accent : 'var(--border)'}`,
              }}
            >
              {ct.name}
            </button>
          )
        })}
      </div>
      {error && (
        <p className="text-xs mt-1.5" style={{ color: '#C0392B' }}>{error}</p>
      )}
    </div>
  )
}
