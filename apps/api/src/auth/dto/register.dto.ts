import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, Matches, MinLength } from "class-validator";

/** En az 8 karakter, en az bir büyük harf, bir küçük harf ve bir rakam */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @MinLength(7)
  phone?: string;

  @ApiProperty({ minLength: 8, description: "En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam" })
  @IsNotEmpty()
  @MinLength(8, { message: "Şifre en az 8 karakter olmalıdır." })
  @Matches(PASSWORD_PATTERN, {
    message: "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir."
  })
  password!: string;
}

