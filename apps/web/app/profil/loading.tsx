import { Header } from "../../src/components/layout/Header";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="main" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)", minHeight: "calc(100vh - 72px)" }}>
        <div className="container">
          <div style={{ maxWidth: 920, margin: "0 auto", paddingTop: "1.75rem" }} aria-hidden>
            {/* Avatar + name hero */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="skel" style={{ width: 72, height: 72, borderRadius: "1rem", flexShrink: 0 }} />
              <div>
                <div className="skel" style={{ width: 160, height: 20, borderRadius: 6, marginBottom: 8 }} />
                <div className="skel" style={{ width: 220, height: 12, borderRadius: 4 }} />
              </div>
            </div>

            {/* Side nav + main content grid */}
            <div className="skel-profile-grid">
              <nav className="skel-profile-nav">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skel" style={{ height: 36, borderRadius: 8, flex: "0 0 auto", width: "100%" }} />
                ))}
              </nav>

              <div>
                <div className="card" style={{ padding: "1.25rem" }}>
                  <div className="skel" style={{ width: 150, height: 18, borderRadius: 6, marginBottom: 6 }} />
                  <div className="skel" style={{ width: "70%", height: 12, borderRadius: 4, marginBottom: "1.25rem" }} />

                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ marginBottom: "1rem" }}>
                      <div className="skel" style={{ width: 80, height: 11, borderRadius: 4, marginBottom: 6 }} />
                      <div className="skel" style={{ height: 42, borderRadius: 10 }} />
                    </div>
                  ))}
                  <div className="skel" style={{ width: 160, height: 42, borderRadius: 10, marginTop: "0.5rem" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
