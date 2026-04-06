import { ApiProperty } from "@nestjs/swagger";
import { CategoryMatchScope } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from "class-validator";

export class CreateCategoryMappingOverrideDto {
  @ApiProperty({ example: "trendyol" })
  @IsString()
  @MinLength(1)
  source!: string;

  @ApiProperty({ enum: CategoryMatchScope, default: CategoryMatchScope.FULL })
  @IsEnum(CategoryMatchScope)
  matchScope!: CategoryMatchScope;

  @ApiProperty({
    description: "normalizeCategoryText çıktısı. Boş bırakılırsa rawSourceText'ten üretilir.",
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  normalizedKey?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rawSourceText?: string;
}

export class UpdateCategoryMappingOverrideDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  source?: string;

  @ApiProperty({ enum: CategoryMatchScope, required: false })
  @IsOptional()
  @IsEnum(CategoryMatchScope)
  matchScope?: CategoryMatchScope;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  normalizedKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rawSourceText?: string | null;
}
