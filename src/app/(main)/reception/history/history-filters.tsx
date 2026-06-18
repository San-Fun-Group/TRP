'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const STATUS_OPTS = [
  { label: 'ทุกสถานะ',    value: '' },
  { label: 'รอเช็คอิน',   value: 'new' },
  { label: 'เช็คอินแล้ว', value: 'checked_in' },
  { label: 'เช็คเอาท์',   value: 'checked_out' },
  { label: 'ยกเลิก',      value: 'cancelled' },
]

const PRIMARY = '#523A85'

const base: React.CSSProperties = {
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text)',
}

function chip(on: boolean): React.CSSProperties {
  return on
    ? { border: `1px solid ${PRIMARY}50`, backgroundColor: `${PRIMARY}0D`, color: PRIMARY }
    : base
}

export function HistoryFilters({
  roomTypes,
  allRooms,
}: {
  roomTypes: { id: string; name: string }[]
  allRooms:  { id: string; name: string }[]
}) {
  const router  = useRouter()
  const sp      = useSearchParams()
  const spRef   = useRef(sp)
  spRef.current = sp

  const [q, setQ]               = useState(sp.get('q') ?? '')
  const [open, setOpen]         = useState(false)
  const popoverRef              = useRef<HTMLDivElement>(null)
  const mounted                 = useRef(false)
  const debounce                = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Close popover on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Sync search text when URL clears it
  useEffect(() => {
    if (!sp.get('q') && q !== '') setQ('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.get('q')])

  // Debounced name search
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => go({ q }), 400)
    return () => clearTimeout(debounce.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function go(overrides: Record<string, string>) {
    const params = new URLSearchParams(spRef.current.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v)
      else   params.delete(k)
    }
    router.replace(`/reception/history?${params}`)
  }

  const dateOn       = !!(sp.get('from') || sp.get('to'))
  const catKeys      = ['status', 'payment', 'room_type', 'room']
  const catCount     = catKeys.filter(k => sp.get(k)).length
  const hasAny       = !!(q || dateOn || catCount)

  return (
    <div className="card px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">

        {/* ── Search ─────────────────────── */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            style={{ color: 'var(--text-light)' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ค้นหาชื่อผู้เข้าพัก…"
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded"
            style={base}
          />
        </div>

        {/* ── Date range ─────────────────── */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] tracking-widest uppercase shrink-0 select-none"
            style={{ color: dateOn ? PRIMARY : 'var(--text-light)' }}>
            เช็คอิน
          </span>
          <div className="flex items-center rounded"
            style={dateOn
              ? { border: `1px solid ${PRIMARY}50`, backgroundColor: `${PRIMARY}0D` }
              : { border: '1px solid var(--border)' }
            }>
            <input type="date"
              value={sp.get('from') ?? ''}
              onChange={e => go({ from: e.target.value })}
              className="text-xs px-2 py-1.5 bg-transparent border-0 outline-none w-32"
              style={{ color: sp.get('from') ? (dateOn ? PRIMARY : 'var(--text)') : 'var(--text-light)' }} />
            <span className="text-xs select-none"
              style={{ color: dateOn ? `${PRIMARY}50` : 'var(--border)' }}>–</span>
            <input type="date"
              value={sp.get('to') ?? ''}
              onChange={e => go({ to: e.target.value })}
              className="text-xs px-2 py-1.5 bg-transparent border-0 outline-none w-32"
              style={{ color: sp.get('to') ? (dateOn ? PRIMARY : 'var(--text)') : 'var(--text-light)' }} />
          </div>
        </div>

        {/* ── Filter popover ─────────────── */}
        <div className="relative shrink-0" ref={popoverRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-opacity hover:opacity-80"
            style={catCount > 0 ? chip(true) : base}
          >
            {/* Sliders icon */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6"  x2="20" y2="6"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
              <circle cx="9"  cy="6"  r="2" fill="currentColor" stroke="none"/>
              <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/>
              <circle cx="9"  cy="18" r="2" fill="currentColor" stroke="none"/>
            </svg>
            <span>กรอง</span>
            {catCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: PRIMARY, color: '#fff' }}>
                {catCount}
              </span>
            )}
            {/* Chevron */}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              className={`transition-transform ${open ? 'rotate-180' : ''}`}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          {open && (
            <div className="absolute top-full right-0 mt-1 z-50 card py-3"
              style={{ minWidth: '230px', boxShadow: `0 8px 32px rgba(82,58,133,0.14)` }}>

              {[
                { label: 'สถานะ',       key: 'status',   opts: STATUS_OPTS },
                { label: 'ชำระเงิน',    key: 'payment',  opts: [
                  { label: 'ทุกสถานะ', value: '' },
                  { label: 'รอชำระ',   value: 'pending' },
                  { label: 'ชำระแล้ว', value: 'paid' },
                ]},
                { label: 'ประเภทห้อง', key: 'room_type', opts: [
                  { label: 'ทุกประเภท', value: '' },
                  ...roomTypes.map(rt => ({ label: rt.name, value: rt.id })),
                ]},
                { label: 'ห้อง',       key: 'room',     opts: [
                  { label: 'ทุกห้อง', value: '' },
                  ...allRooms.map(r => ({ label: r.name, value: r.id })),
                ]},
              ].map(({ label, key, opts }) => (
                <div key={key} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-light)', minWidth: '5rem' }}>
                    {label}
                  </span>
                  <select
                    value={sp.get(key) ?? ''}
                    onChange={e => go({ [key]: e.target.value })}
                    className="text-xs px-2 py-1 rounded flex-1"
                    style={chip(!!sp.get(key))}>
                    {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}

              {catCount > 0 && (
                <div className="mt-1 mx-4 pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <button
                    onClick={() => { go({ status: '', payment: '', room_type: '', room: '' }); setOpen(false) }}
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-light)' }}>
                    ล้างตัวกรอง
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Clear all ──────────────────── */}
        {hasAny && (
          <Link href="/reception/history"
            className="text-xs transition-opacity hover:opacity-70 whitespace-nowrap"
            style={{ color: 'var(--text-light)' }}
            onClick={() => setOpen(false)}>
            ✕ ล้างทั้งหมด
          </Link>
        )}

      </div>
    </div>
  )
}
