import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { authMiddleware } from '@clerk/nextjs'; // ✅ Added Clerk Middleware
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

export default authMiddleware({
  beforeAuth: async (req) => {
    const { supabase, response } = createClient(req);

    // ✅ Refresh session if expired - required for Server Components
    await supabase.auth.getSession();

    return response;
  },
  afterAuth: async (auth, req) => {
    if (!auth.userId) {
      // Redirect if user is not authenticated
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    return NextResponse.next();
  },
});

// ✅ Preserve matcher settings
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
