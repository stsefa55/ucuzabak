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
  list(@Query() query: ProductListQueryDto) {
    return this.productsService.list(query);
  }

  @Get("popular")
  @ApiOkResponse({ description: "Popüler ürünler" })
  getPopular() {
    return this.productsService.getPopularProducts();
  }

  @Get("price-drops")
  @ApiOkResponse({ description: "Fiyatı düşen ürünler" })
  getPriceDrops() {
    return this.productsService.getPriceDroppedProducts();
  }

  @Get("deals")
  @ApiOkResponse({ description: "Fırsat ürünleri" })
  getDeals() {
    return this.productsService.getDealProducts();
  }

  @Get("most-clicked")
  @ApiOkResponse({ description: "En çok tıklanan ürünler (öne çıkan)" })
  getMostClicked() {
    return this.productsService.getMostClickedProducts(12);
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

