import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, hasSessionCookie } from "@/lib/firebase/session";

const PUBLIC_PATHS = ["/login", "/auth"];

// Cheap, unverified presence check only — no Admin SDK call here, so
// middleware stays on the lightweight Edge runtime. Full session
// verification (signature + revocation) happens in getCurrentProfile(),
// called by (app)/layout.tsx on every request — that's the real trust
// boundary, unchanged from the Supabase-era design.
export function middleware(request: NextRequest) {
  const signedIn = hasSessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (signedIn && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets, the manifest, the service worker,
  // image files, and API routes (the session route in particular must be
  // reachable unauthenticated — it's what sets the cookie in the first place).
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)",
  ],
};
