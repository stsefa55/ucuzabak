import { Header } from "../../src/components/layout/Header";

export default function HomeLoading() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container" style={{ paddingTop: "1rem" }}>
          {/* Banner */}
          <div className="skel skel--banner" aria-hidden />

          {/* Kategori kısayolları */}
          <div className="skel skel--cats" aria-hidden />

          {/* Öne çıkan: grid */}
          <div className="skel-section" aria-hidden>
            <div className="skel skel--heading" />
            <div className="skel-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skel skel--card" />
              ))}
            </div>
          </div>

          {/* Son görüntülenen */}
          <div className="skel-section" aria-hidden>
            <div className="skel skel--heading" />
            <div className="skel-rail">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skel skel--rail-card" />
              ))}
            </div>
          </div>

          {/* Popüler: rail */}
          <div className="skel-section" aria-hidden>
            <div className="skel skel--heading" />
            <div className="skel-rail">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skel skel--rail-card" />
              ))}
            </div>
          </div>

          {/* Fiyatı düşen: rail */}
          <div className="skel-section" aria-hidden>
            <div className="skel skel--heading" />
            <div className="skel-rail">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skel skel--rail-card" />
              ))}
            </div>
          </div>

          {/* Fırsat ürünleri: rail */}
          <div className="skel-section" aria-hidden>
            <div className="skel skel--heading" />
            <div className="skel-rail">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skel skel--rail-card" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
