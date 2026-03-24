import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnAdmin = nextUrl.pathname.startsWith('/admin');
            const role = (auth?.user as { role?: string } | undefined)?.role;
            const isAdmin = role === 'ADMIN';

            if (isOnAdmin) {
                if (!isLoggedIn) return false;
                if (isAdmin) return true;
                return Response.redirect(new URL('/', nextUrl));
            }

            if (nextUrl.pathname === '/login' && isLoggedIn) {
                return Response.redirect(new URL(isAdmin ? '/admin' : '/', nextUrl));
            }

            return true;
        },
        jwt({ token, user }) {
            if (user) {
                const authenticatedUser = user as { role?: string; id?: string | number };
                token.role = authenticatedUser.role;
                token.id = authenticatedUser.id;
            }
            return token;
        },
        session({ session, token }) {
            if (token && session.user) {
                const sessionUser = session.user as { role?: string; id?: string | number };
                sessionUser.role = typeof token.role === 'string' ? token.role : undefined;
                sessionUser.id = typeof token.id === 'string' || typeof token.id === 'number' ? token.id : undefined;
            }
            return session;
        }
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
