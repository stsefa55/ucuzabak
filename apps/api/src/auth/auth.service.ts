import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

interface JwtPayload {
  sub: number;
  role: UserRole;
  email: string;
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

    const tokens = this.generateTokens(user.id, user.role, user.email);

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

    const tokens = this.generateTokens(user.id, user.role, user.email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  refresh(userId: number, role: UserRole, email: string) {
    return this.generateTokens(userId, role, email);
  }

  private generateTokens(userId: number, role: UserRole, email: string) {
    const payload: JwtPayload = { sub: userId, role, email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: Number(process.env.API_JWT_ACCESS_TOKEN_TTL || 900)
    });

    const refreshTtl = Number(process.env.API_JWT_REFRESH_TOKEN_TTL || 60 * 60 * 24 * 7);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshTtl
    });

    return { accessToken, refreshToken };
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

