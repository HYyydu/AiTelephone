import Redis, { RedisOptions } from "ioredis";
import { config } from "../config";

const CACHE_NAMESPACE = "quote:search:";
let redisClient: Redis | null = null;
let initAttempted = false;

function initializeRedis(): Redis | null {
  if (!config.redis.url) {
    if (!initAttempted) {
      console.warn(
        "⚠️  REDIS_URL is not configured. Quote search caching is disabled.",
      );
    }
    initAttempted = true;
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const options: RedisOptions = config.redis.tls
      ? {
          tls: {
            // Managed Redis providers often require TLS but reject self-signed certs.
            rejectUnauthorized: false,
          },
        }
      : {};

    redisClient = new Redis(config.redis.url, options);

    redisClient.on("connect", () => {
      console.log("✅ Connected to Redis for quote search caching");
    });

    redisClient.on("error", (error) => {
      console.warn("⚠️  Redis error:", error.message);
    });

    initAttempted = true;
    return redisClient;
  } catch (error) {
    initAttempted = true;
    console.error("❌ Failed to initialize Redis client:", error);
    return null;
  }
}

export function getRedisClient(): Redis | null {
  return redisClient ?? initializeRedis();
}

function buildCacheKey(key: string): string {
  return `${CACHE_NAMESPACE}${key}`;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const cached = await client.get(buildCacheKey(key));
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as T;
  } catch (error) {
    console.warn("⚠️  Failed to read from Redis cache:", error);
    return null;
  }
}

export async function setCachedJson(
  key: string,
  value: unknown,
  ttlSeconds = config.redis.placesCacheTtlSeconds,
): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    const payload = JSON.stringify(value);
    const cacheKey = buildCacheKey(key);
    if (ttlSeconds > 0) {
      await client.setex(cacheKey, ttlSeconds, payload);
    } else {
      await client.set(cacheKey, payload);
    }
  } catch (error) {
    console.warn("⚠️  Failed to write to Redis cache:", error);
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    initAttempted = false;
  }
}
