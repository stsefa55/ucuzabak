import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CategoriesService } from "./categories.service";

@ApiTags("categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOkResponse({ description: "Kategori listesi" })
  list() {
    return this.categoriesService.listTree();
  }

  @Get("with-counts/list")
  @ApiOkResponse({ description: "Kategori listesi ve ürün sayıları" })
  listWithCounts() {
    return this.categoriesService.listWithProductCount();
  }

  @Get(":slug/path")
  @ApiOkResponse({ description: "Kökten yaprağa kategori yolu (slug + isim)" })
  async getPath(@Param("slug") slug: string) {
    const t0 = Date.now();
    const out = await this.categoriesService.getPathByLeafSlug(slug);
    // temporary performance telemetry for slow category navigation UX
    console.log(`[perf] GET /categories/${slug}/path ${Date.now() - t0}ms`);
    return out;
  }

  @Get(":slug/navigation-panel")
  @ApiOkResponse({
    description:
      "Kategori sayfası sol panel: kökte bu kökün doğrudan çocukları; alt seviyede üst + kardeşler; filtreyle uyumlu sayılar"
  })
  async getNavigationPanel(
    @Param("slug") slug: string,
    @Query("brandSlug") brandSlug?: string,
    @Query("brandSlugs") brandSlugs?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string
  ) {
    const t0 = Date.now();
    const out = await this.categoriesService.getNavigationPanelForLeaf(slug, {
      brandSlug: brandSlug?.trim() || undefined,
      brandSlugs: brandSlugs?.trim() || undefined,
      minPrice: minPrice != null && minPrice !== "" ? Number(minPrice) : undefined,
      maxPrice: maxPrice != null && maxPrice !== "" ? Number(maxPrice) : undefined
    });
    console.log(`[perf] GET /categories/${slug}/navigation-panel ${Date.now() - t0}ms`);
    return out;
  }

  @Get(":slug/facets")
  @ApiOkResponse({
    description:
      "Kategori sayfası filtreleri: alt ağaçtaki markalar ve fiyat aralığı (ürün listesi ile aynı kategori kapsamı)"
  })
  async getFacets(
    @Param("slug") slug: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string
  ) {
    const t0 = Date.now();
    const out = await this.categoriesService.getFacetsForCategoryLeaf(slug, {
      minPrice: minPrice != null && minPrice !== "" ? Number(minPrice) : undefined,
      maxPrice: maxPrice != null && maxPrice !== "" ? Number(maxPrice) : undefined
    });
    console.log(`[perf] GET /categories/${slug}/facets ${Date.now() - t0}ms`);
    return out;
  }

  @Get(":slug")
  @ApiOkResponse({ description: "Kategori detayı" })
  async getBySlug(@Param("slug") slug: string) {
    const t0 = Date.now();
    const out = await this.categoriesService.findBySlug(slug);
    console.log(`[perf] GET /categories/${slug} ${Date.now() - t0}ms`);
    return out;
  }

  @Get(":slug/children")
  @ApiOkResponse({ description: "Alt kategori listesi" })
  listChildren(@Param("slug") slug: string) {
    return this.categoriesService.listChildrenByParentSlug(slug);
  }
}

