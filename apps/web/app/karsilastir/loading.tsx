import { Header } from "../../src/components/layout/Header";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div aria-hidden>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div className="skel skel--title" style={{ width: 220 }} />
              <div className="skel" style={{ width: 70, height: 28, borderRadius: 8 }} />
            </div>

            <div className="card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "0.6rem", width: 140, borderBottom: "1px solid #e5e7eb" }} />
                    {Array.from({ length: 3 }).map((_, i) => (
                      <th key={i} style={{ padding: "0.6rem", borderBottom: "1px solid #e5e7eb" }}>
                        <div className="skel" style={{ width: "80%", height: 16, borderRadius: 5, marginBottom: 6 }} />
                        <div className="skel" style={{ width: "50%", height: 10, borderRadius: 4 }} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["Marka", "Kategori", "En düşük fiyat", "Teklif sayısı", "EAN", "Model"].map((label) => (
                    <tr key={label}>
                      <td style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6", fontWeight: 600, fontSize: "0.85rem", color: "#94a3b8" }}>
                        {label}
                      </td>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <td key={i} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                          <div className="skel" style={{ width: "60%", height: 12, borderRadius: 4 }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
