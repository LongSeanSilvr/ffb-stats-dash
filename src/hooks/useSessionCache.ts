export const cache = new Map<string, Promise<any>>();

export function cachedFetch(url: string): Promise<any> {
  if (!cache.has(url)) {
    const promise = fetch(url)
      .then(r => {
        if (!r.ok) {
          throw new Error(`Fetch failed: ${r.status}`);
        }
        return r.json();
      })
      .catch(err => {
        cache.delete(url); // Evict on failure so we can retry
        throw err;
      });
    cache.set(url, promise);
  }
  return cache.get(url)!;
}
