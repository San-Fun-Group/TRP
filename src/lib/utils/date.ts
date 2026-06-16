export function thaiDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

export function thaiDateLong(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}
