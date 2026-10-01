import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

export async function verifyDeployedSite(baseUrl: string, fetcher: Fetcher = fetch) {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const checks = [
    { path: '', contentType: /text\/html/i },
    { path: 'manifest.webmanifest', contentType: /(manifest|json)/i },
    { path: 'sw.js', contentType: /(javascript|text\/plain)/i },
    { path: 'audio/v1/listen-01.wav', contentType: /^audio\//i },
  ];

  for (const check of checks) {
    const url = new URL(check.path, base);
    const response = await fetcher(url, { cache: 'no-store', redirect: 'follow' });
    assert.ok(response.ok, `${check.path || 'site root'} returned ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    assert.match(contentType, check.contentType, `${check.path || 'site root'} returned unexpected content-type ${contentType}`);
    const body = await response.arrayBuffer();
    assert.ok(body.byteLength > 0, `${check.path || 'site root'} returned an empty body`);
  }

  return { checked: checks.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const baseUrl = process.argv.slice(2).find((argument) => argument !== '--');
  assert.ok(baseUrl, 'Usage: pnpm site:verify -- <deployed-page-url>');
  const result = await verifyDeployedSite(baseUrl);
  console.log(`Deployed site verified: ${result.checked} public resources are available.`);
}
