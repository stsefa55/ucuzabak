import React from "react";
import type { Metadata } from "next";
import { resolveStorefrontBaseUrlForWeb } from "@ucuzabak/shared";
import { ReactQueryProvider } from "../src/lib/query-client";
import { AuthBootstrap } from "../src/components/auth/AuthBootstrap";
import { EmailVerificationBanner } from "../src/components/layout/EmailVerificationBanner";
import { CompareBar } from "../src/components/compare/CompareBar";
import { Footer } from "../src/components/layout/Footer";
import { MenuBackdropProvider } from "../src/components/layout/MenuBackdrop";
import "./globals.css";

const storefrontBase = resolveStorefrontBaseUrlForWeb();

export const metadata: Metadata = {
  metadataBase: new URL(`${storefrontBase}/`),
  title: "UcuzaBak.com",
  description: "Türkiye için fiyat karşılaştırma platformu - UcuzaBak.com",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true }
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <ReactQueryProvider>
          <MenuBackdropProvider>
            <div className="layout-wrap">
              <AuthBootstrap />
              <EmailVerificationBanner />
              <div className="layout-main">{children}</div>
              <CompareBar />
              <Footer />
            </div>
          </MenuBackdropProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
