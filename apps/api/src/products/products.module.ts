import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductsSimilarService } from "./products.similar.service";

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsSimilarService, PrismaService],
  exports: [ProductsService, ProductsSimilarService]
})
export class ProductsModule {}

