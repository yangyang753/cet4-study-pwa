export type DictationToken = { word: string; status: 'matched' | 'missing' | 'extra' };

function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9'\s]/g, '').split(/\s+/).filter(Boolean);
}

export function evaluateDictation(expectedText: string, actualText: string) {
  const expected = tokenize(expectedText);
  const actual = tokenize(actualText);
  const table = Array.from({ length: expected.length + 1 }, () => Array(actual.length + 1).fill(0) as number[]);
  for (let left = 1; left <= expected.length; left += 1) {
    for (let right = 1; right <= actual.length; right += 1) {
      table[left][right] = expected[left - 1] === actual[right - 1]
        ? table[left - 1][right - 1] + 1
        : Math.max(table[left - 1][right], table[left][right - 1]);
    }
  }
  const tokens: DictationToken[] = [];
  let left = expected.length;
  let right = actual.length;
  while (left > 0 || right > 0) {
    if (left > 0 && right > 0 && expected[left - 1] === actual[right - 1]) {
      tokens.push({ word: expected[left - 1], status: 'matched' }); left -= 1; right -= 1;
    } else if (right > 0 && (left === 0 || table[left][right - 1] >= table[left - 1][right])) {
      tokens.push({ word: actual[right - 1], status: 'extra' }); right -= 1;
    } else {
      tokens.push({ word: expected[left - 1], status: 'missing' }); left -= 1;
    }
  }
  tokens.reverse();
  const missing = tokens.filter((token) => token.status === 'missing').map((token) => token.word);
  const extra = tokens.filter((token) => token.status === 'extra').map((token) => token.word);
  const matched = tokens.filter((token) => token.status === 'matched').length;
  return { tokens, matched, missing, extra, total: expected.length, accuracy: expected.length ? Math.round(matched / expected.length * 100) : 0 };
}
