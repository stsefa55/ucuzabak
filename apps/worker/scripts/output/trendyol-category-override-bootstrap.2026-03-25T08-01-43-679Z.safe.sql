-- Auto-generated bootstrap overrides (safe candidates only)
-- Source: trendyol
BEGIN;
-- Kedi Ödülü -> pet-shop-kedi (100 rows)
-- overrideKey: trendyol|full|kedi odulu
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kedi odulu',619,0.90,true,'Kedi Ödülü',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Köpek Ödülü -> pet-shop-kopek (100 rows)
-- overrideKey: trendyol|full|kopek odulu
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kopek odulu',622,0.90,true,'Köpek Ödülü',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Yemek Odası Takımı -> mobilya-yemek-odasi (100 rows)
-- overrideKey: trendyol|full|yemek odasi takimi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','yemek odasi takimi',79,0.90,true,'Yemek Odası Takımı',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Kedi Tuvaleti -> pet-shop-kedi (100 rows)
-- overrideKey: trendyol|full|kedi tuvaleti
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kedi tuvaleti',619,0.90,true,'Kedi Tuvaleti',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Bisiklet Aksesuarı -> bisiklet (100 rows)
-- overrideKey: trendyol|full|bisiklet aksesuari
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','bisiklet aksesuari',45,0.90,true,'Bisiklet Aksesuarı',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Bilgisayar Oyunu -> elektronik-bilgisayar (100 rows)
-- overrideKey: trendyol|full|bilgisayar oyunu
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','bilgisayar oyunu',466,0.90,true,'Bilgisayar Oyunu',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Blender Seti -> ev-yasam-mutfak-aletleri-blender (100 rows)
-- overrideKey: trendyol|full|blender seti
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','blender seti',521,0.90,true,'Blender Seti',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Biberon Isıtıcı ve Sterilizatör -> anne-bebek-biberon-ve-emzik-biberon (100 rows)
-- overrideKey: trendyol|full|biberon isitici ve sterilizator
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','biberon isitici ve sterilizator',566,0.90,true,'Biberon Isıtıcı ve Sterilizatör',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
COMMIT;