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
});
