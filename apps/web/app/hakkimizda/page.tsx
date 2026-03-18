import Link from "next/link";
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
            <h1>Hakkımızda</h1>
            <p className="content-page-lead">İndirimleri Yakala — UcuzaBak ne sunar?</p>

            <section>
              <p>
                UcuzaBak, farklı mağazalardaki aynı ürünlerin fiyatlarını karşılaştıran ve indirimleri takip etmenizi sağlayan ücretsiz bir platformdur. En uygun fiyatı tek ekranda görür, bilinçli alışveriş yaparsınız.
              </p>
            </section>

            <section>
              <h2>Nasıl çalışır?</h2>
              <p>
                Mağaza verilerini derleyerek ürün bazında en düşük fiyatı sunuyoruz. Satın alma işlemi doğrudan ilgili mağazanın sitesinde gerçekleşir; UcuzaBak sadece bilgi ve karşılaştırma hizmeti verir.
              </p>
            </section>

            <p className="content-page-back">
              <Link href="/">← Anasayfa</Link>
              {" · "}
              <Link href="/iletisim">İletişim</Link>
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
