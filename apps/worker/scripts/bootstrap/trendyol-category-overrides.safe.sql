-- Faz 2.1 bootstrap (güvenli adaylar)
-- Kaynak: trendyol
-- normalizeCategoryPhrase ile üretilmiş normalizedKey değerleri kullanılır.

BEGIN;

-- Bot & Bootie -> Bot
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','bot ve bootie',124,0.90,true,'Bot & Bootie',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Termal Giyim & İçlik -> Termal Giyim
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','termal giyim ve iclik',336,0.90,true,'Termal Giyim & İçlik',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Koşu & Antrenman Ayakkabısı -> Koşu
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','kosu ve antrenman ayakkabisi',592,0.90,true,'Koşu & Antrenman Ayakkabısı',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Yabancı Dil Roman -> Yabancı Dil
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','yabanci dil roman',406,0.90,true,'Yabancı Dil Roman',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

-- Tıraş Köpük ve Jeli -> Tıraş
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt")
VALUES ('trendyol','FULL','tiras kopuk ve jeli',32,0.90,true,'Tıraş Köpük ve Jeli',NOW(),NOW())
ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE
SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();

COMMIT;
