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
      style={{ fontFamily: 'var(--font-dm-sans, sans-serif)' }}
    >
      {/* ── Left decorative panel ── */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-14 relative overflow-hidden"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        {/* Subtle cross grid pattern */}
        <div className="absolute inset-0" style={{ opacity: 0.06 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cross-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <rect x="21" y="8"  width="6" height="32" fill="white" />
                <rect x="8"  y="21" width="32" height="6" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cross-grid)" />
          </svg>
        </div>

        {/* Top */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="white" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
              <path d="M9 7a1 1 0 012 0v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H7a1 1 0 110-2h2V7z" />
            </svg>
          </div>
          <span className="text-xs tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
            TRP Hospital
          </span>
        </div>

        {/* Center */}
        <div className="relative z-10">
          <h1
            className="leading-[1.1] mb-5"
            style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: '3.75rem',
              fontWeight: 300,
              color: '#fff',
            }}
          >
            Hotel<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>Reservation</em><br />
            System
          </h1>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-10" style={{ backgroundColor: 'var(--accent)' }} />
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </div>
          <p className="text-sm leading-7" style={{ color: 'rgba(255,255,255,0.4)' }}>
            ระบบจัดการห้องพักผู้ป่วยใน<br />
            สำหรับเจ้าหน้าที่เท่านั้น
          </p>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <div className="h-px w-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            IPD Hotel · Internal Staff System · v1
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex items-center justify-center px-8 py-16"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="w-full max-w-sm fade-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <span className="text-white text-xs font-bold">+</span>
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
            }}
          >
            เข้าสู่ระบบ
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Sign in with your staff credentials
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
