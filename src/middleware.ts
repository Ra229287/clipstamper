import { auth } from '@/lib/auth';

export default auth;

export const config = {
  // Match all routes except static files and API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
