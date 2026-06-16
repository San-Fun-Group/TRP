export function joinRow<T extends object>(val: unknown): T | null {
  if (val === null || val === undefined || Array.isArray(val)) return null
  return val as T
}
