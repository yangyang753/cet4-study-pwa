export type ListeningCacheResult = 'cached' | 'already-cached';

export async function cacheListeningAudio(
  url: string,
  cacheStorage: CacheStorage | null = typeof caches === 'undefined' ? null : caches,
): Promise<ListeningCacheResult> {
  if (!cacheStorage) throw new Error('当前浏览器不支持离线音频，请保持联网播放。');
  const cache = await cacheStorage.open('cet4-audio-v2');
  if (await cache.match(url)) return 'already-cached';
  await cache.add(url);
  return 'cached';
}
