'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      // Trigger shake animation
      formRef.current?.classList.remove('shake')
      void formRef.current?.offsetWidth // reflow to restart animation
      formRef.current?.classList.add('shake')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium tracking-widest uppercase mb-2"
          style={{ color: '#1A3A47' }}
        >
          อีเมล
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="staff@trphospital.com"
          className="w-full px-4 py-3 text-sm border outline-none transition-all"
          style={{
            backgroundColor: '#fff',
            borderColor: error ? '#C0392B' : '#DDD8D0',
            color: '#1C1C1C',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#1A3A47')}
          onBlur={e => (e.currentTarget.style.borderColor = error ? '#C0392B' : '#DDD8D0')}
        />
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium tracking-widest uppercase mb-2"
          style={{ color: '#1A3A47' }}
        >
          รหัสผ่าน
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 pr-12 text-sm border outline-none transition-all"
            style={{
              backgroundColor: '#fff',
              borderColor: error ? '#C0392B' : '#DDD8D0',
              color: '#1C1C1C',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1A3A47')}
            onBlur={e => (e.currentTarget.style.borderColor = error ? '#C0392B' : '#DDD8D0')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-opacity hover:opacity-70"
            style={{ color: '#888' }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm flex items-center gap-2" style={{ color: '#C0392B' }}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-sm font-medium tracking-widest uppercase transition-all disabled:opacity-60"
        style={{
          backgroundColor: loading ? '#2A5A72' : '#1A3A47',
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#C4A26A' }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#1A3A47' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            กำลังเข้าสู่ระบบ…
          </span>
        ) : (
          'เข้าสู่ระบบ'
        )}
      </button>

      <p className="text-xs text-center" style={{ color: '#AAA' }}>
        Staff access only · สำหรับเจ้าหน้าที่เท่านั้น
      </p>
    </form>
  )
}
