import { IsString, MinLength } from "class-validator";

export class ConfirmEmailChangeDto {
  @IsString()
  @MinLength(20, { message: "Geçersiz bağlantı." })
  token!: string;
}
