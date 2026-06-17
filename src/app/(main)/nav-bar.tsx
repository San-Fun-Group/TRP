'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_ROLES, BOOKING_ROLES, RECEPTION_ROLES } from '@/lib/constants/roles'

interface Props { role: string | undefined; email: string | undefined }

export function NavBar({ role, email }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const active = (path: string) =>
    pathname === path || pathname.startsWith(path + '/')

  const isAdmin = ADMIN_ROLES.has(role ?? '')

  return (
    <header className="sticky top-0 z-40"
      style={{ backgroundColor: 'var(--primary)', boxShadow: '0 2px 16px rgba(74, 53, 122, 0.18)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

        {/* Logo + Nav links — grouped left */}
        <div className="flex items-center gap-6">

          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.svg" alt="TRP" width={32} height={32} priority />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: '#fff' }}>TRP</span>
              <span className="text-[10px] tracking-wider"
                style={{ color: 'rgba(255,255,255,0.5)' }}>HOSPITAL · IPD</span>
            </div>
          </Link>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 self-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <NavLink href="/home"         isActive={active('/home')}>หน้าหลัก</NavLink>
            {BOOKING_ROLES.has(role ?? '') && (
              <NavLink href="/booking/new" isActive={active('/booking')}>IPD Booking</NavLink>
            )}
            {(role === 'housekeeping' || isAdmin) && (
              <NavLink href="/housekeeping" isActive={active('/housekeeping')}>Housekeeping</NavLink>
            )}
            {RECEPTION_ROLES.has(role ?? '') && (
              <NavLink href="/reception" isActive={pathname === '/reception'}>Reception</NavLink>
            )}
            {RECEPTION_ROLES.has(role ?? '') && (
              <NavLink href="/reception/history" isActive={active('/reception/history')}>จัดการการจอง</NavLink>
            )}
          </nav>
        </div>

        {/* Profile menu */}
        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full transition-colors"
            style={{ backgroundColor: menuOpen ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
            <span className="hidden sm:block text-xs px-2 py-0.5 font-medium rounded-full truncate max-w-40"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)' }}>
              {email ?? 'ไม่มีบัญชี'}
            </span>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              {(email ?? '?').charAt(0).toUpperCase()}
            </span>
          </button>

          {menuOpen && (
            <div className="card absolute right-0 mt-2 w-48 overflow-hidden"
              style={{ top: '100%', zIndex: 100, boxShadow: '0 8px 32px rgba(74,53,122,0.24)', border: '1px solid var(--border-soft)' }}>
              {isAdmin && (
                <>
                  <DropdownLink href="/admin/settings" onClick={() => setMenuOpen(false)}>ตั้งค่า</DropdownLink>
                  <DropdownLink href="/admin/users" onClick={() => setMenuOpen(false)}>ผู้ใช้งาน</DropdownLink>
                  <div style={{ borderTop: '1px solid var(--border-soft)' }} />
                </>
              )}
              <button type="button" onClick={signOut}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:opacity-70"
                style={{ color: 'var(--error)' }}>
                ออกจากระบบ
              </button>
            </div>
          )}
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

function DropdownLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick}
      className="block px-4 py-2.5 text-sm transition-colors hover:opacity-70"
      style={{ color: 'var(--text)' }}>
      {children}
    </Link>
  )
}
