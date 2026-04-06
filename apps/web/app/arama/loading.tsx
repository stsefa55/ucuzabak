import { Header } from "../../src/components/layout/Header";

export default function LoadingSearchPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <section className="page-with-filters">
            <aside className="search-filters filter-panel" style={{ alignSelf: "flex-start" }}>
              <div className="card" style={{ minHeight: 420, background: "#f8fafc", border: "1px solid #eef2f7" }} />
            </aside>
            <section>
              <div className="grid grid-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="card"
                    style={{ height: 240, background: "#f8fafc", border: "1px solid #eef2f7" }}
                  />
                ))}
              </div>
            </section>
          </section>
        </div>
      </main>
    </>
  );
}

