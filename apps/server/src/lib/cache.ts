class MemoryCache {
    private cache = new Map<string, { value: any; expiresAt: number }>();

    set(key: string, value: any, ttlMs: number = 60000) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    get(key: string): any | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() > cached.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return cached.value;
    }

    delete(key: string) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    invalidateStore(storeId: string) {
        this.delete(`store:${storeId}`);
        this.delete(`store:${storeId}:items`);
        this.delete("stores:all");
    }

    invalidateAllStores() {
        this.delete("stores:all");
        for (const key of Array.from(this.cache.keys())) {
            if (key.startsWith("store:")) {
                this.cache.delete(key);
            }
        }
    }
}

export const memoryCache = new MemoryCache();
