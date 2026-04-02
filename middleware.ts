import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // If an auth code lands on the root page, redirect to the dedicated
  // auth-processing page before the landing page ever renders.
  // Safe with implicit flow — no PKCE verifier to lose.
  const code = searchParams.get("code");
  if (code && pathname === "/") {
    const processingUrl = request.nextUrl.clone();
    processingUrl.pathname = "/auth/processing";
    return NextResponse.redirect(processingUrl);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - auth/callback (let the route handler run unaffected by middleware)
     * - public files with extensions (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|ico)$).*)",
  ],
};

