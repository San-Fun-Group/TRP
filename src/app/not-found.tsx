import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <h1 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '4rem', fontWeight: 300, color: 'var(--primary)' }}>
        404
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ไม่พบหน้าที่ต้องการ</p>
      <Link href="/home" className="text-xs px-4 py-2 rounded font-medium"
        style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
        กลับหน้าหลัก
      </Link>
    </div>
  )
}
