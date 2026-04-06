-- Faz 2.1 bootstrap (3. parti / yüksek etkili + düşük risk)
-- Kaynak: trendyol
-- normalizeCategoryPhrase ile uyumlu normalizedKey kullanılır.

BEGIN;

-- Kedi Ödülü -> pet-shop-kedi (yeni; DB'de yok)
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kedi odulu',619,0.90,true,'Kedi Ödülü',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Köpek Ödülü -> pet-shop-kopek (yeni; DB'de yok)
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kopek odulu',622,0.90,true,'Köpek Ödülü',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Yemek Odası Takımı -> mobilya-yemek-odasi (yeni; DB'de yok)
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','yemek odasi takimi',79,0.90,true,'Yemek Odası Takımı',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Kedi Tuvaleti -> pet-shop-kedi (yeni; DB'de yok)
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kedi tuvaleti',619,0.90,true,'Kedi Tuvaleti',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Bisiklet Aksesuarı -> bisiklet (yeni; DB'de yok)
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','bisiklet aksesuari',45,0.90,true,'Bisiklet Aksesuarı',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Blender Seti -> ev-yasam-mutfak-aletleri-blender (yeni; DB'de yok)
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','blender seti',521,0.90,true,'Blender Seti',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Biberon Isıtıcı ve Sterilizatör -> anne-bebek-biberon-ve-emzik-biberon (yeni; DB'de yok)
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','biberon isitici ve sterilizator',566,0.90,true,'Biberon Isıtıcı ve Sterilizatör',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

COMMIT;

