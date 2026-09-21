import test from 'node:test';
import assert from 'node:assert/strict';
import * as u from '../utils.js';
import { SAMPLE_CIPHER, SAMPLE_PLAIN, SAMPLE_P2C } from '../samples.js';
import { DICTIONARIES } from '../dictionaries.js';
import { createRng, randomInitialKey } from '../solver.js';

test('文字の扱い・前処理・鍵の往復', () => {
  const key = 'ILJHUDQTYCVPXKGOFENAMWZSRB';
  assert.equal(u.invertKey(SAMPLE_P2C), key);
  assert.equal(u.decrypt(SAMPLE_CIPHER, key), SAMPLE_PLAIN);
  assert.equal(u.decrypt('Vr dpbf, hdrxr! ßé Ｖｒ 😀 123', key), 'WE HOLD, THESE! ßé Ｖｒ 😀 123');
  assert.equal(u.encrypt('Attack at dawn!', SAMPLE_P2C), 'THHTJN TH FTVS!');
  assert.equal(u.isValidKey(SAMPLE_P2C), true);
  for (const bad of ['ABC', 'AACDEFGHIJKLMNOPQRSTUVWXYZ', null, 42]) assert.equal(u.isValidKey(bad), false);
  const prepared = u.prepareText(SAMPLE_CIPHER);
  assert.ok(prepared.letters instanceof Int8Array);
  assert.ok(prepared.words.every((word) => word instanceof Int8Array));
  assert.equal(prepared.letters.length, 529);
  assert.equal(prepared.words.length, 89);
  assert.equal(prepared.cipherLettersUsed, 'ABCDEFGHIJKLNOPQRSTUVWXYZ');
  const rng = createRng(5);
  for (let i = 0; i < 20; i++) {
    const random = randomInitialKey({}, rng);
    for (const text of ['', 'A'.repeat(10000), 'Abc ßé Ａ 😀\nxyz 123']) {
      assert.equal(u.decrypt(u.encrypt(text, random), u.invertKey(random)), u.decrypt(text, u.ALPHABET));
    }
  }
});

test('入力の分析と数値の検証', () => {
  assert.deepEqual(u.analyzeCipherText(SAMPLE_CIPHER), { length: 639, letters: 529, fullwidth: 0, tooLong: false, short: false });
  for (const [text, expected] of [
    ['', { letters: 0, short: false }], ['ABC', { letters: 3, short: true }],
    ['これは暗号文ではありません 12345', { length: 19, letters: 0 }],
    ['ＶＲ ＤＰＢＦ vr', { length: 10, letters: 2, fullwidth: 6, short: true }],
    ['A'.repeat(10000), { tooLong: false }], ['A'.repeat(10001), { tooLong: true }],
    ['Vr dpbf 😀', { length: 10, letters: 6 }],
  ]) for (const [key, value] of Object.entries(expected)) assert.equal(u.analyzeCipherText(text)[key], value);
  for (const [raw, value] of [['3000', 3000], [' 250 ', 250], ['1', 1], ['20000', 20000], ['1e3', 1000], ['3000.0', 3000]]) {
    assert.deepEqual(u.parseMaxTries(raw), { ok: true, value });
  }
  for (const raw of ['20001', '0', '-5', '2.5', '', 'abc', '１００', null, undefined]) {
    assert.deepEqual(u.parseMaxTries(raw), { ok: false, value: null });
  }
  for (const raw of ['', ' ']) assert.deepEqual(u.parseSeed(raw), { ok: true, value: null });
  for (const raw of ['0', '1', '4294967295', '42 ']) assert.deepEqual(u.parseSeed(raw), { ok: true, value: Number(raw) });
  for (const raw of ['4294967296', '-1', '1.5', 'abc']) assert.deepEqual(u.parseSeed(raw), { ok: false, value: null });
});

test('固定鍵の正規化とハイライト', () => {
  assert.deepEqual(u.normalizeFixedMap({ A: 't', B: 'TT', C: '', D: 'Q', é: 'X', E: '1' }), { D: 'Q' });
  assert.deepEqual(u.findFixedConflicts({ A: 'T', B: 'T', C: 'Z', D: 'Z', E: 'R' }), [
    { cipher: 'T', plains: ['A', 'B'] }, { cipher: 'Z', plains: ['C', 'D'] },
  ]);
  const dictionary = DICTIONARIES.google10000.words;
  const segments = u.highlightSegments(SAMPLE_PLAIN, dictionary);
  assert.equal(segments.count, 80);
  assert.equal(segments.segments.length, 221);
  assert.deepEqual(segments.segments.slice(0, 3), [
    { text: 'WE', highlight: false }, { text: ' ', highlight: false }, { text: 'HOLD', highlight: true },
  ]);
  assert.equal(u.highlightSegments(SAMPLE_PLAIN, DICTIONARIES.basic343.words).count, 43);
  assert.deepEqual([...new Set(segments.segments.filter((s) => /^[A-Z]{3,}$/.test(s.text) && !s.highlight).map((s) => s.text))],
    ['TRUTHS', 'ENDOWED', 'UNALIENABLE', 'INSTITUTED', 'DERIVING', 'GOVERNED', 'DESTRUCTIVE', 'ABOLISH', 'LAYING']);
  const text = 'We hold THESE truths, don’t we? ＴＨＥ';
  const result = u.highlightSegments(text, dictionary);
  assert.equal(result.count, 3);
  assert.deepEqual(result.segments.map((s) => s.text),
    ['We', ' ', 'hold', ' ', 'THESE', ' ', 'truths', ', ', 'don', '’', 't', ' ', 'we', '? ＴＨＥ']);
  assert.equal(result.segments.map((s) => s.text).join(''), text);
  assert.equal(u.formatScore(-351903), '-3519.03');
});
