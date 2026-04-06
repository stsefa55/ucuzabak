import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { execFile } from "child_process";
import { createReadStream, type ReadStream } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";
import { PrismaService } from "../prisma/prisma.service";

const execFileAsync = promisify(execFile);

/** Yedek dosya adı: yalnızca zaman damgası + .sql (path traversal yok). */
const BACKUP_FILE_RE = /^ucuzabak-backup-\d+\.sql$/;

let resolvedPgDumpBin: string | null = null;
let resolvedPsqlBin: string | null = null;

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Windows: PATH’te yoksa `where` veya Program Files altındaki PostgreSQL kurulumları.
 */
async function resolveWindowsPostgresCli(exeName: "pg_dump.exe" | "psql.exe"): Promise<string | null> {
  if (process.platform !== "win32") return null;

  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  const whereExe = path.join(systemRoot, "System32", "where.exe");
  if (await fileExists(whereExe)) {
    try {
      const { stdout } = await execFileAsync(whereExe, [exeName], {
        maxBuffer: 512 * 1024,
        timeout: 15_000
      });
      const first = stdout
        .toString()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 0);
      if (first && (await fileExists(first))) {
        await execFileAsync(first, ["--version"], { maxBuffer: 512 * 1024, timeout: 10_000 });
        return first;
      }
    } catch {
      /* where bulamadı veya --version başarısız */
    }
  }

  const roots = [
    process.env["ProgramFiles"],
    process.env["ProgramFiles(x86)"],
    "C:\\Program Files",
    "C:\\Program Files (x86)"
  ].filter(Boolean) as string[];

  for (const root of roots) {
    const pgBase = path.join(root, "PostgreSQL");
    if (await fileExists(pgBase)) {
      let names: string[];
      try {
        names = await fs.readdir(pgBase);
      } catch {
        names = [];
      }
      for (const name of names) {
        const instDir = path.join(pgBase, name);
        try {
          const st = await fs.stat(instDir);
          if (!st.isDirectory()) continue;
        } catch {
          continue;
        }
        const candidate = path.join(instDir, "bin", exeName);
        if (!(await fileExists(candidate))) continue;
        try {
          await execFileAsync(candidate, ["--version"], { maxBuffer: 512 * 1024, timeout: 10_000 });
          return candidate;
        } catch {
          /* */
        }
      }
    }
    for (let ver = 25; ver >= 9; ver--) {
      const candidate = path.join(root, "PostgreSQL", String(ver), "bin", exeName);
      if (!(await fileExists(candidate))) continue;
      try {
        await execFileAsync(candidate, ["--version"], { maxBuffer: 512 * 1024, timeout: 10_000 });
        return candidate;
      } catch {
        /* */
      }
    }
  }

  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    const scoop = path.join(home, "scoop", "apps", "postgresql", "current", "bin", exeName);
    if (await fileExists(scoop)) {
      try {
        await execFileAsync(scoop, ["--version"], { maxBuffer: 512 * 1024, timeout: 10_000 });
        return scoop;
      } catch {
        /* */
      }
    }
  }

  return null;
}

function execFileFailureDetail(e: unknown, attemptedBin: string): string {
  if (e && typeof e === "object") {
    const o = e as {
      code?: string;
      stderr?: Buffer | string;
      stdout?: Buffer | string;
      message?: string;
    };
    const stderr = o.stderr != null ? String(o.stderr).trim() : "";
    if (stderr.length > 0) return stderr.slice(0, 4000);
    if (o.code === "ENOENT") {
      return `Komut bulunamadı: "${attemptedBin}". Yerelde PG_DUMP_PATH / PSQL_PATH ile tam yol verin (Windows: …\\bin\\pg_dump.exe) veya PostgreSQL’i PATH’e ekleyin. Docker’da API imajında postgresql-client kurulu olmalı (apps/api/Dockerfile).`;
    }
  }
  return e instanceof Error ? e.message : String(e);
}

async function resolvePgDumpBin(): Promise<string> {
  const fromEnv = process.env.PG_DUMP_PATH?.trim();
  if (fromEnv) return fromEnv;
  if (resolvedPgDumpBin) return resolvedPgDumpBin;

  const candidates =
    process.platform === "win32"
      ? ["pg_dump.exe", "pg_dump", "/usr/bin/pg_dump"]
      : ["pg_dump", "/usr/bin/pg_dump"];

  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"], { maxBuffer: 512 * 1024, timeout: 10_000 });
      resolvedPgDumpBin = bin;
      return bin;
    } catch {
      /* try next */
    }
  }

  const win = await resolveWindowsPostgresCli("pg_dump.exe");
  if (win) {
    resolvedPgDumpBin = win;
    return win;
  }

  resolvedPgDumpBin = process.platform === "win32" ? "pg_dump.exe" : "pg_dump";
  return resolvedPgDumpBin;
}

async function resolvePsqlBinPath(): Promise<string> {
  const fromEnv = process.env.PSQL_PATH?.trim();
  if (fromEnv) return fromEnv;
  if (resolvedPsqlBin) return resolvedPsqlBin;

  const candidates =
    process.platform === "win32" ? ["psql.exe", "psql", "/usr/bin/psql"] : ["psql", "/usr/bin/psql"];

  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"], { maxBuffer: 512 * 1024, timeout: 10_000 });
      resolvedPsqlBin = bin;
      return bin;
    } catch {
      /* try next */
    }
  }

  const win = await resolveWindowsPostgresCli("psql.exe");
  if (win) {
    resolvedPsqlBin = win;
    return win;
  }

  resolvedPsqlBin = process.platform === "win32" ? "psql.exe" : "psql";
  return resolvedPsqlBin;
}

function parsePgUrl(databaseUrl: string): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  let u: URL;
  try {
    u = new URL(databaseUrl);
  } catch {
    throw new BadRequestException("DATABASE_URL geçersiz.");
  }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") {
    throw new BadRequestException("Yalnızca PostgreSQL desteklenir.");
  }
  const database = (u.pathname || "").replace(/^\//, "").split("?")[0];
  if (!database) {
    throw new BadRequestException("DATABASE_URL içinde veritabanı adı yok.");
  }
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username || ""),
    password: decodeURIComponent(u.password || ""),
    database
  };
}

function backupDir(): string {
  const d = process.env.BACKUP_DIR?.trim();
  return d && d.length > 0 ? d : path.join(process.cwd(), "data", "backups");
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureBackupDir(): Promise<string> {
    const dir = backupDir();
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  private assertSafeBackupId(id: string): string {
    const name = path.basename(id.trim());
    if (!BACKUP_FILE_RE.test(name)) {
      throw new BadRequestException("Geçersiz yedek kimliği.");
    }
    return name;
  }

  async listBackups(): Promise<Array<{ id: string; sizeBytes: number; createdAt: string }>> {
    const dir = await this.ensureBackupDir();
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return [];
    }
    const out: Array<{ id: string; sizeBytes: number; createdAt: string }> = [];
    for (const name of entries) {
      if (!BACKUP_FILE_RE.test(name)) continue;
      try {
        const p = path.join(dir, name);
        const st = await fs.stat(p);
        if (!st.isFile()) continue;
        out.push({
          id: name,
          sizeBytes: st.size,
          createdAt: st.mtime.toISOString()
        });
      } catch {
        /* skip */
      }
    }
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return out;
  }

  async createBackup(): Promise<{ id: string; sizeBytes: number; createdAt: string }> {
    const dir = await this.ensureBackupDir();
    const dbUrl = process.env.DATABASE_URL?.trim();
    if (!dbUrl) {
      throw new ServiceUnavailableException("DATABASE_URL tanımlı değil.");
    }
    const cfg = parsePgUrl(dbUrl);
    const id = `ucuzabak-backup-${Date.now()}.sql`;
    const filePath = path.join(dir, id);
    const bin = await resolvePgDumpBin();
    const args = [
      "-h",
      cfg.host,
      "-p",
      cfg.port,
      "-U",
      cfg.user,
      "-d",
      cfg.database,
      "-f",
      filePath,
      "--no-owner",
      "--clean",
      "--if-exists"
    ];
    this.logger.log(`pg_dump başlıyor → ${filePath}`);
    try {
      await execFileAsync(bin, args, {
        env: { ...process.env, PGPASSWORD: cfg.password },
        maxBuffer: 64 * 1024 * 1024
      });
    } catch (e: unknown) {
      const detail = execFileFailureDetail(e, bin);
      this.logger.error(`pg_dump hatası (${bin}): ${detail}`);
      try {
        await fs.unlink(filePath);
      } catch {
        /* ignore */
      }
      throw new ServiceUnavailableException(
        `pg_dump çalıştırılamadı. ${detail} — BACKUP_DIR yazılabilir olmalı; API konteynerinde DATABASE_URL ana makine adı genelde postgres olmalı (localhost değil). Yerelde PG_DUMP_PATH veya PATH; Docker’da apps/api/Dockerfile içinde postgresql-client.`,
      );
    }
    const st = await fs.stat(filePath);
    await this.pruneOldBackups();
    return { id, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
  }

  /** BACKUP_RETENTION_DAYS aşımındaki dosyaları siler. */
  async pruneOldBackups(): Promise<number> {
    const days = Number(process.env.BACKUP_RETENTION_DAYS ?? "14");
    if (!Number.isFinite(days) || days < 1) return 0;
    const cutoff = Date.now() - days * 86_400_000;
    const dir = await this.ensureBackupDir();
    let removed = 0;
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return 0;
    }
    for (const name of entries) {
      if (!BACKUP_FILE_RE.test(name)) continue;
      const p = path.join(dir, name);
      try {
        const st = await fs.stat(p);
        if (st.isFile() && st.mtimeMs < cutoff) {
          await fs.unlink(p);
          removed++;
          this.logger.log(`Eski yedek silindi: ${name}`);
        }
      } catch {
        /* skip */
      }
    }
    return removed;
  }

  async deleteBackup(id: string): Promise<void> {
    const name = this.assertSafeBackupId(id);
    const dir = await this.ensureBackupDir();
    const filePath = path.join(dir, name);
    try {
      await fs.unlink(filePath);
    } catch {
      throw new BadRequestException("Yedek bulunamadı.");
    }
  }

  /** Güvenli dosya adı doğrulaması ile akış (indirme). */
  async createBackupReadStream(rawId: string): Promise<{
    stream: ReadStream;
    size: number;
    fileName: string;
  }> {
    const fileName = this.assertSafeBackupId(rawId);
    const dir = await this.ensureBackupDir();
    const filePath = path.join(dir, fileName);
    try {
      await fs.access(filePath);
    } catch {
      throw new BadRequestException("Yedek dosyası bulunamadı.");
    }
    const st = await fs.stat(filePath);
    return {
      stream: createReadStream(filePath),
      size: st.size,
      fileName
    };
  }

  async listRestoreLogs(page: number, pageSize: number) {
    const p = Math.max(1, page);
    const ps = Math.min(100, Math.max(1, pageSize));
    const [items, total] = await this.prisma.$transaction([
      this.prisma.backupRestoreLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * ps,
        take: ps
      }),
      this.prisma.backupRestoreLog.count()
    ]);
    return { items, total, page: p, pageSize: ps };
  }

  /**
   * Veritabanına SQL dökümünü uygular. Önce otomatik pg_dump snapshot alır; işlem günlüğe yazılır.
   */
  async restoreBackup(
    id: string,
    meta?: { initiatedByUserId?: number }
  ): Promise<{ preRestoreSnapshotId: string }> {
    const name = this.assertSafeBackupId(id);
    const dir = await this.ensureBackupDir();
    const filePath = path.join(dir, name);
    try {
      await fs.access(filePath);
    } catch {
      throw new BadRequestException("Yedek dosyası bulunamadı.");
    }

    let preSnapshotId: string;
    try {
      const snap = await this.createBackup();
      preSnapshotId = snap.id;
      this.logger.log(`Geri yükleme öncesi otomatik snapshot: ${preSnapshotId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Geri yükleme öncesi yedek alınamadı: ${msg}`);
      throw new ServiceUnavailableException(
        "Geri yüklemeden önce otomatik yedek alınamadı; işlem güvenlik için iptal edildi.",
      );
    }

    const dbUrl = process.env.DATABASE_URL?.trim();
    if (!dbUrl) {
      throw new ServiceUnavailableException("DATABASE_URL tanımlı değil.");
    }
    const cfg = parsePgUrl(dbUrl);
    const bin = await resolvePsqlBinPath();
    const args = ["-h", cfg.host, "-p", cfg.port, "-U", cfg.user, "-d", cfg.database, "-f", filePath, "-v", "ON_ERROR_STOP=1"];
    this.logger.warn(`psql restore başlıyor: ${name} (snapshot: ${preSnapshotId})`);
    try {
      await execFileAsync(bin, args, {
        env: { ...process.env, PGPASSWORD: cfg.password },
        maxBuffer: 128 * 1024 * 1024
      });
      await this.prisma.backupRestoreLog.create({
        data: {
          targetBackupFile: name,
          preRestoreSnapshotFile: preSnapshotId,
          initiatedByUserId: meta?.initiatedByUserId ?? null,
          success: true,
          errorText: null
        }
      });
      return { preRestoreSnapshotId: preSnapshotId };
    } catch (e: unknown) {
      const detail = execFileFailureDetail(e, bin);
      this.logger.error(`psql restore hatası (${bin}): ${detail}`);
      await this.prisma.backupRestoreLog.create({
        data: {
          targetBackupFile: name,
          preRestoreSnapshotFile: preSnapshotId,
          initiatedByUserId: meta?.initiatedByUserId ?? null,
          success: false,
          errorText: detail.slice(0, 2000)
        }
      });
      throw new ServiceUnavailableException(
        `Geri yükleme başarısız. ${detail.slice(0, 500)} — psql kurulumu (PSQL_PATH) ve döküm dosyası kontrol edin.`,
      );
    }
  }
}
