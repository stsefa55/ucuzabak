import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateAdminBrandDto {
  @ApiProperty({ example: "Philips", description: "Görünen marka adı (feed ile aynı olması sıkı eşleşmeyi kolaylaştırır)" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    required: false,
    example: "philips",
    description: "Boş bırakılırsa addan üretilir; canonical slug kurallarına uyar"
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;
}
