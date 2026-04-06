import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class BulkBrandsImportDto {
  @ApiProperty({ enum: ["csv", "lines"], description: "csv: name,slug başlıklı; lines: satır başına bir marka adı" })
  @IsEnum(["csv", "lines"])
  format!: "csv" | "lines";

  @ApiProperty({ description: "CSV metni veya satır satır marka adları" })
  @IsString()
  @MaxLength(500_000)
  text!: string;

  @ApiProperty({
    required: false,
    description: "true veya atlanırsa yalnızca önizleme; false ile veritabanına yazar"
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
