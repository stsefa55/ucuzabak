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
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ marginBottom: "1.5rem" }}>
                <div className="skel skel--para" style={{ width: "35%", height: 16, marginBottom: "0.75rem" }} />
                <div className="skel skel--para" style={{ width: "100%" }} />
                <div className="skel skel--para" style={{ width: "95%" }} />
                <div className="skel skel--para" style={{ width: "75%" }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
