import { describe, it, expect } from 'vitest'
import { band } from './occupancy'

describe('band', () => {
  it('returns neutral colors when cap is 0', () => {
    const result = band(0, 0)
    expect(result.bg).toBe('var(--border)')
    expect(result.fg).toBe('var(--text-light)')
  })

  it('returns green (ว่างมาก) when occupancy is low', () => {
    expect(band(0, 4).bg).toBe('#8AB185') // 0%
    expect(band(1, 4).bg).toBe('#8AB185') // 25%
  })

  it('returns yellow (ปานกลาง) at 50% occupancy', () => {
    expect(band(2, 4).bg).toBe('#EEDA6B') // exactly 50%
    expect(band(2, 4).fg).toBe('#5a4a16')
  })

  it('returns orange (ใกล้เต็ม) at 75% occupancy', () => {
    expect(band(3, 4).bg).toBe('#DB6F30') // exactly 75%
  })

  it('returns red (เต็ม) when fully occupied', () => {
    expect(band(4, 4).bg).toBe('#AF4A39') // 100%
  })

  it('returns red when over-occupied', () => {
    // Edge case: occ > cap (data anomaly)
    expect(band(5, 4).bg).toBe('#AF4A39')
  })

  it('threshold boundary: 49% is green, 50% is yellow', () => {
    // cap=100 for easy percentage math
    expect(band(49, 100).bg).toBe('#8AB185')
    expect(band(50, 100).bg).toBe('#EEDA6B')
  })

  it('threshold boundary: 74% is yellow, 75% is orange', () => {
    expect(band(74, 100).bg).toBe('#EEDA6B')
    expect(band(75, 100).bg).toBe('#DB6F30')
  })
})
