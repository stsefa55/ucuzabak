-- Feed import özeti: canonical ürüne bağlanan / bağlanmayan satır sayıları
ALTER TABLE "FeedImport" ADD COLUMN "matchedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FeedImport" ADD COLUMN "unmatchedCount" INTEGER NOT NULL DEFAULT 0;
