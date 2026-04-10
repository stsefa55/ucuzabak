import Link from "next/link";
import { MessageCircle, Mail, Info } from "lucide-react";
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
            <div className="content-page__hero">
              <div className="content-page__hero-icon">
                <MessageCircle size={24} strokeWidth={1.8} />
              </div>
              <h1>Bize Ulaşın</h1>
              <p className="content-page-lead">Soru, öneri veya geri bildirim için.</p>
            </div>

            <div className="content-page__contact-card">
              <div className="content-page__contact-row">
                <div className="content-page__contact-icon">
                  <Info size={18} strokeWidth={1.8} />
                </div>
                <p className="content-page__contact-text">
                  UcuzaBak bir bilgi servisidir; destek sadece online verilir, telefon desteği sunulmaz.
                </p>
              </div>

              <div className="content-page__contact-row">
                <div className="content-page__contact-icon">
                  <Mail size={18} strokeWidth={1.8} />
                </div>
                <p className="content-page__contact-text">
                  <a href="mailto:info@ucuzabak.com">info@ucuzabak.com</a>
                </p>
              </div>

              <p className="content-page__contact-hint">
                Fiyat hatası, mağaza önerisi, hesap veya gizlilik taleplerinizi bu adrese yazabilirsiniz.
              </p>
            </div>

            <nav className="content-page-nav">
              <Link href="/" className="content-page-nav__link">Anasayfa</Link>
              <Link href="/sikca-sorulan-sorular" className="content-page-nav__link">SSS</Link>
              <Link href="/hakkimizda" className="content-page-nav__link">Hakkımızda</Link>
            </nav>
          </article>
        </div>
      </main>
    </>
  );
}
