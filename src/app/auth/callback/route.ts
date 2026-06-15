import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Handles email confirmation links and OAuth callbacks.
// For plain email+password login this route is not hit,
// but it's required for magic links / future OAuth providers.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextRaw = searchParams.get('next') ?? '/'
  // Allow only relative paths — block open redirect via external URLs or
  // protocol-relative URLs (//evil.com) and path-traversal variants (/\evil).
  const next =
    nextRaw.startsWith('/') && !nextRaw.startsWith('//') && !nextRaw.startsWith('/\\')
      ? nextRaw
      : '/'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
