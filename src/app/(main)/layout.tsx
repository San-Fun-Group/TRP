import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavBar } from './nav-bar'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-cormorant',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.app_metadata?.role as string | undefined

  return (
    <div
      className={`${cormorant.variable} ${dmSans.variable} min-h-screen flex flex-col`}
      style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', backgroundColor: 'var(--bg)' }}
    >
      <NavBar role={role} email={user.email} />
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
