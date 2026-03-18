import Link from "next/link";
import { Header } from "../../src/components/layout/Header";

export const metadata = {
  title: "Gizlilik ve Çerezler | UcuzaBak.com",
  description: "Gizlilik politikası, kişisel verilerin korunması ve çerez kullanımı."
};

export default function GizlilikPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <article className="content-page">
            <h1>Gizlilik ve Çerezler</h1>
            <p className="content-page-lead">
              Kişisel verileriniz ve çerez kullanımı hakkında bilgi.
            </p>

            <section id="gizlilik-politikasi">
              <h2>Gizlilik Politikası</h2>
              <p>
                UcuzaBak olarak gizliliğinize önem veriyoruz. Topladığımız veriler hizmetin sunulması, hesap yönetimi ve site güvenliği amacıyla kullanılır; yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.
              </p>
            </section>

            <section id="kisisel-veriler">
              <h2>Kişisel Verilerin Korunması</h2>
              <p>
                Hesap oluşturma ve hizmet kullanımı sırasında e-posta, ad-soyad gibi kimlik bilgileri; favori ürünler ve fiyat alarmları toplanabilir. 6698 sayılı KVKK kapsamında verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini talep etme hakkınız vardır. Başvurularınızı <Link href="/iletisim">Bize Ulaşın</Link> üzerinden iletebilirsiniz.
              </p>
            </section>

            <section id="cerezler">
              <h2>Çerezler</h2>
              <p>
                Çerezler, siteyi kullanırken tercihlerinizi ve oturum bilginizi saklamak için kullanılır. Zorunlu çerezler sitenin çalışması için gereklidir; işlevsel ve analitik çerezler deneyimi iyileştirmek için kullanılabilir. Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz.
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
