import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreText, scoreBreakdown, createScorer, wordMatches } from '../score.js';
import { SAMPLE_PLAIN, SAMPLE_CIPHER } from '../samples.js';
import { DICTIONARIES } from '../dictionaries.js';
import { decrypt, prepareText } from '../utils.js';
import { randomInitialKey, createRng } from '../solver.js';
import { scoring } from './support.js';

test('スコア全既知解答', () => {
  for (const [text, letter, ngram, dict, total] of [
    [SAMPLE_PLAIN, -65608, -294295, 8000, -351903], [SAMPLE_CIPHER, -81970, -523052, 0, -605022],
    ['THE', -314, -477, 100, -691], ['THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG', -5399, -23156, 800, -27755],
    ['the quick brown fox', -2508, -9502, 400, -11610], ['ZZZ QQQ', -1857, -6955, 0, -8812],
    ['A', -109, 0, 0, -109], ['', 0, 0, 0, 0], ['12345 これは', 0, 0, 0, 0],
    ['GOVERNMENTS ARE INSTITUTED', -2889, -12560, 200, -15249],
  ]) {
    assert.deepEqual(scoreBreakdown(text, scoring), { letter, ngram, dict });
    assert.equal(scoreText(text, scoring), total);
  }
  for (const [override, expected] of [
    [{ dictionary: DICTIONARIES.basic343.words }, 4300], [{ usePartial: true }, 8700], [{ dictWeight: 200 }, 16000],
  ]) assert.equal(scoreBreakdown(SAMPLE_PLAIN, { ...scoring, ...override }).dict, expected);
});

test('辞書・完全一致と部分一致', () => {
  const google = DICTIONARIES.google10000.words;
  const basic = DICTIONARIES.basic343.words;
  assert.equal(google.size, 9578);
  assert.ok([...google].every((word) => /^[A-Z]{3,}$/.test(word)));
  assert.equal(basic.size, 343);
  assert.equal([...basic].filter((word) => /^[A-Z]{3,}$/.test(word)).length, 320);
  assert.equal([...basic].filter((word) => word.length === 2).length, 22);
  assert.deepEqual([...basic].filter((word) => !/^[A-Z]+$/.test(word)), ["N'T"]);
  for (const [word, full, partial] of [
    ['GOVERNMENTS', true, true], ['GOVERNMENT', true, true], ['THEYARE', false, true],
    ['THEXYZ', false, true], ['TH', false, false], ['XQZ', false, false],
  ]) {
    assert.equal(wordMatches(word, google, false), full);
    assert.equal(wordMatches(word, google, true), partial);
  }
});

test('20個のランダム鍵でも直接採点と復号後採点が整数で一致', () => {
  const rng = createRng(8);
  const score = createScorer(prepareText(SAMPLE_CIPHER), scoring);
  for (let i = 0; i < 20; i++) {
    const key = randomInitialKey({}, rng);
    const actual = score(Int8Array.from(key, (ch) => ch.charCodeAt(0) - 65));
    assert.ok(Number.isInteger(actual));
    assert.equal(actual, scoreText(decrypt(SAMPLE_CIPHER, key), scoring));
  }
});
