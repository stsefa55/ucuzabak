import { ApiProperty } from "@nestjs/swagger";
import { MatchStatus, StoreProductReviewFlag } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

function toBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

export class PatchStoreProductReviewDto {
  @ApiProperty({ enum: StoreProductReviewFlag, required: false })
  @IsOptional()
  @IsEnum(StoreProductReviewFlag)
  reviewFlag?: StoreProductReviewFlag;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reviewNotes?: string | null;

  @ApiProperty({ description: "İncelemeyi tamamlandı olarak işaretle", required: false })
  @IsOptional()
  @IsBoolean()
  markReviewed?: boolean;
}

export class AssignCanonicalProductDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  productId!: number;
}

export class CreateCanonicalFromStoreProductDto {
  @ApiProperty({ required: false, description: "Canonical kategori (isteğe bağlı)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiProperty({ required: false, description: "Marka (isteğe bağlı)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  brandId?: number;

  @ApiProperty({ required: false, description: "Özel slug; boşsa mağaza başlığından türetilir" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;
}

export class OperationsStoreProductQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  storeId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  feedSource?: string;

  @ApiProperty({ enum: MatchStatus, required: false })
  @IsOptional()
  @IsEnum(MatchStatus)
  matchStatus?: MatchStatus;

  @ApiProperty({ required: false, description: "matchDetailsJson.productMatch.reason" })
  @IsOptional()
  @IsString()
  productMatchReason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryResolutionMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  confidenceMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  confidenceMax?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  lowConfidenceOnly?: boolean;

  @ApiProperty({ required: false, description: "Sorunlu + reviewed değil (varsayılan operasyon görünümü)" })
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  problemOnly?: boolean;

  @ApiProperty({ required: false, description: "Sadece manuel atananlar (MANUAL_MATCHED / manual_override)" })
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  manualAssignedOnly?: boolean;

  @ApiProperty({ enum: StoreProductReviewFlag, required: false })
  @IsOptional()
  @IsEnum(StoreProductReviewFlag)
  reviewFlag?: StoreProductReviewFlag;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class ImportSkipsQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  storeId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  feedSource?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class CategoryOverridesQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ required: false, description: "normalizedKey, ham metin veya kategori adına göre arama" })
  @IsOptional()
  @IsString()
  q?: string;
}

export class CategoryUnmappableQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @ApiProperty({ required: false, description: "feed source filtresi (örn. trendyol)" })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ required: false, description: "normalized key / ham kategori metni arama" })
  @IsOptional()
  @IsString()
  q?: string;
}
