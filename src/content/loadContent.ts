import type { ContentPack } from '../domain/content';
import { parseContentPack } from './schema';

export async function loadContentPack(url: string): Promise<ContentPack> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Content load failed: ${response.status}`);
  return parseContentPack(await response.json());
}
