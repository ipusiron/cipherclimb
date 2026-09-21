import { NGRAM_FLOOR, UNIGRAM, BIGRAM_ROWS, TRIGRAM_ROWS } from './ngramModel.js';
import { ALPHABET, MIN_WORD_LENGTH, prepareText } from './utils.js';

export const SCORE_SCALE = 100;

export function decodeRows(rows) {
  const table = new Int16Array(rows.length * 26);
  rows.forEach((row, i) => {
    for (let j = 0; j < 26; j++) table[i * 26 + j] = -parseInt(row.slice(j * 2, j * 2 + 2), 36);
  });
  return table;
}

export const MODEL = {
  floor: NGRAM_FLOOR,
  uni: Int16Array.from(UNIGRAM),
  bi: decodeRows(BIGRAM_ROWS),
  tri: decodeRows(TRIGRAM_ROWS),
};

export function wordMatches(word, dictionary, usePartial) {
  if (word.length < MIN_WORD_LENGTH) return false;
  if (dictionary.has(word)) return true;
  if (!usePartial) return false;
  for (let n = MIN_WORD_LENGTH; n < word.length; n++) {
    if (dictionary.has(word.slice(0, n))) return true;
  }
  return false;
}

// 前処理と辞書は探索1回につき一度だけ用意する。評価の和は整数。
export function createScorer(prepared, options) {
  const { letters, words } = prepared;
  const n = letters.length;
  const buffer = new Int8Array(n);
  const { uni, bi, tri } = MODEL;
  return function score(keyIdx) {
    for (let i = 0; i < n; i++) buffer[i] = keyIdx[letters[i]];
    let total = 0;
    if (options.useLetter) {
      for (let i = 0; i < n; i++) total += uni[buffer[i]];
    }
    if (options.useNgram) {
      for (let i = 0; i + 1 < n; i++) total += bi[buffer[i] * 26 + buffer[i + 1]];
      for (let i = 0; i + 2 < n; i++) total += tri[buffer[i] * 676 + buffer[i + 1] * 26 + buffer[i + 2]];
    }
    if (options.useDict) {
      let count = 0;
      for (const word of words) {
        let decoded = '';
        for (let i = 0; i < word.length; i++) decoded += ALPHABET[keyIdx[word[i]]];
        if (wordMatches(decoded, options.dictionary, options.usePartial)) count++;
      }
      total += count * options.dictWeight;
    }
    return total;
  };
}

export function scoreText(text, options) {
  return createScorer(prepareText(text), options)(Int8Array.from({ length: 26 }, (_, i) => i));
}

export function scoreBreakdown(text, options) {
  const base = { ...options, useLetter: false, useNgram: false, useDict: false };
  return {
    letter: scoreText(text, { ...base, useLetter: true }),
    ngram: scoreText(text, { ...base, useNgram: true }),
    dict: scoreText(text, { ...base, useDict: true }),
  };
}
