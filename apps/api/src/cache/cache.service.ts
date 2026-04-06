import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { redisUrlForNodeRedis } from "@ucuzabak/shared";
import { createClient } from "redis";

type CacheEnvelope<T> = {
  v: T;
  exp: number;
};

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, CacheEnvelope<unknown>>();
  /** Sayaç anahtarları (incrWithTtl); JSON önbellekle karışmaz. */
  private readonly memIncr = new Map<string, { count: number; expiresAt: number }>();
  private redis: any = null;

  async onModuleInit() {
    const hasExplicitRedis =
      Boolean(process.env.REDIS_URL?.trim()) || Boolean(process.env.REDIS_HOST?.trim());
    if (!hasExplicitRedis) return;
    try {
      const client = createClient({ url: redisUrlForNodeRedis() });
      client.on("error", (e) => this.logger.warn(`Redis error: ${String((e as Error)?.message ?? e)}`));
      await client.connect();
      this.redis = client;
      this.logger.log("Redis cache connected.");
    } catch (e) {
      this.logger.warn(`Redis cache disabled: ${String((e as Error)?.message ?? e)}`);
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const inMem = this.memory.get(key);
    if (inMem && inMem.exp > now) {
      return inMem.v as T;
    }
    if (inMem && inMem.exp <= now) {
      this.memory.delete(key);
    }
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    const exp = Date.now() + ttlSec * 1000;
    this.memory.set(key, { v: value, exp });
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), { EX: ttlSec });
    } catch {
      // no-op: memory cache is still available
    }
  }

  async getOrSet<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit != null) return hit;
    const value = await fn();
    await this.set(key, value, ttlSec);
    return value;
  }

  /** Redis INCR / bellek sayaç değeri (blokaj kontrolü; artırmadan). */
  async getCounter(key: string): Promise<number> {
    const now = Date.now();
    const m = this.memIncr.get(key);
    if (m) {
      if (m.expiresAt <= now) {
        this.memIncr.delete(key);
        return 0;
      }
      return m.count;
    }
    if (!this.redis) return 0;
    try {
      const raw = await this.redis.get(key);
      if (raw == null || raw === "") return 0;
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Atomik artırım (Redis); ilk oluşumda TTL. Redis yoksa bellek içi yaklaşık sayaç.
   */
  async incrWithTtl(key: string, ttlSec: number): Promise<number> {
    const now = Date.now();
    if (this.redis) {
      try {
        const n = await this.redis.incr(key);
        if (n === 1) {
          await this.redis.expire(key, ttlSec);
        }
        return Number(n);
      } catch (e) {
        this.logger.warn(`Redis incr failed for ${key}: ${String((e as Error)?.message ?? e)}`);
      }
    }
    const cur = this.memIncr.get(key);
    if (!cur || cur.expiresAt <= now) {
      this.memIncr.set(key, { count: 1, expiresAt: now + ttlSec * 1000 });
      return 1;
    }
    cur.count += 1;
    return cur.count;
  }

  async del(key: string): Promise<void> {
    this.memory.delete(key);
    this.memIncr.delete(key);
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch {
      // ignore
    }
  }
}

