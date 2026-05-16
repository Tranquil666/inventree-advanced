import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
]

function isAuthenticated(request: NextRequest): boolean {
  return AUTH_COOKIE_NAMES.some((name) => request.cookies.has(name))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isApiAuth = pathname.startsWith('/api/auth')
  const isStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|svg|ico|jpg|jpeg|gif|webp)$/)

  if (isStatic || isApiAuth) return NextResponse.next()

  const loggedIn = isAuthenticated(request)

  if (isAuthPage) {
    if (loggedIn) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  if (!loggedIn) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
}
