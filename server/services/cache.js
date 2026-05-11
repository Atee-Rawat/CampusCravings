/**
 * Simple cache with optional Redis fallback.
 * If `REDIS_URL` is provided and `redis` package is installed, it will use Redis.
 * Otherwise falls back to an in-memory Map with TTL support.
 */
let redisClient = null;
let useRedis = false;

try {
    if (process.env.REDIS_URL) {
        // lazy require so package not mandatory for local dev
        // eslint-disable-next-line global-require
        const { createClient } = require('redis');
        redisClient = createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis client error', err));
        redisClient.connect().then(() => {
            useRedis = true;
            console.log('Connected to Redis for server-side caching');
        }).catch((e) => {
            console.warn('Failed to connect to Redis, falling back to memory cache', e.message);
            redisClient = null;
        });
    }
} catch (e) {
    // redis package not installed or other error - continue with memory cache
    redisClient = null;
}

const memoryStore = new Map();

const setMemory = (key, value, ttlMs) => {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    memoryStore.set(key, { value, expiresAt });
    if (ttlMs) {
        setTimeout(() => {
            const entry = memoryStore.get(key);
            if (entry && entry.expiresAt && Date.now() >= entry.expiresAt) {
                memoryStore.delete(key);
            }
        }, Math.min(ttlMs, 60 * 60 * 1000));
    }
};

const getMemory = (key) => {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
        memoryStore.delete(key);
        return null;
    }
    return entry.value;
};

const delMemory = (key) => memoryStore.delete(key);

const delMemoryByPrefix = (prefix) => {
    for (const key of Array.from(memoryStore.keys())) {
        if (key.startsWith(prefix)) memoryStore.delete(key);
    }
};

module.exports = {
    get: async (key) => {
        if (useRedis && redisClient) {
            try {
                const v = await redisClient.get(key);
                return v ? JSON.parse(v) : null;
            } catch (e) {
                return getMemory(key);
            }
        }
        return getMemory(key);
    },
    set: async (key, value, ttlMs = 60 * 60 * 1000) => {
        if (useRedis && redisClient) {
            try {
                const v = JSON.stringify(value);
                if (ttlMs) {
                    await redisClient.set(key, v, { PX: ttlMs });
                } else {
                    await redisClient.set(key, v);
                }
                return true;
            } catch (e) {
                setMemory(key, value, ttlMs);
                return false;
            }
        }
        setMemory(key, value, ttlMs);
        return true;
    },
    del: async (key) => {
        if (useRedis && redisClient) {
            try {
                await redisClient.del(key);
                return true;
            } catch (e) {
                return delMemory(key);
            }
        }
        return delMemory(key);
    },
    delPrefix: async (prefix) => {
        if (useRedis && redisClient) {
            try {
                // Use SCAN to delete keys by pattern
                const stream = redisClient.scanIterator({ MATCH: `${prefix}*` });
                for await (const key of stream) {
                    await redisClient.del(key);
                }
                return true;
            } catch (e) {
                delMemoryByPrefix(prefix);
                return false;
            }
        }
        delMemoryByPrefix(prefix);
        return true;
    }
};
