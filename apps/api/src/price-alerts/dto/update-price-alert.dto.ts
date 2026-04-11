import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, Min } from "class-validator";

export class UpdatePriceAlertDto {
  @ApiPropertyOptional({ description: "TL cinsinden; güncel en düşük fiyatın altında olmalıdır." })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  targetPrice?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

