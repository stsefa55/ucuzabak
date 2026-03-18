import Link from "next/link";
import { Header } from "../../src/components/layout/Header";

export const metadata = {
  title: "Mağaza Başvurusu | UcuzaBak.com",
  description: "Mağazanızı UcuzaBak'ta listeleme başvurusu."
};

export default function SaticiBasvuruPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <article className="content-page">
            <h1>Mağazanızı UcuzaBak&apos;a Taşıyın</h1>
            <p className="content-page-lead">Ürünlerinizi fiyat karşılaştırması yapan kullanıcılara ulaştırın.</p>

            <section>
              <h2>Nasıl çalışır?</h2>
              <p>
                Ürün kataloğunuzu veya fiyat feed&apos;inizi entegre ederek UcuzaBak&apos;ta mağaza olarak yer alabilirsiniz. Kullanıcılar aradığında teklifleriniz sonuçlarda gösterilir ve tıklanınca kendi sitenize yönlendirilir.
              </p>
            </section>

            <section>
              <h2>Başvuru</h2>
              <p>
                <Link href="/iletisim">Bize Ulaşın</Link> sayfasından &quot;Mağaza başvurusu&quot; konusuyla iletişime geçin. Reklam ve iş birliği taleplerinizi de aynı kanaldan iletebilirsiniz.
              </p>
            </section>

            <p className="content-page-back">
              <Link href="/admin" style={{ fontWeight: 600 }}>Mağaza Girişi →</Link>
              {" · "}
              <Link href="/">Anasayfa</Link>
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
