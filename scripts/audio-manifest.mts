import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import listeningSets from '../content/v1/listeningSets.json' with { type: 'json' };

const errors: string[] = [];
function wavDuration(wav: Buffer) {
  const bytesPerSecond = wav.readUInt32LE(28);
  let offset = 12;
  while (offset + 8 <= wav.length) { const id = wav.toString('ascii', offset, offset + 4); const size = wav.readUInt32LE(offset + 4); if (id === 'data') return size / bytesPerSecond; offset += 8 + size + (size % 2); }
  return 0;
}
for (const set of listeningSets) {
  let previous = 0;
  for (const segment of set.segments) { if (segment.start < previous || segment.end <= segment.start) errors.push(`${set.id}: invalid segment timing`); previous = segment.end; }
  const audioPath = path.join(process.cwd(), 'public', set.audioSrc.replace(/^[/\\]+/, ''));
  try {
    await access(audioPath);
    const wav = await readFile(audioPath);
    if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') errors.push(`${set.id}: invalid WAV file`);
    else if ((set.segments.at(-1)?.end ?? 0) > wavDuration(wav) + 0.1) errors.push(`${set.id}: segment timing exceeds WAV duration`);
  } catch { errors.push(`${set.id}: missing ${set.audioSrc}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Validated ${listeningSets.length} listening audio files.`);
