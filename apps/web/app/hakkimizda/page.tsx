import Link from "next/link";
import { Info, Search, ShieldCheck } from "lucide-react";
import { Header } from "../../src/components/layout/Header";

export const metadata = {
  title: "Hakkımızda | UcuzaBak.com",
  description: "UcuzaBak.com - Fiyat karşılaştırma ve indirim takip platformu."
};

export default function HakkimizdaPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <article className="content-page">
            <div className="content-page__hero">
              <div className="content-page__hero-icon">
                <Info size={24} strokeWidth={1.8} />
              </div>
              <h1>Hakkımızda</h1>
              <p className="content-page-lead">
                İndirimleri Yakala — UcuzaBak ne sunar?
              </p>
            </div>

            <section>
              <h2>
                <Search size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6366f1" }} />
                Nedir?
              </h2>
              <p>
                UcuzaBak, farklı mağazalardaki aynı ürünlerin fiyatlarını karşılaştıran ve
                indirimleri takip etmenizi sağlayan ücretsiz bir platformdur. En uygun fiyatı
                tek ekranda görür, bilinçli alışveriş yaparsınız.
              </p>
            </section>

            <section>
              <h2>
                <ShieldCheck size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6366f1" }} />
                Nasıl çalışır?
              </h2>
              <p>
                Mağaza verilerini derleyerek ürün bazında en düşük fiyatı sunuyoruz. Satın alma
                işlemi doğrudan ilgili mağazanın sitesinde gerçekleşir; UcuzaBak sadece bilgi
                ve karşılaştırma hizmeti verir.
              </p>
            </section>

            <nav className="content-page-nav">
              <Link href="/" className="content-page-nav__link">Anasayfa</Link>
              <Link href="/iletisim" className="content-page-nav__link">Bize Ulaşın</Link>
              <Link href="/sikca-sorulan-sorular" className="content-page-nav__link">SSS</Link>
            </nav>
          </article>
        </div>
      </main>
    </>
  );
}
