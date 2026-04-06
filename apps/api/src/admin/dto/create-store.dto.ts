import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StoreStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class CreateStoreDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ description: "Benzersiz slug (küçük harf, tire)" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  websiteUrl?: string | null;

  @ApiPropertyOptional({ enum: StoreStatus })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;
}
