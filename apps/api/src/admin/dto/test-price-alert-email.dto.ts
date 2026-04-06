import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsInt, IsOptional, IsString, Min } from "class-validator";

export class TestPriceAlertEmailDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({ description: "Test alıcı e-postası" })
  @IsEmail()
  to!: string;

  @ApiProperty({ required: false, description: "Boşsa ürünün lowestPriceCache değeri" })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({ required: false, description: "Boşsa price ile aynı" })
  @IsOptional()
  @IsString()
  targetPrice?: string;
}
