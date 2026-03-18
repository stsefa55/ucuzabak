import Link from "next/link";
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
            <h1>Kullanım Koşulları</h1>
            <p className="content-page-lead">
              Site ve hizmetlerimizi kullanırken uymanız gereken koşullar.
            </p>

            <section>
              <h2>Hizmet</h2>
              <p>
                UcuzaBak, ücretsiz fiyat karşılaştırma ve indirim takibi sunar. Fiyat ve ürün bilgileri bilgilendirme amaçlıdır; alışveriş ilgili mağazada gerçekleşir.
              </p>
            </section>

            <section>
              <h2>Kullanıcı yükümlülükleri</h2>
              <p>
                Siteyi mevzuata ve iyi niyet kurallarına uygun kullanmalısınız. Hesap bilgilerinizi güvende tutmak sizin sorumluluğunuzdadır.
              </p>
            </section>

            <section>
              <h2>Kullanıcı sözleşmesi</h2>
              <p>
                Hizmetlerimizden yararlanarak bu koşulları ve <Link href="/gizlilik">Gizlilik ve Çerezler</Link> metnini kabul etmiş sayılırsınız. Koşullar güncellendiğinde sitede yayımlanır; kullanıma devam etmeniz güncel metni kabul ettiğiniz anlamına gelir.
              </p>
            </section>

            <p className="content-page-back">
              <Link href="/">← Anasayfa</Link>
              {" · "}
              <Link href="/gizlilik">Gizlilik</Link>
              {" · "}
              <Link href="/iletisim">İletişim</Link>
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
