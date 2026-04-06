import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { getJwtSecret } from "./auth-secrets";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Yetkilendirme gerekli.");
    }

    const token = authHeader.substring(7);

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: getJwtSecret()
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Geçersiz veya süresi dolmuş token.");
    }
  }
}

