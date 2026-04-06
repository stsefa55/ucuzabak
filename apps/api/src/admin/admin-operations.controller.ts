import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminDiagnosticsService } from "./admin-diagnostics.service";
import { AdminQueueMetricsService } from "./admin-queue-metrics.service";
import { AdminOperationsService } from "./admin-operations.service";
import { MatchAuditQueryDto } from "./dto/match-audit-query.dto";
import {
  CreateCategoryMappingOverrideDto,
  UpdateCategoryMappingOverrideDto
} from "./dto/category-mapping-override.dto";
import { ApproveFeedBrandSuggestionsDto } from "./dto/feed-brand-suggestions.dto";
import { BackfillProductBrandDto } from "./dto/backfill-product-brand.dto";
import {
  AssignCanonicalProductDto,
  CategoryUnmappableQueryDto,
  CategoryOverridesQueryDto,
  CreateCanonicalFromStoreProductDto,
  ImportSkipsQueryDto,
  OperationsStoreProductQueryDto,
  PatchStoreProductReviewDto
} from "./dto/operations-store-product.dto";

type JwtUser = { sub: number; role: string; email: string };

@ApiTags("admin")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin")
export class AdminOperationsController {
  constructor(
    private readonly ops: AdminOperationsService,
    private readonly queueMetricsService: AdminQueueMetricsService,
    private readonly diagnostics: AdminDiagnosticsService
  ) {}

  @Get("operations/summary")
  @ApiOkResponse({ description: "Import / override / mağaza satırı özet sayıları" })
  async summary() {
    return this.ops.getSummary();
  }

  @Get("operations/service-checks")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ description: "Veritabanı, Redis, SMTP portu, kuyruklar — salt okunur tanılama" })
  async serviceChecks() {
    return this.diagnostics.runServiceChecks();
  }

  @Get("operations/queue-metrics")
  @ApiOkResponse({ description: "BullMQ e-posta ve feed-import kuyruk sayıları (salt okunur)" })
  async queueMetrics() {
    try {
      const data = await this.queueMetricsService.getOverview();
      return { ok: true, ...data };
    } catch {
      return {
        ok: false,
        error: "Kuyruk metrikleri alınamadı (Redis / BullMQ erişimi veya worker).",
        email: null as null,
        feedImport: null as null
      };
    }
  }

  @Get("operations/match-audit")
  @ApiOkResponse({ description: "Manuel eşleştirme ve yeni canonical oluşturma denetim kayıtları" })
  async matchAudit(@Query() query: MatchAuditQueryDto) {
    return this.ops.listMatchAuditLogs({
      page: query.page,
      pageSize: query.pageSize,
      action: query.action,
      storeProductId: query.storeProductId,
      actorUserId: query.actorUserId
    });
  }

  @Get("operations/import-skips")
  @ApiOkResponse({ description: "Import sırasında atlanan satırlar (çözülemeyen kategori vb.)" })
  async importSkips(@Query() query: ImportSkipsQueryDto) {
    return this.ops.listImportSkips({
      page: query.page,
      pageSize: query.pageSize,
      storeId: query.storeId,
      reason: query.reason,
      feedSource: query.feedSource,
      q: query.q,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo
    });
  }

  @Get("operations/feed-import-brand-diagnostics")
  @ApiOkResponse({
    description:
      "Son importların marka özeti: matchedBrandCount, eşleşmeyen feed markaları (importSummaryJson)"
  })
  async feedImportBrandDiagnostics(@Query("limit") limitRaw?: string) {
    const n = limitRaw != null && limitRaw !== "" ? Number(limitRaw) : 10;
    return this.ops.getFeedImportBrandDiagnostics(Number.isFinite(n) ? n : 10);
  }

  @Post("operations/products-backfill-brand-from-specs")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOkResponse({
    description:
      "brandId null ürünlerde specs içi markayı okuyup yalnızca sıkı canonical eşleşmede brandId yazar; varsayılan dryRun"
  })
  async backfillProductBrandsFromSpecs(@Body() body: BackfillProductBrandDto) {
    return this.ops.backfillProductBrandsFromStoreSpecs({
      dryRun: body.dryRun,
      limit: body.limit
    });
  }

  @Get("operations/feed-brand-suggestions")
  @ApiOkResponse({
    description:
      "StoreProduct.specsJson marka alanlarından frekans + STRONG/NORMALIZABLE/SUSPICIOUS/GENERIC sınıflandırması"
  })
  async feedBrandSuggestions(
    @Query("limit") limitRaw?: string,
    @Query("minCount") minCountRaw?: string,
    @Query("merge") mergeRaw?: string
  ) {
    const limitN = limitRaw != null && limitRaw !== "" ? Number(limitRaw) : NaN;
    const minN = minCountRaw != null && minCountRaw !== "" ? Number(minCountRaw) : NaN;
    return this.ops.listFeedBrandSuggestions({
      limit: Number.isFinite(limitN) ? limitN : undefined,
      minCount: Number.isFinite(minN) ? minN : undefined,
      merge: mergeRaw === "false" ? false : true
    });
  }

  @Post("operations/feed-brand-suggestions/approve")
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOkResponse({ description: "Seçilen canonical adlarla toplu Brand oluşturma (dryRun varsayılan true)" })
  async approveFeedBrandSuggestions(@Body() body: ApproveFeedBrandSuggestionsDto) {
    return this.ops.approveFeedBrandSuggestions(body.items, body.dryRun);
  }

  @Get("operations/store-products")
  @ApiOkResponse({ description: "Mağaza satırları — matchDetailsJson filtreleri" })
  async storeProducts(@Query() query: OperationsStoreProductQueryDto) {
    return this.ops.listStoreProducts({
      page: query.page,
      pageSize: query.pageSize,
      storeId: query.storeId,
      feedSource: query.feedSource,
      matchStatus: query.matchStatus,
      productMatchReason: query.productMatchReason,
      categoryResolutionMethod: query.categoryResolutionMethod,
      confidenceMin: query.confidenceMin,
      confidenceMax: query.confidenceMax,
      lowConfidenceOnly: query.lowConfidenceOnly,
      problemOnly: query.problemOnly,
      manualAssignedOnly: query.manualAssignedOnly,
      reviewFlag: query.reviewFlag,
      q: query.q,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo
    });
  }

  @Get("operations/store-products/:id")
  @ApiOkResponse({ description: "Mağaza satırı detayı (matchDetailsJson dahil)" })
  async storeProductDetail(@Param("id", ParseIntPipe) id: number) {
    return this.ops.getStoreProductDetail(id);
  }

  @Patch("operations/store-products/:id/review")
  @ApiOkResponse({ description: "İnceleme bayrağı / not" })
  async patchReview(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: PatchStoreProductReviewDto,
    @Req() req: Request
  ) {
    const user = (req as Request & { user?: JwtUser }).user;
    if (!user?.sub) throw new UnauthorizedException();
    return this.ops.patchStoreProductReview(id, body, user.sub);
  }

  @Post("operations/store-products/:id/assign-product")
  @ApiOkResponse({ description: "Manuel canonical ürün ataması" })
  async assignProduct(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: AssignCanonicalProductDto,
    @Req() req: Request
  ) {
    const user = (req as Request & { user?: JwtUser }).user;
    if (!user?.sub) throw new UnauthorizedException();
    return this.ops.assignCanonicalProduct(id, body.productId, user.sub);
  }

  @Post("operations/store-products/:id/create-canonical-product")
  @ApiOkResponse({ description: "Mağaza satırından yeni canonical Product oluştur ve bağla" })
  async createCanonicalFromStore(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateCanonicalFromStoreProductDto,
    @Req() req: Request
  ) {
    const user = (req as Request & { user?: JwtUser }).user;
    if (!user?.sub) throw new UnauthorizedException();
    return this.ops.createCanonicalProductFromStoreProduct(id, user.sub, {
      categoryId: body.categoryId,
      brandId: body.brandId,
      slug: body.slug
    });
  }

  @Get("category-overrides")
  @ApiOkResponse({ description: "CategoryMappingOverride listesi" })
  async listOverrides(@Query() query: CategoryOverridesQueryDto) {
    return this.ops.listCategoryOverrides(query.page ?? 1, query.pageSize ?? 50, query.source, query.q);
  }

  @Get("category-overrides/unmappable")
  @ApiOkResponse({ description: "category_unmappable özetleri (kaynak + normalized key bazlı)" })
  async listUnmappable(@Query() query: CategoryUnmappableQueryDto) {
    return this.ops.listUnmappableCategoryKeys(
      query.page ?? 1,
      query.pageSize ?? 50,
      query.source,
      query.q
    );
  }

  @Post("category-overrides")
  @ApiOkResponse({ description: "Yeni kategori override" })
  async createOverride(@Body() body: CreateCategoryMappingOverrideDto) {
    return this.ops.createCategoryOverride({
      source: body.source,
      matchScope: body.matchScope,
      normalizedKey: body.normalizedKey,
      categoryId: body.categoryId,
      confidence: body.confidence,
      rawSourceText: body.rawSourceText
    });
  }

  @Patch("category-overrides/:id")
  @ApiOkResponse({ description: "Override güncelle" })
  async updateOverride(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateCategoryMappingOverrideDto
  ) {
    return this.ops.updateCategoryOverride(id, body);
  }

  @Delete("category-overrides/:id")
  @ApiOkResponse({ description: "Override sil" })
  async deleteOverride(@Param("id", ParseIntPipe) id: number) {
    return this.ops.deleteCategoryOverride(id);
  }
}
