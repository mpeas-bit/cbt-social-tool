import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Never protect API routes or login page
  if (pathname.startsWith("/api/") || pathname === "/login") {
    return NextResponse.next();
  }

  // Check auth cookie
  const token = req.cookies.get("auth")?.value;
  if (token === process.env.PASSCODE) return NextResponse.next();

  // Redirect to login
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };