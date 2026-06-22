import type { HomePmsBooking, PmsCell, PmsRoomRow } from '@/app/(main)/home/home-pms'

export function buildRoomRows(
  rooms: { id: string; name: string; typeName: string }[],
  bookings: HomePmsBooking[],
  days: string[],
): PmsRoomRow[] {
  return rooms.map(room => {
    const rb = bookings.filter(b => b.room_id === room.id)
    const cells: PmsCell[] = []
    let i = 0
    while (i < days.length) {
      const day = days[i]
      const b = rb.find(b => b.checkin_date <= day && b.checkout_date > day)
      if (b) {
        let span = 1
        for (let j = i + 1; j < days.length; j++) {
          if (days[j] >= b.checkout_date) break
          span++
        }
        cells.push({ kind: 'booking', booking: b, span, arriving: b.checkin_date === day })
        i += span
      } else {
        cells.push({ kind: 'empty' })
        i++
      }
    }
    return { id: room.id, name: room.name, typeName: room.typeName, cells }
  })
}
