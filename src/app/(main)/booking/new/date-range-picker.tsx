'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

interface Props {
  checkin:    string
  checkout:   string
  onCheckin:  (d: string) => void
  onCheckout: (d: string) => void
}

// ── helpers ──────────────────────────────────────────────────────

const MONTHS = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
]
const DAYS = ['อา','จ','อ','พ','พฤ','ศ','ส']

function pad(n: number) { return String(n).padStart(2, '0') }
function ymd(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}` }

function fmt(iso: string) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00Z')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear() + 543).slice(-2)}`
}

function bangkokToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
}

interface DayAvail { available: number; capacity: number }

// ── component ────────────────────────────────────────────────────

export function DateRangePicker({ checkin, checkout, onCheckin, onCheckout }: Props) {
  const today                   = bangkokToday()
  const [open,     setOpen]     = useState(false)
  const [mode,     setMode]     = useState<'start' | 'end'>('start')
  const [hover,    setHover]    = useState('')
  const [offset,   setOffset]   = useState(0)
  const [dayAvail, setDayAvail] = useState<Record<string, DayAvail>>({})
  const ref = useRef<HTMLDivElement>(null)

  // Month pages
  const months = useMemo(() => {
    const base = new Date()
    return [0, 1].map(i => {
      const d = new Date(base.getFullYear(), base.getMonth() + offset + i, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }, [offset])

  // Fetch per-day availability for the two visible months whenever they change
  useEffect(() => {
    if (!open) return
    const from = ymd(months[0].year, months[0].month, 1)
    const lastMonthDays = new Date(months[1].year, months[1].month + 1, 0).getDate()
    const to = ymd(months[1].year, months[1].month, lastMonthDays)
    let cancelled = false
    fetch(`/api/availability/calendar?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => { if (!cancelled && !data.error) setDayAvail(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, months])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setHover('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Open the calendar focused on a specific field
  function openFor(field: 'start' | 'end') {
    setMode(field === 'end' && !checkin ? 'start' : field)
    setOpen(true)
  }

  // Handle a day click
  function pick(date: string) {
    if (date < today) return

    if (mode === 'start') {
      onCheckin(date)
      onCheckout('')
      setMode('end')
      return
    }

    // mode === 'end'
    if (!checkin || date === checkin) return  // need a valid range

    if (date > checkin) {
      onCheckout(date)
      setOpen(false)  // close immediately — no delay
      setHover('')
    } else {
      // picked before checkin — restart from this date
      onCheckin(date)
      onCheckout('')
      setMode('end')
    }
  }

  // Range bg for a cell (gradient on endpoints, solid in middle)
  function rangeBg(date: string): string {
    const C   = 'rgba(107,92,168,0.09)'
    const end = checkout || (mode === 'end' && hover ? hover : '')
    if (!checkin || !end || checkin === end) return 'transparent'
    const lo  = checkin < end ? checkin : end
    const hi  = checkin < end ? end     : checkin
    if (date === lo) return `linear-gradient(90deg, transparent 50%, ${C} 50%)`
    if (date === hi) return `linear-gradient(90deg, ${C} 50%, transparent 50%)`
    if (date > lo && date < hi) return C
    return 'transparent'
  }

  // Trigger labels
  const checkinLabel  = checkin  ? fmt(checkin)  : 'เพิ่มวันที่'
  const checkoutLabel = checkout ? fmt(checkout) : 'เพิ่มวันที่'

  return (
    <div ref={ref} className="relative">

      {/* ── Two-box trigger ──────────────────────────────── */}
      <div className="flex rounded-lg overflow-hidden bg-white transition-all"
        style={{ border: `1px solid ${open ? 'var(--primary)' : 'var(--border)'}` }}>

        {/* Checkin */}
        <button type="button" onClick={() => openFor('start')}
          className="flex-1 px-4 py-3 text-left transition-colors"
          style={{ backgroundColor: (open && mode === 'start') ? 'rgba(107,92,168,0.05)' : 'transparent' }}>
          <div style={{ fontSize: 10, color: 'var(--text-light)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
            เช็คอิน
          </div>
          <div className="text-sm" style={{ color: checkin ? 'var(--text)' : 'var(--text-light)', fontWeight: checkin ? 500 : 400 }}>
            {checkinLabel}
          </div>
        </button>

        {/* Separator */}
        <div style={{ width: 1, background: 'var(--border)', margin: '8px 0' }} />

        {/* Checkout */}
        <button type="button" onClick={() => openFor('end')}
          className="flex-1 px-4 py-3 text-left transition-colors"
          style={{ backgroundColor: (open && mode === 'end') ? 'rgba(107,92,168,0.05)' : 'transparent' }}>
          <div style={{ fontSize: 10, color: 'var(--text-light)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
            เช็คเอาท์
          </div>
          <div className="text-sm" style={{ color: checkout ? 'var(--text)' : 'var(--text-light)', fontWeight: checkout ? 500 : 400 }}>
            {checkoutLabel}
          </div>
        </button>
      </div>

      {/* ── Dropdown ─────────────────────────────────────── */}
      {open && (
        <div className="absolute left-0 right-0 mt-1.5 card p-5 space-y-4"
          style={{ top: '100%', zIndex: 100, boxShadow: '0 8px 32px rgba(107,92,168,0.16)', border: '1px solid var(--border-soft)' }}>

          {/* Instruction hint */}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {mode === 'start' ? 'เลือกวันเช็คอิน' : 'เลือกวันเช็คเอาท์'}
          </p>

          {/* Month nav */}
          <div className="flex items-center">
            <button type="button"
              onClick={() => setOffset(o => o - 1)}
              disabled={offset <= 0}
              className="w-7 h-7 flex items-center justify-center rounded text-lg leading-none transition-opacity disabled:opacity-20 hover:opacity-60"
              style={{ color: 'var(--primary)' }}>‹</button>
            <div className="flex-1 grid grid-cols-2">
              {months.map(({ year, month }) => (
                <span key={`${year}-${month}`} className="text-xs font-semibold text-center uppercase tracking-widest"
                  style={{ color: 'var(--primary)' }}>
                  {MONTHS[month]} {year + 543}
                </span>
              ))}
            </div>
            <button type="button"
              onClick={() => setOffset(o => o + 1)}
              className="w-7 h-7 flex items-center justify-center rounded text-lg leading-none hover:opacity-60 transition-opacity"
              style={{ color: 'var(--primary)' }}>›</button>
          </div>

          {/* Two months side by side */}
          <div className="grid grid-cols-2 gap-6">
            {months.map(({ year, month }) => {
              const days    = new Date(year, month + 1, 0).getDate()
              const startDOW = new Date(year, month, 1).getDay()
              const cells   = [...Array(startDOW).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]

              return (
                <div key={`${year}-${month}`}>
                  {/* Day-of-week header */}
                  <div className="grid grid-cols-7 mb-0.5">
                    {DAYS.map(d => (
                      <div key={d} className="text-center" style={{ fontSize: 10, color: 'var(--text-light)', paddingBottom: 4 }}>{d}</div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} />

                      const date    = ymd(year, month, day)
                      const past    = date < today
                      const isStart = date === checkin
                      const isEnd   = date === checkout
                      const isHover = date === hover && !past && !isStart && !isEnd
                      const selected = isStart || isEnd
                      const avail   = dayAvail[date]
                      // Occupancy reflects rooms occupied *starting* this date — only
                      // relevant when picking a check-in. A checkout date never consumes
                      // that night's capacity, so it should never show as unavailable.
                      const isFull  = mode === 'start' && !past && avail !== undefined && avail.available <= 0

                      return (
                        <div key={i} className="relative flex flex-col items-center justify-start"
                          style={{
                            height: 44, paddingTop: 3, borderRadius: 6,
                            background: isFull ? 'var(--bg)' : rangeBg(date),
                          }}>
                          <button
                            type="button"
                            disabled={past}
                            onClick={() => pick(date)}
                            onMouseEnter={() => { if (!past) setHover(date) }}
                            onMouseLeave={() => setHover('')}
                            className="flex items-center justify-center transition-colors"
                            style={{
                              width: 28, height: 28, borderRadius: '50%',
                              fontSize: 12,
                              backgroundColor: selected
                                ? 'var(--primary)'
                                : isHover
                                ? 'rgba(107,92,168,0.15)'
                                : 'transparent',
                              color:    selected ? '#fff' : past ? 'var(--text-light)' : 'var(--text)',
                              fontWeight: selected ? 600 : 400,
                              cursor: past ? 'not-allowed' : 'pointer',
                            }}>
                            {day}
                          </button>
                          {!past && avail !== undefined && (
                            <span style={{
                              fontSize: 9, lineHeight: 1, marginTop: 2,
                              color: isFull ? 'var(--text-light)' : selected ? 'var(--primary)' : 'var(--text-muted)',
                            }}>
                              {isFull ? 'เต็ม' : avail.available}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-3"
            style={{ borderTop: '1px solid var(--border-soft)' }}>
            <button type="button"
              onClick={() => { onCheckin(''); onCheckout(''); setMode('start'); setOpen(false) }}
              className="text-xs transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-light)' }}>
              ล้างวันที่
            </button>
            {checkin && checkout && (
              <button type="button"
                onClick={() => setOpen(false)}
                className="text-xs px-4 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)' }}>
                ตกลง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
