import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, Matches, MinLength } from "class-validator";

/** RegisterDto ile aynı şifre kuralı */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class ResetPasswordDto {
  @ApiProperty({ description: "E-postadaki sıfırlama bağlantısındaki token" })
  @IsNotEmpty({ message: "Token zorunludur." })
  token!: string;

  @ApiProperty({ minLength: 8, description: "Yeni şifre" })
  @IsNotEmpty({ message: "Yeni şifre zorunludur." })
  @MinLength(8, { message: "Şifre en az 8 karakter olmalıdır." })
  @Matches(PASSWORD_PATTERN, {
    message: "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir."
  })
  newPassword!: string;
}
