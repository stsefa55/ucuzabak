import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const APEX_HOST = "ucuzabak.com";
const CANONICAL_WWW = "www.ucuzabak.com";

const NOINDEX_PREFIXES = [
  "/admin",
  "/giris",
  "/kayit",
  "/profil",
  "/alarm",
  "/favoriler",
  "/karsilastir",
  "/sifremi-unuttum",
  "/sifre-sifirla",
  "/eposta-dogrula",
  "/eposta-degistir-onay"
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (process.env.NODE_ENV === "production") {
    const rawHost = request.headers.get("host") ?? "";
    const host = rawHost.split(":")[0]?.toLowerCase() ?? "";
    if (host === APEX_HOST) {
      const target = new URL(request.url);
      target.hostname = CANONICAL_WWW;
      target.protocol = "https:";
      return NextResponse.redirect(target, 308);
    }
  }

  const shouldNoindex = NOINDEX_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (shouldNoindex) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
