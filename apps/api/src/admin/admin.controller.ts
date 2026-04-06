import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  EmailDeliveryStatus,
  FeedStatus,
  FeedType,
  MatchStatus,
  OfferStatus,
  Prisma,
  ProductStatus,
  ReviewStatus,
  StoreStatus,
  UnmatchedStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { Throttle } from "@nestjs/throttler";
import { BannersService } from "../banners/banners.service";
import {
  canShowStorefrontListDiscountBadge,
  computeListDiscountPercent
} from "../common/offer-list-discount";
import { PaginationQueryDto } from "../common/pagination.dto";
import { EmailQueueService } from "../email/email-queue.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminProductsQueryDto } from "./dto/admin-products-query.dto";
import { AdminBrandsBulkService } from "./admin-brands-bulk.service";
import { BulkBrandsImportDto } from "./dto/bulk-brands-import.dto";
import { CreateAdminBrandDto } from "./dto/create-admin-brand.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { CreateStoreDto } from "./dto/create-store.dto";
import { ImportProductsCsvDto } from "./dto/import-products-csv.dto";
import { ManualFeedPasteDto, ManualFeedUploadFieldsDto } from "./dto/manual-feed-import.dto";
import { PatchUserEmailPreferencesDto } from "./dto/patch-user-email-preferences.dto";
import { SendBulkEmailDto } from "./dto/send-bulk-email.dto";
import { TestEmailDto } from "./dto/test-email.dto";
import { TestPriceAlertEmailDto } from "./dto/test-price-alert-email.dto";
import { UpdateStoreFeedDto } from "./dto/update-store-feed.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";
import {
  BANNER_IMAGE_MIMES,
  bannerImageMulterOptions,
  tryRemoveLocalBannerFile
} from "./banner-upload";
import { ManualFeedImportService } from "./manual-feed-import.service";
import { parse } from "csv-parse/sync";
import { Queue } from "bullmq";
import {
  bullmqConnectionProducer,
  slugifyCanonical,
  type BulkEmailBatchJobData,
  type PriceAlertEmailJobData,
  type ResetPasswordEmailJobData,
  type TestEmailJobData,
  type VerifyEmailJobData,
  type WelcomeEmailJobData
} from "@ucuzabak/shared";

type CanonicalCategoryRow = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  iconName: string | null;
  imageUrl: string | null;
  sortOrder: number | null;
  isActive: boolean;
};

@ApiTags("admin")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bannersService: BannersService,
    private readonly emailQueue: EmailQueueService,
    private readonly manualFeedImport: ManualFeedImportService,
    private readonly brandsBulk: AdminBrandsBulkService
  ) {}

  /** Üretimde admin e-posta test uçları kapalı (keşfi zorlaştırmak için 404). */
  private ensureAdminEmailTestsEnabled(): void {
    if (process.env.NODE_ENV === "production") {
      throw new NotFoundException();
    }
  }

  @Get("dashboard/summary")
  @ApiOkResponse({ description: "Admin dashboard özet kartları" })
  async getDashboardSummary() {
    const [products, stores, feedImports, unmatchedPending, users] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.store.count(),
      this.prisma.feedImport.count(),
      this.prisma.unmatchedProductReview.count({
        where: { status: UnmatchedStatus.PENDING }
      }),
      this.prisma.user.count()
    ]);

    return {
      totalProducts: products,
      totalStores: stores,
      totalFeedImports: feedImports,
      pendingUnmatchedReviews: unmatchedPending,
      totalUsers: users
    };
  }

  @Post("test-email")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "E-posta kuyruğuna test işi ekler (worker SMTP gönderir)" })
  async testEmail(@Req() req: Request, @Body() body: TestEmailDto) {
    this.ensureAdminEmailTestsEnabled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (req as any).user as { email?: string } | undefined;
    const to = body.to?.trim() || payload?.email?.trim();
    if (!to) {
      throw new BadRequestException("Alıcı için `to` gönderin veya JWT içinde e-posta bulunsun.");
    }
    await this.emailQueue.enqueueTestEmail({ to });
    return { ok: true, queuedFor: to };
  }

  @Post("test-price-alert-email")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Örnek fiyat alarmı e-postasını kuyruğa ekler" })
  async testPriceAlertEmail(@Body() body: TestPriceAlertEmailDto) {
    this.ensureAdminEmailTestsEnabled();
    const product = await this.prisma.product.findUnique({
      where: { id: body.productId },
      select: { name: true, slug: true, lowestPriceCache: true }
    });
    if (!product) {
      throw new NotFoundException("Ürün bulunamadı.");
    }
    const price =
      body.price?.trim() ||
      (product.lowestPriceCache != null ? String(product.lowestPriceCache) : null);
    if (!price) {
      throw new BadRequestException("Ürünün fiyatı yok; `price` gönderin.");
    }
    const targetPrice = body.targetPrice?.trim() || price;
    await this.emailQueue.enqueuePriceAlert({
      to: body.to.trim(),
      productName: product.name,
      productSlug: product.slug,
      price,
      currency: "TRY",
      targetPrice
    });
    return { ok: true, queuedFor: body.to.trim(), productId: body.productId };
  }

  @Get("products")
  @ApiOkResponse({ description: "Ürün yönetimi listesi" })
  async getProducts(@Query() query: AdminProductsQueryDto) {
    const page = Number(query.page ?? 1) || 1;
    const pageSize = Number(query.pageSize ?? 20) || 20;

    const where: Prisma.ProductWhereInput = {};
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } }
      ];
    }
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          brand: true,
          category: true
        }
      }),
      this.prisma.product.count({ where })
    ]);

    return { items, total, page, pageSize };
  }

  @Post("products")
  @ApiOkResponse({ description: "Yeni ürün oluşturma" })
  async createProduct(@Body() body: CreateProductDto) {
    const normalizedSlug = slugifyCanonical(body.slug ?? "");
    if (!normalizedSlug) {
      throw new BadRequestException("Geçerli bir slug zorunludur.");
    }
    const product = await this.prisma.product.create({
      data: {
        name: body.name,
        slug: normalizedSlug,
        brandId: body.brandId,
        categoryId: body.categoryId,
        ean: body.ean,
        modelNumber: body.modelNumber,
        mainImageUrl: body.mainImageUrl,
        description: body.description,
        specsJson: body.specsJson as unknown as Prisma.InputJsonValue
      }
    });

    // Opsiyonel ilk teklif (offer) oluşturma
    if (body.initialOfferStoreId && body.initialOfferPrice) {
      const priceNumber = Number(String(body.initialOfferPrice).replace(",", "."));
      if (!Number.isNaN(priceNumber) && priceNumber > 0) {
        await this.prisma.$transaction(async (tx) => {
          const store = await tx.store.findUnique({
            where: { id: body.initialOfferStoreId }
          });
          if (!store) {
            return;
          }

          const storeProduct = await tx.storeProduct.create({
            data: {
              storeId: store.id,
              productId: product.id,
              externalId: `ADMIN-${product.id}-${Date.now()}`,
              title: product.name,
              url: store.websiteUrl ?? body.initialOfferAffiliateUrl ?? "#",
              ean: product.ean ?? undefined,
              modelNumber: product.modelNumber ?? undefined,
              specsJson: product.specsJson ?? undefined
            }
          });

          await tx.offer.create({
            data: {
              productId: product.id,
              storeId: store.id,
              storeProductId: storeProduct.id,
              currentPrice: new Prisma.Decimal(priceNumber.toFixed(2)),
              originalPrice: null,
              inStock: body.initialOfferInStock ?? true,
              affiliateUrl: body.initialOfferAffiliateUrl ?? undefined
            }
          });
        });
      }
    }

    return product;
  }

  @Post("products/import-csv")
  @ApiOkResponse({ description: "CSV ile toplu ürün importu" })
  async importProductsFromCsv(@Body() body: ImportProductsCsvDto) {
    const trimmed = body.csv.trim();
    if (!trimmed) {
      return { createdCount: 0, skippedCount: 0, failedCount: 0, errors: [] };
    }

    let records: Record<string, string>[];
    try {
      records = parse(trimmed, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];
    } catch {
      return {
        createdCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [{ row: 1, message: "CSV içeriği parse edilemedi. Lütfen formatı kontrol edin." }]
      };
    }

    if (records.length === 0) {
      return { createdCount: 0, skippedCount: 0, failedCount: 0, errors: [] };
    }

    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    recordsLoop: for (let i = 0; i < records.length; i++) {
      const rowNumber = i + 2; // header + 1-based
      const record = records[i] || {};

      const name = (record.name || "").trim();
      const slug = slugifyCanonical((record.slug || "").trim());
      const brandSlugOrName = (record.brand || "").trim();
      const categorySlugOrName = (record.category || "").trim();
      const ean = (record.ean || "").trim();
      const modelNumber = (record.modelNumber || "").trim();
      const mainImageUrl = (record.mainImageUrl || "").trim();
      const description = (record.description || "").trim();
      const specsJsonRaw = (record.specsJson || "").trim();

      if (!name || !slug) {
        skippedCount++;
        errors.push({ row: rowNumber, message: "name veya slug eksik olduğu için satır atlandı." });
        continue;
      }

      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (existing) {
        skippedCount++;
        errors.push({ row: rowNumber, message: `Slug zaten mevcut: ${slug}` });
        continue;
      }

      let brandId: number | undefined;
      if (brandSlugOrName) {
        const brand = await this.prisma.brand.findFirst({
          where: {
            OR: [{ slug: brandSlugOrName }, { name: brandSlugOrName }]
          }
        });
        if (!brand) {
          skippedCount++;
          errors.push({ row: rowNumber, message: `Marka bulunamadı: ${brandSlugOrName}` });
          continue;
        }
        brandId = brand.id;
      }

      let categoryId: number | undefined;
      if (categorySlugOrName) {
        const category = await this.prisma.category.findFirst({
          where: {
            OR: [{ slug: categorySlugOrName }, { name: categorySlugOrName }]
          }
        });
        if (!category) {
          skippedCount++;
          errors.push({ row: rowNumber, message: `Kategori bulunamadı: ${categorySlugOrName}` });
          continue;
        }
        categoryId = category.id;
      }

      let specsJson: Prisma.JsonValue | undefined;
      if (specsJsonRaw) {
        try {
          const parsed = JSON.parse(specsJsonRaw);
          if (parsed && typeof parsed === "object") {
            specsJson = parsed as Prisma.JsonValue;
          } else {
            throw new Error("invalid");
          }
        } catch {
          failedCount++;
          errors.push({ row: rowNumber, message: "specsJson JSON olarak parse edilemedi." });
          continue;
        }
      }

      try {
        await this.prisma.product.create({
          data: {
            name,
            slug,
            brandId,
            categoryId,
            ean: ean || undefined,
            modelNumber: modelNumber || undefined,
            mainImageUrl: mainImageUrl || undefined,
            description: description || undefined,
            specsJson: specsJson as unknown as Prisma.InputJsonValue
          }
        });
        createdCount++;
      } catch {
        failedCount++;
        errors.push({ row: rowNumber, message: "Bilinmeyen bir hata nedeniyle ürün oluşturulamadı." });
      }
    }

    return { createdCount, skippedCount, failedCount, errors };
  }

  @Post("stores/:id/import-feed")
  @ApiOkResponse({ description: "Mağaza feed import işlemini başlatır" })
  async triggerStoreFeedImport(@Param("id") id: string) {
    const storeId = Number(id);
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });

    if (!store) {
      throw new NotFoundException("Mağaza bulunamadı.");
    }

    if (!store.feedUrl) {
      throw new BadRequestException("Bu mağaza için feedUrl tanımlı değil.");
    }

    if (store.status !== StoreStatus.ACTIVE || store.feedIsActive === false) {
      throw new BadRequestException("Bu mağaza için feed import şu anda aktif değil.");
    }

    const feedImport = await this.prisma.feedImport.create({
      data: {
        storeId,
        type: FeedType.XML,
        status: FeedStatus.PENDING,
        sourceRef: store.feedUrl
      }
    });

    const queue = new Queue("feed-import", {
      connection: bullmqConnectionProducer()
    });

    await queue.add("feed-import", { feedImportId: feedImport.id });
    await queue.close();

    return {
      id: feedImport.id,
      status: feedImport.status
    };
  }

  @Post("stores/:id/manual-feed-import/upload")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 15, ttl: 600_000 } })
  @ApiConsumes("multipart/form-data")
  @ApiOkResponse({ description: "Yüklenen dosyadan feed import kuyruğa alınır (worker işler)" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir =
            process.env.FEED_IMPORT_UPLOAD_DIR?.trim() ||
            path.join(process.cwd(), "data", "feed-imports");
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || ".dat";
          cb(null, `manual-upload-${Date.now()}-${randomBytes(4).toString("hex")}${ext}`);
        }
      }),
      limits: { fileSize: 100 * 1024 * 1024 }
    })
  )
  async manualFeedImportUpload(
    @Param("id") id: string,
    @Body() fields: ManualFeedUploadFieldsDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const storeId = Number(id);
    if (!file?.path) {
      throw new BadRequestException("Dosya (file) alanı gerekli.");
    }
    return this.manualFeedImport.enqueueFeedImport(storeId, fields.feedType, file.path);
  }

  @Post("stores/:id/manual-feed-import/paste")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 15, ttl: 600_000 } })
  @ApiOkResponse({ description: "Yapıştırılan ham içerik dosyaya yazılır ve import kuyruğa alınır" })
  async manualFeedImportPaste(@Param("id") id: string, @Body() body: ManualFeedPasteDto) {
    const storeId = Number(id);
    const savedPath = await this.manualFeedImport.savePastedContent(body.feedType, body.content);
    return this.manualFeedImport.enqueueFeedImport(storeId, body.feedType, savedPath);
  }

  @Get("products/:id")
  @ApiOkResponse({ description: "Tekil ürün detayı (admin)" })
  async getProductById(@Param("id") id: string) {
    const productId = Number(id);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        category: true,
        productImages: { orderBy: { position: "asc" } }
      }
    });
    return product;
  }

  @Get("products/:id/offers")
  @ApiOkResponse({ description: "Ürüne ait teklifler (admin)" })
  async getProductOffers(@Param("id") id: string) {
    const productId = Number(id);
    const offers = await this.prisma.offer.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: {
        store: true,
        storeProduct: true
      }
    });
    return offers.map((o) => {
      const current = Number(o.currentPrice);
      const orig = o.originalPrice != null ? Number(o.originalPrice) : null;
      const listDiscountPercent =
        orig != null && orig > current && orig > 0 ? computeListDiscountPercent(current, orig) : null;
      const storefrontListDiscountEligible = canShowStorefrontListDiscountBadge({
        status: o.status,
        currentPrice: current,
        originalPrice: orig,
        lastSeenAt: o.lastSeenAt,
        updatedAt: o.updatedAt
      });
      return {
        ...o,
        listDiscountPercent,
        storefrontListDiscountEligible
      };
    });
  }

  @Get("products/:id/images")
  @ApiOkResponse({ description: "Ürüne ait görseller (admin)" })
  async getProductImages(@Param("id") id: string) {
    const productId = Number(id);
    await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" }
    });
  }

  @Post("products/:id/images")
  @ApiOkResponse({ description: "Ürüne görsel ekle" })
  async addProductImage(
    @Param("id") id: string,
    @Body() body: { imageUrl: string }
  ) {
    const productId = Number(id);
    const url = (body.imageUrl ?? "").trim();
    if (!url) throw new BadRequestException("imageUrl zorunludur.");
    await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const maxPos = await this.prisma.productImage.aggregate({
      where: { productId },
      _max: { position: true }
    });
    const position = (maxPos._max.position ?? -1) + 1;
    return this.prisma.productImage.create({
      data: { productId, imageUrl: url, position }
    });
  }

  @Delete("products/:id/images/:imageId")
  @ApiOkResponse({ description: "Ürün görselini sil" })
  async deleteProductImage(
    @Param("id") id: string,
    @Param("imageId") imageId: string
  ) {
    const productId = Number(id);
    const imgId = Number(imageId);
    if (!Number.isInteger(imgId)) throw new BadRequestException("Geçersiz görsel ID.");
    await this.prisma.productImage.findFirstOrThrow({
      where: { id: imgId, productId }
    });
    return this.prisma.productImage.delete({ where: { id: imgId } });
  }

  @Patch("products/:id/images/reorder")
  @ApiOkResponse({ description: "Görsel sırasını güncelle" })
  async reorderProductImages(
    @Param("id") id: string,
    @Body() body: { imageIds: number[] }
  ) {
    const productId = Number(id);
    if (!Array.isArray(body.imageIds)) throw new BadRequestException("imageIds dizisi gerekli.");
    await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const updates = body.imageIds.map((imageId, index) =>
      this.prisma.productImage.updateMany({
        where: { id: imageId, productId },
        data: { position: index }
      })
    );
    await this.prisma.$transaction(updates);
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" }
    });
  }

  private async recomputeProductCache(productId: number) {
    const activeOffers = await this.prisma.offer.findMany({
      where: { productId, status: OfferStatus.ACTIVE },
      orderBy: { currentPrice: "asc" }
    });
    const lastHistory = activeOffers.length > 0
      ? await this.prisma.priceHistory.findFirst({
          where: { offerId: { in: activeOffers.map((o) => o.id) } },
          orderBy: { recordedAt: "desc" }
        })
      : null;
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        lowestPriceCache: activeOffers.length > 0 ? activeOffers[0].currentPrice : null,
        lowestPriceStoreId: activeOffers.length > 0 ? activeOffers[0].storeId : null,
        offerCountCache: activeOffers.length,
        lastPriceUpdatedAt: lastHistory?.recordedAt ?? null
      }
    });
  }

  @Patch("offers/:id")
  @ApiOkResponse({ description: "Teklif güncelleme (fiyat, stok, affiliate, durum)" })
  async updateOffer(
    @Param("id") id: string,
    @Body()
    body: {
      currentPrice?: number | string;
      inStock?: boolean;
      affiliateUrl?: string | null;
      status?: OfferStatus;
    }
  ) {
    const offerId = Number(id);
    const existing = await this.prisma.offer.findUniqueOrThrow({ where: { id: offerId } });
    const data: Prisma.OfferUpdateInput = {};
    if (body.currentPrice !== undefined) {
      const n = Number(String(body.currentPrice).replace(",", "."));
      if (!Number.isFinite(n) || n < 0) throw new BadRequestException("Geçerli bir fiyat giriniz.");
      data.currentPrice = new Prisma.Decimal(n.toFixed(2));
    }
    if (body.inStock !== undefined) data.inStock = body.inStock;
    if (body.affiliateUrl !== undefined) data.affiliateUrl = body.affiliateUrl || null;
    if (body.status !== undefined) data.status = body.status;
    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data,
      include: { store: true, storeProduct: true }
    });
    await this.recomputeProductCache(existing.productId);
    return updated;
  }

  @Post("products/:id/offers")
  @ApiOkResponse({ description: "Ürüne manuel teklif ekleme veya mevcut teklifi güncelleme" })
  async addProductOffer(
    @Param("id") id: string,
    @Body() body: { storeId: number; currentPrice: number | string; inStock?: boolean; affiliateUrl?: string | null }
  ) {
    const productId = Number(id);
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { brand: true, category: true }
    });
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: body.storeId }
    });
    const priceNum = Number(String(body.currentPrice).replace(",", "."));
    if (!Number.isFinite(priceNum) || priceNum < 0) throw new BadRequestException("Geçerli bir fiyat giriniz.");

    const existingOffer = await this.prisma.offer.findFirst({
      where: { productId, storeId: body.storeId },
      include: { store: true, storeProduct: true }
    });

    if (existingOffer) {
      const updated = await this.prisma.offer.update({
        where: { id: existingOffer.id },
        data: {
          currentPrice: new Prisma.Decimal(priceNum.toFixed(2)),
          originalPrice: existingOffer.originalPrice ?? new Prisma.Decimal(priceNum.toFixed(2)),
          inStock: body.inStock ?? existingOffer.inStock,
          affiliateUrl: body.affiliateUrl !== undefined ? body.affiliateUrl : existingOffer.affiliateUrl,
          status: OfferStatus.ACTIVE
        },
        include: { store: true, storeProduct: true }
      });
      await this.recomputeProductCache(productId);
      return updated;
    }

    const externalId = `admin-${productId}-${body.storeId}-${Date.now()}`;
    const storeProduct = await this.prisma.storeProduct.create({
      data: {
        storeId: body.storeId,
        externalId,
        title: product.name,
        url: store.websiteUrl ?? "#",
        productId,
        matchStatus: MatchStatus.MANUAL_MATCHED,
        matchScore: 100
      }
    });
    const offer = await this.prisma.offer.create({
      data: {
        productId,
        storeId: body.storeId,
        storeProductId: storeProduct.id,
        currentPrice: new Prisma.Decimal(priceNum.toFixed(2)),
        originalPrice: new Prisma.Decimal(priceNum.toFixed(2)),
        currency: "TRY",
        inStock: body.inStock ?? true,
        affiliateUrl: body.affiliateUrl ?? null
      },
      include: { store: true, storeProduct: true }
    });
    await this.recomputeProductCache(productId);
    return offer;
  }

  @Get("categories")
  @ApiOkResponse({ description: "Kategori listesi" })
  async getCategories() {
    // Prisma client eski şemada kaldıysa (isActive/sortOrder/iconName alanları tanınmıyorsa) hata veriyor.
    // Admin ekranı için canonical alanları DB'den raw SQL ile çekiyoruz.
    return this.prisma.$queryRaw<CanonicalCategoryRow[]>(Prisma.sql`
      SELECT
        id,
        name,
        slug,
        "parentId",
        "iconName",
        "imageUrl",
        "sortOrder",
        "isActive"
      FROM "Category"
      ORDER BY
        "sortOrder" ASC NULLS LAST,
        "position" ASC,
        "name" ASC;
    `);
  }

  @Post("categories")
  @ApiOkResponse({ description: "Yeni kategori oluşturma" })
  async createCategory(
    @Body()
    body: {
      name: string;
      slug: string;
      parentId?: number | null;
      iconName?: string | null;
      imageUrl?: string | null;
      sortOrder?: number | null;
      isActive?: boolean;
    }
  ) {
    const slug = (body.slug ?? "").trim();
    if (!slug) throw new BadRequestException("slug zorunludur.");
    const name = (body.name ?? "").trim();
    if (!name) throw new BadRequestException("name zorunludur.");

    try {
      const parentId =
        body.parentId === null || body.parentId === undefined ? null : Number(body.parentId);
      const sortOrder =
        body.sortOrder === null || body.sortOrder === undefined ? null : Number(body.sortOrder);

      return await this.prisma.$queryRaw<CanonicalCategoryRow[]>(Prisma.sql`
        INSERT INTO "Category" ("name", "slug", "parentId", "iconName", "imageUrl", "sortOrder", "isActive", "position")
        VALUES (
          ${name},
          ${slug},
          ${parentId},
          ${body.iconName ?? null},
          ${body.imageUrl ?? null},
          ${sortOrder},
          ${body.isActive ?? true},
          0
        )
        RETURNING
          id,
          name,
          slug,
          "parentId",
          "iconName",
          "imageUrl",
          "sortOrder",
          "isActive";
      `);
    } catch (err) {
      throw new BadRequestException(`Kategori oluşturulamadı: ${(err as Error).message ?? String(err)}`);
    }
  }

  @Patch("categories/:id")
  @ApiOkResponse({ description: "Kategori güncelleme" })
  async updateCategory(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      parentId?: number | null;
      iconName?: string | null;
      imageUrl?: string | null;
      sortOrder?: number | null;
      isActive?: boolean;
    }
  ) {
    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) throw new BadRequestException("Geçersiz id.");

    try {
      const setFragments: Prisma.Sql[] = [];

      if (body.name !== undefined) setFragments.push(Prisma.sql`"name" = ${body.name.trim()}`);
      if (body.slug !== undefined) setFragments.push(Prisma.sql`"slug" = ${body.slug.trim()}`);
      if (body.parentId !== undefined) {
        const v = body.parentId === null ? null : Number(body.parentId);
        setFragments.push(Prisma.sql`"parentId" = ${v}`);
      }
      if (body.iconName !== undefined) setFragments.push(Prisma.sql`"iconName" = ${body.iconName}`);
      if (body.imageUrl !== undefined) setFragments.push(Prisma.sql`"imageUrl" = ${body.imageUrl}`);
      if (body.sortOrder !== undefined) {
        const v = body.sortOrder === null ? null : Number(body.sortOrder);
        setFragments.push(Prisma.sql`"sortOrder" = ${v}`);
      }
      if (body.isActive !== undefined) setFragments.push(Prisma.sql`"isActive" = ${body.isActive}`);

      if (setFragments.length === 0) {
        return await this.prisma.$queryRaw<CanonicalCategoryRow[]>(Prisma.sql`
          SELECT
            id,
            name,
            slug,
            "parentId",
            "iconName",
            "imageUrl",
            "sortOrder",
            "isActive"
          FROM "Category"
          WHERE id = ${categoryId}
          LIMIT 1;
        `);
      }

      return await this.prisma.$queryRaw<CanonicalCategoryRow[]>(Prisma.sql`
        UPDATE "Category"
        SET ${Prisma.join(setFragments, ", ")}
        WHERE id = ${categoryId}
        RETURNING
          id,
          name,
          slug,
          "parentId",
          "iconName",
          "imageUrl",
          "sortOrder",
          "isActive";
      `);
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      throw new BadRequestException(`Kategori güncellenemedi: ${msg}`);
    }
  }

  @Get("brands")
  @ApiOkResponse({ description: "Marka listesi" })
  async getBrands() {
    return this.prisma.brand.findMany({
      orderBy: { name: "asc" }
    });
  }

  @Post("brands")
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: "Yeni canonical marka (feed sıkı eşleşmesi için adı feed ile uyumlu tutun)" })
  async createBrand(@Body() body: CreateAdminBrandDto) {
    const name = body.name.trim();
    if (name.length < 2) {
      throw new BadRequestException("Marka adı en az 2 karakter olmalıdır.");
    }
    const slug = body.slug?.trim()
      ? slugifyCanonical(body.slug.trim())
      : slugifyCanonical(name);
    if (!slug) {
      throw new BadRequestException("Geçerli bir slug üretilemedi.");
    }
    try {
      return await this.prisma.brand.create({
        data: {
          name,
          slug
        }
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Bu slug zaten kullanılıyor.");
      }
      throw e;
    }
  }

  @Post("brands/bulk")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({
    description:
      "Toplu marka önizleme veya içe aktarma. dryRun atlanırsa veya true ise yalnızca rapor; false ile kayıt oluşturur."
  })
  async bulkBrands(@Body() body: BulkBrandsImportDto) {
    const dryRun = body.dryRun !== false;
    return this.brandsBulk.run(body.format, body.text, dryRun);
  }

  @Get("stores")
  @ApiOkResponse({ description: "Mağaza listesi" })
  async getStores() {
    return this.prisma.store.findMany({
      orderBy: { name: "asc" }
    });
  }

  @Post("stores")
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: "Yeni mağaza" })
  async createStore(@Body() body: CreateStoreDto) {
    const slug = slugifyCanonical(body.slug);
    if (!slug) {
      throw new BadRequestException("Geçerli bir slug zorunludur.");
    }
    try {
      return await this.prisma.store.create({
        data: {
          name: body.name.trim(),
          slug,
          logoUrl: body.logoUrl?.trim() || null,
          websiteUrl: body.websiteUrl?.trim() || null,
          status: body.status ?? StoreStatus.ACTIVE
        }
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Bu slug zaten kullanılıyor.");
      }
      throw e;
    }
  }

  @Patch("stores/:id")
  @ApiOkResponse({ description: "Mağaza güncelleme" })
  async updateStore(@Param("id") id: string, @Body() body: UpdateStoreDto) {
    const storeId = Number(id);
    const existing = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!existing) {
      throw new NotFoundException("Mağaza bulunamadı.");
    }
    const data: Prisma.StoreUpdateInput = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.slug !== undefined) {
      const s = slugifyCanonical(body.slug);
      if (!s) throw new BadRequestException("Geçerli bir slug giriniz.");
      data.slug = s;
    }
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl?.trim() || null;
    if (body.websiteUrl !== undefined) data.websiteUrl = body.websiteUrl?.trim() || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.feedUrl !== undefined) data.feedUrl = body.feedUrl?.trim() || null;
    if (body.feedIsActive !== undefined) data.feedIsActive = body.feedIsActive;
    if (body.feedImportIntervalLabel !== undefined) {
      data.feedImportIntervalLabel = body.feedImportIntervalLabel?.trim() || null;
    }
    if (body.affiliateDefaultTemplate !== undefined) {
      data.affiliateDefaultTemplate = body.affiliateDefaultTemplate?.trim() || null;
    }
    try {
      return await this.prisma.store.update({
        where: { id: storeId },
        data
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Bu slug zaten kullanılıyor.");
      }
      throw e;
    }
  }

  @Delete("stores/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Mağaza silme (bağımlılık yoksa)" })
  async deleteStore(@Param("id") id: string) {
    const storeId = Number(id);
    const existing = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!existing) {
      throw new NotFoundException("Mağaza bulunamadı.");
    }
    const [sp, off, fi] = await Promise.all([
      this.prisma.storeProduct.count({ where: { storeId } }),
      this.prisma.offer.count({ where: { storeId } }),
      this.prisma.feedImport.count({ where: { storeId } })
    ]);
    if (sp > 0) {
      throw new ConflictException(
        `Bu mağazada ${sp} mağaza ürün kaydı var; silmek için önce verileri temizleyin.`,
      );
    }
    if (off > 0) {
      throw new ConflictException("Mağazaya bağlı teklif kayıtları var; silinemez.");
    }
    if (fi > 0) {
      throw new ConflictException("Feed import geçmişi var; silinemez.");
    }
    await this.prisma.store.delete({ where: { id: storeId } });
    return { ok: true };
  }

  @Get("email/bulk-quota")
  @ApiOkResponse({ description: "Toplu e-posta günlük kota ve ortam bayrakları" })
  async getBulkEmailQuota() {
    const maxRaw = process.env.BULK_EMAIL_MAX_RECIPIENTS_PER_DAY;
    const maxPerDay = maxRaw === undefined || maxRaw === "" ? 10_000 : Number(maxRaw);
    const limitActive = Number.isFinite(maxPerDay) && maxPerDay > 0;
    const day = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
    );
    const row = await this.prisma.bulkEmailQuotaDay.findUnique({ where: { day } });
    const used = row?.queuedCount ?? 0;
    const envTest =
      process.env.BULK_EMAIL_TEST_MODE === "true" || process.env.BULK_EMAIL_TEST_MODE === "1";
    const [marketingOptOutCount, bulkEligibleVerified] = await Promise.all([
      this.prisma.user.count({
        where: { status: UserStatus.ACTIVE, marketingEmailOptIn: false }
      }),
      this.prisma.user.count({
        where: { status: UserStatus.ACTIVE, marketingEmailOptIn: true, emailVerified: true }
      })
    ]);
    return {
      limitActive,
      maxPerDay: limitActive ? Math.floor(maxPerDay) : null,
      usedToday: used,
      remaining: limitActive ? Math.max(0, Math.floor(maxPerDay) - used) : null,
      testModeDefault: envTest,
      confirmPhraseRequired: Boolean(process.env.BULK_EMAIL_CONFIRM_PHRASE?.trim()),
      marketingOptOutCount,
      bulkEligibleVerifiedCount: bulkEligibleVerified,
      note:
        "Toplu e-posta yalnızca marketingEmailOptIn=true kullanıcılara gider; şifre sıfırlama vb. işlemsel e-postalar etkilenmez."
    };
  }

  @Post("email/send-bulk")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @ApiOkResponse({ description: "Toplu e-postayı kuyruğa batch’ler halinde ekler" })
  async sendBulkEmail(@Req() req: Request, @Body() body: SendBulkEmailDto) {
    const envPhrase = process.env.BULK_EMAIL_CONFIRM_PHRASE?.trim();
    if (envPhrase && (body.confirmPhrase ?? "").trim() !== envPhrase) {
      throw new BadRequestException("Onay ifadesi eksik veya hatalı (BULK_EMAIL_CONFIRM_PHRASE).");
    }
    if (body.confirmSend !== true) {
      throw new BadRequestException("confirmSend: true gerekli.");
    }

    const jwt = (req as Request & { user?: { sub?: number; email?: string } }).user;
    const envTest =
      process.env.BULK_EMAIL_TEST_MODE === "true" || process.env.BULK_EMAIL_TEST_MODE === "1";
    const testMode = body.testMode === true || envTest;

    let emails: string[];
    if (testMode) {
      const fromEnv = (process.env.BULK_EMAIL_TEST_RECIPIENTS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const adminEmail = jwt?.email?.trim().toLowerCase();
      emails = [...new Set(fromEnv.length > 0 ? fromEnv : adminEmail ? [adminEmail] : [])];
      if (emails.length === 0) {
        throw new BadRequestException(
          "Test modu: BULK_EMAIL_TEST_RECIPIENTS tanımlayın veya oturumda e-posta olsun.",
        );
      }
    } else {
      const where: Prisma.UserWhereInput = {
        status: UserStatus.ACTIVE,
        marketingEmailOptIn: true
      };
      if (body.target === "verified_only") {
        where.emailVerified = true;
      }
      const users = await this.prisma.user.findMany({
        where,
        select: { email: true }
      });
      emails = [...new Set(users.map((u) => u.email.trim().toLowerCase()).filter(Boolean))];
    }

    const maxRaw = process.env.BULK_EMAIL_MAX_RECIPIENTS_PER_DAY;
    const maxPerDay = maxRaw === undefined || maxRaw === "" ? 10_000 : Number(maxRaw);
    const limitActive = Number.isFinite(maxPerDay) && maxPerDay > 0;
    const day = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
    );

    if (limitActive) {
      await this.prisma.$transaction(async (tx) => {
        const row = await tx.bulkEmailQuotaDay.findUnique({ where: { day } });
        const cur = row?.queuedCount ?? 0;
        const cap = Math.floor(maxPerDay);
        if (cur + emails.length > cap) {
          throw new BadRequestException(
            `Günlük toplu e-posta üst sınırı (${cap}) aşılır. Bugün kuyrukta: ${cur}.`,
          );
        }
        await tx.bulkEmailQuotaDay.upsert({
          where: { day },
          create: { day, queuedCount: emails.length },
          update: { queuedCount: { increment: emails.length } }
        });
      });
    }

    const batchSizeRaw = Number(process.env.BULK_EMAIL_BATCH_SIZE ?? "25");
    const batchSize = Math.min(200, Math.max(5, Number.isFinite(batchSizeRaw) ? Math.floor(batchSizeRaw) : 25));
    let batches = 0;
    try {
      for (let i = 0; i < emails.length; i += batchSize) {
        const chunk = emails.slice(i, i + batchSize);
        await this.emailQueue.enqueueBulkEmailBatch({
          recipients: chunk,
          subject: body.subject.trim(),
          html: body.html,
          text: body.text?.trim() || undefined
        });
        batches++;
      }
    } catch (e: unknown) {
      if (limitActive) {
        try {
          await this.prisma.bulkEmailQuotaDay.update({
            where: { day },
            data: { queuedCount: { decrement: emails.length } }
          });
        } catch {
          /* kota satırı yoksa yut */
        }
      }
      throw e;
    }

    return {
      ok: true,
      queuedRecipients: emails.length,
      batches,
      testMode
    };
  }

  @Patch("stores/:id/feed")
  @ApiOkResponse({ description: "Mağaza feed ayarlarını güncelleme" })
  async updateStoreFeed(@Param("id") id: string, @Body() body: UpdateStoreFeedDto) {
    const storeId = Number(id);

    const data: Prisma.StoreUpdateInput = {};
    if (body.feedUrl !== undefined) {
      data.feedUrl = body.feedUrl || null;
    }
    if (body.feedIsActive !== undefined) {
      data.feedIsActive = body.feedIsActive;
    }
    if (body.feedImportIntervalLabel !== undefined) {
      data.feedImportIntervalLabel = body.feedImportIntervalLabel || null;
    }

    return this.prisma.store.update({
      where: { id: storeId },
      data
    });
  }

  @Patch("products/:id")
  @ApiOkResponse({ description: "Ürün güncelleme (admin)" })
  async updateProduct(@Param("id") id: string, @Body() body: Partial<CreateProductDto>) {
    const productId = Number(id);

    const data: Prisma.ProductUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) {
      const normalizedSlug = slugifyCanonical(body.slug);
      if (!normalizedSlug) throw new BadRequestException("Geçerli bir slug giriniz.");
      data.slug = normalizedSlug;
    }
    if (body.brandId !== undefined) data.brand = body.brandId ? { connect: { id: body.brandId } } : { disconnect: true };
    if (body.categoryId !== undefined) data.category = body.categoryId ? { connect: { id: body.categoryId } } : { disconnect: true };
    if (body.ean !== undefined) data.ean = body.ean;
    if (body.modelNumber !== undefined) data.modelNumber = body.modelNumber;
    if (body.mainImageUrl !== undefined) data.mainImageUrl = body.mainImageUrl;
    if (body.description !== undefined) data.description = body.description;
    if (body.specsJson !== undefined) {
      data.specsJson =
        body.specsJson === null ? Prisma.JsonNull : (body.specsJson as unknown as Prisma.InputJsonValue);
    }
    if ((body as { status?: ProductStatus }).status !== undefined) {
      data.status = (body as { status?: ProductStatus }).status as ProductStatus;
    }
    if ((body as { isFeatured?: boolean }).isFeatured !== undefined) {
      data.isFeatured = Boolean((body as { isFeatured?: boolean }).isFeatured);
    }
    if ((body as { featuredSortOrder?: number }).featuredSortOrder !== undefined) {
      const o = (body as { featuredSortOrder?: number }).featuredSortOrder;
      const n = typeof o === "number" ? o : Number(o);
      if (!Number.isFinite(n) || n < 0) {
        throw new BadRequestException("featuredSortOrder geçerli bir negatif olmayan sayı olmalıdır.");
      }
      data.featuredSortOrder = Math.floor(n);
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data,
      include: {
        brand: true,
        category: true
      }
    });

    return product;
  }

  @Get("feed-imports/:importId")
  @ApiOkResponse({ description: "Tekil feed import kaydı (durum / sayaçlar)" })
  async getFeedImportById(@Param("importId") importId: string) {
    const fid = Number(importId);
    const row = await this.prisma.feedImport.findUnique({
      where: { id: fid },
      include: { store: { select: { id: true, name: true, slug: true } } }
    });
    if (!row) {
      throw new NotFoundException("Feed import bulunamadı.");
    }
    return row;
  }

  @Get("feed-imports")
  @ApiOkResponse({ description: "Feed import listesi" })
  async getFeedImports(
    @Query() query: PaginationQueryDto & { status?: FeedStatus }
  ) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 100);
    const where = query.status ? { status: query.status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.feedImport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { store: true }
      }),
      this.prisma.feedImport.count({ where })
    ]);

    return { items, total, page, pageSize };
  }

  @Get("unmatched-reviews")
  @ApiOkResponse({ description: "Eşleşmemiş ürün inceleme kuyruğu" })
  async getUnmatchedReviews(@Query() query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.unmatchedProductReview.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          storeProduct: {
            include: {
              store: true
            }
          },
          suggestedProduct: true
        }
      }),
      this.prisma.unmatchedProductReview.count()
    ]);

    return { items, total, page, pageSize };
  }

  @Get("users")
  @ApiOkResponse({ description: "Kullanıcı listesi" })
  async getUsers(@Query() query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.user.count()
    ]);

    return { items, total, page, pageSize };
  }

  @Patch("users/:id/email-preferences")
  @ApiOkResponse({ description: "Pazarlama / toplu e-posta tercihi (işlemsel e-postalar değişmez)" })
  async patchUserEmailPreferences(
    @Param("id") id: string,
    @Body() body: PatchUserEmailPreferencesDto,
  ) {
    const userId = Number(id);
    if (!Number.isFinite(userId) || userId < 1) {
      throw new BadRequestException("Geçersiz kullanıcı kimliği.");
    }
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          marketingEmailOptIn: body.marketingEmailOptIn,
          marketingEmailOptOutAt: body.marketingEmailOptIn ? null : new Date()
        },
        select: {
          id: true,
          email: true,
          marketingEmailOptIn: true,
          marketingEmailOptOutAt: true
        }
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("Kullanıcı bulunamadı.");
      }
      throw e;
    }
  }

  @Get("reviews")
  @ApiOkResponse({ description: "Ürün yorumları listesi (okuma)" })
  async getReviews(@Query() query: PaginationQueryDto & { status?: ReviewStatus }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: { status?: ReviewStatus } = {};
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
        orderBy: { createdAt: "desc" },
        include: {
          product: true,
          user: true
        }
      }),
      this.prisma.review.count({ where })
    ]);

    return { items, total, page, pageSize };
  }

  @Get("analytics/affiliate")
  @ApiOkResponse({ description: "Affiliate tıklama analitiği" })
  async getAffiliateAnalytics() {
    const totalClicks = await this.prisma.affiliateClick.count();

    const topStoreGroups = await this.prisma.affiliateClick.groupBy({
      by: ["storeId"],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: "desc"
        }
      },
      take: 10
    });

    const topProductGroups = await this.prisma.affiliateClick.groupBy({
      by: ["productId"],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: "desc"
        }
      },
      take: 10
    });

    const storeIds = topStoreGroups.map((g) => g.storeId);
    const productIds = topProductGroups.map((g) => g.productId);

    const categoryRows = await this.prisma.$queryRaw<{ categoryId: number; clicks: bigint }[]>`
      SELECT p."categoryId" AS "categoryId", COUNT(ac.id)::bigint AS clicks
      FROM "AffiliateClick" ac
      INNER JOIN "Product" p ON p.id = ac."productId"
      WHERE p."categoryId" IS NOT NULL
      GROUP BY p."categoryId"
      ORDER BY clicks DESC
      LIMIT 12
    `;

    const [stores, products, recentClicks, categoryMeta] = await Promise.all([
      this.prisma.store.findMany({
        where: { id: { in: storeIds } }
      }),
      this.prisma.product.findMany({
        where: { id: { in: productIds } }
      }),
      this.prisma.affiliateClick.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          store: true,
          product: true,
          user: true
        }
      }),
      categoryRows.length
        ? this.prisma.category.findMany({
            where: { id: { in: categoryRows.map((r) => r.categoryId) } },
            select: { id: true, name: true, slug: true }
          })
        : Promise.resolve([])
    ]);

    const topStores = topStoreGroups.map((g) => {
      const store = stores.find((s) => s.id === g.storeId);
      return {
        storeId: g.storeId,
        storeName: store?.name ?? "",
        clicks: g._count.id
      };
    });

    const topProducts = topProductGroups.map((g) => {
      const product = products.find((p) => p.id === g.productId);
      return {
        productId: g.productId,
        productName: product?.name ?? "",
        clicks: g._count.id
      };
    });

    const topCategoriesByClicks = categoryRows.map((r) => {
      const cat = categoryMeta.find((c) => c.id === r.categoryId);
      return {
        categoryId: r.categoryId,
        categoryName: cat?.name ?? "",
        categorySlug: cat?.slug ?? "",
        clicks: Number(r.clicks)
      };
    });

    return {
      totalClicks,
      topStores,
      topProducts,
      topCategoriesByClicks,
      recentClicks
    };
  }

  @Get("analytics/search-trends")
  @ApiOkResponse({ description: "Arama sorgusu istatistikleri (SearchQueryStat)" })
  async getSearchTrends(@Query("limit") limitStr?: string) {
    const lim = Math.min(50, Math.max(5, Number(limitStr ?? "15") || 15));
    const items = await this.prisma.searchQueryStat.findMany({
      orderBy: { count: "desc" },
      take: lim,
      select: { query: true, count: true, updatedAt: true }
    });
    return { items };
  }

  @Get("operations/import-summary")
  @ApiOkResponse({ description: "Import / eşleşme operasyon özeti" })
  async getImportOperationsSummary() {
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const since7 = new Date(Date.now() - 7 * 86_400_000);
    const [pendingUnmatched, unmatchedSp, skipped7d, byStatus, recentFailed, recentFeedImports] =
      await Promise.all([
        this.prisma.unmatchedProductReview.count({
          where: { status: UnmatchedStatus.PENDING }
        }),
        this.prisma.storeProduct.count({
          where: { matchStatus: MatchStatus.UNMATCHED }
        }),
        this.prisma.importSkippedRow.count({
          where: { createdAt: { gte: since7 } }
        }),
        this.prisma.feedImport.groupBy({
          by: ["status"],
          where: { createdAt: { gte: since30 } },
          _count: { id: true }
        }),
        this.prisma.feedImport.findMany({
          where: { status: { in: [FeedStatus.FAILED, FeedStatus.PARTIAL] } },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { store: true }
        }),
        this.prisma.feedImport.findMany({
          where: { createdAt: { gte: since30 } },
          orderBy: { createdAt: "desc" },
          take: 25,
          include: { store: { select: { id: true, name: true, slug: true } } }
        })
      ]);
    const feedImportsByStatusLast30Days: Record<string, number> = {};
    for (const g of byStatus) {
      feedImportsByStatusLast30Days[g.status] = g._count.id;
    }
    return {
      pendingUnmatchedReviews: pendingUnmatched,
      unmatchedStoreProducts: unmatchedSp,
      importSkippedRowsLast7Days: skipped7d,
      feedImportsByStatusLast30Days,
      recentFailedOrPartialImports: recentFailed,
      recentFeedImports: recentFeedImports.map((r) => ({
        id: r.id,
        storeId: r.storeId,
        status: r.status,
        processedCount: r.processedCount,
        createdCount: r.createdCount,
        updatedCount: r.updatedCount,
        matchedCount: r.matchedCount,
        unmatchedCount: r.unmatchedCount,
        errorCount: r.errorCount,
        errorLogPreview: r.errorLog ? r.errorLog.slice(0, 600) : null,
        createdAt: r.createdAt,
        store: r.store
      }))
    };
  }

  @Get("email/logs")
  @ApiOkResponse({ description: "E-posta teslim günlüğü" })
  async getEmailLogs(
    @Query() query: PaginationQueryDto & { status?: EmailDeliveryStatus; jobName?: string }
  ) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 40, 100);
    const where: Prisma.EmailDeliveryLogWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.jobName?.trim()) {
      where.jobName = query.jobName.trim();
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.emailDeliveryLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.emailDeliveryLog.count({ where })
    ]);
    const items = rows.map(({ retryPayload, ...rest }) => ({
      ...rest,
      canRetry: rest.status === EmailDeliveryStatus.FAILED && retryPayload != null
    }));
    return { items, total, page, pageSize };
  }

  @Post("email/logs/:id/retry")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkResponse({ description: "Başarısız kayıt için işi yeniden kuyruğa ekler" })
  async retryEmailLog(@Param("id") id: string) {
    const logId = Number(id);
    if (!Number.isInteger(logId) || logId < 1) {
      throw new BadRequestException("Geçersiz günlük ID.");
    }
    const row = await this.prisma.emailDeliveryLog.findUnique({ where: { id: logId } });
    if (!row || row.status !== EmailDeliveryStatus.FAILED) {
      throw new BadRequestException("Yalnızca başarısız kayıtlar yeniden kuyruğa alınabilir.");
    }
    if (row.retryPayload == null || typeof row.retryPayload !== "object") {
      throw new BadRequestException("Bu kayıtta yeniden deneme verisi yok.");
    }
    const payload = row.retryPayload as { jobName?: string; data?: unknown };
    const jn = payload.jobName;
    const jd = payload.data;
    if (!jn || jd == null) {
      throw new BadRequestException("Geçersiz yeniden deneme yükü.");
    }
    switch (jn) {
      case "welcome_email":
        await this.emailQueue.enqueueWelcome(jd as WelcomeEmailJobData);
        break;
      case "reset_password":
        await this.emailQueue.enqueueResetPassword(jd as ResetPasswordEmailJobData);
        break;
      case "verify_email":
        await this.emailQueue.enqueueVerifyEmail(jd as VerifyEmailJobData);
        break;
      case "price_alert":
        await this.emailQueue.enqueuePriceAlert(jd as PriceAlertEmailJobData);
        break;
      case "test_email":
        await this.emailQueue.enqueueTestEmail(jd as TestEmailJobData);
        break;
      case "bulk_email_batch":
        await this.emailQueue.enqueueBulkEmailBatch(jd as BulkEmailBatchJobData);
        break;
      default:
        throw new BadRequestException(`Bu iş tipi için yeniden deneme desteklenmiyor: ${jn}`);
    }
    return { ok: true, requeuedJob: jn };
  }

  @Get("banners")
  @ApiOkResponse({ description: "Banner listesi (admin)" })
  async getBanners() {
    return this.bannersService.listAll();
  }

  @Post("banners/upload-image")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      ...bannerImageMulterOptions(),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype && BANNER_IMAGE_MIMES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              "Yalnızca JPEG, PNG, WebP veya GIF yükleyebilirsiniz."
            ) as unknown as Error,
            false
          );
        }
      }
    })
  )
  @ApiOkResponse({ description: "Yüklenen dosyanın public yolu (imageUrl)" })
  async uploadBannerImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException("Dosya (file) alanı gerekli.");
    }
    return { imageUrl: `/uploads/banners/${file.filename}` };
  }

  @Post("banners")
  @ApiOkResponse({ description: "Yeni banner ekle" })
  async createBanner(
    @Body()
    body: { imageUrl: string; linkUrl?: string; title?: string; position?: number }
  ) {
    return this.bannersService.create(body);
  }

  @Patch("banners/:id/image")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      ...bannerImageMulterOptions(),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype && BANNER_IMAGE_MIMES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              "Yalnızca JPEG, PNG, WebP veya GIF yükleyebilirsiniz."
            ) as unknown as Error,
            false
          );
        }
      }
    })
  )
  @ApiOkResponse({ description: "Banner görseli dosya ile değiştirildi" })
  async replaceBannerImage(@Param("id") idStr: string, @UploadedFile() file?: Express.Multer.File) {
    const id = Number(idStr);
    if (!Number.isInteger(id)) throw new BadRequestException("Geçersiz banner ID.");
    if (!file?.filename) {
      throw new BadRequestException("Dosya (file) alanı gerekli.");
    }
    const prev = await this.prisma.banner.findUnique({ where: { id } });
    if (!prev) {
      throw new NotFoundException("Banner bulunamadı.");
    }
    const imageUrl = `/uploads/banners/${file.filename}`;
    const updated = await this.bannersService.update(id, { imageUrl });
    tryRemoveLocalBannerFile(prev.imageUrl);
    return updated;
  }

  @Patch("banners/:id")
  @ApiOkResponse({ description: "Banner güncelle" })
  async updateBanner(
    @Param("id") idStr: string,
    @Body()
    body: { imageUrl?: string; linkUrl?: string; title?: string; position?: number; isActive?: boolean }
  ) {
    const id = Number(idStr);
    if (!Number.isInteger(id)) throw new BadRequestException("Geçersiz banner ID.");
    return this.bannersService.update(id, body);
  }

  @Delete("banners/:id")
  @ApiOkResponse({ description: "Banner sil" })
  async deleteBanner(@Param("id") idStr: string) {
    const id = Number(idStr);
    if (!Number.isInteger(id)) throw new BadRequestException("Geçersiz banner ID.");
    const row = await this.prisma.banner.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("Banner bulunamadı.");
    }
    const removed = await this.bannersService.delete(id);
    tryRemoveLocalBannerFile(row.imageUrl);
    return removed;
  }
}

