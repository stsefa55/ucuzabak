import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  brandId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ean?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  modelNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mainImageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: "object", additionalProperties: true })
  @IsOptional()
  // specsJson frontend'de serbest JSON olarak gönderilecek, burada ekstra validasyon yok
  specsJson?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  initialOfferStoreId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  initialOfferPrice?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  initialOfferInStock?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  initialOfferAffiliateUrl?: string;
}

