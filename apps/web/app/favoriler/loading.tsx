import { Header } from "../../src/components/layout/Header";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div aria-hidden>
            <div className="skel skel--title" style={{ width: 140, marginBottom: "1rem" }} />

            {/* Misafir callout */}
            <div className="skel" style={{ height: 110, borderRadius: 14, marginBottom: "1.25rem" }} />

            {/* Ürün grid */}
            <div className="skel-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skel skel--card" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
