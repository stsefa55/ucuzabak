export default function AdminLoading() {
  return (
    <div aria-hidden style={{ padding: "1rem 0" }}>
      {/* Hero */}
      <div className="skel" style={{ width: 180, height: 24, borderRadius: 6, marginBottom: 6 }} />
      <div className="skel" style={{ width: 300, height: 13, borderRadius: 4, marginBottom: "1.25rem" }} />

      {/* Quick links */}
      <div className="skel" style={{ height: 32, borderRadius: 8, marginBottom: "1.25rem" }} />

      {/* Stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 80, borderRadius: 12 }} />
        ))}
      </div>

      {/* Panels */}
      <div className="skel" style={{ height: 200, borderRadius: 14, marginBottom: "1rem" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        <div className="skel" style={{ height: 180, borderRadius: 14 }} />
        <div className="skel" style={{ height: 180, borderRadius: 14 }} />
      </div>
    </div>
  );
}
