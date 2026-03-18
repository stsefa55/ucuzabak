import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ProductStatus } from "@prisma/client";

export class AdminProductsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "Ad veya slug ile arama" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ProductStatus, description: "Durum filtresi" })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
