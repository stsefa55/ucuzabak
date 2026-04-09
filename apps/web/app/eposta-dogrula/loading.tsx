import { Header } from "../../src/components/layout/Header";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="main skel-auth" aria-hidden>
        <div className="skel-auth__card">
          <div className="skel skel--auth-title" />
          <div className="skel skel--para" style={{ width: "80%", margin: "0 auto" }} />
          <div className="skel skel--btn" />
        </div>
      </main>
    </>
  );
}
