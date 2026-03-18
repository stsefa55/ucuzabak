import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" }
    });
  }

  listAll() {
    return this.prisma.banner.findMany({
      orderBy: [{ position: "asc" }, { id: "asc" }]
    });
  }

  create(data: { imageUrl: string; linkUrl?: string; title?: string; position?: number }) {
    return this.prisma.banner.create({
      data: {
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl ?? null,
        title: data.title ?? null,
        position: data.position ?? 0
      }
    });
  }

  update(
    id: number,
    data: { imageUrl?: string; linkUrl?: string; title?: string; position?: number; isActive?: boolean }
  ) {
    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });
  }

  delete(id: number) {
    return this.prisma.banner.delete({ where: { id } });
  }
}
