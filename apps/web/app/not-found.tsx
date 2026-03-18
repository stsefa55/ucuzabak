import Link from "next/link";
import { Header } from "../src/components/layout/Header";
import { RecentlyViewedRail } from "../src/components/home/RecentlyViewedRail";
import { PopularSearches } from "../src/components/home/PopularSearches";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              maxWidth: "28rem",
              margin: "0 auto"
            }}
          >
            <p
              style={{
                fontSize: "4rem",
                fontWeight: 700,
                color: "#e5e7eb",
                lineHeight: 1,
                marginBottom: "0.5rem"
              }}
              aria-hidden
            >
              404
            </p>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Üzgünüz, aradığınız sayfayı bulamadık.
            </h1>
            <p className="text-muted" style={{ fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              Bu sayfa kaldırılmış, adresi değişmiş veya geçici olarak kullanılamıyor olabilir.
            </p>
            <Link href="/" className="btn-primary">
              Anasayfaya dön
            </Link>
          </div>

          <PopularSearches />

          <RecentlyViewedRail />
        </div>
      </main>
    </>
  );
}
