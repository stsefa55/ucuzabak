import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { Throttle } from "@nestjs/throttler";
import { PaginationQueryDto } from "../common/pagination.dto";
import { BackupService } from "./backup.service";
import { RestoreBackupDto } from "./dto/restore-backup.dto";

type JwtUser = { sub: number; role: string; email: string };

@ApiTags("admin")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/backups")
export class AdminBackupsController {
  constructor(private readonly backup: BackupService) {}

  @Get()
  @ApiOkResponse({ description: "Yerel yedek listesi" })
  async list() {
    return { backups: await this.backup.listBackups() };
  }

  @Get("restore-logs")
  @ApiOkResponse({ description: "Geri yükleme denemeleri (audit)" })
  async restoreLogs(@Query() query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;
    return this.backup.listRestoreLogs(page, pageSize);
  }

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOkResponse({ description: "pg_dump ile yedek oluşturur" })
  async create() {
    const row = await this.backup.createBackup();
    return { ok: true, backup: row };
  }

  @Get(":id/download")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkResponse({ description: "Yedek .sql dosyasını indirir (path traversal korumalı)" })
  async download(@Param("id") id: string, @Res() res: Response): Promise<void> {
    const { stream, size, fileName } = await this.backup.createBackupReadStream(decodeURIComponent(id));
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", String(size));
    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  }

  @Post("restore")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 3_600_000 } })
  @ApiOkResponse({ description: "psql -f ile geri yükler (tehlikeli)" })
  async restore(@Body() body: RestoreBackupDto, @Req() req: Request) {
    if (body.confirm !== "RESTORE_DATABASE") {
      throw new BadRequestException('Onay için confirm alanı tam olarak "RESTORE_DATABASE" olmalıdır.');
    }
    const user = (req as Request & { user?: JwtUser }).user;
    const result = await this.backup.restoreBackup(body.id, {
      initiatedByUserId: user?.sub
    });
    return { ok: true, preRestoreSnapshotId: result.preRestoreSnapshotId };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Yedek dosyasını siler" })
  async remove(@Param("id") id: string) {
    await this.backup.deleteBackup(decodeURIComponent(id));
    return { ok: true };
  }
}
