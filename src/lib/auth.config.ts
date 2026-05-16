import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
      const isApiAuth = pathname.startsWith('/api/auth')

      if (isApiAuth) return true
      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl))
        return true
      }
      if (!isLoggedIn) {
        const loginUrl = new URL('/login', nextUrl)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return Response.redirect(loginUrl)
      }
      return true
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
}
