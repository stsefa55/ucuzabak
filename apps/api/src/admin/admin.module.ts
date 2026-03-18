import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BannersModule } from "../banners/banners.module";
import { PrismaService } from "../prisma/prisma.service";
import { AdminController } from "./admin.controller";

@Module({
  imports: [AuthModule, BannersModule],
  controllers: [AdminController],
  providers: [PrismaService]
})
export class AdminModule {}

