import { chromium } from 'playwright';

const targets = [
  { path: 'public/icon-192.png', size: 192 },
  { path: 'public/icon-512.png', size: 512 },
  { path: 'public/icon-maskable-512.png', size: 512 },
  { path: 'public/apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.size, height: target.size } });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style><svg xmlns="http://www.w3.org/2000/svg" width="${target.size}" height="${target.size}" viewBox="0 0 512 512"><rect width="512" height="512" fill="#183f33"/><path d="M122 126h268v54H184v69h171v53H184v84h-62z" fill="#f7f4ec"/><circle cx="366" cy="370" r="58" fill="#f2c269"/><path d="M365 333v74m-37-37h74" stroke="#183f33" stroke-width="20" stroke-linecap="round"/></svg>`);
    await page.locator('svg').screenshot({ path: target.path });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('Generated application icons.');
