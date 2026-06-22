'use client'

import { useState, useRef, useEffect } from 'react'
import { thaiDate } from '@/lib/utils/date'
import { band } from '@/lib/utils/occupancy'

interface TypeRow { id: string; name: string; cap: number; occ: number[] }
interface Room    { id: string; name: string; room_type_id: string }
interface OccRoom { guest_name: string; checkout_date: string; leavingToday: boolean }

const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

export function OccupancyView({
  typeRows, rooms, occByRoom, days, today,
}: {
  typeRows:  TypeRow[]
  rooms:     Room[]
  occByRoom: Record<string, OccRoom>
  days:      string[]
  today:     string
}) {
  const [sel,        setSel]        = useState(typeRows[0]?.id ?? '')
  const [cursor,     setCursor]     = useState(days[0] ?? today)
  const [colCount,   setColCount]   = useState(14)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Measure available width → compute how many day columns fit without scrolling
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth
      // 120px type column + 40px card padding + 20px buffer = 180px reserved
      const fit = Math.max(5, Math.floor((w - 180) / 37))
      setColCount(Math.min(fit, 30))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Cursor → visible slice
  const cursorIdx  = Math.max(0, days.indexOf(cursor))
  const startIdx   = Math.min(cursorIdx, Math.max(0, days.length - colCount))
  const visibleDays = days.slice(startIdx, startIdx + colCount)
  const visibleRows = typeRows.map(r => ({ ...r, occ: r.occ.slice(startIdx, startIdx + colCount) }))

  const canPrev = startIdx > 0
  const canNext = startIdx + colCount < days.length
  const atStart = cursor === (days[0] ?? today)

  function navigate(dir: 1 | -1) {
    const newIdx = Math.max(0, Math.min(days.length - colCount, startIdx + dir * colCount))
    setCursor(days[newIdx])
  }

  const selType  = typeRows.find(t => t.id === sel)
  const selRooms = rooms.filter(r => r.room_type_id === sel)

  // Group visible days by month for the spanning header row
  const monthGroups = visibleDays.reduce<{ key: string; label: string; count: number; firstIdx: number }[]>((acc, d, i) => {
    const dt    = new Date(d + 'T12:00:00Z')
    const key   = d.slice(0, 7)
    const label = `${MONTHS_SHORT[dt.getUTCMonth()]} ${dt.getUTCFullYear() + 543}`
    const last  = acc[acc.length - 1]
    if (last && last.key === key) { last.count++ } else { acc.push({ key, label, count: 1, firstIdx: i }) }
    return acc
  }, [])

  return (
    <div className="space-y-8">

      {/* ── Section 1 — availability by room type × date ── */}
      <section ref={sectionRef}>
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
              ห้องว่างตามประเภท
            </h2>
            <div className="flex items-center gap-1 shrink-0">
              {!atStart && (
                <button type="button" onClick={() => setCursor(days[0] ?? today)}
                  className="text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-opacity hover:opacity-70"
                  style={{ color: 'var(--primary)', border: '1px solid var(--border-soft)' }}>
                  วันนี้
                </button>
              )}
              <button type="button" onClick={() => navigate(-1)} disabled={!canPrev}
                className="w-7 h-7 flex items-center justify-center rounded-full text-base transition-opacity disabled:opacity-25 hover:opacity-60"
                style={{ color: 'var(--primary)' }}>
                ‹
              </button>
              <button type="button" onClick={() => navigate(1)} disabled={!canNext}
                className="w-7 h-7 flex items-center justify-center rounded-full text-base transition-opacity disabled:opacity-25 hover:opacity-60"
                style={{ color: 'var(--primary)' }}>
                ›
              </button>
            </div>
          </div>
        </div>

        {typeRows.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีข้อมูลห้องพัก</p>
        ) : (
          <div className="card p-5">
            <table className="text-xs w-full" style={{ borderCollapse: 'separate', borderSpacing: '3px' }}>
              <thead>
                {/* Month label row — with a dedicated 1px separator column between months */}
                <tr>
                  <th className="sticky left-0 z-10" style={{ background: 'var(--surface)' }} />
                  {monthGroups.flatMap(({ key, label, count }, gi) => [
                    ...(gi > 0 ? [
                      <th key={`msep-${key}`} style={{ width: '1px', padding: 0, backgroundColor: 'var(--border)' }} />,
                    ] : []),
                    <th key={key} colSpan={count} className="text-center pb-1 text-[10px] font-semibold tracking-widest uppercase"
                      style={{ color: 'var(--primary)' }}>
                      {label}
                    </th>,
                  ])}
                </tr>
                {/* Day row */}
                <tr>
                  <th className="text-left pr-3 pb-2 font-medium whitespace-nowrap sticky left-0 z-10"
                    style={{ color: 'var(--text-light)', minWidth: '120px', background: 'var(--surface)' }}>
                    ประเภทห้อง
                  </th>
                  {visibleDays.flatMap((d, i) => {
                    const dt           = new Date(d + 'T12:00:00Z')
                    const isToday      = d === today
                    const isMonthStart = i > 0 && d.slice(8, 10) === '01'
                    return [
                      ...(isMonthStart ? [
                        <th key={`dsep-${d}`} style={{ width: '1px', padding: 0, backgroundColor: 'var(--border)' }} />,
                      ] : []),
                      <th key={d} className="pb-2 text-center font-medium"
                        style={{ minWidth: '34px', color: isToday ? 'var(--primary)' : 'var(--text-light)' }}>
                        <div>{dt.toLocaleDateString('th-TH', { weekday: 'narrow' })}</div>
                        <div style={{ fontWeight: isToday ? 700 : 400 }}>{dt.getUTCDate()}</div>
                      </th>,
                    ]
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(row => {
                  const active = row.id === sel
                  return (
                    <tr key={row.id}>
                      <td className="pr-3 py-0.5 sticky left-0 z-10" style={{ background: 'var(--surface)' }}>
                        <button type="button" onClick={() => setSel(row.id)}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 transition-all flex items-baseline justify-between gap-2"
                          style={{
                            border: active ? '1.5px solid var(--primary)' : '1px solid var(--border-soft)',
                            background: active ? 'rgba(82,58,133,0.06)' : 'transparent',
                          }}>
                          <span className="font-medium" style={{ color: active ? 'var(--primary)' : 'var(--text)' }}>
                            {row.name}
                          </span>
                          <span className="font-normal" style={{ color: 'var(--text-light)' }}>/{row.cap}</span>
                        </button>
                      </td>
                      {row.occ.flatMap((count, i) => {
                        const avail        = row.cap - count
                        const { bg, fg }   = band(count, row.cap)
                        const isMonthStart = i > 0 && visibleDays[i]?.slice(8, 10) === '01'
                        return [
                          ...(isMonthStart ? [
                            <td key={`sep-${i}`} style={{ width: '1px', padding: 0, backgroundColor: 'var(--border)' }} />,
                          ] : []),
                          <td key={i} className="text-center py-0.5">
                            <div className="inline-flex items-center justify-center rounded font-medium"
                              style={{ backgroundColor: bg, color: fg, width: '30px', height: '30px', fontSize: '12px' }}
                              title={`ว่าง ${avail}/${row.cap}`}>
                              {avail}
                            </div>
                          </td>,
                        ]
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
              {[['#8AB185','ว่างมาก'],['#EEDA6B','ปานกลาง'],['#DB6F30','ใกล้เต็ม'],['#AF4A39','เต็ม']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-4 h-3 rounded" style={{ backgroundColor: c }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Section 2 — room cards for the selected type (right now) ── */}
      <section>
        <h2 className="mb-3 text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--text-light)' }}>
          สถานะห้องวันนี้{selType ? ` · ${selType.name}` : ''}
        </h2>
        {selRooms.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีห้องในประเภทนี้</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {selRooms.map(room => {
              const occ     = occByRoom[room.id]
              const leaving = occ?.leavingToday
              const cardStyle = !occ
                ? { backgroundColor: 'rgba(138,177,133,0.12)', borderColor: 'rgba(138,177,133,0.45)' }
                : leaving
                ? { backgroundColor: '#DB6F30', borderColor: '#DB6F30', color: '#fff' }
                : { backgroundColor: '#523A85', borderColor: '#523A85', color: '#fff' }
              return (
                <div key={room.id} className="rounded-xl p-4 border" style={cardStyle}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm" style={{ color: occ ? '#fff' : 'var(--text)' }}>
                      {room.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={occ
                        ? { backgroundColor: 'rgba(255,255,255,0.20)', color: '#fff' }
                        : { backgroundColor: '#8AB185', color: '#fff' }
                      }>
                      {!occ ? 'ว่าง' : leaving ? 'เช็คเอาท์วันนี้' : 'ไม่ว่าง'}
                    </span>
                  </div>
                  {occ ? (
                    <>
                      <div className="text-sm font-medium truncate" title={occ.guest_name}>{occ.guest_name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {leaving ? 'ออกวันนี้' : `ถึง ${thaiDate(occ.checkout_date)}`}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs" style={{ color: 'var(--text-light)' }}>พร้อมรับผู้เข้าพัก</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
