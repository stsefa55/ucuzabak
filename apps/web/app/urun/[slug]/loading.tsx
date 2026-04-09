import { Header } from "../../../src/components/layout/Header";

export default function LoadingProductPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container pdp" aria-hidden>
          {/* Breadcrumb */}
          <div className="skel skel--text" style={{ width: "30%", marginBottom: "1.25rem" }} />

          {/* Hero: galeri + bilgi */}
          <div className="skel-pdp-hero">
            <div className="skel skel--img" />
            <div className="skel-pdp-info">
              <div className="skel skel--text-sm" style={{ width: "80px" }} />
              <div className="skel skel--text" style={{ width: "85%", height: 20 }} />
              <div className="skel skel--text" style={{ width: "60%", height: 16 }} />
              <div className="skel skel--chip" />
              <div className="skel skel--price" />
              <div className="skel skel--text" style={{ width: "45%", height: 12 }} />
              <div style={{ marginTop: "auto" }}>
                <div className="skel skel--actions" />
              </div>
            </div>
          </div>

          {/* Grafik + teklifler yan yana */}
          <div className="skel-two-col">
            {/* Sol: grafik */}
            <div className="skel skel--chart" />
            {/* Sağ: teklif listesi */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div className="skel" style={{ width: 80, height: 16, borderRadius: 6 }} />
                <div className="skel" style={{ width: 28, height: 20, borderRadius: 999 }} />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: 52, borderRadius: 10, marginBottom: 8 }} />
              ))}
            </div>
          </div>

          {/* Benzer ürünler */}
          <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
            <div className="skel skel--heading" />
            <div className="skel-rail">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skel skel--rail-card" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
