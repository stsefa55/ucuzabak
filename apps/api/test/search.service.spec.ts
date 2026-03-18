import { Test } from "@nestjs/testing";
import { ProductStatus } from "@prisma/client";
import { PrismaService } from "../src/prisma/prisma.service";
import { SearchService } from "../src/search/search.service";

describe("SearchService", () => {
  let searchService: SearchService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SearchService, PrismaService]
    }).compile();

    searchService = moduleRef.get(SearchService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns products for a simple q search", async () => {
    const result = await searchService.searchProducts({
      q: "iphone",
      page: 1,
      pageSize: 10
    } as any);

    expect(result).toHaveProperty("items");
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("applies category and price filters together", async () => {
    // assume seeded "Cep Telefonu" category exists
    const result = await searchService.searchProducts({
      q: "",
      categorySlug: "cep-telefonu",
      minPrice: 1000,
      maxPrice: 100000,
      page: 1,
      pageSize: 50
    } as any);

    expect(result.items.every((p) => p.category?.slug === "cep-telefonu")).toBe(true);
  });

  it("excludes inactive products", async () => {
    const product = await prisma.product.create({
      data: {
        name: "Inactive Test Product",
        slug: `inactive-test-${Date.now()}`,
        status: ProductStatus.INACTIVE
      }
    });

    const result = await searchService.searchProducts({
      q: "Inactive Test Product",
      page: 1,
      pageSize: 10
    } as any);

    expect(result.items.find((p) => p.id === product.id)).toBeUndefined();

    await prisma.product.delete({ where: { id: product.id } });
  });
});

