import { Header } from "../../src/components/layout/Header";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div className="skel-content-page" aria-hidden>
            <div className="skel skel--title" />
            <div className="skel skel--lead" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ marginBottom: "1.25rem" }}>
                <div className="skel skel--para" style={{ width: `${60 + (i % 3) * 10}%`, height: 16 }} />
                <div className="skel skel--para" style={{ width: "95%" }} />
                <div className="skel skel--para" style={{ width: "80%" }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
