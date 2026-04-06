/**
 * BullMQ + ioredis için tutarlı Redis bağlantısı (API, worker, önbellek).
 *
 * Öncelik (Docker’da kök `.env` içindeki `REDIS_URL=redis://127.0.0.1:6379` yüzünden
 * yanlış host’a düşmeyi önlemek için):
 * 1. `REDIS_HOST` doluysa → `REDIS_HOST` + `REDIS_PORT` (+ `REDIS_PASSWORD`) — **REDIS_URL yok sayılır**
 * 2. Aksi halde `REDIS_URL` varsa → URL’den host/port/şifre
 * 3. Aksi halde varsayılan: host `redis`, port `6379` (+ şifre)
 *
 * Yerel geliştirme: `REDIS_HOST=127.0.0.1` veya yalnızca `REDIS_URL=redis://127.0.0.1:6379` kullanın.
 * `localhost` / `127.0.0.1` varsayılan olarak kullanılmaz.
 */

export type BullmqRedisOptions = {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest?: number | null;
};

/** Ortak host/port çözümlemesi (BullMQ dışı node-redis vb. için). */
export type RedisConnectionOptions = {
  host: string;
  port: number;
  password?: string;
};

function parseRedisUrl(url: string): Pick<RedisConnectionOptions, "host" | "port" | "password"> | null {
  try {
    const u = new URL(url);
    if (!u.hostname) return null;
    const port = u.port ? Number(u.port) : 6379;
    const password = u.password ? decodeURIComponent(u.password) : undefined;
    return { host: u.hostname, port, password };
  } catch {
    return null;
  }
}

/**
 * Tek doğruluk kaynağı: tüm BullMQ ve önerilen Redis URL’leri bununla hizalanır.
 */
export function resolveRedisConnectionOptions(): RedisConnectionOptions {
  const hostFromEnv = process.env.REDIS_HOST?.trim();
  if (hostFromEnv) {
    const portRaw = process.env.REDIS_PORT?.trim();
    const port = portRaw ? Number(portRaw) : 6379;
    const password = process.env.REDIS_PASSWORD?.trim() || undefined;
    return {
      host: hostFromEnv,
      port: Number.isFinite(port) && port > 0 ? port : 6379,
      password
    };
  }

  const url = process.env.REDIS_URL?.trim();
  if (url) {
    const parsed = parseRedisUrl(url);
    if (parsed) {
      return {
        host: parsed.host,
        port: parsed.port,
        password: parsed.password
      };
    }
  }

  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD?.trim() || undefined;
  return {
    host: "redis",
    port: Number.isFinite(port) && port > 0 ? port : 6379,
    password
  };
}

/** `redis` paketi (`createClient({ url })`) için — `resolveRedisConnectionOptions` ile aynı host/port. */
export function redisUrlForNodeRedis(): string {
  const o = resolveRedisConnectionOptions();
  if (o.password) {
    return `redis://:${encodeURIComponent(o.password)}@${o.host}:${o.port}`;
  }
  return `redis://${o.host}:${o.port}`;
}

/** API / Queue tarafı (iş üretici). */
export function bullmqConnectionProducer(): BullmqRedisOptions {
  return { ...resolveRedisConnectionOptions() };
}

/** Worker (iş tüketici). */
export function bullmqConnectionWorker(): BullmqRedisOptions {
  return {
    ...resolveRedisConnectionOptions(),
    maxRetriesPerRequest: null
  };
}

function formatMaxRetriesForLog(value: number | null | undefined): string {
  if (value === null) return "null";
  if (value === undefined) return "default";
  return String(value);
}

/** Log için güvenli özet (şifre yok). */
export function bullmqConnectionSummary(which: "producer" | "worker"): string {
  const o = which === "worker" ? bullmqConnectionWorker() : bullmqConnectionProducer();
  const pw = o.password ? "yes" : "no";
  return `host=${o.host} port=${o.port} password=${pw} maxRetriesPerRequest=${formatMaxRetriesForLog(o.maxRetriesPerRequest)}`;
}
