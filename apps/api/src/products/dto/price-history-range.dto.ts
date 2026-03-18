import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

export enum PriceHistoryRange {
  D7 = "7d",
  D30 = "30d",
  D90 = "90d",
  Y1 = "1y",
  ALL = "all"
}

export class PriceHistoryQueryDto {
  @ApiPropertyOptional({
    description: "Fiyat geçmişi aralığı",
    enum: PriceHistoryRange,
    default: PriceHistoryRange.D90
  })
  @IsOptional()
  @Type(() => String)
  @IsEnum(PriceHistoryRange)
  range?: PriceHistoryRange = PriceHistoryRange.D90;
}

