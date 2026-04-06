import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RestoreBackupDto {
  @ApiProperty({ example: "ucuzabak-backup-1710000000000.sql" })
  @IsString()
  @MinLength(8)
  id!: string;

  @ApiProperty({ description: 'Tam olarak "RESTORE_DATABASE" yazılmalıdır.', example: "RESTORE_DATABASE" })
  @IsString()
  confirm!: string;
}
