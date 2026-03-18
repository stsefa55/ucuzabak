import { Controller, Get, Param } from "@nestjs/common";
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

  @Get(":slug")
  @ApiOkResponse({ description: "Kategori detayı" })
  getBySlug(@Param("slug") slug: string) {
    return this.categoriesService.findBySlug(slug);
  }
}

