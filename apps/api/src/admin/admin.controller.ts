import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  FeedStatus,
  FeedType,
  MatchStatus,
  OfferStatus,
  Prisma,
  ProductStatus,
  ReviewStatus,
  StoreStatus,
  UnmatchedStatus,
  UserRole
} from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BannersService } from "../banners/banners.service";
import { PaginationQueryDto } from "../common/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { AdminProductsQueryDto } from "./dto/admin-products-query.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { ImportProductsCsvDto } from "./dto/import-products-csv.dto";
import { UpdateStoreFeedDto } from "./dto/update-store-feed.dto";
import { parse } from "csv-parse/sync";
import { Queue } from "bullmq";

@ApiTags("admin")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bannersService: BannersService
  ) {}

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
    const product = await this.prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        brandId: body.brandId,
        categoryId: body.categoryId,
        ean: body.ean,
        modelNumber: body.modelNumber,
        mainImageUrl: body.mainImageUrl,
        description: body.description,
        specsJson: body.specsJson
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
      const slug = (record.slug || "").trim();
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
            specsJson
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

    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = Number(process.env.REDIS_PORT || 6379);

    const queue = new Queue("feed-import", {
      connection: { host: redisHost, port: redisPort }
    });

    await queue.add("feed-import", { feedImportId: feedImport.id });
    await queue.close();

    return {
      id: feedImport.id,
      status: feedImport.status
    };
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
    return offers;
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
    return this.prisma.category.findMany({
      orderBy: { name: "asc" }
    });
  }

  @Get("brands")
  @ApiOkResponse({ description: "Marka listesi" })
  async getBrands() {
    return this.prisma.brand.findMany({
      orderBy: { name: "asc" }
    });
  }

  @Get("stores")
  @ApiOkResponse({ description: "Mağaza listesi" })
  async getStores() {
    return this.prisma.store.findMany({
      orderBy: { name: "asc" }
    });
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
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.brandId !== undefined) data.brand = body.brandId ? { connect: { id: body.brandId } } : { disconnect: true };
    if (body.categoryId !== undefined) data.category = body.categoryId ? { connect: { id: body.categoryId } } : { disconnect: true };
    if (body.ean !== undefined) data.ean = body.ean;
    if (body.modelNumber !== undefined) data.modelNumber = body.modelNumber;
    if (body.mainImageUrl !== undefined) data.mainImageUrl = body.mainImageUrl;
    if (body.description !== undefined) data.description = body.description;
    if (body.specsJson !== undefined) data.specsJson = body.specsJson as Prisma.JsonValue;
    if ((body as { status?: ProductStatus }).status !== undefined) {
      data.status = (body as { status?: ProductStatus }).status as ProductStatus;
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
      take: 5
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
      take: 5
    });

    const storeIds = topStoreGroups.map((g) => g.storeId);
    const productIds = topProductGroups.map((g) => g.productId);

    const [stores, products, recentClicks] = await Promise.all([
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
      })
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

    return {
      totalClicks,
      topStores,
      topProducts,
      recentClicks
    };
  }

  @Get("banners")
  @ApiOkResponse({ description: "Banner listesi (admin)" })
  async getBanners() {
    return this.bannersService.listAll();
  }

  @Post("banners")
  @ApiOkResponse({ description: "Yeni banner ekle" })
  async createBanner(
    @Body()
    body: { imageUrl: string; linkUrl?: string; title?: string; position?: number }
  ) {
    return this.bannersService.create(body);
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
    return this.bannersService.delete(id);
  }
}

