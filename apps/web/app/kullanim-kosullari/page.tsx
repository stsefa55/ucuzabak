import Link from "next/link";
import { FileText, Globe, UserCheck, Handshake } from "lucide-react";
import { Header } from "../../src/components/layout/Header";

export const metadata = {
  title: "Kullanım Koşulları | UcuzaBak.com",
  description: "UcuzaBak.com kullanım koşulları ve kullanıcı sözleşmesi."
};

export default function KullanimKosullariPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <article className="content-page">
            <div className="content-page__hero">
              <div className="content-page__hero-icon">
                <FileText size={24} strokeWidth={1.8} />
              </div>
              <h1>Kullanım Koşulları</h1>
              <p className="content-page-lead">
                Site ve hizmetlerimizi kullanırken uymanız gereken koşullar.
              </p>
            </div>

            <section>
              <h2>
                <Globe size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6366f1" }} />
                Hizmet
              </h2>
              <p>
                UcuzaBak, ücretsiz fiyat karşılaştırma ve indirim takibi sunar. Fiyat ve ürün
                bilgileri bilgilendirme amaçlıdır; alışveriş ilgili mağazada gerçekleşir.
              </p>
            </section>

            <section>
              <h2>
                <UserCheck size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6366f1" }} />
                Kullanıcı Yükümlülükleri
              </h2>
              <p>
                Siteyi mevzuata ve iyi niyet kurallarına uygun kullanmalısınız. Hesap
                bilgilerinizi güvende tutmak sizin sorumluluğunuzdadır.
              </p>
            </section>

            <section>
              <h2>
                <Handshake size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6366f1" }} />
                Kullanıcı Sözleşmesi
              </h2>
              <p>
                Hizmetlerimizden yararlanarak bu koşulları ve{" "}
                <Link href="/gizlilik">Gizlilik ve Çerezler</Link> metnini kabul etmiş
                sayılırsınız. Koşullar güncellendiğinde sitede yayımlanır; kullanıma devam
                etmeniz güncel metni kabul ettiğiniz anlamına gelir.
              </p>
            </section>

            <nav className="content-page-nav">
              <Link href="/" className="content-page-nav__link">Anasayfa</Link>
              <Link href="/gizlilik" className="content-page-nav__link">Gizlilik</Link>
              <Link href="/iletisim" className="content-page-nav__link">Bize Ulaşın</Link>
            </nav>
          </article>
        </div>
      </main>
    </>
  );
}
