import Link from "next/link";
import { Shield, UserCheck, Cookie } from "lucide-react";
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
            <div className="content-page__hero">
              <div className="content-page__hero-icon">
                <Shield size={24} strokeWidth={1.8} />
              </div>
              <h1>Gizlilik ve Çerezler</h1>
              <p className="content-page-lead">
                Kişisel verileriniz ve çerez kullanımı hakkında bilgi.
              </p>
            </div>

            <section>
              <h2>
                <Shield size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6366f1" }} />
                Gizlilik Politikası
              </h2>
              <p>
                UcuzaBak olarak gizliliğinize önem veriyoruz. Topladığımız veriler hizmetin
                sunulması, hesap yönetimi ve site güvenliği amacıyla kullanılır; yasal
                zorunluluklar dışında üçüncü taraflarla paylaşılmaz.
              </p>
            </section>

            <section>
              <h2>
                <UserCheck size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6366f1" }} />
                Kişisel Verilerin Korunması
              </h2>
              <p>
                Hesap oluşturma ve hizmet kullanımı sırasında e-posta, ad-soyad gibi kimlik
                bilgileri; favori ürünler ve fiyat alarmları toplanabilir. 6698 sayılı KVKK
                kapsamında verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya
                silinmesini talep etme hakkınız vardır. Başvurularınızı{" "}
                <Link href="/iletisim">Bize Ulaşın</Link> üzerinden iletebilirsiniz.
              </p>
            </section>

            <section>
              <h2>
                <Cookie size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6366f1" }} />
                Çerezler
              </h2>
              <p>
                Çerezler, siteyi kullanırken tercihlerinizi ve oturum bilginizi saklamak için
                kullanılır. Zorunlu çerezler sitenin çalışması için gereklidir; işlevsel ve
                analitik çerezler deneyimi iyileştirmek için kullanılabilir. Tarayıcı
                ayarlarınızdan çerezleri yönetebilirsiniz.
              </p>
            </section>

            <nav className="content-page-nav">
              <Link href="/" className="content-page-nav__link">Anasayfa</Link>
              <Link href="/kullanim-kosullari" className="content-page-nav__link">Kullanım Koşulları</Link>
              <Link href="/iletisim" className="content-page-nav__link">Bize Ulaşın</Link>
            </nav>
          </article>
        </div>
      </main>
    </>
  );
}
