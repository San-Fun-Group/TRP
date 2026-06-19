'use client'

import { useState } from 'react'

interface RoomType { id: string; name: string }
interface Room     { id: string; name: string; room_type_id: string }
interface Occ      { guest_name: string; room_id: string; checkin_date: string; checkout_date: string }

const OCCUPIED = '#523A85' // mauve/primary — room taken
const FREE     = '#8AB185' // green — available

export function RoomBoard({
  types, rooms, occ, days, today,
}: {
  types: RoomType[]
  rooms: Room[]
  occ:   Occ[]
  days:  string[]
  today: string
}) {
  const [sel, setSel] = useState(types[0]?.id ?? '')

  const bookingFor = (roomId: string, day: string) =>
    occ.find(o => o.room_id === roomId && o.checkin_date <= day && o.checkout_date > day)

  const availToday = (typeId: string) => {
    const rs  = rooms.filter(r => r.room_type_id === typeId)
    const used = rs.filter(r => bookingFor(r.id, today)).length
    return { avail: rs.length - used, total: rs.length }
  }

  const typeRooms = rooms.filter(r => r.room_type_id === sel)

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr] items-start">

      {/* Section 1 — room-type selector */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--text-light)' }}>
          ประเภทห้อง
        </h2>
        {types.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีประเภทห้อง</p>
        )}
        {types.map(t => {
          const { avail, total } = availToday(t.id)
          const active = t.id === sel
          return (
            <button key={t.id} type="button" onClick={() => setSel(t.id)}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{
                border: active ? '2px solid var(--primary)' : '1px solid var(--border-soft)',
                background: active ? 'rgba(82,58,133,0.06)' : 'var(--surface)',
                boxShadow: active ? '0 2px 12px rgba(82,58,133,0.10)' : 'none',
              }}>
              <div className="font-medium text-sm mb-1" style={{ color: 'var(--primary)' }}>{t.name}</div>
              <div className="flex items-baseline gap-1.5">
                <span style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.6rem', fontWeight: 400, lineHeight: 1, color: avail > 0 ? FREE : OCCUPIED }}>
                  {avail}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-light)' }}>/ {total} ว่างวันนี้</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Section 2 — per-room availability board for the selected type */}
      <div className="card p-5">
        <h2 className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--text-light)' }}>
          สถานะห้องพัก · {days.length} วัน
        </h2>

        {typeRooms.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีห้องในประเภทนี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: '3px' }}>
              <thead>
                <tr>
                  <th className="text-left pr-3 pb-2 font-medium whitespace-nowrap sticky left-0 z-10"
                    style={{ color: 'var(--text-light)', minWidth: '64px', background: 'var(--surface)' }}>
                    ห้อง
                  </th>
                  {days.map(d => {
                    const dt = new Date(d + 'T12:00:00Z')
                    const isToday = d === today
                    return (
                      <th key={d} className="pb-2 text-center font-medium"
                        style={{ minWidth: '96px', color: isToday ? 'var(--primary)' : 'var(--text-light)' }}>
                        <div>{dt.toLocaleDateString('th-TH', { weekday: 'narrow' })}</div>
                        <div style={{ fontWeight: isToday ? 700 : 400 }}>{dt.getUTCDate()}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {typeRooms.map(room => (
                  <tr key={room.id}>
                    <td className="pr-3 py-0.5 font-medium whitespace-nowrap sticky left-0 z-10"
                      style={{ color: 'var(--text)', background: 'var(--surface)' }}>
                      {room.name}
                    </td>
                    {days.map((day, i) => {
                      const b = bookingFor(room.id, day)
                      // show guest name only at the start of a stay (or the left edge) → Gantt-style bar
                      const showName = !!b && (b.checkin_date === day || i === 0)
                      return (
                        <td key={day} className="py-0.5">
                          <div className="flex items-center rounded px-1.5"
                            style={{
                              backgroundColor: b ? OCCUPIED : 'rgba(138,177,133,0.18)',
                              color: b ? '#fff' : 'var(--text-light)',
                              height: '30px', minWidth: '96px',
                            }}
                            title={b ? `${b.guest_name} · ${b.checkin_date} – ${b.checkout_date}` : 'ว่าง'}>
                            <span className="truncate text-[11px]">
                              {b ? (showName ? b.guest_name : '') : 'ว่าง'}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* legend */}
        <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
          {[[FREE,'ว่าง'],[OCCUPIED,'มีผู้เข้าพัก']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: c }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
