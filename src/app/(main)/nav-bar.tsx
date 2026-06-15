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
    <header style={{ backgroundColor: 'var(--primary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            +
          </div>
          <span
            className="text-white text-sm tracking-widest uppercase hidden sm:block"
            style={{ opacity: 0.85 }}
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
            className="hidden sm:block text-xs px-2 py-0.5 font-medium"
            style={{ backgroundColor: 'rgba(198,183,225,0.25)', color: 'var(--accent)' }}
          >
            {role ?? 'no role'}
          </span>
          <button
            onClick={signOut}
            className="text-xs tracking-widest uppercase transition-opacity hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            ออกจากระบบ
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
        color: active ? '#fff' : 'rgba(255,255,255,0.55)',
        backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
      }}
    >
      {children}
    </Link>
  )
}
