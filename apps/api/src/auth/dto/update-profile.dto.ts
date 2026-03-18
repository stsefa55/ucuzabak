import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @MinLength(7)
  phone?: string;
}

