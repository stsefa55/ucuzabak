import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand-block">
          <Link href="/" className="footer-logo">
            UcuzaBak<span className="footer-logo-dot">.com</span>
          </Link>
          <p className="footer-tagline">İndirimleri Yakala!</p>
          <p className="footer-desc">
            Alışverişçiler için ücretsiz fiyat karşılaştırma. Servis sadece online verilir.
          </p>
        </div>

        <div className="footer-grid">
          <nav className="footer-col">
            <h4 className="footer-col-title">Kurumsal</h4>
            <ul>
              <li><Link href="/hakkimizda">Hakkımızda</Link></li>
              <li><Link href="/sikca-sorulan-sorular">Sıkça Sorulan Sorular</Link></li>
              <li><Link href="/gizlilik">Gizlilik ve Çerezler</Link></li>
              <li><Link href="/kullanim-kosullari">Kullanım Koşulları</Link></li>
              <li><Link href="/iletisim">Bize Ulaşın</Link></li>
            </ul>
          </nav>
          <nav className="footer-col">
            <h4 className="footer-col-title">Keşfet</h4>
            <ul>
              <li><Link href="/one-cikan-urunler">Öne Çıkan Ürünler</Link></li>
              <li><Link href="/fiyati-dusen-urunler">Fiyatı Düşenler</Link></li>
              <li><Link href="/firsat-urunleri">Fırsat Ürünleri</Link></li>
              <li><Link href="/populer-urunler">Popüler Ürünler</Link></li>
              <li><Link href="/karsilastir">Karşılaştır</Link></li>
              <li><Link href="/arama">Tüm Ürünler</Link></li>
            </ul>
          </nav>
          <nav className="footer-col">
            <h4 className="footer-col-title">Popüler Kategoriler</h4>
            <ul>
              <li><Link href="/arama?q=cep+telefonu">Cep Telefonu</Link></li>
              <li><Link href="/arama?q=laptop">Laptop</Link></li>
              <li><Link href="/arama?q=televizyon">Televizyon</Link></li>
              <li><Link href="/arama?q=tablet">Tablet</Link></li>
              <li><Link href="/arama?q=kulaklik">Kulaklık</Link></li>
              <li><Link href="/arama?q=elektrikli+supurge">Elektrikli Süpürge</Link></li>
              <li><Link href="/arama">Tüm Kategoriler</Link></li>
            </ul>
          </nav>
          <nav className="footer-col">
            <h4 className="footer-col-title">Popüler Aramalar</h4>
            <ul>
              <li><Link href="/arama?q=iphone">iPhone</Link></li>
              <li><Link href="/arama?q=samsung">Samsung</Link></li>
              <li><Link href="/arama?q=airpods">AirPods</Link></li>
              <li><Link href="/arama?q=playstation">PlayStation</Link></li>
              <li><Link href="/arama?q=kahve+makinesi">Kahve Makinesi</Link></li>
              <li><Link href="/arama?q=termos">Termos</Link></li>
            </ul>
          </nav>
        </div>

        <div className="footer-bottom">
          <p className="footer-legal">
            Sitemizde çerez kullanılmaktadır. Kullanıma devam ederek <Link href="/gizlilik">Gizlilik ve Çerezler</Link> metnini kabul etmiş olursunuz.
          </p>
          <p className="footer-copy">© {currentYear} UcuzaBak.com</p>
          <p className="footer-disclaimer">
            UcuzaBak bilgi servisidir. Alışveriş ilgili mağazada yapılır; güncel bilgi satıcıdan alınmalıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
