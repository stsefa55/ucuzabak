import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "./auth-messages";

/**
 * JwtAuthGuard ile birlikte kullanın. Veritabanındaki güncel emailVerified değerini okur
 * (doğrulama sonrası eski access token ile bile doğru karar).
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = (request as any).user?.sub as number | undefined;
    if (sub == null || !Number.isFinite(sub)) {
      throw new UnauthorizedException("Yetkilendirme gerekli.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { emailVerified: true, status: true }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(EMAIL_VERIFICATION_REQUIRED_MESSAGE);
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(EMAIL_VERIFICATION_REQUIRED_MESSAGE);
    }

    return true;
  }
}
