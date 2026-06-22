import { describe, it, expect } from 'vitest'
import { thaiDate, thaiDateLong } from './date'

// thaiDate uses year:'2-digit' → Buddhist year last 2 digits (2568 → '68')
// thaiDateLong uses year:'numeric' → full Buddhist year ('2568')

describe('thaiDate', () => {
  it('formats a mid-month date in Thai Buddhist calendar (2-digit year)', () => {
    const result = thaiDate('2025-06-15')
    expect(result).toContain('68') // 2568 → '68'
    expect(result).toContain('15')
  })

  it('formats 2024-01-01 correctly', () => {
    const result = thaiDate('2024-01-01')
    expect(result).toContain('67') // 2567 → '67'
    expect(result).toContain('1')
  })

  it('does not shift the date due to timezone (uses T12:00:00Z anchor)', () => {
    // Without T12:00:00Z, dates near midnight UTC can shift ±1 day
    const result = thaiDate('2025-03-01')
    expect(result).toMatch(/^1 /) // day must start with '1 ', not '28' or '2'
  })

  it('handles end-of-year dates', () => {
    const result = thaiDate('2024-12-31')
    expect(result).toContain('67') // 2567 → '67'
    expect(result).toContain('31')
  })
})

describe('thaiDateLong', () => {
  it('includes the full month name and full Buddhist year', () => {
    const result = thaiDateLong('2025-06-15')
    expect(result).toContain('มิถุนายน')
    expect(result).toContain('2568') // year:'numeric' → full 4-digit year
  })

  it('does not timezone-shift the day', () => {
    const result = thaiDateLong('2025-01-01')
    expect(result).toContain('มกราคม')
    expect(result).toContain('2568')
  })
})
