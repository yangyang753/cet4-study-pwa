import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import listeningSets from '../content/v1/listeningSets.json' with { type: 'json' };

const errors: string[] = [];
for (const set of listeningSets) {
  let previous = 0;
  for (const segment of set.segments) { if (segment.start < previous || segment.end <= segment.start) errors.push(`${set.id}: invalid segment timing`); previous = segment.end; }
  const audioPath = path.join(process.cwd(), 'public', set.audioSrc.replace(/^[/\\]+/, ''));
  try {
    await access(audioPath);
    const wav = await readFile(audioPath);
    if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') errors.push(`${set.id}: invalid WAV file`);
  } catch { errors.push(`${set.id}: missing ${set.audioSrc}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Validated ${listeningSets.length} listening audio files.`);
