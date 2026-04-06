import { Header } from "../src/components/layout/Header";

export default function RootLoading() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container" style={{ paddingTop: "1rem" }}>
          <div className="home-skeleton-rail" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="home-skeleton-card" />
            ))}
          </div>
          <div style={{ marginTop: "2rem" }} className="home-skeleton-rail" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="home-skeleton-card" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
