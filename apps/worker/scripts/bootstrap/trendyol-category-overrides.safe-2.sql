-- Faz 2.1 bootstrap (2. parti / güvenli adaylar)
-- Kaynak: trendyol
-- Üretim referansı: scripts/output/trendyol-category-override-bootstrap.2026-03-25T07-46-18-242Z.safe.sql
-- normalizeCategoryPhrase ile üretilmiş normalizedKey değerleri kullanılır.

BEGIN;

-- Kahvaltılık Gevrek -> Kahvaltılık
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kahvaltilik gevrek',68,0.90,true,'Kahvaltılık Gevrek',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Kedi Tırmalaması -> Kedi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kedi tirmalamasi',619,0.90,true,'Kedi Tırmalaması',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Bebek Odası Takımı -> Bebek Odası
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','bebek odasi takimi',41,0.90,true,'Bebek Odası Takımı',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Kedi Ödülü -> Kedi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kedi odulu',619,0.90,true,'Kedi Ödülü',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Köpek Ödülü -> Köpek
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kopek odulu',622,0.90,true,'Köpek Ödülü',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Yemek Odası Takımı -> Yemek Odası
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','yemek odasi takimi',79,0.90,true,'Yemek Odası Takımı',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Kedi Tuvaleti -> Kedi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kedi tuvaleti',619,0.90,true,'Kedi Tuvaleti',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Bisiklet Aksesuarı -> Bisiklet
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','bisiklet aksesuari',45,0.90,true,'Bisiklet Aksesuarı',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Bilgisayar Oyunu -> Bilgisayar
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','bilgisayar oyunu',466,0.90,true,'Bilgisayar Oyunu',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Blender Seti -> Blender
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','blender seti',521,0.90,true,'Blender Seti',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Biberon Isıtıcı ve Sterilizatör -> Biberon
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','biberon isitici ve sterilizator',566,0.90,true,'Biberon Isıtıcı ve Sterilizatör',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

COMMIT;

