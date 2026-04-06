import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class BackfillProductBrandDto {
  @ApiProperty({
    required: false,
    description:
      "Atlanırsa veya true ise yalnızca rapor; kalıcı yazma için açıkça false gönderin (dryRun: false)."
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiProperty({ required: false, default: 300, description: "İşlenecek en fazla canonical ürün (brandId null)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}
