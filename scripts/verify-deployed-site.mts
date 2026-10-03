import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

async function fetchWithTimeout(fetcher: Fetcher, url: URL, init: RequestInit, label: string, timeoutMs: number) {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([fetcher(url, { ...init, signal: controller.signal }), timeout]);
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`${label} timed out after ${timeoutMs}ms`, { cause: error });
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function responseHasBody(response: Response, label: string, timeoutMs: number) {
  if (!response.body) return (await response.arrayBuffer()).byteLength > 0;
  const reader = response.body.getReader();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} body timed out after ${timeoutMs}ms`));
      void reader.cancel().catch(() => undefined);
    }, timeoutMs);
  });
  try {
    const first = await Promise.race([reader.read(), timeout]);
    return !first.done && Boolean(first.value?.byteLength);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    await reader.cancel().catch(() => undefined);
  }
}

export async function verifyDeployedSite(baseUrl: string, fetcher: Fetcher = fetch, { timeoutMs = 30_000 }: { timeoutMs?: number } = {}) {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const checks = [
    { path: '', contentType: /text\/html/i },
    { path: 'manifest.webmanifest', contentType: /(manifest|json)/i },
    { path: 'sw.js', contentType: /(javascript|text\/plain)/i },
    { path: 'audio/v1/listen-01.wav', contentType: /^audio\//i },
  ];

  for (const check of checks) {
    const url = new URL(check.path, base);
    const label = check.path || 'site root';
    const audioProbe = check.path.endsWith('.wav');
    const response = await fetchWithTimeout(fetcher, url, {
      cache: 'no-store', redirect: 'follow', ...(audioProbe ? { headers: { Range: 'bytes=0-1023' } } : {}),
    }, label, timeoutMs);
    assert.ok(response.ok, `${check.path || 'site root'} returned ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    assert.match(contentType, check.contentType, `${check.path || 'site root'} returned unexpected content-type ${contentType}`);
    assert.ok(await responseHasBody(response, label, timeoutMs), `${check.path || 'site root'} returned an empty body`);
  }

  return { checked: checks.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const baseUrl = process.argv.slice(2).find((argument) => argument !== '--');
  assert.ok(baseUrl, 'Usage: pnpm site:verify -- <deployed-page-url>');
  const result = await verifyDeployedSite(baseUrl);
  console.log(`Deployed site verified: ${result.checked} public resources are available.`);
}
