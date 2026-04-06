import { ApiPropertyOptional } from "@nestjs/swagger";
import { StoreProductMatchAuditAction } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class MatchAuditQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 30;

  @ApiPropertyOptional({ enum: StoreProductMatchAuditAction })
  @IsOptional()
  @IsEnum(StoreProductMatchAuditAction)
  action?: StoreProductMatchAuditAction;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  storeProductId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actorUserId?: number;
}
