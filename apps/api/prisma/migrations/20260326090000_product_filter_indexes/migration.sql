-- Product listing/filter query performance indexes
CREATE INDEX IF NOT EXISTS "Product_status_categoryId_idx"
ON "Product"("status", "categoryId");

CREATE INDEX IF NOT EXISTS "Product_status_brandId_idx"
ON "Product"("status", "brandId");

CREATE INDEX IF NOT EXISTS "Product_status_lowestPriceCache_idx"
ON "Product"("status", "lowestPriceCache");

