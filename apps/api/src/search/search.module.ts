import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { PrismaService } from "../prisma/prisma.service";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [CategoriesModule],
  controllers: [SearchController],
  providers: [SearchService, PrismaService]
})
export class SearchModule {}

