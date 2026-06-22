export function band(occ: number, cap: number): { bg: string; fg: string } {
  if (cap === 0)   return { bg: 'var(--border)', fg: 'var(--text-light)' }
  const pct = occ / cap
  if (occ >= cap)  return { bg: '#AF4A39', fg: '#fff' }
  if (pct >= 0.75) return { bg: '#DB6F30', fg: '#fff' }
  if (pct >= 0.5)  return { bg: '#EEDA6B', fg: '#5a4a16' }
  return { bg: '#8AB185', fg: '#fff' }
}
