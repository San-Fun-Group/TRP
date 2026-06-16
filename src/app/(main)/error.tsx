'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <h2 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--primary)' }}>
        เกิดข้อผิดพลาด
      </h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {error.message || 'กรุณาลองใหม่อีกครั้ง'}
      </p>
      <button
        onClick={reset}
        className="text-xs px-4 py-2 rounded font-medium"
        style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
      >
        ลองอีกครั้ง
      </button>
    </div>
  )
}
