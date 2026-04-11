import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response, Request } from "express";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { LogoutDto } from "./dto/logout.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { RequestEmailChangeDto } from "./dto/request-email-change.dto";
import { ConfirmEmailChangeDto } from "./dto/confirm-email-change.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Throttle } from "@nestjs/throttler";

function getClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0]!.trim();
  }
  if (Array.isArray(xff) && xff[0]) {
    return String(xff[0]).split(",")[0]!.trim();
  }
  const raw = req.socket?.remoteAddress;
  if (raw) {
    return raw.replace(/^::ffff:/, "");
  }
  const maybeIp = (req as Request & { ip?: string }).ip;
  return maybeIp && maybeIp.trim() ? maybeIp.trim() : "unknown";
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post("confirm-email-change")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  async confirmEmailChange(@Body() body: ConfirmEmailChangeDto) {
    return this.authService.confirmEmailChange(body.token);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPasswordWithToken(body.token, body.newPassword);
    return { success: true };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmailWithToken(body.token);
  }

  @Post("resend-verification-email")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  async resendVerificationEmail(@Body() body: ForgotPasswordDto) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Headers("x-client-type") clientType: string | undefined,
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const ct = (clientType || "web").toLowerCase();
    const { user, accessToken, refreshToken } = await this.authService.register(dto);

    if (ct === "mobile") {
      return { accessToken, refreshToken };
    }

    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Headers("x-client-type") clientType: string | undefined,
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ct = (clientType || "web").toLowerCase();
    const { user, accessToken, refreshToken } = await this.authService.login(dto, getClientIp(req));

    if (ct === "mobile") {
      return { accessToken, refreshToken };
    }

    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Headers("x-client-type") clientType: string | undefined,
    @Req() req: Request,
    @Body() body: RefreshDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const ct = (clientType || "web").toLowerCase();
    const refreshToken =
      ct === "mobile" ? body?.refreshToken?.trim() || undefined : req.cookies?.refresh_token;
    if (!refreshToken) {
      return { accessToken: null };
    }

    try {
      const { accessToken, refreshToken: newRefresh } = await this.authService.rotateRefreshToken(refreshToken);

      if (ct === "mobile") {
        return { accessToken, refreshToken: newRefresh };
      }

      this.setRefreshCookie(res, newRefresh);

      return { accessToken };
    } catch {
      // expired/invalid refresh token: clear cookie
      if (ct !== "mobile") {
        res.clearCookie("refresh_token", this.getRefreshCookieOptions());
      }
      return { accessToken: null };
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async logout(
    @Headers("x-client-type") clientType: string | undefined,
    @Body() body: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ct = (clientType || "web").toLowerCase();

    if (ct === "mobile") {
      if (body?.refreshToken) {
        await this.authService.revokeRefreshToken(body.refreshToken);
      }
      return { success: true };
    }

    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }
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

  @Post("me/request-email-change")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  async requestEmailChange(@Req() req: Request, @Body() body: RequestEmailChangeDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (req as any).user;
    return this.authService.requestEmailChange(payload.sub, body.newEmail, body.currentPassword);
  }

  @Post("me/resend-verification-email")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  async resendVerificationEmailForMe(@Req() req: Request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (req as any).user;
    const row = await this.usersService.findById(payload.sub);
    return this.authService.resendVerificationEmail(row?.email ?? "");
  }

  private getRefreshCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    const domain = process.env.COOKIE_DOMAIN || undefined;
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? "none" : "lax") as "none" | "lax",
      domain,
      path: "/",
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

