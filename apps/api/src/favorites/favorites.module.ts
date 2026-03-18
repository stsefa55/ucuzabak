import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "../prisma/prisma.service";
import { FavoritesController } from "./favorites.controller";
import { FavoritesService } from "./favorites.service";

@Module({
  imports: [AuthModule],
  controllers: [FavoritesController],
  providers: [FavoritesService, PrismaService]
})
export class FavoritesModule {}

