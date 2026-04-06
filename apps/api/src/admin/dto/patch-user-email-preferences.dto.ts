import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class PatchUserEmailPreferencesDto {
  @ApiProperty({ description: "Pazarlama / toplu e-posta; işlemsel e-postalar etkilenmez." })
  @IsBoolean()
  marketingEmailOptIn!: boolean;
}
