import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

// Credential validation schema
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Build providers array conditionally
const providers: NextAuthConfig['providers'] = [];

// Add GitHub if configured
const githubId = process.env['GITHUB_CLIENT_ID'];
const githubSecret = process.env['GITHUB_CLIENT_SECRET'];
if (githubId && githubSecret) {
  providers.push(
    GitHub({
      clientId: githubId,
      clientSecret: githubSecret,
    })
  );
}

// Add Google if configured
const googleId = process.env['GOOGLE_CLIENT_ID'];
const googleSecret = process.env['GOOGLE_CLIENT_SECRET'];
if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    })
  );
}

// Always add credentials for demo access
providers.push(
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      // Demo user for development/testing (case-insensitive for convenience)
      const emailMatch = parsed.data.email.toLowerCase() === 'demo@clipstamper.dev';
      const passMatch = parsed.data.password.toLowerCase() === 'demo1234';

      if (emailMatch && passMatch) {
        return {
          id: 'demo-user-id',
          name: 'Demo User',
          email: parsed.data.email,
        };
      }

      return null;
    },
  })
);

export const authConfig: NextAuthConfig = {
  providers,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');
      const isOnStream = request.nextUrl.pathname.startsWith('/stream');

      if (isOnDashboard || isOnStream) {
        if (isLoggedIn) return true;
        return false;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token['id'] = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token['id']) {
        session.user.id = token['id'] as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
