import React from "react";
import { ReactQueryProvider } from "../src/lib/query-client";
import { AuthBootstrap } from "../src/components/auth/AuthBootstrap";
import { CompareBar } from "../src/components/compare/CompareBar";
import { Footer } from "../src/components/layout/Footer";
import { MenuBackdropProvider } from "../src/components/layout/MenuBackdrop";
import "./globals.css";

export const metadata = {
  title: "UcuzaBak.com",
  description: "Türkiye için fiyat karşılaştırma platformu - UcuzaBak.com"
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
