import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listTree() {
    return this.prisma.category.findMany({
      orderBy: { position: "asc" }
    });
  }

  /** Kategori listesi + her kategorideki aktif ürün sayısı (sadece üst kategoriler) */
  async listWithProductCount() {
    const [categories, countRows] = await Promise.all([
      this.prisma.category.findMany({
        where: { parentId: null },
        orderBy: { position: "asc" },
        select: { id: true, name: true, slug: true }
      }),
      this.prisma.product.groupBy({
        by: ["categoryId"],
        _count: { id: true },
        where: { status: ProductStatus.ACTIVE, categoryId: { not: null } }
      })
    ]);
    const countByCategoryId = Object.fromEntries(countRows.map((r) => [r.categoryId, r._count.id]));
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: countByCategoryId[c.id] ?? 0
    }));
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug }
    });
    if (!category) {
      throw new NotFoundException("Kategori bulunamadı.");
    }
    return category;
  }
}

