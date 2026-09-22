import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { preview } from 'vite';

const repositoryBase = '/cet4-study-pwa/';
const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'pnpm';
const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm run build'] : ['run', 'build'];
const build = spawnSync(command, args, {
  cwd: process.cwd(),
  env: { ...process.env, GITHUB_ACTIONS: 'true' },
  encoding: 'utf8',
});

if (build.status !== 0) {
  if (build.stdout) process.stdout.write(build.stdout);
  if (build.stderr) process.stderr.write(build.stderr);
  if (build.error) console.error(build.error);
  process.exit(build.status ?? 1);
}

const indexHtml = readFileSync('dist/index.html', 'utf8');
assert.ok(existsSync('dist/404.html'), 'GitHub Pages must include a direct-route fallback');
const fallbackHtml = readFileSync('dist/404.html', 'utf8');
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8')) as {
  start_url: string;
  scope: string;
  icons: Array<{ src: string }>;
};

assert.match(indexHtml, /\/cet4-study-pwa\/assets\//, 'built assets must use the repository base path');
assert.equal(fallbackHtml, indexHtml, 'GitHub Pages must serve the app shell for direct route visits');
assert.equal(manifest.start_url, `${repositoryBase}today`);
assert.equal(manifest.scope, repositoryBase);
assert.equal(manifest.icons[0]?.src, `${repositoryBase}icon.svg`);

process.env.GITHUB_ACTIONS = 'true';
const server = await preview({
  configFile: 'vite.config.ts',
  logLevel: 'silent',
  preview: { host: '127.0.0.1', port: 4189, strictPort: true },
});
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:4189${repositoryBase}today`);
  await page.getByRole('heading', { name: /继续向 425 分前进/ }).waitFor();
  await page.getByRole('link', { name: /开始今日训练/ }).click();
  await page.waitForURL(`**${repositoryBase}listen`);
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}

console.log('GitHub Pages build contract verified.');
