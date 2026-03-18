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
  searchProducts(@Query() query: ProductListQueryDto) {
    return this.searchService.searchProducts(query);
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

