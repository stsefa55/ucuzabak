-- Auto-generated bootstrap overrides (safe candidates only)
-- Source: trendyol
BEGIN;
-- Kahvaltılık Gevrek -> kahvaltilik (100 rows)
-- overrideKey: trendyol|full|kahvaltilik gevrek
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kahvaltilik gevrek',68,0.90,true,'Kahvaltılık Gevrek',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Kedi Tırmalaması -> pet-shop-kedi (100 rows)
-- overrideKey: trendyol|full|kedi tirmalamasi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kedi tirmalamasi',619,0.90,true,'Kedi Tırmalaması',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Bebek Odası Takımı -> bebek-odasi (100 rows)
-- overrideKey: trendyol|full|bebek odasi takimi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','bebek odasi takimi',41,0.90,true,'Bebek Odası Takımı',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
COMMIT;