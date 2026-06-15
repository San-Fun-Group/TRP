import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  // Public routes that never redirect
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    // If already logged in, send to their role-based dashboard
    if (user) {
      const role = user.app_metadata?.role as string | undefined
      const dest = role === 'reception' ? '/reception' : '/agent'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return supabaseResponse
  }

  // All other routes require authentication
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // app_metadata is server-only (set via service role). Never use user_metadata for
  // authorization — users can write their own user_metadata via supabase.auth.updateUser().
  const role = user.app_metadata?.role as string | undefined

  // Guard role-specific areas
  if (pathname.startsWith('/reception') && role !== 'reception') {
    return NextResponse.redirect(new URL('/agent', request.url))
  }
  if (pathname.startsWith('/agent') && role !== 'agent' && role !== 'reception') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Root redirect to role dashboard
  if (pathname === '/') {
    const dest = role === 'reception' ? '/reception' : '/agent'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
