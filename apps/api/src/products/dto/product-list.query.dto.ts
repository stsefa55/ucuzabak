import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { PaginationQueryDto } from "../../common/pagination.dto";

export enum ProductSortField {
  RELEVANCE = "relevance",
  POPULAR = "popular",
  LOWEST_PRICE = "lowest_price",
  HIGHEST_PRICE = "highest_price",
  PRICE_DROP = "price_drop",
  NEWEST = "newest"
}

export class ProductListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandSlug?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ProductSortField, default: ProductSortField.RELEVANCE })
  @IsOptional()
  @IsEnum(ProductSortField)
  sort?: ProductSortField = ProductSortField.RELEVANCE;
}

