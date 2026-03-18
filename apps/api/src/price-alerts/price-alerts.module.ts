import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "../prisma/prisma.service";
import { PriceAlertsController } from "./price-alerts.controller";
import { PriceAlertsService } from "./price-alerts.service";

@Module({
  imports: [AuthModule],
  controllers: [PriceAlertsController],
  providers: [PriceAlertsService, PrismaService]
})
export class PriceAlertsModule {}

