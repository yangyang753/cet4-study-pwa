export type ListeningCacheResult = 'cached' | 'already-cached';
const audioCacheName = 'cet4-audio-v2';

export async function cacheListeningAudio(
  url: string,
  cacheStorage: CacheStorage | null = typeof caches === 'undefined' ? null : caches,
): Promise<ListeningCacheResult> {
  if (!cacheStorage) throw new Error('当前浏览器不支持离线音频，请保持联网播放。');
  const cache = await cacheStorage.open(audioCacheName);
  if (await cache.match(url)) return 'already-cached';
  await cache.add(url);
  return 'cached';
}

export async function listCachedListeningAudio(cacheStorage: CacheStorage | null = typeof caches === 'undefined' ? null : caches): Promise<string[]> {
  if (!cacheStorage) return [];
  const cache = await cacheStorage.open(audioCacheName);
  const requests = await cache.keys();
  return requests.map((request) => new URL(request.url).pathname).filter((pathname) => /\/audio\/v1\/listen-[^/]+\.wav$/i.test(pathname));
}

export async function clearCachedListeningAudio(cacheStorage: CacheStorage | null = typeof caches === 'undefined' ? null : caches): Promise<boolean> {
  if (!cacheStorage) return false;
  return cacheStorage.delete(audioCacheName);
}
