import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export interface BundleAsset { path: string; bytes: number; entry: boolean }
export function checkBundleBudget(files: BundleAsset[], limits = { initialLimitBytes: 512000, assetLimitBytes: 800000 }): string[] {
  return files.filter((file) => file.path.endsWith('.js')).flatMap((file) => {
    const limit = file.entry ? limits.initialLimitBytes : limits.assetLimitBytes;
    return file.bytes > limit ? [`${file.path}: ${file.bytes} bytes exceeds ${limit}`] : [];
  });
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  const manifestPath = path.resolve('dist/.vite/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, { file: string; isEntry?: boolean }>;
  const assets = [...new Map(Object.values(manifest).filter((item) => item.file.endsWith('.js')).map((item) => [item.file, { path: item.file, bytes: statSync(path.resolve('dist', item.file)).size, entry: Boolean(item.isEntry) }])).values()];
  const errors = checkBundleBudget(assets);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`Bundle budget verified: ${assets.length} JavaScript assets.`);
}
