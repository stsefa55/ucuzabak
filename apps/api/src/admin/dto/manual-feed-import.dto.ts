import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FeedType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ManualFeedUploadFieldsDto {
  @ApiProperty({ enum: FeedType })
  @IsEnum(FeedType)
  feedType!: FeedType;
}

export class ManualFeedPasteDto {
  @ApiProperty({ enum: FeedType })
  @IsEnum(FeedType)
  feedType!: FeedType;

  @ApiProperty({ description: "Ham XML, JSON veya CSV metni" })
  @IsString()
  @MinLength(1)
  @MaxLength(50_000_000)
  content!: string;
}
