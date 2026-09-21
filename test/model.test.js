import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MODEL } from '../score.js';
import { BIGRAM_ROWS, TRIGRAM_ROWS, NGRAM_TOTAL_LETTERS, NGRAM_SOURCES } from '../ngramModel.js';

test('モデルの数値・件数・確率・復号後SHA-256', () => {
  assert.equal(MODEL.floor, -871);
  assert.equal(NGRAM_TOTAL_LETTERS, 5141270);
  assert.equal(NGRAM_SOURCES.length, 10);
  assert.equal(BIGRAM_ROWS.length, 26);
  assert.equal(TRIGRAM_ROWS.length, 676);
  for (const row of [...BIGRAM_ROWS, ...TRIGRAM_ROWS]) assert.match(row, /^[0-9a-z]{52}$/);
  const index = (word) => [...word].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 65, 0);
  for (const [word, value] of Object.entries({ THE: -172, AND: -201, ING: -213, QQQ: -871 })) {
    assert.equal(MODEL.tri[index(word)], value);
  }
  for (const [word, value] of Object.entries({ TH: -150, HE: -155, QZ: -871 })) assert.equal(MODEL.bi[index(word)], value);
  for (const [word, value] of Object.entries({ E: -91, T: -104, Z: -323 })) assert.equal(MODEL.uni[index(word)], value);
  for (const [name, max, count, hash] of [
    ['uni', 'E', 26, 'f169a43ae0c836b2476047741a253175ad47e7fe14dfa5fe3b388d8f0de1eaae'],
    ['bi', 'TH', 623, '3f30b49f5795d34cfd611ef36641aaef92f71cd40911ade46452098868169412'],
    ['tri', 'THE', 8604, '8a65869f61f0a59012398754f29870682bd14c1aaa7980227ed14eaeb49f43d7'],
  ]) {
    const values = [...MODEL[name]];
    assert.equal(values.indexOf(Math.max(...values)), index(max));
    const seen = values.filter((value) => value !== MODEL.floor);
    assert.equal(seen.length, count);
    assert.ok(Math.abs(seen.reduce((sum, value) => sum + 10 ** (value / 100), 0) - 1) <= 0.01);
    assert.equal(createHash('sha256').update(values.join(',')).digest('hex'), hash);
  }
});

test('提供された4ファイルをバイト単位で保持', () => {
  for (const [name, bytes, hash] of [
    ['ngramModel.js', 42736, 'b99d4501781127b43a6bb0713ff995a2d27fbae009663e2a7c4f0415dcefa6be'],
    ['tools/build-ngram-model.mjs', 6292, '600c013695e95e7d6aca8dfc6bd4b38a9729671bdfe7d612de1f680446743636'],
    ['vendor/chartjs/chart.umd.min.js', 208522, '48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a'],
    ['vendor/chartjs/LICENSE.md', 1093, '41a84aa2caba645f966a18d9c2056b73e6d3a81d80bc0046bc0011a2634d4cce'],
  ]) {
    const data = readFileSync(new URL('../' + name, import.meta.url));
    assert.equal(data.length, bytes, name);
    assert.equal(createHash('sha256').update(data).digest('hex'), hash, name);
  }
});
