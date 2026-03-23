import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

interface JwtPayload {
  sub: number;
  role: UserRole;
  email: string;
}

interface RefreshJwtPayload extends JwtPayload {
  jti: string;
  typ: "refresh";
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async isEmailAvailable(email: string): Promise<boolean> {
    const value = email?.trim();
    if (!value) return false;
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: value, mode: "insensitive" } }
    });
    return !existing;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (existing) {
      throw new UnauthorizedException("E-posta zaten kayıtlı.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone || undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined
      }
    });

    const tokens = await this.issueTokens(user.id, user.role, user.email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (!user) {
      throw new UnauthorizedException("Geçersiz kimlik bilgileri.");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Geçersiz kimlik bilgileri.");
    }

    const tokens = await this.issueTokens(user.id, user.role, user.email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  /**
   * Refresh token rotation:
   * - verify JWT signature + exp
   * - ensure token exists in DB (by jti) and hash matches
   * - ensure not revoked, not expired
   * - ensure user still exists and is ACTIVE
   * - revoke old token, issue and store a new refresh token
   */
  async rotateRefreshToken(oldRefreshToken: string) {
    const payload = await this.verifyRefreshToken(oldRefreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Kullanıcı bulunamadı veya aktif değil.");
    }

    const tokenRow = await this.prisma.refreshToken.findUnique({
      where: { jti: payload.jti }
    });
    if (!tokenRow || tokenRow.userId !== payload.sub) {
      throw new UnauthorizedException("Geçersiz refresh token.");
    }
    if (tokenRow.revoked || tokenRow.expiresAt <= new Date()) {
      throw new UnauthorizedException("Geçersiz veya süresi dolmuş refresh token.");
    }

    // Hash check (plain token DB'de yok)
    const presentedHash = this.hashRefreshToken(oldRefreshToken);
    if (!this.safeEqual(presentedHash, tokenRow.tokenHash)) {
      throw new UnauthorizedException("Geçersiz refresh token.");
    }

    await this.prisma.refreshToken.update({
      where: { jti: payload.jti },
      data: { revoked: true }
    });

    return await this.issueTokens(user.id, user.role, user.email);
  }

  async revokeRefreshToken(token: string) {
    try {
      const payload = await this.verifyRefreshToken(token);
      await this.prisma.refreshToken.updateMany({
        where: { jti: payload.jti, userId: payload.sub },
        data: { revoked: true }
      });
    } catch {
      // ignore invalid token on logout
    }
  }

  private getAccessTtlSeconds() {
    return Number(process.env.API_JWT_ACCESS_TOKEN_TTL || 60 * 15); // 15 dakika
  }

  private getRefreshTtlSeconds() {
    return Number(process.env.API_JWT_REFRESH_TOKEN_TTL || 60 * 60 * 24 * 7); // 7 gün
  }

  private async issueTokens(userId: number, role: UserRole, email: string) {
    const payload: JwtPayload = { sub: userId, role, email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.getAccessTtlSeconds()
    });

    const refreshTtl = this.getRefreshTtlSeconds();
    const jti = crypto.randomUUID();
    const refreshPayload: RefreshJwtPayload = { ...payload, jti, typ: "refresh" };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshTtl
    });

    await this.prisma.refreshToken.create({
      data: {
        userId,
        jti,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      }
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshJwtPayload> {
    // verifyAsync exp/signature validation yapar; secret aynı
    const raw = await this.jwtService.verifyAsync(token, {
      secret: process.env.API_JWT_SECRET || "change-me-in-dev"
    });
    const payload = raw as Partial<RefreshJwtPayload>;

    if (!payload || payload.typ !== "refresh" || !payload.jti || !payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException("Geçersiz refresh token.");
    }
    return payload as RefreshJwtPayload;
  }

  private getRefreshPepper(): string {
    // Prod'da mutlaka set edin. Dev'de fallback var ama önerilmez.
    return process.env.API_REFRESH_TOKEN_PEPPER || process.env.API_JWT_SECRET || "change-me-in-dev";
  }

  private hashRefreshToken(token: string): string {
    return crypto.createHmac("sha256", this.getRefreshPepper()).update(token).digest("hex");
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  }

  private sanitizeUser(user: { id: number; email: string; name: string; role: UserRole; phone: string | null }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone
    };
  }
}

