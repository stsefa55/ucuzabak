import { Header } from "../../src/components/layout/Header";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div className="skel-listing" aria-hidden>
            <div className="skel skel--title" />
            <div className="skel skel--desc" />
            <div className="skel-grid">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="skel skel--card" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
