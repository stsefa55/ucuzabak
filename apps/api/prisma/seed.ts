import { PrismaClient, UserRole } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

export async function main() {
  // Clean existing data in a safe order for development seeding.
  await prisma.affiliateClick.deleteMany();
  await prisma.unmatchedProductReview.deleteMany();
  await prisma.feedImport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.priceAlert.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.storeProduct.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const userPasswordHash = await bcrypt.hash("User123!", 10);

  await prisma.user.create({
    data: {
      email: "admin@ucuzabak.com",
      name: "Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN
    }
  });

  await prisma.user.create({
    data: {
      email: "user@ucuzabak.com",
      name: "Kullanıcı",
      passwordHash: userPasswordHash,
      role: UserRole.USER
    }
  });

  // Canonical category tree (manual, Turkish storefront taxonomy)
  const iconByGroup = {
    electronics: "electronics",
    whitegoods: "whitegoods",
    home: "home",
    personalCare: "personal-care",
    baby: "baby",
    sports: "sports",
    automotive: "automotive",
    office: "office",
    pet: "pet",
    grocery: "grocery"
  } as const;

  const electronics = await prisma.category.create({
    data: {
      name: "Elektronik",
      slug: "elektronik",
      iconName: iconByGroup.electronics,
      imageUrl: null,
      sortOrder: 10,
      isActive: true
    }
  });

  const whitegoods = await prisma.category.create({
    data: {
      name: "Beyaz Eşya",
      slug: "beyaz-esya",
      iconName: iconByGroup.whitegoods,
      imageUrl: null,
      sortOrder: 20,
      isActive: true
    }
  });

  const home = await prisma.category.create({
    data: {
      name: "Ev Yaşam",
      slug: "ev-yasam",
      iconName: iconByGroup.home,
      imageUrl: null,
      sortOrder: 30,
      isActive: true
    }
  });

  const personalCare = await prisma.category.create({
    data: {
      name: "Kişisel Bakım",
      slug: "kisisel-bakim",
      iconName: iconByGroup.personalCare,
      imageUrl: null,
      sortOrder: 40,
      isActive: true
    }
  });

  const baby = await prisma.category.create({
    data: {
      name: "Anne Bebek",
      slug: "anne-bebek",
      iconName: iconByGroup.baby,
      imageUrl: null,
      sortOrder: 50,
      isActive: true
    }
  });

  const sports = await prisma.category.create({
    data: {
      name: "Spor Outdoor",
      slug: "spor-outdoor",
      iconName: iconByGroup.sports,
      imageUrl: null,
      sortOrder: 60,
      isActive: true
    }
  });

  const automotive = await prisma.category.create({
    data: {
      name: "Otomotiv",
      slug: "otomotiv",
      iconName: iconByGroup.automotive,
      imageUrl: null,
      sortOrder: 70,
      isActive: true
    }
  });

  const office = await prisma.category.create({
    data: {
      name: "Ofis Kırtasiye",
      slug: "ofis-kirtasiye",
      iconName: iconByGroup.office,
      imageUrl: null,
      sortOrder: 80,
      isActive: true
    }
  });

  const pet = await prisma.category.create({
    data: {
      name: "Pet Shop",
      slug: "pet-shop",
      iconName: iconByGroup.pet,
      imageUrl: null,
      sortOrder: 90,
      isActive: true
    }
  });

  const grocery = await prisma.category.create({
    data: {
      name: "Süpermarket",
      slug: "supermarket",
      iconName: iconByGroup.grocery,
      imageUrl: null,
      sortOrder: 100,
      isActive: true
    }
  });

  // Electronics children
  await prisma.category.create({
    data: { name: "Cep Telefonu", slug: "cep-telefonu", parentId: electronics.id, iconName: iconByGroup.electronics, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Laptop", slug: "laptop", parentId: electronics.id, iconName: iconByGroup.electronics, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Televizyon", slug: "televizyon", parentId: electronics.id, iconName: iconByGroup.electronics, imageUrl: null, sortOrder: 30, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Tablet", slug: "tablet", parentId: electronics.id, iconName: iconByGroup.electronics, imageUrl: null, sortOrder: 40, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Kulaklık", slug: "kulaklik", parentId: electronics.id, iconName: iconByGroup.electronics, imageUrl: null, sortOrder: 50, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Kamera", slug: "kamera", parentId: electronics.id, iconName: iconByGroup.electronics, imageUrl: null, sortOrder: 60, isActive: true }
  });

  // White goods children
  await prisma.category.create({ data: { name: "Buzdolabı", slug: "buzdolabi", parentId: whitegoods.id, iconName: iconByGroup.whitegoods, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "Çamaşır Makinesi", slug: "camsasir-makinesi", parentId: whitegoods.id, iconName: iconByGroup.whitegoods, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Bulaşık Makinesi", slug: "bulasik-makinesi", parentId: whitegoods.id, iconName: iconByGroup.whitegoods, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Fırın", slug: "firin", parentId: whitegoods.id, iconName: iconByGroup.whitegoods, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Kurutma Makinesi", slug: "kurutma-makinesi", parentId: whitegoods.id, iconName: iconByGroup.whitegoods, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Derin Dondurucu", slug: "derin-dondurucu", parentId: whitegoods.id, iconName: iconByGroup.whitegoods, imageUrl: null, sortOrder: 60, isActive: true } });

  // Home children
  await prisma.category.create({ data: { name: "Elektrikli Süpürge", slug: "elektrikli-supurge", parentId: home.id, iconName: iconByGroup.home, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "Kahve Makinesi", slug: "kahve-makinesi", parentId: home.id, iconName: iconByGroup.home, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Tencere & Tava", slug: "tencere-tava", parentId: home.id, iconName: iconByGroup.home, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Aydınlatma", slug: "aydinlatma", parentId: home.id, iconName: iconByGroup.home, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Ev Tekstili", slug: "ev-tekstili", parentId: home.id, iconName: iconByGroup.home, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Isıtıcılar", slug: "isiticilar", parentId: home.id, iconName: iconByGroup.home, imageUrl: null, sortOrder: 60, isActive: true } });

  // Personal care children
  await prisma.category.create({ data: { name: "Kozmetik", slug: "kozmetik", parentId: personalCare.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "Saç Bakım", slug: "sac-bakim", parentId: personalCare.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Cilt Bakımı", slug: "cilt-bakimi", parentId: personalCare.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Tıraş", slug: "tras", parentId: personalCare.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Diş Bakımı", slug: "dis-bakimi", parentId: personalCare.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Ağız Bakımı", slug: "agiz-bakimi", parentId: personalCare.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 55, isActive: true } });
  await prisma.category.create({ data: { name: "Parfüm", slug: "parfum", parentId: personalCare.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 60, isActive: true } });

  // Baby children
  await prisma.category.create({ data: { name: "Bebek Arabası", slug: "bebek-arabasi", parentId: baby.id, iconName: iconByGroup.baby, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "Oto Koltuğu", slug: "oto-koltugu", parentId: baby.id, iconName: iconByGroup.baby, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Emzik & Şişe", slug: "emzik-sise", parentId: baby.id, iconName: iconByGroup.baby, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Bez", slug: "bez", parentId: baby.id, iconName: iconByGroup.baby, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Bebek Beslenme", slug: "bebek-beslenme", parentId: baby.id, iconName: iconByGroup.baby, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Bebek Odası", slug: "bebek-odasi", parentId: baby.id, iconName: iconByGroup.baby, imageUrl: null, sortOrder: 60, isActive: true } });

  // Sports children
  await prisma.category.create({ data: { name: "Fitness Aksesuarları", slug: "fitness-aksesuarlar", parentId: sports.id, iconName: iconByGroup.sports, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "Outdoor Giyim", slug: "outdoor-giyim", parentId: sports.id, iconName: iconByGroup.sports, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Kamp & Piknik", slug: "kamp-piknik", parentId: sports.id, iconName: iconByGroup.sports, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Bisiklet", slug: "bisiklet", parentId: sports.id, iconName: iconByGroup.sports, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Spor Ayakkabı", slug: "spor-ayakkabi", parentId: sports.id, iconName: iconByGroup.sports, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Spor Beslenme", slug: "spor-beslenme", parentId: sports.id, iconName: iconByGroup.sports, imageUrl: null, sortOrder: 60, isActive: true } });

  // Automotive children
  await prisma.category.create({ data: { name: "Oto Aksesuarları", slug: "oto-aksesuarlar", parentId: automotive.id, iconName: iconByGroup.automotive, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "Oto Temizlik", slug: "oto-temizlik", parentId: automotive.id, iconName: iconByGroup.automotive, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Yağlar", slug: "yaglar", parentId: automotive.id, iconName: iconByGroup.automotive, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Aydınlatma", slug: "oto-aydinlatma", parentId: automotive.id, iconName: iconByGroup.automotive, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Jant & Lastik", slug: "jant-lastik", parentId: automotive.id, iconName: iconByGroup.automotive, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Oto Elektroniği", slug: "oto-elektronigi", parentId: automotive.id, iconName: iconByGroup.automotive, imageUrl: null, sortOrder: 60, isActive: true } });

  // Office children
  await prisma.category.create({ data: { name: "Yazıcı Sarf", slug: "yazici-sarf", parentId: office.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "Kağıt & Fatura", slug: "kagit-fatura", parentId: office.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Defterler", slug: "defterler", parentId: office.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Kalem", slug: "kalem", parentId: office.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Dosya & Klasör", slug: "dosya-klasor", parentId: office.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Etiketleme", slug: "etiketleme", parentId: office.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 60, isActive: true } });

  // Pet children
  await prisma.category.create({ data: { name: "Kedi Maması", slug: "kedi-mamasi", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "Köpek Maması", slug: "kopek-mamasi", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Kum & Hijyen", slug: "kum-hijyen", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Oyuncaklar", slug: "pet-oyuncaklari", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Aksesuarlar", slug: "pet-aksesuarlar", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Bakım Ürünleri", slug: "pet-bakim", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 60, isActive: true } });

  // Grocery children
  await prisma.category.create({ data: { name: "Temel Gıda", slug: "temel-gida", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 10, isActive: true } });
  await prisma.category.create({ data: { name: "İçecek", slug: "icecek", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 20, isActive: true } });
  await prisma.category.create({ data: { name: "Kahvaltılık", slug: "kahvaltilik", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 30, isActive: true } });
  await prisma.category.create({ data: { name: "Temizlik", slug: "temizlik", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 40, isActive: true } });
  await prisma.category.create({ data: { name: "Atıştırmalık", slug: "atistirmalik", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 50, isActive: true } });
  await prisma.category.create({ data: { name: "Bebek Maması", slug: "bebek-mamasi-supermarket", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 60, isActive: true } });

  /**
   * Category completeness pass
   * - Eksik root gruplarını ekle
   * - Mevcut tüm level-2 düğümlerine anlamlı level-3 dallar ekle
   * - Tüm kategoriler: name, slug, parentId, iconName, sortOrder, isActive (imageUrl: null)
   *
   * Not: Elektronik alt kategori slug'ları (cep-telefonu, laptop, televizyon) import eşlemesi için korunur.
   */
  const slugify = (input: string) => {
    return input
      .toLowerCase()
      .trim()
      .replace(/&/g, " ve ")
      .replace(/[ç]/g, "c")
      .replace(/[ğ]/g, "g")
      .replace(/[ı]/g, "i")
      .replace(/[i]/g, "i")
      .replace(/[ö]/g, "o")
      .replace(/[ş]/g, "s")
      .replace(/[ü]/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  /**
   * Aynı seed çalışması içinde birden fazla blok (newRoots, completeness, exhaustive, pet genişlemesi vb.)
   * aynı global `slug` ile L2 oluşturmaya çalışabiliyordu. Slug global unique olduğu için çakışmayı önlemek için:
   * - L2: slug varsa yeniden oluşturma, mevcut düğümü kullan
   * - L3: yalnızca slug henüz yoksa ekle (eksik dalları tamamlar)
   */
  async function ensureCategoryL2WithChildren(
    rootId: string,
    rootSlug: string,
    row: {
      iconName: string;
      sortOrder: number;
      name: string;
      children: [string, string];
    }
  ) {
    const l2Slug = `${rootSlug}-${slugify(row.name)}`;
    let l2 = await prisma.category.findUnique({ where: { slug: l2Slug } });
    if (!l2) {
      l2 = await prisma.category.create({
        data: {
          name: row.name,
          slug: l2Slug,
          parentId: rootId,
          iconName: row.iconName,
          imageUrl: null,
          sortOrder: row.sortOrder,
          isActive: true
        }
      });
    } else if (l2.parentId !== rootId) {
      throw new Error(
        `Seed slug collision: slug=${l2Slug} exists under a different parent (expected rootId=${rootId}, got parentId=${l2.parentId}).`
      );
    }

    const [c1, c2] = row.children;
    for (let idx = 0; idx < 2; idx++) {
      const childName = idx === 0 ? c1 : c2;
      const cSlug = `${l2Slug}-${slugify(childName)}`;
      const exists = await prisma.category.findUnique({ where: { slug: cSlug } });
      if (!exists) {
        await prisma.category.create({
          data: {
            name: childName,
            slug: cSlug,
            parentId: l2.id,
            iconName: row.iconName,
            imageUrl: null,
            sortOrder: (idx + 1) * 10,
            isActive: true
          }
        });
      }
    }
  }

  const newRoots: Array<{
    name: string;
    slug: string;
    iconName: string;
    sortOrder: number;
    level2: Array<{
      name: string;
      level3: [string, string];
    }>;
  }> = [
    {
      name: "Mobilya",
      slug: "mobilya",
      iconName: iconByGroup.home,
      sortOrder: 40,
      level2: [
        { name: "Oturma Odası", level3: ["Koltuk Takımları", "Sehpa & Orta Sehpa"] },
        { name: "Yatak Odası", level3: ["Yatak & Başlık", "Gardırop & Şifonyer"] },
        { name: "Yemek Odası", level3: ["Masa & Sandalye", "Büfe & Konsol"] },
        { name: "Çalışma & Ofis Mobilyaları", level3: ["Çalışma Masaları", "Ofis Koltukları"] },
        { name: "Depolama & Organizasyon", level3: ["Kitaplık & Raf", "Ayakkabılık & Portmanto"] },
        { name: "Balkon & Bahçe Mobilyaları", level3: ["Balkon Takımları", "Bahçe Oturma Grupları"] }
      ]
    },
    {
      name: "Moda",
      slug: "moda",
      iconName: iconByGroup.office,
      sortOrder: 70,
      level2: [
        { name: "Kadın Giyim", level3: ["Elbise & Abiye", "Bluz & Gömlek"] },
        { name: "Erkek Giyim", level3: ["Tişört & Polo", "Pantolon & Şort"] },
        { name: "Çocuk Giyim", level3: ["Tulum & Set", "Üst Giyim"] },
        { name: "İç Giyim", level3: ["Sütyen & Takım", "Boxer & Külot"] },
        { name: "Dış Giyim", level3: ["Mont & Kaban", "Yağmurluk & Rüzgarlık"] },
        { name: "Spor Giyim", level3: ["Spor Tayt", "Spor Üst"] }
      ]
    },
    {
      name: "Ayakkabı & Çanta",
      slug: "ayakkabi-canta",
      iconName: iconByGroup.office,
      sortOrder: 80,
      level2: [
        { name: "Kadın Ayakkabı", level3: ["Topuklu Ayakkabı", "Babet & Loafer"] },
        { name: "Erkek Ayakkabı", level3: ["Deri Ayakkabı", "Günlük Ayakkabı"] },
        { name: "Çocuk Ayakkabı", level3: ["İlk Adım Ayakkabı", "Okul Ayakkabısı"] },
        { name: "Spor Ayakkabı", level3: ["Sneaker", "Koşu Ayakkabısı"] },
        { name: "Bot & Çizme", level3: ["Bot", "Çizme"] },
        { name: "Çanta", level3: ["Omuz Çanta", "Sırt Çantası"] }
      ]
    },
    {
      name: "Yapı Market & Bahçe",
      slug: "yapi-market-bahce",
      iconName: iconByGroup.whitegoods,
      sortOrder: 140,
      level2: [
        { name: "El Aletleri", level3: ["Tornavida & Set", "Pense & Anahtar"] },
        { name: "Elektrikli El Aletleri", level3: ["Matkap & Vidalama", "Zımpara & Kesim"] },
        { name: "Boya & Badana", level3: ["İç Cephe Boya", "Dış Cephe Boya"] },
        { name: "Hırdavat", level3: ["Vida & Dübel", "Kapı & Menteşe"] },
        { name: "Banyo Yapı Ürünleri", level3: ["Batarya & Musluk", "Duş Sistemleri"] },
        { name: "Bahçe Araçları & Sulama", level3: ["Bahçe Hortumu", "Sulama Ekipmanları"] }
      ]
    },
    {
      name: "Oyun & Hobi",
      slug: "oyun-hobi",
      iconName: iconByGroup.sports,
      sortOrder: 150,
      level2: [
        { name: "Eğitici Oyuncaklar", level3: ["Puzzle", "STEM Set"] },
        { name: "Kutu Oyunları & Zeka", level3: ["Masa Oyunları", "Kart Oyunları"] },
        { name: "Model & Maket", level3: ["Model Arabalar", "Model Uçaklar"] },
        { name: "Boyama & Sanat Malzemeleri", level3: ["Boya & Fırça", "Tuval & Kağıt"] },
        { name: "Yapı Oyuncakları", level3: ["Yapı Blokları", "İnşa Setleri"] },
        { name: "El Sanatları", level3: ["Makrome & Örgü Seti", "Takı Yapım Setleri"] }
      ]
    },
    {
      name: "Kitap, Müzik, Film",
      slug: "kitap-muzik-film",
      iconName: iconByGroup.office,
      sortOrder: 160,
      level2: [
        { name: "Roman & Hikaye", level3: ["Romanlar", "Hikaye Kitapları"] },
        { name: "Çocuk Kitapları", level3: ["Masal Kitapları", "Boyama Kitapları"] },
        { name: "Akademik & Eğitim", level3: ["Matematik & Fen", "Dil Öğrenimi"] },
        { name: "Müzik", level3: ["Albüm & CD", "Müzik Eğitimi"] },
        { name: "Film & Dizi", level3: ["DVD & Blu-ray", "Film Aksesuarları"] },
        { name: "Hediye & Koleksiyon", level3: ["Poster & Koleksiyon", "Özel Baskı"] }
      ]
    },
    {
      name: "Sağlık",
      slug: "saglik",
      iconName: iconByGroup.personalCare,
      sortOrder: 170,
      level2: [
        { name: "Vitamin & Takviye", level3: ["Vitaminler", "Probiyotik"] },
        { name: "Medikal Cihazlar", level3: ["Tansiyon Aleti", "Ateş Ölçer"] },
        { name: "Ortopedik Ürünler", level3: ["Ortez & Destek", "Bandaj & Sargı"] },
        { name: "İlk Yardım", level3: ["Yara Bandı", "Soğuk Kompres"] },
        { name: "Uyku & Rahatlama", level3: ["Uyku Maskesi", "Difüzör & Aromaterapi"] },
        { name: "Göz & İşitme", level3: ["Göz Bakım Ürünleri", "Kulak Tıkacı & Aksesuar"] }
      ]
    },
    {
      name: "Takı & Aksesuar",
      slug: "taki-aksesuar",
      iconName: iconByGroup.office,
      sortOrder: 180,
      level2: [
        { name: "Kolye & Uçları", level3: ["Kolye Zincirleri", "Kolye Uçları"] },
        { name: "Bileklik & Halhal", level3: ["Bileklikler", "Halhal"] },
        { name: "Yüzük", level3: ["Alyans", "Taşlı Yüzük"] },
        { name: "Küpe", level3: ["Küpeler", "Küpe Takım"] },
        { name: "Saat", level3: ["Saat Kayışı", "Akıllı Saat Aksesuarı"] },
        { name: "Saç Aksesuarları", level3: ["Saç Tokası", "Saç Bandı"] }
      ]
    }
  ];

  // 1) Mevcut root adlarını canonical isimlere güncelle (slug korunur)
  await prisma.category.update({ where: { slug: "anne-bebek" }, data: { name: "Anne & Bebek", sortOrder: 60 } });
  await prisma.category.update({ where: { slug: "kisisel-bakim" }, data: { name: "Kişisel Bakım", sortOrder: 50 } });
  await prisma.category.update({ where: { slug: "spor-outdoor" }, data: { name: "Spor & Outdoor", sortOrder: 90 } });
  await prisma.category.update({ where: { slug: "otomotiv" }, data: { name: "Otomotiv & Motosiklet", sortOrder: 100 } });
  await prisma.category.update({ where: { slug: "ofis-kirtasiye" }, data: { name: "Ofis & Kırtasiye", sortOrder: 110 } });
  await prisma.category.update({ where: { slug: "pet-shop" }, data: { name: "Pet Shop", sortOrder: 120 } });
  await prisma.category.update({ where: { slug: "supermarket" }, data: { name: "Süpermarket", sortOrder: 130 } });

  // Elektronik/Beyaz Eşya/Ev Yaşam/Kişisel Bakım slugsında isimler zaten uyumlu; sadece sortOrder’lar yukarıda ayarlandı.

  // 2) Eksik root'ları ve onların full level-2/level-3 dallarını ekle
  for (const root of newRoots) {
    const rootCat = await prisma.category.create({
      data: {
        name: root.name,
        slug: root.slug,
        iconName: root.iconName,
        imageUrl: null,
        sortOrder: root.sortOrder,
        isActive: true
      }
    });

    for (let i = 0; i < root.level2.length; i++) {
      const l2 = root.level2[i];
      const l2Slug = `${root.slug}-${slugify(l2.name)}`;
      const l2Cat = await prisma.category.create({
        data: {
          name: l2.name,
          slug: l2Slug,
          parentId: rootCat.id,
          iconName: root.iconName,
          imageUrl: null,
          sortOrder: (i + 1) * 10,
          isActive: true
        }
      });

      for (let j = 0; j < 2; j++) {
        const childName = l2.level3[j];
        const l3Slug = `${l2Slug}-${slugify(childName)}`;
        await prisma.category.create({
          data: {
            name: childName,
            slug: l3Slug,
            parentId: l2Cat.id,
            iconName: root.iconName,
            imageUrl: null,
            sortOrder: (j + 1) * 10,
            isActive: true
          }
        });
      }
    }
  }

  // 2.5) Aggressive coverage expansions
  // Bazı root'lar (Süpermarket, Pet Shop vb.) mevcut 6 level-2 ile pazaryeri hissini yeterince veremiyordu.
  // Bu blokta bu weak branch'leri genişletiyoruz (root -> level-2 -> level-3).
  // Slug'larda çakışma riskini düşürmek için yeni eklerde root slug prefix'i kullanıyoruz.
  const modaRoot = await prisma.category.findUnique({ where: { slug: "moda" }, select: { id: true } });
  const ayakkabiCantaRoot = await prisma.category.findUnique({ where: { slug: "ayakkabi-canta" }, select: { id: true } });
  const yapiRoot = await prisma.category.findUnique({ where: { slug: "yapi-market-bahce" }, select: { id: true } });
  const saglikRoot = await prisma.category.findUnique({ where: { slug: "saglik" }, select: { id: true } });
  if (!modaRoot || !ayakkabiCantaRoot || !yapiRoot || !saglikRoot) throw new Error("Missing expanded root category id(s).");

  // Moda root: Tesettür Giyim
  const tesettur = await prisma.category.create({
    data: {
      name: "Tesettür Giyim",
      slug: "moda-tesettur-giyim",
      parentId: modaRoot.id,
      iconName: iconByGroup.office,
      imageUrl: null,
      sortOrder: 70,
      isActive: true
    }
  });
  const tesetturL3a = "Tesettür Abiye";
  const tesetturL3b = "Tesettür Günlük";
  await prisma.category.create({
    data: { name: tesetturL3a, slug: `${tesettur.slug}-${slugify(tesetturL3a)}`, parentId: tesettur.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: tesetturL3b, slug: `${tesettur.slug}-${slugify(tesetturL3b)}`, parentId: tesettur.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 20, isActive: true }
  });

  // Ayakkabı & Çanta root: Valiz & Seyahat
  const valiz = await prisma.category.create({
    data: {
      name: "Valiz & Seyahat",
      slug: "ayakkabi-canta-valiz-seyahat",
      parentId: ayakkabiCantaRoot.id,
      iconName: iconByGroup.office,
      imageUrl: null,
      sortOrder: 70,
      isActive: true
    }
  });
  const valizL3a = "Valiz";
  const valizL3b = "Seyahat Aksesuarları";
  await prisma.category.create({
    data: { name: valizL3a, slug: `${valiz.slug}-${slugify(valizL3a)}`, parentId: valiz.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: valizL3b, slug: `${valiz.slug}-${slugify(valizL3b)}`, parentId: valiz.id, iconName: iconByGroup.office, imageUrl: null, sortOrder: 20, isActive: true }
  });

  // Sağlık root: Cinsel Sağlık
  const cinselSaglik = await prisma.category.create({
    data: {
      name: "Cinsel Sağlık",
      slug: "saglik-cinsel-saglik",
      parentId: saglikRoot.id,
      iconName: iconByGroup.personalCare,
      imageUrl: null,
      sortOrder: 70,
      isActive: true
    }
  });
  const cinselL3a = "Cinsel Sağlık Ürünleri";
  const cinselL3b = "Prezervatif & Kayganlaştırıcı";
  await prisma.category.create({
    data: { name: cinselL3a, slug: `${cinselSaglik.slug}-${slugify(cinselL3a)}`, parentId: cinselSaglik.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: cinselL3b, slug: `${cinselSaglik.slug}-${slugify(cinselL3b)}`, parentId: cinselSaglik.id, iconName: iconByGroup.personalCare, imageUrl: null, sortOrder: 20, isActive: true }
  });

  // Yapı Market & Bahçe root: Aydınlatma + Güvenlik Sistemleri
  const yapiAydinlatma = await prisma.category.create({
    data: {
      name: "Aydınlatma",
      slug: "yapi-market-bahce-aydinlatma",
      parentId: yapiRoot.id,
      iconName: iconByGroup.whitegoods,
      imageUrl: null,
      sortOrder: 70,
      isActive: true
    }
  });
  const yapiAydinlatmaL3a = "Aydınlatma Armatürleri";
  const yapiAydinlatmaL3b = "Akıllı Aydınlatma";
  await prisma.category.create({
    data: { name: yapiAydinlatmaL3a, slug: `${yapiAydinlatma.slug}-${slugify(yapiAydinlatmaL3a)}`, parentId: yapiAydinlatma.id, iconName: iconByGroup.whitegoods, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: yapiAydinlatmaL3b, slug: `${yapiAydinlatma.slug}-${slugify(yapiAydinlatmaL3b)}`, parentId: yapiAydinlatma.id, iconName: iconByGroup.whitegoods, imageUrl: null, sortOrder: 20, isActive: true }
  });

  const yapiGuvenlik = await prisma.category.create({
    data: {
      name: "Güvenlik Sistemleri",
      slug: "yapi-market-bahce-guvenlik-sistemleri",
      parentId: yapiRoot.id,
      iconName: iconByGroup.automotive,
      imageUrl: null,
      sortOrder: 80,
      isActive: true
    }
  });
  const yapiGuvL3a = "Kamera Sistemleri";
  const yapiGuvL3b = "Alarm & Sensörler";
  await prisma.category.create({
    data: { name: yapiGuvL3a, slug: `${yapiGuvenlik.slug}-${slugify(yapiGuvL3a)}`, parentId: yapiGuvenlik.id, iconName: iconByGroup.automotive, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: yapiGuvL3b, slug: `${yapiGuvenlik.slug}-${slugify(yapiGuvL3b)}`, parentId: yapiGuvenlik.id, iconName: iconByGroup.automotive, imageUrl: null, sortOrder: 20, isActive: true }
  });

  // Süpermarket root genişleme
  const supermarketKonserve = await prisma.category.create({
    data: { name: "Konserve & Hazır Yemek", slug: "supermarket-konserve-hazir-yemek", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 70, isActive: true }
  });
  const supermarketKağıt = await prisma.category.create({
    data: { name: "Kağıt Ürünleri", slug: "supermarket-kagit-urunleri", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 80, isActive: true }
  });
  const supermarketCamasir = await prisma.category.create({
    data: { name: "Çamaşır Bakım", slug: "supermarket-camasir-bakim", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 90, isActive: true }
  });
  const supermarketBulashik = await prisma.category.create({
    data: { name: "Bulaşık Bakım", slug: "supermarket-bulasik-bakim", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 100, isActive: true }
  });
  const supermarketHijyen = await prisma.category.create({
    data: { name: "Kişisel Hijyen", slug: "supermarket-kisisel-hijyen", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 110, isActive: true }
  });
  const supermarketEvcil = await prisma.category.create({
    data: { name: "Evcil Hayvan Tüketim", slug: "supermarket-evcil-hayvan-tuketim", parentId: grocery.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 120, isActive: true }
  });

  await prisma.category.create({
    data: { name: "Konserve Gıdalar", slug: `${supermarketKonserve.slug}-${slugify("Konserve Gıdalar")}`, parentId: supermarketKonserve.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Hazır Yemek & Soslar", slug: `${supermarketKonserve.slug}-${slugify("Hazır Yemek & Soslar")}`, parentId: supermarketKonserve.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Mutfak Kağıtları", slug: `${supermarketKağıt.slug}-${slugify("Mutfak Kağıtları")}`, parentId: supermarketKağıt.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Tuvalet Kağıdı", slug: `${supermarketKağıt.slug}-${slugify("Tuvalet Kağıdı")}`, parentId: supermarketKağıt.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Çamaşır Deterjanı", slug: `${supermarketCamasir.slug}-${slugify("Çamaşır Deterjanı")}`, parentId: supermarketCamasir.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Yumuşatıcı & Leke Çıkarıcı", slug: `${supermarketCamasir.slug}-${slugify("Yumuşatıcı & Leke Çıkarıcı")}`, parentId: supermarketCamasir.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Bulaşık Deterjanı", slug: `${supermarketBulashik.slug}-${slugify("Bulaşık Deterjanı")}`, parentId: supermarketBulashik.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Parlatıcı & Tabletler", slug: `${supermarketBulashik.slug}-${slugify("Parlatıcı & Tabletler")}`, parentId: supermarketBulashik.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Şampuan & Saç Bakım", slug: `${supermarketHijyen.slug}-${slugify("Şampuan & Saç Bakım")}`, parentId: supermarketHijyen.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Ağız Bakımı", slug: `${supermarketHijyen.slug}-${slugify("Ağız Bakımı")}`, parentId: supermarketHijyen.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Kedi & Köpek Sağlık Ürünleri", slug: `${supermarketEvcil.slug}-${slugify("Kedi & Köpek Sağlık Ürünleri")}`, parentId: supermarketEvcil.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Ödül & Atıştırmalıklar", slug: `${supermarketEvcil.slug}-${slugify("Ödül & Atıştırmalıklar")}`, parentId: supermarketEvcil.id, iconName: iconByGroup.grocery, imageUrl: null, sortOrder: 20, isActive: true }
  });

  // Pet Shop root genişleme
  const petTasima = await prisma.category.create({
    data: { name: "Taşıma & Gezdirme", slug: "pet-shop-tasima-gezdirme", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 70, isActive: true }
  });
  const petYatak = await prisma.category.create({
    data: { name: "Yatak", slug: "pet-shop-yatak", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 80, isActive: true }
  });
  const petTasma = await prisma.category.create({
    data: { name: "Tasma & Aksesuar", slug: "pet-shop-tasma-aksesuar", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 90, isActive: true }
  });
  const petKuş = await prisma.category.create({
    data: { name: "Kuş", slug: "pet-shop-kus", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 100, isActive: true }
  });
  const petAkvaryum = await prisma.category.create({
    data: { name: "Akvaryum", slug: "pet-shop-akvaryum", parentId: pet.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 110, isActive: true }
  });

  await prisma.category.create({
    data: { name: "Taşıma Kafesi & Çanta", slug: `${petTasima.slug}-${slugify("Taşıma Kafesi & Çanta")}`, parentId: petTasima.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Gezdirme Tasma Setleri", slug: `${petTasima.slug}-${slugify("Gezdirme Tasma Setleri")}`, parentId: petTasima.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Kedi Yatağı", slug: `${petYatak.slug}-${slugify("Kedi Yatağı")}`, parentId: petYatak.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Köpek Yatağı", slug: `${petYatak.slug}-${slugify("Köpek Yatağı")}`, parentId: petYatak.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Boyun Tasması & Emniyet", slug: `${petTasma.slug}-${slugify("Boyun Tasması & Emniyet")}`, parentId: petTasma.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Göğüs Tasması & Kemer", slug: `${petTasma.slug}-${slugify("Göğüs Tasması & Kemer")}`, parentId: petTasma.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Kuş Kafesi", slug: `${petKuş.slug}-${slugify("Kuş Kafesi")}`, parentId: petKuş.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Kuş Yemi & Kum", slug: `${petKuş.slug}-${slugify("Kuş Yemi & Kum")}`, parentId: petKuş.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 20, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Akvaryum Taşları & Kum", slug: `${petAkvaryum.slug}-${slugify("Akvaryum Taşları & Kum")}`, parentId: petAkvaryum.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 10, isActive: true }
  });
  await prisma.category.create({
    data: { name: "Balık Yemi & Bakım", slug: `${petAkvaryum.slug}-${slugify("Balık Yemi & Bakım")}`, parentId: petAkvaryum.id, iconName: iconByGroup.pet, imageUrl: null, sortOrder: 20, isActive: true }
  });

  // 3) Mevcut level-2 düğümlerine level-3 children ekle
  const existingLevel2WithChildren: Array<{
    parentSlug: string;
    iconName: string;
    children: [string, string];
  }> = [
    // Elektronik
    { parentSlug: "cep-telefonu", iconName: iconByGroup.electronics, children: ["Telefon Kılıfları & Kapaklar", "Şarj Aletleri & Power Bank"] },
    { parentSlug: "laptop", iconName: iconByGroup.electronics, children: ["Laptop Çantaları", "Adaptör & Şarj Cihazları"] },
    { parentSlug: "televizyon", iconName: iconByGroup.electronics, children: ["Televizyon Aksesuarları", "TV Duvar Askı Aparatları"] },
    { parentSlug: "tablet", iconName: iconByGroup.electronics, children: ["Tablet Kılıfları", "Stylus & Klavye"] },
    { parentSlug: "kulaklik", iconName: iconByGroup.electronics, children: ["Bluetooth Kulaklıklar", "Kulaklık Kılıfları"] },
    { parentSlug: "kamera", iconName: iconByGroup.electronics, children: ["Kamera Çantaları", "Tripod & Sabitleyiciler"] },

    // Beyaz Eşya
    { parentSlug: "buzdolabi", iconName: iconByGroup.whitegoods, children: ["No-Frost Bölmeler", "Buzluk & Saklama Kapları"] },
    { parentSlug: "camsasir-makinesi", iconName: iconByGroup.whitegoods, children: ["Tambur Temizleyici", "Makine Bakım Kimyasalları"] },
    { parentSlug: "bulasik-makinesi", iconName: iconByGroup.whitegoods, children: ["Temizlik Tabletleri", "Durulama & Parlatıcı"] },
    { parentSlug: "firin", iconName: iconByGroup.whitegoods, children: ["Fırın Tepsi & Aksesuarları", "Fırın Temizliği"] },
    { parentSlug: "kurutma-makinesi", iconName: iconByGroup.whitegoods, children: ["Filtre & Aksesuarlar", "Kurutma Bakım Ürünleri"] },
    { parentSlug: "derin-dondurucu", iconName: iconByGroup.whitegoods, children: ["Dondurucu Saklama Kapları", "Dondurucu Aksesuarları"] },

    // Ev Yaşam
    { parentSlug: "elektrikli-supurge", iconName: iconByGroup.home, children: ["Süpürge Filtresi & Torbaları", "Aksesuar Başlıklar"] },
    { parentSlug: "kahve-makinesi", iconName: iconByGroup.home, children: ["Kahve Makinesi Temizliği", "Kahve Öğütücü Aksesuarları"] },
    { parentSlug: "tencere-tava", iconName: iconByGroup.home, children: ["Tencere Setleri", "Tava & Kapaklar"] },
    { parentSlug: "aydinlatma", iconName: iconByGroup.home, children: ["Avize & Sarkıt", "Ampul & LED Aydınlatma"] },
    { parentSlug: "ev-tekstili", iconName: iconByGroup.home, children: ["Nevresim Setleri", "Yastık & Yorgan"] },
    { parentSlug: "isiticilar", iconName: iconByGroup.home, children: ["Fanlı Isıtıcılar", "Isıtıcı Bakım & Filtre"] },

    // Kişisel Bakım
    { parentSlug: "kozmetik", iconName: iconByGroup.personalCare, children: ["Makyaj", "Güneş Koruyucu"] },
    { parentSlug: "sac-bakim", iconName: iconByGroup.personalCare, children: ["Şampuan & Saç Kremi", "Saç Maskesi & Onarıcı"] },
    { parentSlug: "cilt-bakimi", iconName: iconByGroup.personalCare, children: ["Temizleyici", "Nemlendirici"] },
    { parentSlug: "tras", iconName: iconByGroup.personalCare, children: ["Tıraş Köpüğü & Jel", "Tıraş Bıçağı & Fırça"] },
    { parentSlug: "dis-bakimi", iconName: iconByGroup.personalCare, children: ["Diş Macunu", "Ağız Bakım Gargarası"] },
    { parentSlug: "agiz-bakimi", iconName: iconByGroup.personalCare, children: ["Diş Macunu", "Ağız Bakım Gargarası"] },
    { parentSlug: "parfum", iconName: iconByGroup.personalCare, children: ["Parfüm", "Deodorant & Sprey"] },

    // Anne Bebek
    { parentSlug: "bebek-arabasi", iconName: iconByGroup.baby, children: ["Puset & Taşıma", "Bebek Arabası Aksesuarları"] },
    { parentSlug: "oto-koltugu", iconName: iconByGroup.baby, children: ["Oto Koltuğu", "Emniyet Aksesuarları"] },
    { parentSlug: "emzik-sise", iconName: iconByGroup.baby, children: ["Biberon Ucu & Emzik", "Sterilizasyon Ürünleri"] },
    { parentSlug: "bez", iconName: iconByGroup.baby, children: ["Bebek Bezleri", "Islak Mendil & Bakım Kremi"] },
    { parentSlug: "bebek-beslenme", iconName: iconByGroup.baby, children: ["Mama Hazırlık Ürünleri", "Bardak & Mama Setleri"] },
    { parentSlug: "bebek-odasi", iconName: iconByGroup.baby, children: ["Bebek Nevresimi", "Oda Tekstili & Organizer"] },

    // Spor Outdoor
    { parentSlug: "fitness-aksesuarlar", iconName: iconByGroup.sports, children: ["Dambıl & Ağırlık", "Yoga Mat & Egzersiz"] },
    { parentSlug: "outdoor-giyim", iconName: iconByGroup.sports, children: ["Termal Giyim", "Rüzgarlık & Yağmurluk"] },
    { parentSlug: "kamp-piknik", iconName: iconByGroup.sports, children: ["Çadır & Barınak", "Kamp Mutfak Ekipmanları"] },
    { parentSlug: "bisiklet", iconName: iconByGroup.sports, children: ["Bisiklet Aydınlatma", "Bisiklet Lastiği"] },
    { parentSlug: "spor-ayakkabi", iconName: iconByGroup.sports, children: ["Futbol Ayakkabısı", "Koşu Ayakkabısı"] },
    { parentSlug: "spor-beslenme", iconName: iconByGroup.sports, children: ["Protein & Takviyeler", "Spor Bar & İçecek"] },

    // Otomotiv
    { parentSlug: "oto-aksesuarlar", iconName: iconByGroup.automotive, children: ["Araç İçi Organizer", "Koltuk Kılıfı"] },
    { parentSlug: "oto-temizlik", iconName: iconByGroup.automotive, children: ["Oto Şampuanı", "Cam Temizleyici"] },
    { parentSlug: "yaglar", iconName: iconByGroup.automotive, children: ["Motor Yağı", "Yağ Filtresi"] },
    { parentSlug: "oto-aydinlatma", iconName: iconByGroup.automotive, children: ["Far Ampulleri", "LED Şerit & Aydınlatma"] },
    { parentSlug: "jant-lastik", iconName: iconByGroup.automotive, children: ["Lastik & Jant Setleri", "Bijon & Aksesuar"] },
    { parentSlug: "oto-elektronigi", iconName: iconByGroup.automotive, children: ["Navigasyon Sistemleri", "Park Sensörü & Kamera"] },

    // Ofis Kırtasiye
    { parentSlug: "yazici-sarf", iconName: iconByGroup.office, children: ["Mürekkep Kartuşu", "Toner"] },
    { parentSlug: "kagit-fatura", iconName: iconByGroup.office, children: ["Fatura Kağıdı", "Fatura Rulosu"] },
    { parentSlug: "defterler", iconName: iconByGroup.office, children: ["Ajanda & Planlayıcı", "Defter & Bloknot"] },
    { parentSlug: "kalem", iconName: iconByGroup.office, children: ["Tükenmez Kalem", "Kurşun Kalem"] },
    { parentSlug: "dosya-klasor", iconName: iconByGroup.office, children: ["Dosya Klasör", "Arşiv Kutuları"] },
    { parentSlug: "etiketleme", iconName: iconByGroup.office, children: ["Etiket Sarfı", "Koli Etiketi"] },

    // Pet Shop
    { parentSlug: "kedi-mamasi", iconName: iconByGroup.pet, children: ["Kuru Mama", "Yaş Mama"] },
    { parentSlug: "kopek-mamasi", iconName: iconByGroup.pet, children: ["Kuru Köpek Maması", "Yaş Köpek Maması"] },
    { parentSlug: "kum-hijyen", iconName: iconByGroup.pet, children: ["Kedi Kumu", "Kedi Tuvalet Spreyi"] },
    { parentSlug: "pet-oyuncaklari", iconName: iconByGroup.pet, children: ["Kedi Oyuncakları", "Köpek Oyuncakları"] },
    { parentSlug: "pet-aksesuarlar", iconName: iconByGroup.pet, children: ["Tasma & Eğitim", "Gezdirme Ürünleri"] },
    { parentSlug: "pet-bakim", iconName: iconByGroup.pet, children: ["Şampuan", "Tüy Bakım Fırçası"] },

    // Grocery (Süpermarket)
    { parentSlug: "temel-gida", iconName: iconByGroup.grocery, children: ["Pirinç & Bulgur", "Makarna & Un"] },
    { parentSlug: "icecek", iconName: iconByGroup.grocery, children: ["Su & Maden Suyu", "Çay & Kahve"] },
    { parentSlug: "kahvaltilik", iconName: iconByGroup.grocery, children: ["Reçel & Bal", "Gevrek & Kahvaltılık"] },
    { parentSlug: "temizlik", iconName: iconByGroup.grocery, children: ["Çamaşır Deterjanı", "Bulaşık Deterjanı"] },
    { parentSlug: "atistirmalik", iconName: iconByGroup.grocery, children: ["Cips & Atıştırmalık", "Kuruyemiş"] },
    { parentSlug: "bebek-mamasi-supermarket", iconName: iconByGroup.grocery, children: ["Bebek Maması", "Bebek Aperatifleri"] }
  ];

  // Parent id'leri tek seferde çek
  const existingParentSlugs = existingLevel2WithChildren.map((x) => x.parentSlug);
  const existingParents = await prisma.category.findMany({
    where: { slug: { in: existingParentSlugs } },
    select: { id: true, slug: true }
  });
  const parentIdMap = new Map(existingParents.map((p) => [p.slug, p.id]));

  for (const def of existingLevel2WithChildren) {
    const parentId = parentIdMap.get(def.parentSlug);
    if (!parentId) {
      throw new Error(`Seed category parent not found for slug=${def.parentSlug}`);
    }

    const [c1, c2] = def.children;
    const c1Slug = `${def.parentSlug}-${slugify(c1)}`;
    const c2Slug = `${def.parentSlug}-${slugify(c2)}`;

    await prisma.category.create({
      data: {
        name: c1,
        slug: c1Slug,
        parentId,
        iconName: def.iconName,
        imageUrl: null,
        sortOrder: 10,
        isActive: true
      }
    });
    await prisma.category.create({
      data: {
        name: c2,
        slug: c2Slug,
        parentId,
        iconName: def.iconName,
        imageUrl: null,
        sortOrder: 20,
        isActive: true
      }
    });
  }

  // 4) Final completeness expansion for thin branches
  const oyunHobiRoot = await prisma.category.findUnique({ where: { slug: "oyun-hobi" }, select: { id: true } });
  const kitapMuzikFilmRoot = await prisma.category.findUnique({ where: { slug: "kitap-muzik-film" }, select: { id: true } });
  const takiRoot = await prisma.category.findUnique({ where: { slug: "taki-aksesuar" }, select: { id: true } });
  const ofisRoot = await prisma.category.findUnique({ where: { slug: "ofis-kirtasiye" }, select: { id: true } });
  const otomotivRoot = await prisma.category.findUnique({ where: { slug: "otomotiv" }, select: { id: true } });
  const evYasamRoot = await prisma.category.findUnique({ where: { slug: "ev-yasam" }, select: { id: true } });

  if (!oyunHobiRoot || !kitapMuzikFilmRoot || !takiRoot || !ofisRoot || !otomotivRoot || !evYasamRoot) {
    throw new Error("Seed root lookup failed in completeness expansion.");
  }

  const completenessRows: Array<{
    rootId: string;
    rootSlug: string;
    iconName: string;
    sortOrder: number;
    name: string;
    children: [string, string];
  }> = [
    { rootId: oyunHobiRoot.id, rootSlug: "oyun-hobi", iconName: iconByGroup.sports, sortOrder: 70, name: "Konsol Oyunları", children: ["PlayStation Oyunları", "Xbox Oyunları"] },
    { rootId: oyunHobiRoot.id, rootSlug: "oyun-hobi", iconName: iconByGroup.sports, sortOrder: 80, name: "Müzik Enstrümanları", children: ["Gitar", "Klavye"] },
    { rootId: oyunHobiRoot.id, rootSlug: "oyun-hobi", iconName: iconByGroup.sports, sortOrder: 90, name: "Uzaktan Kumandalı Ürünler", children: ["RC Araba", "RC Drone"] },

    { rootId: kitapMuzikFilmRoot.id, rootSlug: "kitap-muzik-film", iconName: iconByGroup.office, sortOrder: 70, name: "Kitap", children: ["Kişisel Gelişim", "Bilim & Araştırma"] },
    { rootId: kitapMuzikFilmRoot.id, rootSlug: "kitap-muzik-film", iconName: iconByGroup.office, sortOrder: 80, name: "Yabancı Dil", children: ["İngilizce Kaynaklar", "Sınav Hazırlık"] },
    { rootId: kitapMuzikFilmRoot.id, rootSlug: "kitap-muzik-film", iconName: iconByGroup.office, sortOrder: 90, name: "Dergi", children: ["Aylık Dergiler", "Koleksiyon Sayıları"] },
    { rootId: kitapMuzikFilmRoot.id, rootSlug: "kitap-muzik-film", iconName: iconByGroup.office, sortOrder: 100, name: "Koleksiyon Yayınları", children: ["Özel Baskılar", "Limitli Seriler"] },

    { rootId: takiRoot.id, rootSlug: "taki-aksesuar", iconName: iconByGroup.office, sortOrder: 70, name: "Kadın Takı", children: ["Altın Takı", "Gümüş Takı"] },
    { rootId: takiRoot.id, rootSlug: "taki-aksesuar", iconName: iconByGroup.office, sortOrder: 80, name: "Erkek Aksesuar", children: ["Bileklik", "Kol Düğmesi"] },
    { rootId: takiRoot.id, rootSlug: "taki-aksesuar", iconName: iconByGroup.office, sortOrder: 90, name: "Güneş Gözlüğü", children: ["Kadın Güneş Gözlüğü", "Erkek Güneş Gözlüğü"] },
    { rootId: takiRoot.id, rootSlug: "taki-aksesuar", iconName: iconByGroup.office, sortOrder: 100, name: "Bijuteri", children: ["Günlük Bijuteri", "Set Bijuteri"] },
    { rootId: takiRoot.id, rootSlug: "taki-aksesuar", iconName: iconByGroup.office, sortOrder: 110, name: "Değerli Takı", children: ["Pırlanta Takı", "İnci Takı"] },

    { rootId: ofisRoot.id, rootSlug: "ofis-kirtasiye", iconName: iconByGroup.office, sortOrder: 70, name: "Ofis Mobilyası", children: ["Çalışma Masası", "Ergonomik Koltuk"] },
    { rootId: ofisRoot.id, rootSlug: "ofis-kirtasiye", iconName: iconByGroup.office, sortOrder: 80, name: "Ofis Elektroniği", children: ["Projeksiyon", "Evrak İmha Makinesi"] },
    { rootId: ofisRoot.id, rootSlug: "ofis-kirtasiye", iconName: iconByGroup.office, sortOrder: 90, name: "Okul Gereçleri", children: ["Okul Çantası", "Geometri Seti"] },

    { rootId: otomotivRoot.id, rootSlug: "otomotiv", iconName: iconByGroup.automotive, sortOrder: 70, name: "Akü", children: ["Otomobil Aküsü", "Motosiklet Aküsü"] },
    { rootId: otomotivRoot.id, rootSlug: "otomotiv", iconName: iconByGroup.automotive, sortOrder: 80, name: "Yedek Parça", children: ["Fren Parçaları", "Filtreler"] },
    { rootId: otomotivRoot.id, rootSlug: "otomotiv", iconName: iconByGroup.automotive, sortOrder: 90, name: "Motosiklet", children: ["Scooter", "Touring"] },
    { rootId: otomotivRoot.id, rootSlug: "otomotiv", iconName: iconByGroup.automotive, sortOrder: 100, name: "Motosiklet Ekipman", children: ["Motosiklet Kaskı", "Motosiklet Montu"] },

    { rootId: evYasamRoot.id, rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 70, name: "Ütü", children: ["Buharlı Ütü", "Kazanlı Ütü"] },
    { rootId: evYasamRoot.id, rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 80, name: "Dekorasyon", children: ["Duvar Dekoru", "Masa Üstü Dekor"] },
    { rootId: evYasamRoot.id, rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 90, name: "Banyo", children: ["Banyo Setleri", "Duş Aksesuarları"] },
    { rootId: evYasamRoot.id, rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 100, name: "Temizlik Gereçleri", children: ["Mop", "Cam Temizlik Ürünleri"] }
  ];

  for (const row of completenessRows) {
    await ensureCategoryL2WithChildren(row.rootId, row.rootSlug, {
      iconName: row.iconName,
      sortOrder: row.sortOrder,
      name: row.name,
      children: row.children
    });
  }

  // 5) Exhaustive coverage expansion (strict canonical completeness)
  const exhaustiveRootSlugs = [
    "elektronik",
    "beyaz-esya",
    "ev-yasam",
    "mobilya",
    "kisisel-bakim",
    "anne-bebek",
    "moda",
    "ayakkabi-canta",
    "spor-outdoor",
    "otomotiv",
    "ofis-kirtasiye",
    "pet-shop",
    "supermarket",
    "yapi-market-bahce",
    "oyun-hobi",
    "kitap-muzik-film",
    "saglik",
    "taki-aksesuar"
  ] as const;

  const exhaustiveRoots = await prisma.category.findMany({
    where: { slug: { in: [...exhaustiveRootSlugs] } },
    select: { id: true, slug: true }
  });
  const exhaustiveRootMap = new Map(exhaustiveRoots.map((r) => [r.slug, r.id]));

  const getRootId = (slug: (typeof exhaustiveRootSlugs)[number]) => {
    const id = exhaustiveRootMap.get(slug);
    if (!id) throw new Error(`Missing exhaustive root id for slug=${slug}`);
    return id;
  };

  const exhaustiveRows: Array<{
    rootSlug: (typeof exhaustiveRootSlugs)[number];
    iconName: string;
    sortOrder: number;
    name: string;
    children: [string, string];
  }> = [
    // Elektronik
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 70, name: "Telefon Aksesuarları", children: ["Telefon Kılıfı", "Ekran Koruyucu"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 80, name: "Bilgisayar", children: ["Masaüstü Bilgisayar", "All-in-One Bilgisayar"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 90, name: "Bilgisayar Bileşenleri", children: ["Ekran Kartı", "Anakart"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 100, name: "Monitör", children: ["Oyuncu Monitörü", "Profesyonel Monitör"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 110, name: "Yazıcı & Tarayıcı", children: ["Lazer Yazıcı", "Tarayıcı"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 120, name: "Ağ Ürünleri", children: ["Router", "Mesh Sistem"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 130, name: "TV & Görüntü", children: ["4K Televizyon", "Projeksiyon"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 140, name: "Ses Sistemleri", children: ["Soundbar", "Bluetooth Hoparlör"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 150, name: "Kamera & Fotoğraf", children: ["Fotoğraf Makinesi", "Aksiyon Kamera"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 160, name: "Giyilebilir Teknoloji", children: ["Akıllı Saat", "Akıllı Bileklik"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 170, name: "Oyun & Konsol", children: ["Oyun Konsolu", "Oyun Kolu"] },
    { rootSlug: "elektronik", iconName: iconByGroup.electronics, sortOrder: 180, name: "Ofis Elektroniği", children: ["Projeksiyon Cihazı", "Evrak İmha Makinesi"] },

    // Beyaz Eşya
    { rootSlug: "beyaz-esya", iconName: iconByGroup.whitegoods, sortOrder: 70, name: "Mikrodalga", children: ["Solo Mikrodalga", "Ankastre Mikrodalga"] },
    { rootSlug: "beyaz-esya", iconName: iconByGroup.whitegoods, sortOrder: 80, name: "Davlumbaz", children: ["Eğimli Davlumbaz", "Teleskopik Davlumbaz"] },
    { rootSlug: "beyaz-esya", iconName: iconByGroup.whitegoods, sortOrder: 90, name: "Klima", children: ["Split Klima", "Mobil Klima"] },
    { rootSlug: "beyaz-esya", iconName: iconByGroup.whitegoods, sortOrder: 100, name: "Ankastre", children: ["Ankastre Set", "Ankastre Ocak"] },
    { rootSlug: "beyaz-esya", iconName: iconByGroup.whitegoods, sortOrder: 110, name: "Isıtıcılar", children: ["Fanlı Isıtıcı", "Yağlı Radyatör"] },
    { rootSlug: "beyaz-esya", iconName: iconByGroup.whitegoods, sortOrder: 120, name: "Su Isıtıcı Sistemleri", children: ["Şofben", "Termosifon"] },

    // Ev Yaşam
    { rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 110, name: "Süpürge", children: ["Robot Süpürge", "Dikey Süpürge"] },
    { rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 120, name: "Mutfak Aletleri", children: ["Blender", "Mikser"] },
    { rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 130, name: "Kahve & İçecek Hazırlama", children: ["Espresso Makinesi", "Filtre Kahve Makinesi"] },
    { rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 140, name: "Pişirme Yardımcıları", children: ["Airfryer", "Tost Makinesi"] },
    { rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 150, name: "Isıtma & Soğutma", children: ["Vantilatör", "Hava Temizleyici"] },
    { rootSlug: "ev-yasam", iconName: iconByGroup.home, sortOrder: 160, name: "Düzenleme & Depolama", children: ["Saklama Kutusu", "Dolap Düzenleyici"] },

    // Mobilya
    { rootSlug: "mobilya", iconName: iconByGroup.home, sortOrder: 90, name: "Çocuk Odası", children: ["Çocuk Yatağı", "Çocuk Dolabı"] },
    { rootSlug: "mobilya", iconName: iconByGroup.home, sortOrder: 100, name: "Ofis Mobilyası", children: ["Çalışma Masası", "Ergonomik Koltuk"] },
    { rootSlug: "mobilya", iconName: iconByGroup.home, sortOrder: 110, name: "Bahçe Mobilyası", children: ["Bahçe Takımı", "Şezlong"] },
    { rootSlug: "mobilya", iconName: iconByGroup.home, sortOrder: 120, name: "TV Ünitesi", children: ["TV Sehpası", "Duvar TV Ünitesi"] },
    { rootSlug: "mobilya", iconName: iconByGroup.home, sortOrder: 130, name: "Depolama Mobilyaları", children: ["Kitaplık", "Çok Amaçlı Dolap"] },

    // Kişisel Bakım
    { rootSlug: "kisisel-bakim", iconName: iconByGroup.personalCare, sortOrder: 100, name: "Tıraş & Erkek Bakım", children: ["Tıraş Makinesi", "Sakal Bakım"] },
    { rootSlug: "kisisel-bakim", iconName: iconByGroup.personalCare, sortOrder: 110, name: "Epilasyon & Kadın Bakım", children: ["Epilatör", "Ağda Ürünleri"] },
    { rootSlug: "kisisel-bakim", iconName: iconByGroup.personalCare, sortOrder: 120, name: "Kişisel Hijyen", children: ["Duş Jeli", "Hijyen Pedi"] },
    { rootSlug: "kisisel-bakim", iconName: iconByGroup.personalCare, sortOrder: 130, name: "Medikal Kişisel Bakım", children: ["Nebülizatör", "Ateş Ölçer"] },

    // Anne & Bebek
    { rootSlug: "anne-bebek", iconName: iconByGroup.baby, sortOrder: 110, name: "Bebek Bezi", children: ["Yenidoğan Bezi", "Külot Bez"] },
    { rootSlug: "anne-bebek", iconName: iconByGroup.baby, sortOrder: 120, name: "Biberon & Emzik", children: ["Biberon", "Emzik"] },
    { rootSlug: "anne-bebek", iconName: iconByGroup.baby, sortOrder: 130, name: "Mama Sandalyesi", children: ["Katlanır Mama Sandalyesi", "Portatif Mama Sandalyesi"] },
    { rootSlug: "anne-bebek", iconName: iconByGroup.baby, sortOrder: 140, name: "Bebek Giyim", children: ["Body", "Tulum"] },
    { rootSlug: "anne-bebek", iconName: iconByGroup.baby, sortOrder: 150, name: "Oyuncak", children: ["Diş Kaşıyıcı", "Eğitici Oyuncak"] },
    { rootSlug: "anne-bebek", iconName: iconByGroup.baby, sortOrder: 160, name: "Anne Bakım", children: ["Göğüs Pompası", "Anne Bakım Kremi"] },

    // Ayakkabı & Çanta
    { rootSlug: "ayakkabi-canta", iconName: iconByGroup.office, sortOrder: 100, name: "Terlik & Sandalet", children: ["Ev Terliği", "Sandalet"] },
    { rootSlug: "ayakkabi-canta", iconName: iconByGroup.office, sortOrder: 110, name: "Kadın Çanta", children: ["Omuz Çantası", "Portföy"] },
    { rootSlug: "ayakkabi-canta", iconName: iconByGroup.office, sortOrder: 120, name: "Erkek Çanta", children: ["Evrak Çantası", "Postacı Çantası"] },
    { rootSlug: "ayakkabi-canta", iconName: iconByGroup.office, sortOrder: 130, name: "Valiz", children: ["Kabin Boy Valiz", "Büyük Boy Valiz"] },

    // Spor & Outdoor
    { rootSlug: "spor-outdoor", iconName: iconByGroup.sports, sortOrder: 110, name: "Koşu", children: ["Koşu Bandı", "Koşu Aksesuarları"] },
    { rootSlug: "spor-outdoor", iconName: iconByGroup.sports, sortOrder: 120, name: "Takım Sporları", children: ["Futbol", "Basketbol"] },
    { rootSlug: "spor-outdoor", iconName: iconByGroup.sports, sortOrder: 130, name: "Su Sporları", children: ["Yüzme Gözlüğü", "Palet"] },
    { rootSlug: "spor-outdoor", iconName: iconByGroup.sports, sortOrder: 140, name: "Kış Sporları", children: ["Kayak", "Snowboard"] },
    { rootSlug: "spor-outdoor", iconName: iconByGroup.sports, sortOrder: 150, name: "Outdoor Ekipman", children: ["Kamp Lambası", "Matara"] },

    // Ofis & Kırtasiye
    { rootSlug: "ofis-kirtasiye", iconName: iconByGroup.office, sortOrder: 100, name: "Kağıt Ürünleri", children: ["A4 Kağıt", "Fotokopi Kağıdı"] },
    { rootSlug: "ofis-kirtasiye", iconName: iconByGroup.office, sortOrder: 110, name: "Defter & Ajanda", children: ["Ajanda", "Spiralli Defter"] },
    { rootSlug: "ofis-kirtasiye", iconName: iconByGroup.office, sortOrder: 120, name: "Kalem & Boyama", children: ["Tükenmez Kalem", "Keçeli Kalem"] },
    { rootSlug: "ofis-kirtasiye", iconName: iconByGroup.office, sortOrder: 130, name: "Dosyalama", children: ["Klasör", "Arşiv Kutusu"] },

    // Pet Shop
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 120, name: "Kedi", children: ["Kedi Maması", "Kedi Kumu"] },
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 130, name: "Köpek", children: ["Köpek Maması", "Köpek Tasması"] },
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 140, name: "Kuş", children: ["Kuş Yemi", "Kuş Kafesi"] },
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 150, name: "Balık & Akvaryum", children: ["Akvaryum", "Balık Yemi"] },
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 160, name: "Kemirgen", children: ["Kemirgen Yemi", "Kemirgen Kafesi"] },
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 170, name: "Sürüngen", children: ["Terraryum", "Sürüngen Isıtıcı"] },
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 180, name: "Mama", children: ["Kuru Mama", "Yaş Mama"] },
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 190, name: "Bakım & Hijyen", children: ["Tüy Bakım", "Pet Şampuan"] },
    { rootSlug: "pet-shop", iconName: iconByGroup.pet, sortOrder: 200, name: "Oyuncak & Aksesuar", children: ["Kedi Oyuncağı", "Köpek Oyuncağı"] },

    // Süpermarket
    { rootSlug: "supermarket", iconName: iconByGroup.grocery, sortOrder: 130, name: "Temizlik Ürünleri", children: ["Yüzey Temizleyici", "Banyo Temizleyici"] },

    // Yapı Market & Bahçe
    { rootSlug: "yapi-market-bahce", iconName: iconByGroup.whitegoods, sortOrder: 90, name: "Banyo Ürünleri", children: ["Banyo Bataryası", "Duş Seti"] },
    { rootSlug: "yapi-market-bahce", iconName: iconByGroup.whitegoods, sortOrder: 100, name: "Mutfak Yapı Ürünleri", children: ["Mutfak Bataryası", "Evye"] },
    { rootSlug: "yapi-market-bahce", iconName: iconByGroup.whitegoods, sortOrder: 110, name: "Bahçe Araçları", children: ["Budama Makası", "Bahçe Eldiveni"] },
    { rootSlug: "yapi-market-bahce", iconName: iconByGroup.whitegoods, sortOrder: 120, name: "Sulama", children: ["Bahçe Hortumu", "Sulama Tabancası"] },

    // Oyun & Hobi
    { rootSlug: "oyun-hobi", iconName: iconByGroup.sports, sortOrder: 100, name: "Oyuncak & Hobi Setleri", children: ["Bilim Seti", "El Beceri Seti"] },
    { rootSlug: "oyun-hobi", iconName: iconByGroup.sports, sortOrder: 110, name: "Koleksiyon", children: ["Koleksiyon Figür", "Koleksiyon Kartları"] },
    { rootSlug: "oyun-hobi", iconName: iconByGroup.sports, sortOrder: 120, name: "Sanat & Hobi", children: ["Akrilik Boya", "Fırça Seti"] },
    { rootSlug: "oyun-hobi", iconName: iconByGroup.sports, sortOrder: 130, name: "Puzzle", children: ["500 Parça Puzzle", "1000 Parça Puzzle"] },

    // Kitap, Müzik, Film
    { rootSlug: "kitap-muzik-film", iconName: iconByGroup.office, sortOrder: 110, name: "Çocuk Kitapları", children: ["Masal Kitapları", "Etkinlik Kitapları"] },
    { rootSlug: "kitap-muzik-film", iconName: iconByGroup.office, sortOrder: 120, name: "Eğitim", children: ["Sınav Hazırlık", "Akademik Kaynak"] },
    { rootSlug: "kitap-muzik-film", iconName: iconByGroup.office, sortOrder: 130, name: "Müzik", children: ["CD", "Plak"] },
    { rootSlug: "kitap-muzik-film", iconName: iconByGroup.office, sortOrder: 140, name: "Film", children: ["DVD", "Blu-ray"] },

    // Sağlık
    { rootSlug: "saglik", iconName: iconByGroup.personalCare, sortOrder: 80, name: "Göz Sağlığı", children: ["Göz Damlası", "Lens Solüsyonu"] },
    { rootSlug: "saglik", iconName: iconByGroup.personalCare, sortOrder: 90, name: "İşitme Destek", children: ["Kulak Tıkacı", "İşitme Cihazı Pili"] },

    // Takı & Aksesuar
    { rootSlug: "taki-aksesuar", iconName: iconByGroup.office, sortOrder: 120, name: "Saat", children: ["Kadın Saat", "Erkek Saat"] },
    { rootSlug: "taki-aksesuar", iconName: iconByGroup.office, sortOrder: 130, name: "Saç Aksesuarı", children: ["Saç Tokası", "Taç"] }
  ];

  for (const row of exhaustiveRows) {
    const rootId = getRootId(row.rootSlug);
    await ensureCategoryL2WithChildren(rootId, row.rootSlug, {
      iconName: row.iconName,
      sortOrder: row.sortOrder,
      name: row.name,
      children: row.children
    });
  }

  // Minimal baseline store for normalized JSON / feed import (slug must match importer default).
  // No demo products, offers, or price history — catalog comes from import pipelines.
  await prisma.store.upsert({
    where: { slug: "trendyol" },
    create: { name: "Trendyol", slug: "trendyol" },
    update: { name: "Trendyol" }
  });
}

if (require.main === module) {
  main()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("Seed completed.");
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Seed failed", err);
      process.exit(1);
    });
}

