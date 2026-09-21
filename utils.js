// ASCIIの英字だけを扱う。鍵の向きは暗号文字 → 平文字。
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const MAX_CIPHER_CHARS = 10000;
export const SHORT_TEXT_LETTERS = 100;
export const MIN_WORD_LENGTH = 3;
export const DEFAULT_MAX_TRIES = 3000;
export const MAX_TRIES_LIMIT = 20000;

export function letterIndex(ch) {
  const code = ch.codePointAt(0);
  if (code >= 65 && code <= 90) return code - 65;
  if (code >= 97 && code <= 122) return code - 97;
  return -1;
}

export function decrypt(text, key) {
  let result = '';
  for (const ch of text) {
    const i = letterIndex(ch);
    result += i >= 0 ? key[i] : ch;
  }
  return result;
}

export function encrypt(text, plainToCipher) {
  return decrypt(text, plainToCipher);
}

export function invertKey(key) {
  const result = Array(26).fill('?');
  for (let i = 0; i < 26; i++) result[key.charCodeAt(i) - 65] = ALPHABET[i];
  return result.join('');
}

export function isValidKey(key) {
  return typeof key === 'string' && key.length === 26 && [...ALPHABET].every((ch) => key.includes(ch));
}

export function prepareText(text) {
  const letters = [];
  const words = [];
  let run = [];
  for (const ch of text) {
    const i = letterIndex(ch);
    if (i >= 0) {
      letters.push(i);
      run.push(i);
    } else {
      if (run.length >= MIN_WORD_LENGTH) words.push(Int8Array.from(run));
      run = [];
    }
  }
  if (run.length >= MIN_WORD_LENGTH) words.push(Int8Array.from(run));
  const seen = new Set(letters);
  return {
    letters: Int8Array.from(letters), words,
    cipherLettersUsed: [...seen].sort((a, b) => a - b).map((i) => ALPHABET[i]).join(''),
  };
}

export function analyzeCipherText(text) {
  let letters = 0;
  let fullwidth = 0;
  for (const ch of text) {
    if (letterIndex(ch) >= 0) letters++;
    const cp = ch.codePointAt(0);
    if ((cp >= 0xff21 && cp <= 0xff3a) || (cp >= 0xff41 && cp <= 0xff5a)) fullwidth++;
  }
  return {
    length: text.length, letters, fullwidth,
    tooLong: text.length > MAX_CIPHER_CHARS,
    short: letters > 0 && letters < SHORT_TEXT_LETTERS,
  };
}

export function parseMaxTries(raw) {
  const text = String(raw ?? '').trim();
  const value = text === '' ? NaN : Number(text);
  const ok = Number.isInteger(value) && value >= 1 && value <= MAX_TRIES_LIMIT;
  return { ok, value: ok ? value : null };
}

export function parseSeed(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { ok: true, value: null };
  const value = Number(text);
  const ok = Number.isInteger(value) && value >= 0 && value <= 4294967295;
  return { ok, value: ok ? value : null };
}

export function normalizeFixedMap(map) {
  const result = {};
  for (const plain of ALPHABET) {
    const cipher = map?.[plain];
    if (typeof cipher === 'string' && /^[A-Z]$/.test(cipher)) result[plain] = cipher;
  }
  return result;
}

export function findFixedConflicts(map) {
  const byCipher = {};
  for (const [plain, cipher] of Object.entries(normalizeFixedMap(map))) (byCipher[cipher] ||= []).push(plain);
  return Object.entries(byCipher)
    .filter(([, plains]) => plains.length > 1)
    .map(([cipher, plains]) => ({ cipher, plains }));
}

export function highlightSegments(text, dictionary) {
  const segments = [];
  let count = 0;
  for (const part of text.match(/[A-Za-z]+|[^A-Za-z]+/gu) || []) {
    const highlight = /^[A-Za-z]+$/.test(part) && part.length >= MIN_WORD_LENGTH
      && dictionary.has(decrypt(part, ALPHABET));
    segments.push({ text: part, highlight });
    if (highlight) count++;
  }
  return { segments, count };
}

export function formatScore(intScore) {
  return (intScore / 100).toFixed(2);
}
