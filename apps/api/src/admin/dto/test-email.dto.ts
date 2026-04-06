import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional } from "class-validator";

export class TestEmailDto {
  @ApiProperty({
    required: false,
    description: "Boşsa oturumdaki kullanıcının e-postasına gönderilir."
  })
  @IsOptional()
  @IsEmail()
  to?: string;
}
