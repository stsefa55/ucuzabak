import { Header } from "../../src/components/layout/Header";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div aria-hidden>
            <div className="skel skel--title" style={{ width: 180, marginBottom: "1rem" }} />

            <div className="card" style={{ padding: "0.75rem" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.65rem 0",
                    borderBottom: i < 3 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div className="skel" style={{ width: "65%", height: 14, borderRadius: 5, marginBottom: 6 }} />
                    <div className="skel" style={{ width: "35%", height: 11, borderRadius: 4 }} />
                  </div>
                  <div className="skel" style={{ width: 70, height: 28, borderRadius: 8, flexShrink: 0, marginLeft: 12 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
