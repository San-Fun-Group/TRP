'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const BOOKING_ROLES    = new Set(['super_admin', 'admin', 'reception', 'agent'])
const ADMIN_ROLES      = new Set(['super_admin', 'admin'])
const RECEPTION_ROLES  = new Set(['super_admin', 'admin', 'reception'])

interface Props { role: string | undefined }

export function NavBar({ role }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const active = (path: string) =>
    pathname === path || pathname.startsWith(path + '/')

  return (
    <header className="sticky top-0 z-40"
      style={{ backgroundColor: 'var(--primary)', boxShadow: '0 2px 16px rgba(74, 53, 122, 0.18)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--gold)' }}>
            +
          </div>
          <span className="text-sm tracking-widest uppercase hidden sm:block"
            style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            TRP Hotel
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <NavLink href="/home"         isActive={active('/home')}>หน้าหลัก</NavLink>
          {BOOKING_ROLES.has(role ?? '') && (
            <NavLink href="/booking/new" isActive={active('/booking')}>IPD Booking</NavLink>
          )}
          {(role === 'housekeeping' || ADMIN_ROLES.has(role ?? '')) && (
            <NavLink href="/housekeeping" isActive={active('/housekeeping')}>Housekeeping</NavLink>
          )}
          {RECEPTION_ROLES.has(role ?? '') && (
            <NavLink href="/admin" isActive={active('/admin') && !active('/admin/settings') && !active('/admin/users')}>Reception</NavLink>
          )}
          {ADMIN_ROLES.has(role ?? '') && (
            <NavLink href="/admin/settings" isActive={active('/admin/settings')}>ตั้งค่า</NavLink>
          )}
          {ADMIN_ROLES.has(role ?? '') && (
            <NavLink href="/admin/users" isActive={active('/admin/users')}>ผู้ใช้งาน</NavLink>
          )}
        </nav>

        {/* Role badge + sign out */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs px-2 py-0.5 font-medium rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)' }}>
            {role ?? 'no role'}
          </span>
          <button onClick={signOut}
            className="text-xs tracking-widest uppercase transition-opacity hover:opacity-60"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, isActive, children }: { href: string; isActive: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-1.5 text-sm transition-all relative"
      style={{
        color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
        fontWeight: isActive ? 500 : 400,
      }}>
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5"
          style={{ backgroundColor: 'var(--gold)' }} />
      )}
    </Link>
  )
}
