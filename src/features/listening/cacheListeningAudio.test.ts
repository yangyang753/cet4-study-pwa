import { describe, expect, it, vi } from 'vitest';
import { cacheListeningAudio } from './cacheListeningAudio';

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
