import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import {
  resolveEmailVerificationTtlSeconds,
  resolvePasswordResetTtlSeconds,
  resolveStorefrontBaseUrlForBackend
} from "@ucuzabak/shared";
import { CacheService } from "../cache/cache.service";
import { EmailQueueService } from "../email/email-queue.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  getEmailVerificationPepper,
  getJwtSecret,
  getPasswordResetPepper,
  getRefreshTokenPepper
} from "./auth-secrets";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

/** Giriş hatalarında tek mesaj (hesap varlığı sızdırılmaz). */
export const AUTH_LOGIN_GENERIC_MESSAGE = "E-posta veya şifre hatalı.";

const RESEND_VERIFICATION_GENERIC =
  "Eğer bu e-posta adresi sistemde kayıtlı ve henüz doğrulanmamışsa, doğrulama bağlantısı gönderildi.";

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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailQueue: EmailQueueService,
    private readonly cache: CacheService,
  ) {}

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

    this.emailQueue.safeEnqueueWelcome({
      to: user.email,
      name: user.name
    });

    await this.createFreshEmailVerificationTokenAndQueue(user.id, user.email);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, clientIp?: string) {
    const ip = (clientIp || "unknown").trim() || "unknown";
    const normEmail = (dto.email || "").trim().toLowerCase();
    const emailKey = crypto.createHash("sha256").update(normEmail).digest("hex").slice(0, 32);

    if (await this.isLoginThrottled(ip, emailKey)) {
      throw new UnauthorizedException(AUTH_LOGIN_GENERIC_MESSAGE);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (!user) {
      await this.recordLoginFailure(ip, emailKey);
      throw new UnauthorizedException(AUTH_LOGIN_GENERIC_MESSAGE);
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.recordLoginFailure(ip, emailKey);
      throw new UnauthorizedException(AUTH_LOGIN_GENERIC_MESSAGE);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordLoginFailure(ip, emailKey);
      throw new UnauthorizedException(AUTH_LOGIN_GENERIC_MESSAGE);
    }

    await this.clearLoginFailures(ip, emailKey);

    const tokens = await this.issueTokens(user.id, user.role, user.email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async verifyEmailWithToken(plainToken: string): Promise<{ success: true; message: string }> {
    const token = plainToken?.trim();
    if (!token || token.length < 20) {
      throw new BadRequestException("Doğrulama bağlantısı geçersiz veya süresi dolmuş.");
    }

    const tokenHash = this.hashEmailVerificationToken(token);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        include: { user: true }
      });

      if (!row) {
        throw new BadRequestException("Doğrulama bağlantısı geçersiz veya süresi dolmuş.");
      }
      if (row.usedAt != null) {
        throw new BadRequestException("Bu doğrulama bağlantısı zaten kullanılmış.");
      }
      if (row.expiresAt <= now) {
        throw new BadRequestException("Doğrulama bağlantısının süresi dolmuş.");
      }
      if (row.user.status !== UserStatus.ACTIVE) {
        throw new BadRequestException("Hesap aktif değil.");
      }

      const consumed = await tx.emailVerificationToken.updateMany({
        where: {
          id: row.id,
          usedAt: null,
          expiresAt: { gt: now }
        },
        data: { usedAt: now }
      });

      if (consumed.count !== 1) {
        const again = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });
        if (!again) {
          throw new BadRequestException("Doğrulama bağlantısı geçersiz veya süresi dolmuş.");
        }
        if (again.usedAt != null) {
          throw new BadRequestException("Bu doğrulama bağlantısı zaten kullanılmış.");
        }
        if (again.expiresAt <= new Date()) {
          throw new BadRequestException("Doğrulama bağlantısının süresi dolmuş.");
        }
        throw new BadRequestException("Doğrulama işlemi tamamlanamadı. Lütfen tekrar deneyin.");
      }

      await tx.user.update({
        where: { id: row.userId },
        data: { emailVerified: true }
      });
    });

    return { success: true, message: "E-posta adresiniz doğrulandı." };
  }

  /**
   * Her zaman aynı mesaj (e-posta / hesap enumerasyonu yok).
   */
  async resendVerificationEmail(emailRaw: string): Promise<{ message: string }> {
    const generic = RESEND_VERIFICATION_GENERIC;
    const normalized = emailRaw?.trim().toLowerCase();
    if (!normalized) {
      return { message: generic };
    }

    try {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: normalized, mode: "insensitive" } }
      });

      if (!user || user.status !== UserStatus.ACTIVE || user.emailVerified) {
        return { message: generic };
      }

      await this.createFreshEmailVerificationTokenAndQueue(user.id, user.email);

      return { message: generic };
    } catch (err: unknown) {
      this.logger.error(
        `Doğrulama e-postası yeniden gönderim — arka plan hatası (genel yanıt): ${String(err)}`,
      );
      return { message: generic };
    }
  }

  private async createFreshEmailVerificationTokenAndQueue(userId: number, email: string): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    });

    const plainToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = this.hashEmailVerificationToken(plainToken);
    const ttlSec = resolveEmailVerificationTtlSeconds();

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlSec * 1000)
      }
    });

    const verifyLink = this.buildEmailVerificationLink(plainToken);
    this.emailQueue.safeEnqueueVerifyEmail({ to: email, verifyLink });
  }

  private getLoginFailureWindowSec(): number {
    return Math.max(60, Number(process.env.LOGIN_FAILURE_WINDOW_SEC || 900));
  }

  private getLoginFailureMaxPerIp(): number {
    return Math.max(1, Number(process.env.LOGIN_FAILURE_MAX_PER_IP || 25));
  }

  private getLoginFailureMaxPerEmail(): number {
    return Math.max(1, Number(process.env.LOGIN_FAILURE_MAX_PER_EMAIL || 8));
  }

  private loginFailIpKey(ip: string): string {
    return `login-fail:ip:${ip}`;
  }

  private loginFailEmailKey(emailKey: string): string {
    return `login-fail:em:${emailKey}`;
  }

  private async isLoginThrottled(ip: string, emailKey: string): Promise<boolean> {
    const maxIp = this.getLoginFailureMaxPerIp();
    const maxEm = this.getLoginFailureMaxPerEmail();
    const ipK = this.loginFailIpKey(ip);
    const emK = this.loginFailEmailKey(emailKey);
    const [cIp, cEm] = await Promise.all([this.cache.getCounter(ipK), this.cache.getCounter(emK)]);
    return cIp >= maxIp || cEm >= maxEm;
  }

  private async recordLoginFailure(ip: string, emailKey: string): Promise<void> {
    const windowSec = this.getLoginFailureWindowSec();
    await Promise.all([
      this.cache.incrWithTtl(this.loginFailIpKey(ip), windowSec),
      this.cache.incrWithTtl(this.loginFailEmailKey(emailKey), windowSec)
    ]);
  }

  private async clearLoginFailures(ip: string, emailKey: string): Promise<void> {
    await Promise.all([this.cache.del(this.loginFailIpKey(ip)), this.cache.del(this.loginFailEmailKey(emailKey))]);
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

  /**
   * Her zaman aynı mesaj (e-posta enumerasyonu yok).
   * Kullanıcı yoksa veya aktif değilse e-posta gönderilmez.
   */
  async requestPasswordReset(emailRaw: string): Promise<{ message: string }> {
    const generic =
      "Eğer bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.";

    const normalized = emailRaw?.trim().toLowerCase();
    if (!normalized) {
      return { message: generic };
    }

    try {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: normalized, mode: "insensitive" } }
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        return { message: generic };
      }

      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      const plainToken = crypto.randomBytes(32).toString("base64url");
      const tokenHash = this.hashPasswordResetToken(plainToken);
      const ttlSec = resolvePasswordResetTtlSeconds();

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + ttlSec * 1000)
        }
      });

      const resetLink = this.buildPasswordResetLink(plainToken);
      try {
        await this.emailQueue.enqueueResetPassword({
          to: user.email,
          resetLink
        });
      } catch (err: unknown) {
        this.logger.warn(`Şifre sıfırlama e-postası kuyruğa alınamadı: ${String(err)}`);
      }

      return { message: generic };
    } catch (err: unknown) {
      this.logger.error(
        `Şifre sıfırlama talebi — arka plan hatası (kullanıcıya genel yanıt): ${String(err)}`,
      );
      return { message: generic };
    }
  }

  async resetPasswordWithToken(plainToken: string, newPassword: string): Promise<void> {
    const token = plainToken?.trim();
    if (!token || token.length < 20) {
      throw new BadRequestException("Geçersiz şifre sıfırlama bağlantısı.");
    }

    const tokenHash = this.hashPasswordResetToken(token);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true }
      });

      if (!row) {
        throw new BadRequestException("Geçersiz şifre sıfırlama bağlantısı.");
      }
      if (row.usedAt != null) {
        throw new BadRequestException("Bu bağlantı zaten kullanılmış.");
      }
      if (row.expiresAt <= now) {
        throw new BadRequestException("Şifre sıfırlama bağlantısının süresi dolmuş.");
      }
      if (row.user.status !== UserStatus.ACTIVE) {
        throw new BadRequestException("Hesap aktif değil.");
      }

      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: row.id,
          usedAt: null,
          expiresAt: { gt: now }
        },
        data: { usedAt: now }
      });

      if (consumed.count !== 1) {
        const again = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
        if (!again) {
          throw new BadRequestException("Geçersiz şifre sıfırlama bağlantısı.");
        }
        if (again.usedAt != null) {
          throw new BadRequestException("Bu bağlantı zaten kullanılmış.");
        }
        if (again.expiresAt <= new Date()) {
          throw new BadRequestException("Şifre sıfırlama bağlantısının süresi dolmuş.");
        }
        throw new BadRequestException("Şifre sıfırlama işlemi tamamlanamadı. Lütfen tekrar deneyin.");
      }

      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash }
      });
      await tx.refreshToken.updateMany({
        where: { userId: row.userId, revoked: false },
        data: { revoked: true }
      });
    });
  }

  private hashPasswordResetToken(plain: string): string {
    return crypto
      .createHash("sha256")
      .update(`${getPasswordResetPepper()}:${plain}`)
      .digest("hex");
  }

  private hashEmailVerificationToken(plain: string): string {
    return crypto
      .createHash("sha256")
      .update(`${getEmailVerificationPepper()}:${plain}`)
      .digest("hex");
  }

  private buildPasswordResetLink(token: string): string {
    const base = resolveStorefrontBaseUrlForBackend();
    return `${base}/sifre-sifirla?token=${encodeURIComponent(token)}`;
  }

  private buildEmailVerificationLink(token: string): string {
    const base = resolveStorefrontBaseUrlForBackend();
    return `${base}/eposta-dogrula?token=${encodeURIComponent(token)}`;
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
      secret: getJwtSecret()
    });
    const payload = raw as Partial<RefreshJwtPayload>;

    if (!payload || payload.typ !== "refresh" || !payload.jti || !payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException("Geçersiz refresh token.");
    }
    return payload as RefreshJwtPayload;
  }

  private hashRefreshToken(token: string): string {
    return crypto.createHmac("sha256", getRefreshTokenPepper()).update(token).digest("hex");
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  }

  private sanitizeUser(user: {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    phone: string | null;
    emailVerified: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      emailVerified: user.emailVerified
    };
  }
}
