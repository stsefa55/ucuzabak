import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "ornek@mail.com" })
  @IsNotEmpty({ message: "E-posta zorunludur." })
  @IsEmail({}, { message: "Geçerli bir e-posta adresi giriniz." })
  email!: string;
}
