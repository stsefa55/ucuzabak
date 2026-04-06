# UcuzaBak.com Monorepo

UcuzaBak.com, Türkiye odaklı bir fiyat karşılaştırma ve affiliate platformu için monorepo yapısıdır.

Platform şu anda uçtan uca çalışan bir MVP durumundadır:

- Public web (arama, kategori, ürün detay, favoriler, fiyat alarmları)
- NestJS API (auth, katalog, arama, feed import, eşleştirme, affiliate redirect)
- BullMQ worker (feed import ve eşleştirme işleri)
- Admin alanı (dashboard, katalog yönetimi, feed importlar, eşleşmemiş ürünler, kullanıcılar, yorumlar, temel affiliate analytics)

## Yapı

- `apps/web` – Next.js (App Router) frontend
- `apps/api` – NestJS backend API
- `apps/worker` – BullMQ tabanlı worker servisi
- `packages/shared` – Ortak tipler, util fonksiyonları, sabitler
- `packages/config` – Ortak TypeScript, lint, format konfigürasyonları

## Geliştirme için Önkoşullar

- Node.js >= 18.18
- pnpm >= 9
- Docker ve Docker Compose

## Ortam Değişkenleri

Kök dizinde `.env.example` dosyası yer alır. Geliştirme için genelde aşağıdaki gibi kullanabilirsiniz:

```bash
cp .env.example .env
```

Önemli değişkenler:

- Veritabanı: `POSTGRES_*`, `DATABASE_URL`
- Redis: `REDIS_*`
- API: `API_PORT`, `API_JWT_*`, `AFFILIATE_IP_SALT`
- Web: `WEB_PORT`, `NEXT_PUBLIC_API_BASE_URL`
- Worker: `WORKER_NAME`

## İlk Kurulum

```bash
pnpm install
```

## Docker ile Çalıştırma (Geliştirme için hepsi bir arada)

Alt servisleri (PostgreSQL, Redis, MinIO, Mailhog, Elasticsearch) ve uygulamaları ayağa kaldırmak için:

```bash
docker compose up --build
```

Bu komut sonrasında:

- API: `http://localhost:4000`
  - Health: `http://localhost:4000/api/v1/health`
  - Swagger: `http://localhost:4000/api/v1/docs`
- Web: `http://localhost:3000`
- Mailhog UI: `http://localhost:8025`
- Elasticsearch (şu an opsiyonel): `http://localhost:9200`

> Not: Elasticsearch şu an arama için zorunlu değildir; arama Postgres üzerinden çalışır. Elasticsearch ileriki fazlarda devreye alınabilir.

Tek tanım: `docker-compose.yml`. Ortam değişkenleri kök `.env` ile verilir; varsayılanlar yerel geliştirme içindir (`NODE_ENV` ve `NEXT_PUBLIC_API_BASE_URL` için `docker-compose.yml` içindeki `${...:-...}` ifadelerine bakın). Prod sunucuda `NODE_ENV=production` ve gerçek `NEXT_PUBLIC_API_BASE_URL` değerlerini `.env` üzerinden ayarlayıp `docker compose up --build` kullanın.

Next.js istemci paketinde `NEXT_PUBLIC_*` değerleri **build** anında gömülür; web imajı `docker-compose.yml` içindeki `build.args` ile bu değeri alır.

## Lokal Geliştirme (Docker ile DB + Redis, uygulamalar lokal)

Önce Docker ile PostgreSQL ve Redis'i başlatın:

```bash
docker compose up -d postgres redis
```

Ardından ayrı terminallerde API, Web ve Worker'ı çalıştırın:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:worker
```

### Migrasyon ve Seed

İlk kez çalıştırırken veritabanını hazırlamak için:

```bash
cd apps/api
pnpm prisma:migrate
pnpm prisma:seed
```

Bu işlemler:

- Şemadaki tüm tabloları oluşturur
- Örnek kategoriler, markalar, mağazalar, ürünler, offers ve fiyat geçmişi ekler
- Bir admin ve bir normal kullanıcı oluşturur:
  - Admin: `admin@ucuzabak.com` / `Admin123!`
  - Kullanıcı: `user@ucuzabak.com` / `User123!`

### Feed Import ve Worker

Worker servisi BullMQ üzerinden feed import işlerini yürütür.

Önce worker'ı çalıştırın:

```bash
cd apps/worker
pnpm dev
```

Sample feed'leri kuyruğa eklemek için:

```bash
cd apps/worker
pnpm seed:feeds
```

Bu komut:

- `trendyol`, `hepsiburada`, `amazon` mağazalarını oluşturur (yoksa)
- `feeds/sample/` altındaki örnek XML/CSV/JSON feed dosyalarına karşılık gelen `FeedImport` kayıtlarını ekler
- Her biri için `feed-import` kuyruğuna job ekler

Çalışan worker bu job'ları işleyerek:

- Feed'den `StoreProduct` ve `Offer` kayıtları üretir/günceller
- Eşleştirme pipeline'ını çalıştırır
- Fiyat geçmişi ve ürün cache alanlarını günceller
- Gerekirse `UnmatchedProductReview` kuyruğuna kayıt açar

## Scriptler

Kök `package.json` üzerinden:

- `pnpm dev:api` – NestJS API development server
- `pnpm dev:web` – Next.js development server
- `pnpm dev:worker` – Worker development (BullMQ worker)
- `pnpm build:api`, `pnpm build:web`, `pnpm build:worker`
- `pnpm lint:api`, `pnpm lint:web`, `pnpm lint:worker`
- `pnpm migrate` – `apps/api` içinde Prisma migrate
- `pnpm seed` – `apps/api` içinde seed
- `pnpm test:api` – Backend (NestJS) testleri
- `pnpm test:web:e2e` – Frontend e2e testleri (Playwright)
- `pnpm test` – Hem backend hem frontend testlerini çalıştırır

`apps/api` içinde:

- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm prisma:seed`

`apps/worker` içinde:

- `pnpm seed:feeds` – Örnek feed import job'larını kuyruğa ekler

## Örnek Giriş Bilgileri

- **Admin kullanıcı**:
  - E-posta: `admin@ucuzabak.com`
  - Şifre: `Admin123!`
  - Admin panel: `http://localhost:3000/admin`

- **Normal kullanıcı**:
  - E-posta: `user@ucuzabak.com`
  - Şifre: `User123!`

## Özellik Özeti (Tamamlananlar)

- Monorepo yapılandırması (pnpm workspaces)
- Next.js App Router frontend (Türkçe UI, responsive)
- NestJS API (JWT auth, katalog, arama, feed import, eşleştirme)
- PostgreSQL + Prisma şeması (ürünler, kategoriler, markalar, mağazalar, teklifler, fiyat geçmişi, kullanıcılar, favoriler, fiyat alarmları, yorumlar, affiliate tıklamalar, feed importlar, eşleşmemiş ürün review kuyruğu)
- Redis + BullMQ ile feed import ve eşleştirme job'ları
- Public yüz:
  - Anasayfa
  - Kategori sayfaları
  - Ürün detay (teklifler, fiyat grafiği, favori, fiyat alarmı)
  - Arama sayfası (filtreler ve sıralama)
  - Favoriler / Fiyat alarmları sayfaları
  - Giriş / Kayıt akışı
- Admin alanı:
  - Dashboard (özet kartlar + affiliate klik analitiği)
  - Ürün / Kategori / Marka / Mağaza listeleri
  - Feed import listesi
  - Eşleşmemiş ürün inceleme kuyruğu
  - Kullanıcı listesi
  - Yorum listesi (read-only)
- Affiliate redirect akışı:
  - `/api/v1/out/:offerId` ile tıklama log'lama + mağazaya yönlendirme

## Gelecek / İyileştirme Alanları (Özet)

- Elasticsearch tabanlı gelişmiş arama ve autocomplete
- Admin üzerinden manuel eşleştirme aksiyonları (UnmatchedProductReview için)
- Yorum moderasyon aksiyonları (onay/red)
- Gelişmiş affiliate gelir/ dönüşüm takibi
- Daha detaylı rate limiting ve audit logging

