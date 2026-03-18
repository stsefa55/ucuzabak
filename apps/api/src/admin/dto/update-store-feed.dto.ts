import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateStoreFeedDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  feedUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  feedIsActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  feedImportIntervalLabel?: string;
}

