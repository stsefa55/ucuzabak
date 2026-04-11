import { IsEmail, IsString, MinLength } from "class-validator";

export class RequestEmailChangeDto {
  @IsEmail({}, { message: "Geçerli bir e-posta girin." })
  newEmail!: string;

  @IsString()
  @MinLength(1, { message: "Mevcut şifrenizi girin." })
  currentPassword!: string;
}
