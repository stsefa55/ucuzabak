import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ImportProductsCsvDto {
  @ApiProperty({ description: "CSV içeriği", type: String })
  @IsString()
  csv!: string;
}

