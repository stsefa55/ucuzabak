import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { AffiliateController } from "./affiliate.controller";
import { AffiliateService } from "./affiliate.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AffiliateController],
  providers: [AffiliateService, PrismaService]
})
export class AffiliateModule {}

