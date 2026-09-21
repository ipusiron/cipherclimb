import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomInitialKey, freeLetters, coolingRate, climb, solve } from '../solver.js';
import { ALPHABET } from '../utils.js';
import { SAMPLE_PLAIN, SAMPLE_P2C, SAMPLE_FIXED } from '../samples.js';
import { DICTIONARIES } from '../dictionaries.js';
import { scoreText } from '../score.js';
import { config, accuracy } from './support.js';

test('mulberry32・初期鍵・自由文字・冷却率の既知解答', () => {
  for (const [seed, expected] of [
    [1, ['0.6270739406', '0.0027357212', '0.5274470400', '0.9810509675', '0.9683778982']],
    [0, ['0.2664292087', '0.0003297457', '0.2232720274']],
    [4294967295, ['0.8964226141', '0.1894782567', '0.7156526782']],
  ]) {
    const rng = createRng(seed);
    assert.deepEqual(expected.map(() => rng().toFixed(10)), expected);
  }
  assert.equal(randomInitialKey({}, createRng(1)), 'OLGJIKTDYESCUBPRZHNXFVWMAQ');
  assert.equal(randomInitialKey({}, createRng(2)), 'PCYEVUAHRLQSKFDWBOXJNZMGIT');
  assert.equal(randomInitialKey(SAMPLE_FIXED, createRng(1)), 'BLNHJDITCYPRXGZOKEFUVWMSAQ');
  const free = freeLetters(SAMPLE_FIXED);
  assert.equal(free.freePlain.join(''), 'ABCFGIJKMNPQRUVXYZ');
  assert.equal(free.freeCipher.join(''), 'ACEGIJKLMNOQSTUWYZ');
  assert.equal(coolingRate('auto', 3000), 0.9977000638225533);
  assert.equal(coolingRate('0.999', 3000), 0.999);
  assert.equal(coolingRate('bogus', 1000), 0.9931160484209338);
});

const key = 'ILJHUDQTYCVPXKGOFENAMWZSRB';
const fixed = (n) => Object.fromEntries([...ALPHABET].slice(0, n).map((ch, i) => [ch, SAMPLE_P2C[i]]));
const shortCipher = [
  'Vr dpbf hdrxr hyehdx hp zr xrbq-rkafrsh, hdth tbb urs tyr jyrthrf rgetb;',
  'hdth hdri tyr rsfpvrf zi hdray Jyrthpy vahd jryhtas estbarstzbr Yaodhx.',
].join(' ');
// スコア、鍵、再始動番号、再加熱回数、正解率は仕様の固定値。
const cases = [
  ['A', 1, {}, {}, -352088, 'ILJHUDQTYCVPZKGOFENAMWXSRB', 4, 6, '99.81'],
  ['B', 2, {}, {}, -351903, key, 0, 4, '100.00'],
  ['C', 3, {}, {}, -351903, key, 1, 4, '100.00'],
  ['D', 1, { useAnnealing: false }, {}, -351903, key, 0, 0, '100.00'],
  ['E', 1, { enableReheat: false }, {}, -351903, key, 2, 0],
  ['F', 1, { cooling: '0.995' }, {}, -351903, key, 0, 7],
  ['G', 1, { maxTries: 200 }, {}, -426813, 'OLJIUCQRPMKHXZFYTENABWGSDV', 4, 0, '42.53'],
  ['H', 7, { maxTries: 200, useAnnealing: false }, {}, -433210, 'ALJCUWXEPGFYQKMOHITRSVZDNB', 1, 0, '14.37'],
  ['I', 1, {}, { useDict: false }, -359903, key, 1, 3, '100.00'],
  ['J', 4, {}, { dictionary: DICTIONARIES.basic343.words, usePartial: true, dictWeight: 200 }, -348703, key, 1, 5, '100.00'],
  ['K', 1, { maxTries: 500 }, { useNgram: false, useDict: false }, -65354, 'IDKRCLJTGYBFZXMNUEASWVQOHP', 3, null, '33.65'],
  ['L', 1, { fixedMap: SAMPLE_FIXED, maxTries: 300 }, {}, -354653, 'ILJHUDQTYCVBXKGOFENAMWZSRP', 2, null, '96.79'],
  ['M', 1, { fixedMap: fixed(24), maxTries: 50 }, {}, -351903, key, null, null, '100.00'],
  ['N', 1, { fixedMap: fixed(25) }, {}, -351903, key, 0, 0],
  ['O', 1, { fixedMap: fixed(26) }, {}, -351903, key, 0, 0],
  ['P', 5, { cipherText: shortCipher, maxTries: 1000 }, {}, -83431, 'ILZNYSBOCDFJXQGUVEATPMKWRH', 1],
];
for (const [id, seed, overrides, scoreOverrides, expectedScore, expectedKey, restart, reheats, percent] of cases) {
  test('A-9 ' + id, () => {
    const options = config(seed, overrides, scoreOverrides);
    const begin = performance.now();
    const result = solve(options);
    const elapsed = performance.now() - begin;
    assert.equal(result.bestScore, expectedScore);
    assert.equal(result.bestKey, expectedKey);
    if (restart != null) assert.equal(result.bestRestart, restart);
    if (reheats != null) assert.equal(result.reheats, reheats);
    if (percent) assert.equal(accuracy(SAMPLE_PLAIN, result.plainText), percent);
    assert.equal(scoreText(result.plainText, options.scoring), result.bestScore);
    const searched = !['N', 'O'].includes(id);
    assert.equal(result.searched, searched);
    assert.equal(result.triesDone, searched ? options.maxTries * 5 : 0);
    assert.equal(result.totalTries, result.triesDone);
    assert.equal(result.history.length, searched ? Math.ceil(options.maxTries / 100) * 5 : 0);
    assert.equal(result.snapshots, searched ? Math.ceil(options.maxTries / 500) * 5 : 0);
    for (const [plain, cipher] of Object.entries(options.fixedMap)) {
      assert.equal(result.bestKey[cipher.charCodeAt(0) - 65], plain);
    }
    if (!searched) assert.ok(elapsed < 1000, '固定鍵だけの処理が1秒未満');
    if (id === 'P') assert.ok(result.plainText.startsWith('ME NULS ONEWE ORYONW OU HE WELV-EFISEAO, ONT'));
    if (id === 'A') {
      assert.deepEqual(result.history[0], { x: 1, current: -634397, best: -634397 });
      assert.deepEqual(result.history.at(-1), { x: 14901, current: -352372, best: -352088 });
      assert.deepEqual(solve(config(1)), result);
    }
  });
}

test('Gの中間報告とAの途中停止', () => {
  const iterator = climb(config(1, { maxTries: 200 }));
  const first = iterator.next().value;
  assert.deepEqual(first, {
    restart: 0, iteration: 0, triesDone: 1, totalTries: 1000, temperature: 966.0508789898133,
    currentScore: -634397, restartBestScore: -634397, bestScore: -634397,
    bestKey: 'OLGJIKTDYESCUBPRZHNXFVWMAQ', points: [{ x: 1, current: -634397, best: -634397 }],
  });
  const second = iterator.next().value;
  for (const [field, value] of Object.entries({
    restart: 1, iteration: 0, triesDone: 201, currentScore: -548571, restartBestScore: -548571,
    bestScore: -438914, bestKey: 'IWULODQEKBGFXJTRPANYHVZMSC',
  })) assert.equal(second[field], value);
  assert.equal(second.points.length, 2);
  const normal = climb(config());
  let stopped;
  for (let i = 0; i < 4; i++) stopped = normal.next().value;
  for (const [field, value] of Object.entries({
    restart: 0, iteration: 1500, triesDone: 1501, bestScore: -382006, bestKey: 'AMJHUGBTPDVFQZYOWENILCXSRK',
  })) assert.equal(stopped[field], value);
  assert.throws(() => climb(config(1, { fixedMap: { A: 'T', B: 'T' } })).next(), /conflicts/);
});
