import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { writeFileSync } from 'node:fs';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const base = isGitHubPages ? '/cet4-study-pwa/' : '/';

export default defineConfig({
  base,
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/@remix-run') || id.includes('node_modules/react-router')) return 'vendor-react';
          if (id.includes('node_modules/dexie')) return 'vendor-dexie';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          if (id.includes('content/v1/listeningSets.json')) return 'content-listening';
          if (id.includes('content/v1/readingSets.json')) return 'content-reading';
          if (id.includes('content/v1/translations.json') || id.includes('content/v1/writingPrompts.json') || id.includes('content/v1/mockExams.json')) return 'content-mock-subjective';
        },
      },
    },
  },
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'],
    manifest: {
      name: '四级向前 · CET-4 Study Lab',
      short_name: '四级向前',
      description: '面向英语基础薄弱学习者的四级每日训练应用',
      theme_color: '#183f33',
      background_color: '#f7f4ec',
      display: 'standalone',
      start_url: `${base}#/today`,
      scope: base,
      lang: 'zh-CN',
      icons: [
        { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: `${base}icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: `${base}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
      navigateFallback: `${base}index.html`,
      runtimeCaching: [{
        urlPattern: ({ url }) => url.pathname.startsWith(`${base}audio/`),
        handler: 'NetworkFirst',
        options: { cacheName: 'cet4-audio-v2', networkTimeoutSeconds: 5, expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 90 } },
      }],
    },
    devOptions: { enabled: true, navigateFallback: 'index.html' },
  }), {
    name: 'github-pages-spa-fallback',
    closeBundle() {
      if (isGitHubPages) {
        const safeBase = JSON.stringify(base);
        writeFileSync('dist/404.html', `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>正在打开四级向前…</title></head><body><p>正在打开学习页面…</p><script>(function(){var base=${safeBase};var route=location.pathname.indexOf(base)===0?location.pathname.slice(base.length):'';var target=base+'#/'+route.replace(/^\\/+|\\/+$/g,'')+location.search;location.replace(target);})();</script></body></html>`);
      }
    },
  }],
  test: {
    environment: 'jsdom',
    testTimeout: 20_000,
    // Keep jsdom suites within the memory/CPU budget of ordinary laptops.
    // Fork startup can time out under load, while a small threads pool stays
    // isolated per test file without spawning a large process tree.
    pool: 'threads',
    maxWorkers: 2,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**'],
  },
});
