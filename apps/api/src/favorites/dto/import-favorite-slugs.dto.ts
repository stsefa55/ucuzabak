import { ArrayMaxSize, IsArray, IsString, MaxLength } from "class-validator";

export class ImportFavoriteSlugsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  slugs!: string[];
}
