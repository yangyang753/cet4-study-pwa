interface CryptoSource { randomUUID?: () => string }

let fallbackSequence = 0;

export function createId(
  cryptoSource: CryptoSource = globalThis.crypto ?? {},
  now: () => number = Date.now,
  random: () => number = Math.random,
) {
  if (typeof cryptoSource.randomUUID === 'function') return cryptoSource.randomUUID();
  fallbackSequence += 1;
  return `local-${now().toString(36)}-${fallbackSequence.toString(36)}-${Math.floor(random() * Number.MAX_SAFE_INTEGER).toString(36)}`;
}
