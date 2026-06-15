'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const BOOKING_ROLES = new Set(['super_admin', 'admin', 'reception', 'agent'])
const ADMIN_ROLES   = new Set(['super_admin', 'admin'])

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
    <header style={{ backgroundColor: '#1A3A47' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: '#C4A26A' }}
          >
            +
          </div>
          <span
            className="text-white text-sm tracking-widest uppercase hidden sm:block"
            style={{ opacity: 0.8 }}
          >
            TRP Hotel
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <NavLink href="/home" active={active('/home')}>หน้าหลัก</NavLink>

          {BOOKING_ROLES.has(role ?? '') && (
            <NavLink href="/booking/new" active={active('/booking')}>
              IPD Booking
            </NavLink>
          )}

          {(role === 'housekeeping' || ADMIN_ROLES.has(role ?? '')) && (
            <NavLink href="/housekeeping" active={active('/housekeeping')}>
              Housekeeping
            </NavLink>
          )}

          {ADMIN_ROLES.has(role ?? '') && (
            <NavLink href="/admin" active={active('/admin')}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Role badge + sign out */}
        <div className="flex items-center gap-3">
          <span
            className="hidden sm:block text-xs px-2 py-0.5 rounded-sm font-medium"
            style={{ backgroundColor: 'rgba(196,162,106,0.2)', color: '#C4A26A' }}
          >
            {role ?? 'no role'}
          </span>
          <button
            onClick={signOut}
            className="text-xs tracking-widest uppercase transition-opacity hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            ออก
          </button>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 text-sm transition-all"
      style={{
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
      }}
    >
      {children}
    </Link>
  )
}
