import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { getJwtSecret } from "./auth-secrets";
import { EmailVerifiedGuard } from "./email-verified.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: {
          expiresIn: Number(process.env.API_JWT_ACCESS_TOKEN_TTL || 900)
        }
      })
    }),
    UsersModule
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtAuthGuard, RolesGuard, EmailVerifiedGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard, EmailVerifiedGuard]
})
export class AuthModule {}

