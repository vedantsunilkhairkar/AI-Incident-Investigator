import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  const pathname = request.nextUrl.pathname;

  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";

  // Allow login and register pages without authentication
  if (isLoginPage || isRegisterPage) {
    return NextResponse.next();
  }

  // Protect the application
  if (!token) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/incidents/:path*",
    "/profile/:path*",
  ],
};