import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ProductListQueryDto } from "../products/dto/product-list.query.dto";
import { SearchService } from "./search.service";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("products")
  @ApiOkResponse({ description: "Ürün arama" })
  async searchProducts(@Query() query: ProductListQueryDto) {
    const t0 = Date.now();
    const out = await this.searchService.searchProducts(query);
    console.log(`[perf] GET /search/products ${Date.now() - t0}ms`);
    return out;
  }

  @Get("category-facets")
  @ApiOkResponse({
    description:
      "Arama sayfası kategori facet'leri (q + filtreler uygulanır; categorySlug facet hesaplamasına dahil edilmez)"
  })
  async categoryFacets(@Query() query: ProductListQueryDto) {
    const t0 = Date.now();
    const out = await this.searchService.getSearchCategoryFacets(query);
    console.log(`[perf] GET /search/category-facets ${Date.now() - t0}ms`);
    return out;
  }

  @Get("brand-facets")
  @ApiOkResponse({
    description:
      "Arama sayfası marka facet'leri (q + kategori + fiyat; marka filtresi facet sayımına dahil edilmez)"
  })
  async brandFacets(@Query() query: ProductListQueryDto) {
    const t0 = Date.now();
    const out = await this.searchService.getSearchBrandFacets(query);
    console.log(`[perf] GET /search/brand-facets ${Date.now() - t0}ms`);
    return out;
  }

  @Get("suggest")
  @ApiOkResponse({ description: "Arama önerileri" })
  suggest(@Query("q") q: string, @Query("limit") limit?: string) {
    const numLimit = limit ? Number(limit) : 10;
    return this.searchService.suggest(q, numLimit);
  }

  @Get("popular-queries")
  @ApiOkResponse({ description: "Sitede en çok aranan terimler (opsiyonel prefix ile filtre)" })
  getPopularQueries(@Query("limit") limit?: string, @Query("prefix") prefix?: string) {
    const numLimit = limit ? Math.min(20, Math.max(1, Number(limit))) : 12;
    return this.searchService.getPopularQueries(numLimit, prefix);
  }
}

