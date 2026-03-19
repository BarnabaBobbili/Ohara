const cacheStore = new Map();

export const withCache = async (key, ttlMs, resolver) => {
    const now = Date.now();
    const existing = cacheStore.get(key);

    if (existing) {
        if (existing.value !== undefined && existing.expiresAt > now) {
            return existing.value;
        }
        if (existing.promise) {
            return existing.promise;
        }
    }

    const promise = Promise.resolve()
        .then(() => resolver())
        .then((value) => {
            cacheStore.set(key, {
                value,
                expiresAt: Date.now() + ttlMs,
            });
            return value;
        })
        .catch((error) => {
            cacheStore.delete(key);
            throw error;
        });

    cacheStore.set(key, {
        promise,
        expiresAt: now + ttlMs,
    });

    return promise;
};

export const invalidateCacheKey = (key) => {
    cacheStore.delete(key);
};

export const invalidateCacheByPrefix = (...prefixes) => {
    for (const key of cacheStore.keys()) {
        if (prefixes.some((prefix) => key.startsWith(prefix))) {
            cacheStore.delete(key);
        }
    }
};

export const getCacheStats = () => ({
    entries: cacheStore.size,
});
