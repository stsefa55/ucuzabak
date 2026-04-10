import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Header } from "../../src/components/layout/Header";

export const metadata = {
  title: "Sıkça Sorulan Sorular | UcuzaBak.com",
  description: "UcuzaBak hakkında sıkça sorulan sorular."
};

const faqs = [
  {
    q: "UcuzaBak nedir?",
    a: "Farklı mağazalardaki ürün fiyatlarını karşılaştıran ve indirimleri takip etmenizi sağlayan ücretsiz bir platformdur."
  },
  {
    q: "Buradan alışveriş yapabilir miyim?",
    a: "Hayır. UcuzaBak mağaza değildir; size en uygun fiyatı sunan mağazaya yönlendirir, satın alma orada yapılır."
  },
  {
    q: "Fiyat alarmı nasıl kurulur?",
    a: "Giriş yaptıktan sonra ürün sayfasında hedef fiyat belirleyip alarmı kaydedin; fiyat düştüğünde bilgilendirilirsiniz."
  },
  {
    q: "Fiyatlar ne sıklıkla güncellenir?",
    a: "Veriler mağazalardan belirli aralıklarla alınır. En güncel fiyat için ilgili mağaza sayfasını kontrol etmeniz iyi olur."
  }
];

export default function SikcaSorulanSorularPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <article className="content-page">
            <div className="content-page__hero">
              <div className="content-page__hero-icon">
                <HelpCircle size={24} strokeWidth={1.8} />
              </div>
              <h1>Sıkça Sorulan Sorular</h1>
              <p className="content-page-lead">Merak ettiklerinizin kısa yanıtları.</p>
            </div>

            <dl className="content-page__faq-list">
              {faqs.map((item, i) => (
                <div key={i} className="content-page__faq-item">
                  <dt className="content-page__faq-q">{item.q}</dt>
                  <dd className="content-page__faq-a">{item.a}</dd>
                </div>
              ))}
            </dl>

            <nav className="content-page-nav">
              <Link href="/iletisim" className="content-page-nav__link">Sorunuz mu var? Bize ulaşın</Link>
              <Link href="/" className="content-page-nav__link">Anasayfa</Link>
            </nav>
          </article>
        </div>
      </main>
    </>
  );
}
