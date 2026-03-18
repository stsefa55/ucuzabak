import Link from "next/link";
import { Header } from "../../src/components/layout/Header";

export const metadata = {
  title: "İşlem Rehberi | UcuzaBak.com",
  description: "UcuzaBak'da arama, karşılaştırma ve fiyat takibi nasıl yapılır?"
};

export default function IslemRehberiPage() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <article className="content-page">
            <h1>İşlem Rehberi</h1>
            <p className="content-page-lead">
              Arama, karşılaştırma ve fiyat takibi için kısa rehber.
            </p>

            <section>
              <h2>1. Ürün arama</h2>
              <p>
                Ana sayfadaki arama kutusundan veya <Link href="/arama">Arama</Link> sayfasından ürün adı veya kategori yazın. Sonuçlarda en düşük fiyatlı teklifler öne çıkar.
              </p>
            </section>

            <section>
              <h2>2. Fiyat karşılaştırma</h2>
              <p>
                Ürüne tıklayarak detay sayfasında mağaza fiyatlarını görün. En fazla 4 ürünü <Link href="/karsilastir">Karşılaştır</Link> sayfasında yan yana inceleyebilirsiniz.
              </p>
            </section>

            <section>
              <h2>3. Fiyat alarmı ve favoriler</h2>
              <p>
                Giriş yaptıktan sonra hedef fiyat belirleyerek alarm kurabilir, beğendiğiniz ürünleri favorilere ekleyebilirsiniz.
              </p>
            </section>

            <section>
              <h2>4. Satın alma</h2>
              <p>
                UcuzaBak mağaza değildir; sizi uygun fiyatlı mağazaya yönlendirir. &quot;Mağazaya git&quot; veya teklif linkiyle alışverişi ilgili sitede tamamlarsınız.
              </p>
            </section>

            <p className="content-page-back">
              <Link href="/">← Anasayfa</Link>
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
