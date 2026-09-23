import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const contentPath = path.join(root, 'content/v1/listeningSets.json');
const inventoryPath = path.join(root, 'content/v1/inventory.json');
const sets = JSON.parse(await readFile(contentPath, 'utf8')) as Array<{ id: string; audioSrc: string; segments: Array<{ start: number; end: number; text: string }> }>;

function wavDuration(buffer: Buffer) {
  const bytesPerSecond = buffer.readUInt32LE(28);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'data') return size / bytesPerSecond;
    offset += 8 + size + (size % 2);
  }
  throw new Error('WAV data chunk not found');
}

for (const set of sets) {
  const audio = await readFile(path.join(root, 'public', set.audioSrc.replace(/^[/\\]+/, '')));
  const duration = wavDuration(audio);
  const weights = set.segments.map((segment) => Math.max(1, segment.text.trim().split(/\s+/).length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let elapsed = 0;
  set.segments = set.segments.map((segment, index) => {
    const start = elapsed;
    elapsed = index === set.segments.length - 1 ? duration : elapsed + duration * weights[index] / totalWeight;
    return { ...segment, start: Number(start.toFixed(2)), end: Number(elapsed.toFixed(2)) };
  });
}

await writeFile(contentPath, `${JSON.stringify(sets, null, 2)}\n`, 'utf8');
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8')) as Record<string, unknown>;
inventory.listeningSets = sets;
await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
console.log(`Synchronized segment timing for ${sets.length} WAV files.`);
