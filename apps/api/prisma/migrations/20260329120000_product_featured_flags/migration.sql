-- Öne çıkan vitrin: admin tarafından yönetilen sıra
ALTER TABLE "Product" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "featuredSortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Product_isFeatured_featuredSortOrder_idx" ON "Product" ("isFeatured", "featuredSortOrder");
