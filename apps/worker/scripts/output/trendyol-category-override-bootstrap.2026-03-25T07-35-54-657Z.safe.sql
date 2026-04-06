-- Auto-generated bootstrap overrides (safe candidates only)
-- Source: trendyol
BEGIN;
-- Bot & Bootie -> ayakkabi-canta-bot-ve-cizme-bot (366 rows)
-- overrideKey: trendyol|full|bot ve bootie
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','bot ve bootie',124,0.90,true,'Bot & Bootie',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Termal Giyim & İçlik -> outdoor-giyim-termal-giyim (217 rows)
-- overrideKey: trendyol|full|termal giyim ve iclik
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','termal giyim ve iclik',336,0.90,true,'Termal Giyim & İçlik',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Koşu & Antrenman Ayakkabısı -> spor-outdoor-kosu (147 rows)
-- overrideKey: trendyol|full|kosu ve antrenman ayakkabisi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kosu ve antrenman ayakkabisi',592,0.90,true,'Koşu & Antrenman Ayakkabısı',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Yabancı Dil Roman -> kitap-muzik-film-yabanci-dil (103 rows)
-- overrideKey: trendyol|full|yabanci dil roman
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','yabanci dil roman',406,0.90,true,'Yabancı Dil Roman',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Tıraş Köpük ve Jeli -> tras (102 rows)
-- overrideKey: trendyol|full|tiras kopuk ve jeli
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','tiras kopuk ve jeli',32,0.90,true,'Tıraş Köpük ve Jeli',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Kedi Vitamini -> pet-shop-kedi (101 rows)
-- overrideKey: trendyol|full|kedi vitamini
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kedi vitamini',619,0.90,true,'Kedi Vitamini',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Oyuncak Dolabı -> anne-bebek-oyuncak (101 rows)
-- overrideKey: trendyol|full|oyuncak dolabi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','oyuncak dolabi',574,0.90,true,'Oyuncak Dolabı',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Bisiklet Kaskı -> bisiklet (100 rows)
-- overrideKey: trendyol|full|bisiklet kaski
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','bisiklet kaski',45,0.90,true,'Bisiklet Kaskı',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Kedi Fırça ve Tarağı -> pet-shop-kedi (100 rows)
-- overrideKey: trendyol|full|kedi firca ve taragi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kedi firca ve taragi',619,0.90,true,'Kedi Fırça ve Tarağı',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
-- Kayak Ayakkabısı -> spor-outdoor-kis-sporlari-kayak (100 rows)
-- overrideKey: trendyol|full|kayak ayakkabisi
INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('trendyol','FULL','kayak ayakkabisi',602,0.90,true,'Kayak Ayakkabısı',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();
COMMIT;