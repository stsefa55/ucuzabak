-- Feed import satır düzeyi özet / ret nedeni toplulaştırması (worker tarafından doldurulur)
ALTER TABLE "FeedImport" ADD COLUMN "importSummaryJson" JSONB;
