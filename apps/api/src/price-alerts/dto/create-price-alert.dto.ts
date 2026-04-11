import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNumber, Min } from "class-validator";

export class CreatePriceAlertDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({ description: "TL cinsinden; güncel en düşük fiyatın altında olmalıdır." })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  targetPrice!: number;
}

