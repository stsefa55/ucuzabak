import { Header } from "../src/components/layout/Header";

export default function RootLoading() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container" style={{ paddingTop: "1.5rem" }}>
          <div aria-hidden style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="skel" style={{ width: 200, height: 22, borderRadius: 6 }} />
            <div className="skel" style={{ width: "60%", height: 13, borderRadius: 5 }} />
            <div className="skel" style={{ width: "100%", height: 1, borderRadius: 0, opacity: 0 }} />
            <div className="skel" style={{ width: "100%", height: 12, borderRadius: 4 }} />
            <div className="skel" style={{ width: "90%", height: 12, borderRadius: 4 }} />
            <div className="skel" style={{ width: "75%", height: 12, borderRadius: 4 }} />
          </div>
        </div>
      </main>
    </>
  );
}
