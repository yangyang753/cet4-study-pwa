import { describe, expect, it, vi } from 'vitest';
import { cacheListeningAudio, clearCachedListeningAudio, listCachedListeningAudio } from './cacheListeningAudio';

function cacheStorage({ matched = false, addError }: { matched?: boolean; addError?: Error } = {}) {
  const cache = {
    match: vi.fn(async () => matched ? new Response('audio') : undefined),
    add: vi.fn(async () => { if (addError) throw addError; }),
  };
  return {
    cache,
    storage: { open: vi.fn(async () => cache) } as unknown as CacheStorage,
  };
}

describe('cacheListeningAudio', () => {
  it('stores one listening file in the named audio cache', async () => {
    const { cache, storage } = cacheStorage();
    await expect(cacheListeningAudio('/audio/v1/listen-01.wav', storage)).resolves.toBe('cached');
    expect(storage.open).toHaveBeenCalledWith('cet4-audio-v2');
    expect(cache.match).toHaveBeenCalledWith('/audio/v1/listen-01.wav');
    expect(cache.add).toHaveBeenCalledWith('/audio/v1/listen-01.wav');
  });

  it('lists and clears downloaded listening files', async () => {
    const keys = vi.fn(async () => [new Request('https://example.test/audio/v1/listen-01.wav'), new Request('https://example.test/app.js')]);
    const cache = { keys };
    const storage = { open: vi.fn(async () => cache), delete: vi.fn(async () => true) } as unknown as CacheStorage;
    await expect(listCachedListeningAudio(storage)).resolves.toEqual(['/audio/v1/listen-01.wav']);
    await expect(clearCachedListeningAudio(storage)).resolves.toBe(true);
    expect(storage.delete).toHaveBeenCalledWith('cet4-audio-v2');
  });

  it('does not download a file that is already cached', async () => {
    const { cache, storage } = cacheStorage({ matched: true });
    await expect(cacheListeningAudio('/audio/v1/listen-01.wav', storage)).resolves.toBe('already-cached');
    expect(cache.add).not.toHaveBeenCalled();
  });

  it('reports unsupported browsers and preserves quota or network failures', async () => {
    await expect(cacheListeningAudio('/audio/v1/listen-01.wav', null)).rejects.toThrow(/不支持离线音频/);
    const { storage } = cacheStorage({ addError: new DOMException('Quota exceeded', 'QuotaExceededError') });
    await expect(cacheListeningAudio('/audio/v1/listen-01.wav', storage)).rejects.toThrow(/Quota exceeded/);
  });
});
