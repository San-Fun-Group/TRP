import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function roleDashboard(role: string | undefined): string {
  switch (role) {
    case 'admin':        return '/admin'
    case 'reception':    return '/reception'
    case 'housekeeping': return '/housekeeping'
    case 'agent':
    default:             return '/agent'
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for SSR auth to work correctly
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — never redirect
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    if (user) {
      // Already logged in: send to role dashboard
      return NextResponse.redirect(new URL(roleDashboard(user.app_metadata?.role), request.url))
    }
    return supabaseResponse
  }

  // All other routes require authentication
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // app_metadata is server-only (set via service role).
  // Never use user_metadata for authorization — it is client-writable.
  const role = user.app_metadata?.role as string | undefined

  // Route guards — admin passes everything
  if (role === 'admin') {
    if (pathname === '/') return NextResponse.redirect(new URL('/admin', request.url))
    return supabaseResponse
  }

  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL(roleDashboard(role), request.url))
  }
  if (pathname.startsWith('/reception') && role !== 'reception') {
    return NextResponse.redirect(new URL(roleDashboard(role), request.url))
  }
  if (pathname.startsWith('/agent') && role !== 'agent') {
    return NextResponse.redirect(new URL(roleDashboard(role), request.url))
  }
  if (pathname.startsWith('/housekeeping') && role !== 'housekeeping') {
    return NextResponse.redirect(new URL(roleDashboard(role), request.url))
  }

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(roleDashboard(role), request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
