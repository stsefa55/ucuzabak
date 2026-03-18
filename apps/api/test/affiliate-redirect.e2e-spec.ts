import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Affiliate redirect (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("redirects to affiliateUrl and logs a click", async () => {
    // create a minimal product, store, offer for testing
    const store = await prisma.store.create({
      data: { name: "Test Store", slug: `test-store-${Date.now()}` }
    });

    const product = await prisma.product.create({
      data: { name: "Affiliate Test Product", slug: `affiliate-test-${Date.now()}` }
    });

    const offer = await prisma.offer.create({
      data: {
        productId: product.id,
        storeId: store.id,
        storeProductId: (await prisma.storeProduct.create({
          data: {
            storeId: store.id,
            externalId: `ext-${Date.now()}`,
            title: "Affiliate test store product",
            url: "https://example.com/store-product"
          }
        })).id,
        currentPrice: 1000,
        affiliateUrl: "https://example.com/redirect-target"
      }
    });

    const server = app.getHttpServer();

    const res = await request(server)
      .get(`/api/v1/out/${offer.id}`)
      .set("User-Agent", "jest-test-agent")
      .set("Referer", "http://localhost/test")
      .expect(302);

    expect(res.header.location).toBe("https://example.com/redirect-target");

    const clicks = await prisma.affiliateClick.findMany({
      where: { offerId: offer.id }
    });

    expect(clicks.length).toBeGreaterThan(0);
  });
});

