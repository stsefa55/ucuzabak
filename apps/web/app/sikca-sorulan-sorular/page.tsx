import Link from "next/link";
import { Header } from "../../src/components/layout/Header";

export const metadata = {
  title: "Sıkça Sorulan Sorular | UcuzaBak.com",
  description: "UcuzaBak hakkında sıkça sorulan sorular."
};

const faqs = [
  { q: "UcuzaBak nedir?", a: "Farklı mağazalardaki ürün fiyatlarını karşılaştıran ve indirimleri takip etmenizi sağlayan ücretsiz bir platformdur." },
  { q: "Buradan alışveriş yapabilir miyim?", a: "Hayır. UcuzaBak mağaza değildir; size en uygun fiyatı sunan mağazaya yönlendirir, satın alma orada yapılır." },
  { q: "Fiyat alarmı nasıl kurulur?", a: "Giriş yaptıktan sonra ürün sayfasında hedef fiyat belirleyip alarmı kaydedin; fiyat düştüğünde bilgilendirilirsiniz." },
  { q: "Fiyatlar ne sıklıkla güncellenir?", a: "Veriler mağazalardan belirli aralıklarla alınır. En güncel fiyat için ilgili mağaza sayfasını kontrol etmeniz iyi olur." }
];

export default function SikcaSorulanSorularPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <article className="content-page">
            <h1>Sıkça Sorulan Sorular</h1>
            <p className="content-page-lead">Merak ettiklerinizin kısa yanıtları.</p>

            <section>
              <dl style={{ margin: 0 }}>
                {faqs.map((item, i) => (
                  <div key={i} style={{ marginBottom: "1.25rem" }}>
                    <dt style={{ fontWeight: 600, marginBottom: "0.35rem", color: "#111827" }}>{item.q}</dt>
                    <dd style={{ margin: 0, color: "#4b5563" }}>{item.a}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <p className="content-page-back">
              <Link href="/iletisim">Sorunuz mu var? Bize ulaşın</Link>
              {" · "}
              <Link href="/">Anasayfa</Link>
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
