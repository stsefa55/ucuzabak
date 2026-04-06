-- Feed import sırasında UI ilerlemesi: toplam satır + ara güncellemeler
ALTER TABLE "FeedImport" ADD COLUMN IF NOT EXISTS "totalItems" INTEGER;
