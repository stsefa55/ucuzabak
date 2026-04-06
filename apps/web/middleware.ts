import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const APEX_HOST = "ucuzabak.com";
const CANONICAL_WWW = "www.ucuzabak.com";

/**
 * Üretimde apex → www kalıcı yönlendirme (tek canonical mağaza alanı).
 * API ayrı host’ta kalır; bu middleware yalnızca Next (web) önünde çalışır.
 */
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const rawHost = request.headers.get("host") ?? "";
  const host = rawHost.split(":")[0]?.toLowerCase() ?? "";
  if (host !== APEX_HOST) {
    return NextResponse.next();
  }

  const target = new URL(request.url);
  target.hostname = CANONICAL_WWW;
  target.protocol = "https:";
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/:path*"]
};
