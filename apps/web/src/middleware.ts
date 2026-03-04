import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/automations", "/admin"];
const SESSION_COOKIE_NAMES = ["caas.session_token", "__Secure-caas.session_token"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((cookieName) =>
    request.cookies.has(cookieName)
  );
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/automations/:path*", "/admin/:path*"]
};
