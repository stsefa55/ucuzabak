import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { createClient } from "redis";
import * as net from "net";
import { bullmqConnectionProducer } from "@ucuzabak/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EmailQueueService } from "../email/email-queue.service";

export type ServiceCheckStatus = "ok" | "fail" | "skip";

export interface ServiceCheckRow {
  id: string;
  label: string;
  status: ServiceCheckStatus;
  latencyMs?: number;
  detail?: string;
  hint?: string;
}

function redisUrlFromBullOpts(host: string, port: number, password?: string): string {
  if (password) {
    return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

function probeTcp(host: string, port: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error(`Bağlantı zaman aşımı (${timeoutMs} ms)`));
    }, timeoutMs);
    const socket = net.createConnection({ host, port }, () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.end();
      resolve();
    });
    socket.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

@Injectable()
export class AdminDiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  async runServiceChecks(): Promise<{
    generatedAt: string;
    environment: string;
    emailTestEndpointAvailable: boolean;
    checks: ServiceCheckRow[];
  }> {
    const checks: ServiceCheckRow[] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkSmtpPort(),
      this.checkEmailQueue(),
      this.checkFeedImportQueue(),
      this.checkElasticsearch(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      emailTestEndpointAvailable: process.env.NODE_ENV !== "production",
      checks,
    };
  }

  private async checkDatabase(): Promise<ServiceCheckRow> {
    const label = "PostgreSQL";
    const t = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        id: "database",
        label,
        status: "ok",
        latencyMs: Date.now() - t,
        detail: "SELECT 1 başarılı",
      };
    } catch (e) {
      return {
        id: "database",
        label,
        status: "fail",
        latencyMs: Date.now() - t,
        detail: e instanceof Error ? e.message : String(e),
        hint: "DATABASE_URL ve migrasyonları kontrol edin.",
      };
    }
  }

  private async checkRedis(): Promise<ServiceCheckRow> {
    const label = "Redis (BullMQ)";
    const o = bullmqConnectionProducer();
    const t = Date.now();
    const client = createClient({
      url: redisUrlFromBullOpts(o.host, o.port, o.password),
      socket: { connectTimeout: 4000 },
    });
    try {
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      return {
        id: "redis",
        label,
        status: "ok",
        latencyMs: Date.now() - t,
        detail: `PING → ${pong} (${o.host}:${o.port})`,
      };
    } catch (e) {
      try {
        await client.quit();
      } catch {
        /* */
      }
      return {
        id: "redis",
        label,
        status: "fail",
        latencyMs: Date.now() - t,
        detail: e instanceof Error ? e.message : String(e),
        hint: "REDIS_HOST / REDIS_PORT veya REDIS_URL; Docker’da redis servisi çalışıyor mu?",
      };
    }
  }

  private async checkSmtpPort(): Promise<ServiceCheckRow> {
    const label = "SMTP sunucusu (TCP)";
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || "0");
    if (!host || !Number.isFinite(port) || port <= 0) {
      return {
        id: "smtp_tcp",
        label,
        status: "skip",
        detail: "Bu API sürecinde SMTP_HOST / SMTP_PORT tanımlı değil.",
        hint: "E-posta worker ile aynı .env değerlerini API’ye de verin veya worker konteynerinde doğrulayın (ör. mailhog:1025).",
      };
    }
    const t = Date.now();
    try {
      await probeTcp(host, port, 5000);
      return {
        id: "smtp_tcp",
        label,
        status: "ok",
        latencyMs: Date.now() - t,
        detail: `${host}:${port} erişilebilir (kimlik doğrulama test edilmedi).`,
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const hostLower = host.toLowerCase();
      const looksLikeDnsFail =
        errMsg.includes("ENOTFOUND") ||
        errMsg.includes("getaddrinfo") ||
        errMsg.includes("EAI_AGAIN");

      /** API süreci host makinede (pnpm) çalışırken Docker servis adı çoğu zaman çözülmez. */
      if (looksLikeDnsFail && (hostLower === "mailhog" || hostLower === "smtp")) {
        for (const alt of ["127.0.0.1", "localhost"] as const) {
          try {
            const tAlt = Date.now();
            await probeTcp(alt, port, 4000);
            return {
              id: "smtp_tcp",
              label,
              status: "ok",
              latencyMs: Date.now() - t,
              detail: `${host}:${port} bu süreçten çözülemedi (${errMsg}). ${alt}:${port} erişilebilir — API’yi Docker dışında çalıştırıyorsanız .env içinde SMTP_HOST=${alt} kullanın (Mailhog portu genelde 1025).`,
              hint: "Docker içindeki API konteynerinde mailhog hostname normaldir.",
            };
          } catch {
            /* try next fallback */
          }
        }
      }

      return {
        id: "smtp_tcp",
        label,
        status: "fail",
        latencyMs: Date.now() - t,
        detail: errMsg,
        hint:
          looksLikeDnsFail && hostLower === "mailhog"
            ? "Yerel API: SMTP_HOST=localhost ve Mailhog’un 1025 portunun yayınlandığından emin olun. Docker API: mailhog hostname kullanılabilir."
            : "Mailhog / SMTP çalışıyor mu; host adı bu süreçten çözülebiliyor mu? (Konteyner ağı vs. localhost)",
      };
    }
  }

  private async checkEmailQueue(): Promise<ServiceCheckRow> {
    const label = "BullMQ e-posta kuyruğu";
    const t = Date.now();
    try {
      const snap = await this.emailQueue.getQueueSnapshot();
      const total = Object.values(snap.counts).reduce((a, b) => a + b, 0);
      return {
        id: "bullmq_email",
        label,
        status: "ok",
        latencyMs: Date.now() - t,
        detail: `Kuyruk "${snap.name}" okundu (toplam iş sayısı ~${total}).`,
      };
    } catch (e) {
      return {
        id: "bullmq_email",
        label,
        status: "fail",
        latencyMs: Date.now() - t,
        detail: e instanceof Error ? e.message : String(e),
        hint: "Redis ve BullMQ bağlantısı; worker ayrı olsa da kuyruk Redis’te durur.",
      };
    }
  }

  private async checkFeedImportQueue(): Promise<ServiceCheckRow> {
    const label = "BullMQ feed-import kuyruğu";
    const connection = bullmqConnectionProducer();
    const q = new Queue("feed-import", { connection });
    const t = Date.now();
    try {
      await q.getJobCounts("waiting", "failed");
      await q.close();
      return {
        id: "bullmq_feed",
        label,
        status: "ok",
        latencyMs: Date.now() - t,
        detail: "feed-import kuyruğu Redis üzerinden okunabildi.",
      };
    } catch (e) {
      try {
        await q.close();
      } catch {
        /* */
      }
      return {
        id: "bullmq_feed",
        label,
        status: "fail",
        latencyMs: Date.now() - t,
        detail: e instanceof Error ? e.message : String(e),
        hint: "Redis ve worker aynı Redis örneğine bağlı mı?",
      };
    }
  }

  private async checkElasticsearch(): Promise<ServiceCheckRow> {
    const label = "Elasticsearch";
    const base = process.env.ELASTICSEARCH_HOST?.trim();
    if (!base) {
      return {
        id: "elasticsearch",
        label,
        status: "skip",
        detail: "ELASTICSEARCH_HOST tanımlı değil.",
        hint: "Arama yığını kullanılmıyorsa normal.",
      };
    }

    const probeEs = async (root: string): Promise<{ ok: boolean; detail: string }> => {
      const url = `${root.replace(/\/$/, "")}/`;
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 5000);
        const res = await fetch(url, { signal: ac.signal });
        clearTimeout(timer);
        if (res.ok) return { ok: true, detail: `Yanıt alındı (${root})` };
        return { ok: false, detail: `HTTP ${res.status}` };
      } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : String(e) };
      }
    };

    const t = Date.now();
    const primary = await probeEs(base);
    if (primary.ok) {
      return {
        id: "elasticsearch",
        label,
        status: "ok",
        latencyMs: Date.now() - t,
        detail: primary.detail,
      };
    }

    let parsed: URL;
    try {
      const withProto = base.includes("://") ? base : `http://${base}`;
      parsed = new URL(withProto);
    } catch {
      return {
        id: "elasticsearch",
        label,
        status: "fail",
        latencyMs: Date.now() - t,
        detail: "ELASTICSEARCH_HOST URL olarak çözülemedi.",
        hint: "Örn. http://localhost:9200 veya http://elasticsearch:9200",
      };
    }

    if (parsed.hostname === "elasticsearch") {
      const fb = new URL(parsed.toString());
      fb.hostname = "127.0.0.1";
      const second = await probeEs(fb.origin);
      if (second.ok) {
        return {
          id: "elasticsearch",
          label,
          status: "ok",
          latencyMs: Date.now() - t,
          detail: `elasticsearch hostname bu API sürecinden erişilemedi (${primary.detail}). ${fb.origin} yanıt verdi — yerel pnpm API için ELASTICSEARCH_HOST=${fb.origin} kullanın.`,
          hint: "Docker içindeki API için http://elasticsearch:9200 uygundur.",
        };
      }
    }

    return {
      id: "elasticsearch",
      label,
      status: "fail",
      latencyMs: Date.now() - t,
      detail: primary.detail,
      hint:
        parsed.hostname === "elasticsearch"
          ? "ES konteyneri çalışıyor mu ve 9200 host’a yayınlanıyor mu? Yerel API: ELASTICSEARCH_HOST=http://127.0.0.1:9200"
          : "Elasticsearch adresi, TLS ve ağ erişimi.",
    };
  }
}
