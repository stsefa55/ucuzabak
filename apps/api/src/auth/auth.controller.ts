import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response, Request } from "express";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Throttle } from "@nestjs/throttler";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  @Get("check-email")
  @Throttle({ default: { limit: 20, ttl: 60 } })
  async checkEmail(@Query("email") email: string) {
    const available = await this.authService.isEmailAvailable(email ?? "");
    return { available };
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return { accessToken: null };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.API_JWT_SECRET || "change-me-in-dev"
      });

      const { accessToken, refreshToken: newRefresh } = this.authService.refresh(
        payload.sub,
        payload.role,
        payload.email,
      );
      this.setRefreshCookie(res, newRefresh);

      return { accessToken };
    } catch {
      // expired/invalid refresh token: clear cookie
      res.clearCookie("refresh_token", this.getRefreshCookieOptions());
      return { accessToken: null };
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60 } })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("refresh_token", this.getRefreshCookieOptions());
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  async me(@Req() req: Request) {
    // JwtAuthGuard sets req.user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (req as any).user;
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      return { user: null };
    }
    const { passwordHash, ...safeUser } = user;
    return { user: safeUser };
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  async updateMe(@Req() req: Request, @Body() body: UpdateProfileDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (req as any).user;
    const updated = await this.usersService.updateProfile(payload.sub, {
      name: body.name,
      phone: body.phone
    });
    const { passwordHash, ...safeUser } = updated;
    return { user: safeUser };
  }

  private getRefreshCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    const maxAge = Number(process.env.API_JWT_REFRESH_TOKEN_TTL || 60 * 60 * 24 * 7) * 1000;
    res.cookie("refresh_token", token, {
      ...this.getRefreshCookieOptions(),
      maxAge
    });
  }
}

