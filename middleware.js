import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("auth")?.value;
  if (token === process.env.PASSCODE) return NextResponse.next();
  const url = req.nextUrl.clone();
  if (url.pathname === "/login") return NextResponse.next();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };