import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface Segment { start: number; end: number; text: string; speaker?: string }
interface ListeningSet { id: string; themeEn: string; transcript: string; segments: Segment[] }

const target = path.join(process.cwd(), 'content/v1/listeningSets.json');
const sets = JSON.parse(await readFile(target, 'utf8')) as ListeningSet[];
const uses = new Map<string, Array<{ set: ListeningSet; segment: Segment }>>();
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z]+/g, ' ').trim();

for (const set of sets) for (const segment of set.segments) {
  const prefix = `During work on ${set.themeEn}, `;
  if (segment.text.startsWith(prefix)) segment.text = `${segment.text.charAt(prefix.length).toUpperCase()}${segment.text.slice(prefix.length + 1)}`;
  const topic = set.themeEn.split(/\s+/)[0];
  const escapedTopic = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedTheme = set.themeEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  segment.text = segment.text
    .replace(new RegExp(`^Organizers of the ${escapedTheme} activity`, 'i'), 'The organizers')
    .replace(new RegExp(`^Instructions for the ${escapedTheme} activity`, 'i'), 'Clear instructions')
    .replace(new RegExp(`^Participants in the ${escapedTheme} activity were`, 'i'), 'Participants were')
    .replace(new RegExp(`^The ${escapedTheme} team`, 'i'), 'The team')
    .replace(new RegExp(`^A follow-up survey about ${escapedTheme}`, 'i'), 'A short follow-up survey')
    .replace(new RegExp(`^Staff organizing the ${escapedTheme} activity emphasized`, 'i'), 'Organizers emphasized')
    .replace(new RegExp(`^Any later change to the ${escapedTheme} plan`, 'i'), 'Any later change')
    .replace(new RegExp(`^Results from the ${escapedTheme} activity`, 'i'), 'The results')
    .replace(new RegExp(`^Students who joined the ${escapedTheme} activity`, 'i'), 'Students who took part')
    .replace(new RegExp(`^A participant in the ${escapedTheme} activity explained: I`, 'i'), 'Great. I')
    .replace(new RegExp(`^${escapedTopic} organizers`, 'i'), 'The organizers')
    .replace(new RegExp(`^${escapedTopic} instructions`, 'i'), 'Clear instructions')
    .replace(new RegExp(`^${escapedTopic} participants would`, 'i'), 'Students who took part would')
    .replace(new RegExp(`^${escapedTopic} participants`, 'i'), 'Participants were')
    .replace(new RegExp(`^${escapedTopic} team`, 'i'), 'The team')
    .replace(new RegExp(`^The ${escapedTopic} follow-up survey`, 'i'), 'A short follow-up survey')
    .replace(new RegExp(`^${escapedTopic} staff emphasized`, 'i'), 'Organizers emphasized')
    .replace(new RegExp(`^Any ${escapedTopic} change`, 'i'), 'Any later change')
    .replace(new RegExp(`^${escapedTopic} results`, 'i'), 'The results')
    .replace(new RegExp(`^${escapedTopic} participant: I`, 'i'), 'Great. I');
  const key = normalize(segment.text);
  uses.set(key, [...(uses.get(key) ?? []), { set, segment }]);
}

let changed = 0;
for (const occurrences of uses.values()) {
  if (new Set(occurrences.map(({ set }) => set.id)).size <= 2) continue;
  occurrences.slice(2).forEach(({ set, segment }) => {
    const sentence = segment.text.trim();
    const topic = set.themeEn.split(/\s+/)[0].toLowerCase();
    const capitalizedTopic = `${topic.charAt(0).toUpperCase()}${topic.slice(1)}`;
    segment.text = sentence
      .replace(/^The organizers/i, `The ${topic} organizers`)
      .replace(/^Clear instructions/i, `Clear ${topic} instructions`)
      .replace(/^Participants were/i, `${capitalizedTopic} participants were`)
      .replace(/^The team/i, `The ${topic} team`)
      .replace(/^A short follow-up survey/i, `A short ${topic} follow-up survey`)
      .replace(/^Organizers emphasized/i, `${capitalizedTopic} organizers emphasized`)
      .replace(/^Any later change/i, `Any later ${topic} change`)
      .replace(/^The results/i, `The ${topic} results`)
      .replace(/^Students who took part/i, `${capitalizedTopic} participants`)
      .replace(/^Great\. I/i, `One ${topic} participant said: I`);
    changed += 1;
  });
}
for (const set of sets) set.transcript = set.segments.map((segment) => segment.text).join(' ');

await writeFile(target, `${JSON.stringify(sets, null, 2)}\n`, 'utf8');
console.log(`Diversified ${changed} repeated listening segments across ${sets.length} sets.`);
