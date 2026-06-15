import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { LoginForm } from './login-form'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-cormorant',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export default function LoginPage() {
  return (
    <div
      className={`${cormorant.variable} ${dmSans.variable} min-h-screen flex`}
      style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', backgroundColor: 'var(--surface)' }}
    >
      {/* ── Left decorative panel ── */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-14 relative overflow-hidden"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        {/* Very subtle texture */}
        <div className="absolute inset-0" style={{ opacity: 0.04 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />
          </svg>
        </div>

        {/* Top logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center font-bold text-white text-sm"
            style={{ backgroundColor: 'var(--gold)', opacity: 0.9 }}>
            +
          </div>
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
            TRP Hospital
          </span>
        </div>

        {/* Center headline */}
        <div className="relative z-10">
          <h1
            className="leading-[1.1] mb-6"
            style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: '3.5rem',
              fontWeight: 300,
              color: '#fff',
              letterSpacing: '-0.01em',
            }}
          >
            Hotel<br />
            <em style={{ color: 'var(--gold)', fontStyle: 'normal', fontWeight: 400 }}>Reservation</em><br />
            System
          </h1>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-8" style={{ backgroundColor: 'var(--gold)', opacity: 0.7 }} />
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </div>
          <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ระบบจัดการห้องพักผู้ป่วยใน<br />
            สำหรับเจ้าหน้าที่เท่านั้น
          </p>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <div className="h-px w-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
            IPD Hotel · Internal Staff System · v1
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex items-center justify-center px-8 py-16"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="w-full max-w-sm fade-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 flex items-center justify-center font-bold text-white text-xs"
              style={{ backgroundColor: 'var(--gold)' }}>
              +
            </div>
            <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--primary)' }}>
              TRP Hospital Hotel
            </span>
          </div>

          <h2
            className="mb-1"
            style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: '2.5rem',
              fontWeight: 400,
              color: 'var(--primary)',
              letterSpacing: '-0.01em',
            }}
          >
            เข้าสู่ระบบ
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-light)' }}>
            Sign in with your staff credentials
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
