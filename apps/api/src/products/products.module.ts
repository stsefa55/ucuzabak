import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductsSimilarService } from "./products.similar.service";

@Module({
  imports: [CategoriesModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsSimilarService, PrismaService],
  exports: [ProductsService, ProductsSimilarService]
})
export class ProductsModule {}

