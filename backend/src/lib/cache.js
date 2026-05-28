import { LRUCache } from 'lru-cache';
import { env } from '../config/env.js';

const TTL_SECONDS = 60;

function makeLruBackend() {
  const lru = new LRUCache({
    max: 1000,
    ttl: TTL_SECONDS * 1000,
    updateAgeOnGet: false,
    allowStale: false,
  });
  return {
    async get(key) { return lru.get(key) ?? null; },
    async set(key, value, ttl = TTL_SECONDS) {
      lru.set(key, value, { ttl: ttl * 1000 });
    },
    async del(key) { lru.delete(key); },
  };
}

async function makeRedisBackend(url) {
  const { default: Redis } = await import('ioredis');
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  await client.connect();
  return {
    async get(key) {
      const v = await client.get(key);
      return v ? JSON.parse(v) : null;
    },
    async set(key, value, ttl = TTL_SECONDS) {
      await client.set(key, JSON.stringify(value), 'EX', ttl);
    },
    async del(key) { await client.del(key); },
  };
}

async function buildCache() {
  if (!env.redisUrl) {
    console.log('cache: in-memory LRU (no REDIS_URL set)');
    return makeLruBackend();
  }
  try {
    const redis = await makeRedisBackend(env.redisUrl);
    console.log(`cache: redis at ${env.redisUrl.replace(/\/\/.*@/, '//***@')}`);
    return redis;
  } catch (err) {
    console.warn(`cache: redis unavailable (${err.message}), falling back to in-memory LRU`);
    return makeLruBackend();
  }
}

export const cache = await buildCache();
