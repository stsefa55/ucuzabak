import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";

export class FeedBrandApproveItemDto {
  @ApiProperty({ description: "Oluşturulacak canonical marka adı (düzenlenmiş olabilir)" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  canonicalName!: string;
}

export class ApproveFeedBrandSuggestionsDto {
  @ApiProperty({ type: [FeedBrandApproveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedBrandApproveItemDto)
  items!: FeedBrandApproveItemDto[];

  @ApiProperty({
    required: false,
    description: "Atlanırsa veya true: yalnızca toplu içe aktarma önizlemesi; false ile Brand kaydı oluşturulur"
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  dryRun?: boolean;
}
