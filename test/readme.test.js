import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { solve, RESTARTS, T0, T_END, REHEAT_AFTER } from '../solver.js';
import { SAMPLE_PLAIN, SAMPLE_FIXED, SAMPLE_P2C, SHORT_SAMPLE_PLAIN } from '../samples.js';
import { MAX_CIPHER_CHARS, DEFAULT_MAX_TRIES, MAX_TRIES_LIMIT, encrypt, formatScore } from '../utils.js';
import { NGRAM_TOTAL_LETTERS, NGRAM_SEEN, NGRAM_SOURCES } from '../ngramModel.js';
import { DICTIONARIES } from '../dictionaries.js';
import { config, accuracy } from './support.js';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const readme = read('README.md');
function tableAfter(heading) {
  const body = readme.split(heading + '\n')[1].split(/\n#{2,3} /)[0];
  return body.split('\n').filter((line) => line.startsWith('|')).slice(2)
    .map((line) => line.split('|').slice(1, -1).map((part) => part.trim()));
}

test('all seven README examples reproduce their score and accuracy', () => {
  const cases = new Map([
    ['既定', [{}, {}]],
    ['ヒルクライミング法（焼きなまし法 OFF）', [{ useAnnealing: false }, {}]],
    ['辞書照合 OFF', [{}, { useDict: false }]],
    ['試行回数 200', [{ maxTries: 200 }, {}]],
    ['文字頻度だけ・試行回数 500', [{ maxTries: 500 }, { useNgram: false, useDict: false }]],
    ['サンプルの固定鍵・試行回数 300', [{ maxTries: 300, fixedMap: SAMPLE_FIXED }, {}]],
  ]);
  const rows = tableAfter('### 動作例');
  assert.equal(rows.length, 7);
  for (const [label, seed, score, correct] of rows) {
    assert.ok(cases.has(label), label);
    const [overrides, scoring] = cases.get(label);
    const actual = solve(config(Number(seed), overrides, scoring));
    assert.equal(formatScore(actual.bestScore), score, label);
    assert.equal(accuracy(SAMPLE_PLAIN, actual.plainText) + '%', correct, label);
  }
});

test('all four success-rate rows are recalculated across seeds 1 to 10', () => {
  const rows = tableAfter('### 成功率');
  assert.equal(rows.length, 4);
  for (const [label, method, complete, average] of rows) {
    const plain = label.startsWith('短い') ? SHORT_SAMPLE_PLAIN : SAMPLE_PLAIN;
    assert.ok(['焼きなまし法（既定）', 'ヒルクライミング法'].includes(method));
    let successes = 0;
    let total = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const actual = solve(config(seed, {
        cipherText: encrypt(plain, SAMPLE_P2C), useAnnealing: method === '焼きなまし法（既定）',
      }));
      const correct = Number(accuracy(plain, actual.plainText));
      if (correct === 100) successes++;
      total += correct;
    }
    assert.equal(`${successes}/10`, complete, label + method);
    assert.equal((total / 10).toFixed(1) + '%', average, label + method);
  }
});

test('documented constants, dictionary counts and corpus match the code', () => {
  const expected = [
    MAX_CIPHER_CHARS.toLocaleString('en-US') + '文字', `1〜${MAX_TRIES_LIMIT}`, `既定${DEFAULT_MAX_TRIES}`,
    `${RESTARTS}回`, `初期温度${T0 / 100}`, `終了温度${T_END / 100}`, `不採択${REHEAT_AFTER}回`,
    DICTIONARIES.google10000.words.size.toLocaleString('en-US') + '語', DICTIONARIES.basic343.words.size + '語',
    [...DICTIONARIES.basic343.words].filter((word) => /^[A-Z]{3,}$/.test(word)).length + '語',
    NGRAM_TOTAL_LETTERS.toLocaleString('en-US') + '字', NGRAM_SEEN.bigram + '種',
    NGRAM_SEEN.trigram.toLocaleString('en-US') + '種',
  ];
  for (const value of expected) assert.ok(readme.includes(value), value);
  const sources = tableAfter('## 🔬 スコアの仕組み');
  assert.equal(sources.length, 10);
  assert.deepEqual(sources, NGRAM_SOURCES.map(({ title, author }) => [title, author]));
});

test('YAML identifiers, block lists and relative image references remain valid', () => {
  assert.match(readme, /^<!--\r?\n---\r?\n/);
  const metadata = readme.split('-->')[0];
  for (const [key, value] of Object.entries({
    id: 'day018', slug: 'cipherclimb', title: '"Cipher Climb"',
    repo_url: '"https://github.com/ipusiron/cipherclimb"', demo_url: '"https://ipusiron.github.io/cipherclimb/"', hub: 'true',
  })) assert.ok(metadata.includes(`${key}: ${value}\n`), key);
  for (const key of ['category_ja', 'category_en', 'tags']) assert.match(metadata, new RegExp(`${key}:\\r?\\n  - `));
  const paths = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]).filter((p) => !/^https?:/.test(p));
  assert.equal(paths.length, 3);
  assert.deepEqual(paths, ['assets/screenshot2.png', 'assets/screenshot3.png', 'assets/screenshot4.png']);
  for (const path of paths) assert.ok(existsSync(new URL(path, root)), path);
  for (const file of ['README.md', 'CLAUDE.md', 'index.html']) {
    assert.doesNotMatch(read(file), /NGSL|cdn\.jsdelivr\.net|最大5000/, file);
  }
});

test('directory tree documents every actual directory and file, with aligned descriptions', () => {
  const section = readme.split('## 📁 ディレクトリー構造')[1].split('\n## ')[0];
  const lines = section.match(/```[^\n]*\n([\s\S]*?)```/)[1].trimEnd().split('\n');
  const documented = [];
  const parents = [];
  let commentColumn;
  for (const [index, line] of lines.entries()) {
    assert.match(line, / # .+$/, line);
    commentColumn ??= line.indexOf('#');
    assert.equal(line.indexOf('#'), commentColumn, line);
    if (index === 0) continue;
    const match = line.match(/^((?:│   |    )*)(?:├── |└── )([^ ]+)/);
    assert.ok(match, line);
    const depth = match[1].length / 4;
    parents.length = depth;
    const name = match[2];
    const path = [...parents, name].join('/');
    documented.push(path);
    if (name.endsWith('/')) parents.push(name.slice(0, -1));
  }
  const actual = [];
  function walk(prefix = '') {
    for (const item of readdirSync(new URL(prefix, root), { withFileTypes: true })) {
      if (['.git', 'node_modules'].includes(item.name)) continue;
      const path = prefix + item.name;
      actual.push(path + (item.isDirectory() ? '/' : ''));
      if (item.isDirectory()) walk(path + '/');
    }
  }
  walk();
  assert.deepEqual(documented.sort(), actual.sort(), 'README directory tree is out of date');
});
