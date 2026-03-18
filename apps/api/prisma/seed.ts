import { PrismaClient, UserRole } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

export async function main() {
  // Clean existing data in a safe order for development seeding.
  await prisma.affiliateClick.deleteMany();
  await prisma.unmatchedProductReview.deleteMany();
  await prisma.feedImport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.priceAlert.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.storeProduct.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const userPasswordHash = await bcrypt.hash("User123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@ucuzabak.com",
      name: "Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN
    }
  });

  const user = await prisma.user.create({
    data: {
      email: "user@ucuzabak.com",
      name: "Kullanıcı",
      passwordHash: userPasswordHash,
      role: UserRole.USER
    }
  });

  const electronics = await prisma.category.create({
    data: {
      name: "Elektronik",
      slug: "elektronik"
    }
  });

  const phones = await prisma.category.create({
    data: {
      name: "Cep Telefonu",
      slug: "cep-telefonu",
      parentId: electronics.id
    }
  });

  const laptops = await prisma.category.create({
    data: {
      name: "Laptop",
      slug: "laptop",
      parentId: electronics.id
    }
  });

  const tv = await prisma.category.create({
    data: {
      name: "Televizyon",
      slug: "televizyon",
      parentId: electronics.id
    }
  });

  const apple = await prisma.brand.create({
    data: {
      name: "Apple",
      slug: "apple"
    }
  });

  const samsung = await prisma.brand.create({
    data: {
      name: "Samsung",
      slug: "samsung"
    }
  });

  const lenovo = await prisma.brand.create({
    data: {
      name: "Lenovo",
      slug: "lenovo"
    }
  });

  const store1 = await prisma.store.create({
    data: {
      name: "UcuzaBak Market",
      slug: "ucuzabak-market"
    }
  });

  const store2 = await prisma.store.create({
    data: {
      name: "TeknoSepet",
      slug: "teknosepet"
    }
  });

  const store3 = await prisma.store.create({
    data: {
      name: "HizliAlisveris",
      slug: "hizli-alisveris"
    }
  });

  // Create ~20 products across phones, laptops, tv
  const productsData = [
    {
      name: "Apple iPhone 14 128GB",
      slug: "apple-iphone-14-128gb",
      brandId: apple.id,
      categoryId: phones.id,
      ean: "0194253371234",
      modelNumber: "A2882",
      specsJson: {
        brand: "Apple",
        capacity_gb: 128,
        ram_gb: 6,
        screen_size_inch: 6.1
      }
    },
    {
      name: "Apple iPhone 14 256GB",
      slug: "apple-iphone-14-256gb",
      brandId: apple.id,
      categoryId: phones.id,
      ean: "0194253372234",
      modelNumber: "A2882",
      specsJson: {
        brand: "Apple",
        capacity_gb: 256,
        ram_gb: 6,
        screen_size_inch: 6.1
      }
    },
    {
      name: "Apple iPhone 13 128GB",
      slug: "apple-iphone-13-128gb",
      brandId: apple.id,
      categoryId: phones.id,
      ean: "0194253141234",
      modelNumber: "A2633",
      specsJson: {
        brand: "Apple",
        capacity_gb: 128,
        ram_gb: 4,
        screen_size_inch: 6.1
      }
    },
    {
      name: "Samsung Galaxy S23 256GB",
      slug: "samsung-galaxy-s23-256gb",
      brandId: samsung.id,
      categoryId: phones.id,
      ean: "8806094841234",
      modelNumber: "SM-S911B",
      specsJson: {
        brand: "Samsung",
        capacity_gb: 256,
        ram_gb: 8,
        screen_size_inch: 6.1
      }
    },
    {
      name: "Samsung Galaxy S23 128GB",
      slug: "samsung-galaxy-s23-128gb",
      brandId: samsung.id,
      categoryId: phones.id,
      ean: "8806094842234",
      modelNumber: "SM-S911B",
      specsJson: {
        brand: "Samsung",
        capacity_gb: 128,
        ram_gb: 8,
        screen_size_inch: 6.1
      }
    },
    {
      name: "Samsung Galaxy A54 128GB",
      slug: "samsung-galaxy-a54-128gb",
      brandId: samsung.id,
      categoryId: phones.id,
      ean: "8806094881234",
      modelNumber: "SM-A546B",
      specsJson: {
        brand: "Samsung",
        capacity_gb: 128,
        ram_gb: 8,
        screen_size_inch: 6.4
      }
    },
    {
      name: "Lenovo IdeaPad 3 15\" Ryzen 5",
      slug: "lenovo-ideapad-3-ryzen-5",
      brandId: lenovo.id,
      categoryId: laptops.id,
      ean: "0196112341234",
      modelNumber: "82KU00LUTX",
      specsJson: {
        brand: "Lenovo",
        ram_gb: 8,
        ssd_gb: 512,
        screen_size_inch: 15.6
      }
    },
    {
      name: "Lenovo IdeaPad Gaming 3 RTX 3050",
      slug: "lenovo-ideapad-gaming-3-rtx3050",
      brandId: lenovo.id,
      categoryId: laptops.id,
      ean: "0196112342234",
      modelNumber: "82K200LUTX",
      specsJson: {
        brand: "Lenovo",
        ram_gb: 16,
        ssd_gb: 512,
        gpu: "RTX 3050"
      }
    },
    {
      name: "Samsung 55\" 4K UHD Smart TV",
      slug: "samsung-55-4k-uhd-smart-tv",
      brandId: samsung.id,
      categoryId: tv.id,
      ean: "8806094991234",
      modelNumber: "UE55AU7100",
      specsJson: {
        brand: "Samsung",
        screen_size_inch: 55,
        resolution: "4K"
      }
    },
    {
      name: "Samsung 65\" QLED 4K Smart TV",
      slug: "samsung-65-qled-4k-smart-tv",
      brandId: samsung.id,
      categoryId: tv.id,
      ean: "8806094992234",
      modelNumber: "QE65Q60B",
      specsJson: {
        brand: "Samsung",
        screen_size_inch: 65,
        resolution: "4K QLED"
      }
    }
  ];

  // Duplicate/variant products to reach 20+ total
  const extraProducts = Array.from({ length: 12 }).map((_, index) => ({
    name: `Genel Elektronik Ürün ${index + 1}`,
    slug: `genel-elektronik-urun-${index + 1}`,
    brandId: index % 2 === 0 ? samsung.id : lenovo.id,
    categoryId: index % 3 === 0 ? laptops.id : phones.id,
    ean: `10000000000${index}`,
    modelNumber: `MODEL-${index}`,
    specsJson: {
      brand: index % 2 === 0 ? "Samsung" : "Lenovo",
      ram_gb: 4 + (index % 4) * 4
    }
  }));

  const allProductsInput = [...productsData, ...extraProducts];

  const products = [];
  for (const data of allProductsInput) {
    const product = await prisma.product.create({
      data
    });
    products.push(product);
  }

  // Create StoreProducts and Offers with basic price history
  const stores = [store1, store2, store3];

  for (const product of products) {
    for (const store of stores) {
      const basePrice = 1000 + product.id * 50 + store.id * 10;

      const storeProduct = await prisma.storeProduct.create({
        data: {
          storeId: store.id,
          externalId: `${store.slug}-${product.slug}`,
          productId: product.id,
          title: product.name,
          url: `https://example.com/${store.slug}/${product.slug}`,
          ean: product.ean ?? undefined,
          modelNumber: product.modelNumber ?? undefined
        }
      });

      const offer = await prisma.offer.create({
        data: {
          productId: product.id,
          storeId: store.id,
          storeProductId: storeProduct.id,
          currentPrice: basePrice,
          originalPrice: basePrice + 200
        }
      });

      await prisma.priceHistory.createMany({
        data: [
          {
            offerId: offer.id,
            price: basePrice + 100,
            currency: "TRY",
            recordedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          {
            offerId: offer.id,
            price: basePrice + 50,
            currency: "TRY",
            recordedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          },
          {
            offerId: offer.id,
            price: basePrice,
            currency: "TRY",
            recordedAt: new Date()
          }
        ]
      });
    }
  }

  // Simple favorites and price alerts for the normal user
  const someProducts = products.slice(0, 5);
  for (const product of someProducts) {
    await prisma.favorite.create({
      data: {
        userId: user.id,
        productId: product.id
      }
    });

    await prisma.priceAlert.create({
      data: {
        userId: user.id,
        productId: product.id,
        targetPrice: 1000
      }
    });
  }

  // Update basic product cache fields (lowest price, offer count, last price update)
  for (const product of products) {
    const offers = await prisma.offer.findMany({
      where: { productId: product.id },
      orderBy: { currentPrice: "asc" }
    });

    if (offers.length === 0) continue;

    const lowest = offers[0];

    const lastHistory = await prisma.priceHistory.findFirst({
      where: { offerId: lowest.id },
      orderBy: { recordedAt: "desc" }
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        lowestPriceCache: lowest.currentPrice,
        lowestPriceStoreId: lowest.storeId,
        offerCountCache: offers.length,
        lastPriceUpdatedAt: lastHistory?.recordedAt ?? new Date()
      }
    });
  }
}

if (require.main === module) {
  main()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("Seed completed.");
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Seed failed", err);
      process.exit(1);
    });
}

