import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BrandsController } from "./brands.controller";
import { BrandsService } from "./brands.service";

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, PrismaService]
})
export class BrandsModule {}

