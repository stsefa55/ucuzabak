import { Header } from "../../../src/components/layout/Header";

export default function LoadingCategoryPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div className="skel skel--title" style={{ width: 180, marginBottom: "1rem" }} aria-hidden />

          <div className="skel-page-filters" aria-hidden>
            <aside>
              <div className="skel skel--filter" />
            </aside>

            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div className="skel skel--text" style={{ width: "50%", height: 14 }} />
                <div className="skel" style={{ width: 160, height: 36, borderRadius: 8 }} />
              </div>
              <div className="skel-grid">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="skel skel--card" />
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
