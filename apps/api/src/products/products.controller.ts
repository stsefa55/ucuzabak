import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { ProductsSimilarService } from "./products.similar.service";
import { ProductListQueryDto } from "./dto/product-list.query.dto";
import { PriceHistoryQueryDto } from "./dto/price-history-range.dto";

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsSimilarService: ProductsSimilarService,
  ) {}

  @Get()
  @ApiOkResponse({ description: "Ürün listeleme" })
  async list(@Query() query: ProductListQueryDto) {
    const t0 = Date.now();
    const out = await this.productsService.list(query);
    console.log(`[perf] GET /products ${Date.now() - t0}ms`);
    return out;
  }

  @Get("featured")
  @ApiOkResponse({ description: "Öne çıkan (admin vitrin)" })
  getFeatured() {
    return this.productsService.getFeaturedProducts();
  }

  @Get("popular")
  @ApiOkResponse({ description: "Popüler ürünler (son günlerde affiliate tıklama)" })
  getPopular() {
    return this.productsService.getPopularProducts();
  }

  @Get("price-drops")
  @ApiOkResponse({ description: "Fiyatı düşen ürünler" })
  getPriceDrops() {
    return this.productsService.getPriceDroppedProducts();
  }

  @Get("deals")
  @ApiOkResponse({ description: "Fırsat ürünleri (liste fiyatı indirim oranı)" })
  getDeals() {
    return this.productsService.getDealProducts();
  }

  @Get("by-slugs")
  @ApiOkResponse({ description: "Slug listesine göre ürünler (son gezilenler vb.)" })
  getBySlugs(@Query("slugs") slugs: string) {
    const slugList = typeof slugs === "string" ? slugs.split(",").map((s) => s.trim()).filter(Boolean) : [];
    return this.productsService.findBySlugs(slugList);
  }

  @Get(":slug")
  @ApiOkResponse({ description: "Ürün detayı" })
  getBySlug(@Param("slug") slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(":slug/offers")
  @ApiOkResponse({ description: "Ürün teklif listesi" })
  getOffers(@Param("slug") slug: string) {
    return this.productsService.getOffersBySlug(slug);
  }

  @Get(":slug/price-history")
  @ApiOkResponse({ description: "Ürün fiyat geçmişi" })
  getPriceHistory(@Param("slug") slug: string, @Query() query: PriceHistoryQueryDto) {
    return this.productsService.getPriceHistoryBySlug(slug, query);
  }

  @Get(":slug/similar")
  @ApiOkResponse({ description: "Benzer ürün listesi" })
  getSimilar(@Param("slug") slug: string) {
    return this.productsSimilarService.getSimilarBySlug(slug);
  }
}

