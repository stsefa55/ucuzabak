import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Equals, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export type BulkEmailTarget = "all_active" | "verified_only";

export class SendBulkEmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  subject!: string;

  @ApiProperty({ description: "HTML gövde" })
  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  html!: string;

  @ApiPropertyOptional({ description: "Düz metin alternatifi" })
  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  text?: string;

  @ApiProperty({ enum: ["all_active", "verified_only"] })
  @IsString()
  @IsIn(["all_active", "verified_only"])
  target!: BulkEmailTarget;

  @ApiProperty({
    description: "İkinci onay: istek gövdesinde açıkça true olmalı (UI + API).",
    example: true
  })
  @IsBoolean()
  @Equals(true)
  confirmSend!: boolean;

  @ApiPropertyOptional({
    description:
      "BULK_EMAIL_CONFIRM_PHRASE tanımlıysa bu alan aynı metinle gönderilmeli; aksi halde isteğe bağlı."
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  confirmPhrase?: string;

  @ApiPropertyOptional({
    description:
      "true: yalnızca test alıcılarına (BULK_EMAIL_TEST_RECIPIENTS veya admin e-postası). Ortamda BULK_EMAIL_TEST_MODE=1 ise de test modu açılır."
  })
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}
