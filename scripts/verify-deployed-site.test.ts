import { describe, expect, it, vi } from 'vitest';
import { verifyDeployedSite } from './verify-deployed-site.mts';

describe('verifyDeployedSite', () => {
  it('checks the deployed shell, manifest, worker, and one listening file', async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('manifest.webmanifest')) return new Response('{"name":"CET-4"}', { status: 200, headers: { 'content-type': 'application/manifest+json' } });
      if (url.endsWith('sw.js')) return new Response('self.addEventListener("fetch",()=>{})', { status: 200, headers: { 'content-type': 'application/javascript' } });
      if (url.endsWith('audio/v1/listen-01.wav')) return new Response('RIFF', { status: 200, headers: { 'content-type': 'audio/wav' } });
      return new Response('<main>四级向前</main>', { status: 200, headers: { 'content-type': 'text/html' } });
    });

    await expect(verifyDeployedSite('https://example.test/cet4-study-pwa/', fetcher)).resolves.toEqual({ checked: 4 });
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      'https://example.test/cet4-study-pwa/',
      'https://example.test/cet4-study-pwa/manifest.webmanifest',
      'https://example.test/cet4-study-pwa/sw.js',
      'https://example.test/cet4-study-pwa/audio/v1/listen-01.wav',
    ]);
    expect(fetcher.mock.calls[3][1]).toEqual(expect.objectContaining({
      headers: { Range: 'bytes=0-1023' },
    }));
  });

  it('fails when a deployed asset cannot be fetched', async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('sw.js')) return new Response('', { status: 404 });
      return new Response(url.endsWith('manifest.webmanifest') ? '{}' : '<main>ok</main>', {
        status: 200,
        headers: { 'content-type': url.endsWith('manifest.webmanifest') ? 'application/json' : 'text/html' },
      });
    });
    await expect(verifyDeployedSite('https://example.test/app/', fetcher)).rejects.toThrow(/sw\.js.*404/);
  });

  it('aborts a resource check that exceeds the configured timeout', async () => {
    const fetcher = vi.fn((_input: string | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    await expect(verifyDeployedSite('https://example.test/app/', fetcher, { timeoutMs: 5 })).rejects.toThrow(/site root timed out after 5ms/);
    expect((fetcher.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
  });

  it('times out when headers arrive but the response body never starts', async () => {
    const stalledBody = new ReadableStream<Uint8Array>({ start() { /* intentionally never enqueue */ } });
    const fetcher = vi.fn(async () => new Response(stalledBody, { status: 200, headers: { 'content-type': 'text/html' } }));
    await expect(verifyDeployedSite('https://example.test/app/', fetcher, { timeoutMs: 5 })).rejects.toThrow(/site root body timed out after 5ms/);
  });
});
