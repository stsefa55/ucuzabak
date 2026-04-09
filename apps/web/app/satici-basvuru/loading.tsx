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
            <div className="skel skel--para" style={{ width: "100%" }} />
            <div className="skel skel--para" style={{ width: "90%" }} />
            <div className="skel skel--para" style={{ width: "70%" }} />
          </div>
        </div>
      </main>
    </>
  );
}
