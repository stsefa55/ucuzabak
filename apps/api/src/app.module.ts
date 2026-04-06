import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminModule } from "./admin/admin.module";
import { EmailModule } from "./email/email.module";
import { AffiliateModule } from "./affiliate/affiliate.module";
import { AuthModule } from "./auth/auth.module";
import { BannersModule } from "./banners/banners.module";
import { BrandsModule } from "./brands/brands.module";
import { CacheModule } from "./cache/cache.module";
import { CategoriesModule } from "./categories/categories.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { HealthModule } from "./health/health.module";
import { PriceAlertsModule } from "./price-alerts/price-alerts.module";
import { ProductsModule } from "./products/products.module";
import { SearchModule } from "./search/search.module";
import { StoresModule } from "./stores/stores.module";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EmailModule,
    CacheModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100
      }
    ]),
    HealthModule,
    AuthModule,
    BannersModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    StoresModule,
    FavoritesModule,
    PriceAlertsModule,
    SearchModule,
    AdminModule,
    AffiliateModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}

