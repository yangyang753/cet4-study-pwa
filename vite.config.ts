import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync } from 'node:fs';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const base = isGitHubPages ? '/cet4-study-pwa/' : '/';

export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: '四级向前 · CET-4 Study Lab',
      short_name: '四级向前',
      description: '面向英语基础薄弱学习者的四级每日训练应用',
      theme_color: '#183f33',
      background_color: '#f7f4ec',
      display: 'standalone',
      start_url: `${base}today`,
      scope: base,
      lang: 'zh-CN',
      icons: [{ src: `${base}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
      navigateFallback: `${base}index.html`,
      runtimeCaching: [{
        urlPattern: ({ url }) => url.pathname.startsWith(`${base}audio/`),
        handler: 'CacheFirst',
        options: { cacheName: 'cet4-audio-v1', expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 90 } },
      }],
    },
    devOptions: { enabled: true, navigateFallback: 'index.html' },
  }), {
    name: 'github-pages-spa-fallback',
    closeBundle() {
      if (isGitHubPages) copyFileSync('dist/index.html', 'dist/404.html');
    },
  }],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['tests/**', 'node_modules/**'],
  },
});
