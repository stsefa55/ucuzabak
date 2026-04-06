import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Response, Request } from "express";
import * as crypto from "crypto";
import { getAffiliateIpSalt, getJwtSecret } from "../auth/auth-secrets";
import { PrismaService } from "../prisma/prisma.service";
import { AffiliateService } from "./affiliate.service";
import { Throttle } from "@nestjs/throttler";

@Controller("out")
export class AffiliateController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly affiliateService: AffiliateService,
    private readonly jwtService: JwtService,
  ) {}

  @Get(":offerId")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async redirect(@Param("offerId") offerIdParam: string, @Req() req: Request, @Res() res: Response) {
    const offerId = Number(offerIdParam);
    if (!Number.isFinite(offerId)) {
      return res.redirect(302, "/");
    }

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        productId: true,
        storeId: true,
        affiliateUrl: true
      }
    });

    if (!offer || !offer.affiliateUrl) {
      return res.redirect(302, "/");
    }

    const targetUrl = offer.affiliateUrl;

    // Tıklama sadece geçerli affiliate linki olan tekliflerde kaydedilir
    try {
      const rawIpHeader = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
      const rawIp = rawIpHeader || req.ip || req.socket.remoteAddress || "";
      const salt = getAffiliateIpSalt();
      const ipHash = rawIp
        ? crypto.createHash("sha256").update(rawIp + salt).digest("hex")
        : "unknown";

      let userId: number | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const payload: any = await this.jwtService.verifyAsync(token, {
            secret: getJwtSecret()
          });
          if (payload?.sub) {
            userId = Number(payload.sub);
          }
        } catch {
          // ignore token errors for click logging
        }
      }

      const userAgent = (req.headers["user-agent"] as string) || null;
      const referer = (req.headers.referer as string) || null;

      void this.affiliateService
        .logClick({
          offerId: offer.id,
          productId: offer.productId,
          storeId: offer.storeId,
          userId,
          ipHash,
          userAgent,
          referer
        })
        .catch(() => {
          // log but do not block redirect
        });
    } catch {
      // Swallow logging errors
    }

    return res.redirect(302, targetUrl);
  }
}

