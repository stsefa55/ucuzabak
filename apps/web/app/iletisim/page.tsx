import Link from "next/link";
import { Header } from "../../src/components/layout/Header";

export const metadata = {
  title: "Bize Ulaşın | UcuzaBak.com",
  description: "UcuzaBak iletişim bilgileri."
};

export default function IletisimPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <article className="content-page">
            <h1>Bize Ulaşın</h1>
            <p className="content-page-lead">Soru, öneri veya geri bildirim için.</p>

            <section>
              <p>
                UcuzaBak bir bilgi servisidir; destek sadece online verilir, telefon desteği sunulmaz.
              </p>
              <p>
                <strong>E-posta:</strong>{" "}
                <a href="mailto:destek@ucuzabak.com" style={{ color: "#2563eb" }}>destek@ucuzabak.com</a>
              </p>
              <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                Fiyat hatası, mağaza önerisi, hesap veya gizlilik taleplerinizi bu adrese yazabilirsiniz.
              </p>
            </section>

            <p className="content-page-back">
              <Link href="/">← Anasayfa</Link>
              {" · "}
              <Link href="/sikca-sorulan-sorular">SSS</Link>
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
