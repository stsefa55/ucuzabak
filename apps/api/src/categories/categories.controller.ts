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
  getPath(@Param("slug") slug: string) {
    return this.categoriesService.getPathByLeafSlug(slug);
  }

  @Get(":slug/navigation-panel")
  @ApiOkResponse({
    description:
      "Kategori sayfası sol panel: kökte bu kökün doğrudan çocukları; alt seviyede üst + kardeşler; filtreyle uyumlu sayılar"
  })
  getNavigationPanel(
    @Param("slug") slug: string,
    @Query("brandSlug") brandSlug?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string
  ) {
    return this.categoriesService.getNavigationPanelForLeaf(slug, {
      brandSlug: brandSlug?.trim() || undefined,
      minPrice: minPrice != null && minPrice !== "" ? Number(minPrice) : undefined,
      maxPrice: maxPrice != null && maxPrice !== "" ? Number(maxPrice) : undefined
    });
  }

  @Get(":slug/facets")
  @ApiOkResponse({
    description:
      "Kategori sayfası filtreleri: alt ağaçtaki markalar ve fiyat aralığı (ürün listesi ile aynı kategori kapsamı)"
  })
  getFacets(
    @Param("slug") slug: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string
  ) {
    return this.categoriesService.getFacetsForCategoryLeaf(slug, {
      minPrice: minPrice != null && minPrice !== "" ? Number(minPrice) : undefined,
      maxPrice: maxPrice != null && maxPrice !== "" ? Number(maxPrice) : undefined
    });
  }

  @Get(":slug")
  @ApiOkResponse({ description: "Kategori detayı" })
  getBySlug(@Param("slug") slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(":slug/children")
  @ApiOkResponse({ description: "Alt kategori listesi" })
  listChildren(@Param("slug") slug: string) {
    return this.categoriesService.listChildrenByParentSlug(slug);
  }
}

