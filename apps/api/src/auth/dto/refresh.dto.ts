import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * Web: refresh_token HttpOnly cookie ile gelir; gövde boş veya {} olabilir.
 * Mobil: x-client-type: mobile + body.refreshToken zorunlu (controller’da kontrol edilir).
 */
export class RefreshDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

