import { LRUCache } from "lru-cache";

const lookupCache = new LRUCache<string, unknown>({
  max: 200,
  ttl: 1000 * 60 * 5,
});

export async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = lookupCache.get(key) as T | undefined;
  if (hit !== undefined) return hit;
  const value = await loader();
  lookupCache.set(key, value as unknown);
  return value;
}

export function invalidateLookupCache(prefix?: string): void {
  if (!prefix) {
    lookupCache.clear();
    return;
  }
  for (const key of lookupCache.keys()) {
    if (key.startsWith(prefix)) lookupCache.delete(key);
  }
}
