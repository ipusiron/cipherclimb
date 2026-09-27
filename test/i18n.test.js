import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');

// i18n.js は通常のスクリプトなので、window も document も無い Node からは関数として読む。
const I18n = new Function(read('i18n.js') + '\nreturn I18n;')();
const html = read('index.html');
const scriptFiles = ['main.js', 'theme.js', 'chart.js'];
const pureFiles = ['utils.js', 'score.js', 'solver.js', 'samples.js', 'dictionaries.js', 'ngramModel.js'];
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
// g フラグを付けると lastIndex が残って交互に false になるため、毎回新しく判定する。
const hasJapanese = (text) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(text);
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function htmlKeys() {
  const keys = [...html.matchAll(/\bdata-i18n(?:-[\w-]+)?="([\w.]+)"/g)].map((m) => m[1]);
  return [...new Set(keys)];
}

function scriptKeys() {
  const keys = [];
  for (const file of scriptFiles) {
    // 末尾に文字を要求して、'risk.' のような組み立て途中の断片を拾わないようにする。
    for (const match of read(file).matchAll(/'([a-z][\w]*(?:\.[\w]+)+)'/g)) keys.push(match[1]);
  }
  // i18n.js 自身が呼ぶキー（document.title など）も「使っている」に数える。
  for (const match of read('i18n.js').matchAll(/\bt\('([\w.]+[\w])'\)/g)) keys.push(match[1]);
  return [...new Set(keys)];
}

test('the Japanese and English dictionaries share one key set', () => {
  assert.deepEqual(Object.keys(I18n.ja).sort(), Object.keys(I18n.en).sort());
  assert.ok(Object.keys(I18n.ja).length >= 150);
});

test('every key uses the same placeholders in both languages', () => {
  for (const key of Object.keys(I18n.ja)) {
    assert.deepEqual(placeholders(I18n.en[key]), placeholders(I18n.ja[key]), key);
  }
});

test('every key named in the HTML and the scripts exists in the dictionary', () => {
  for (const key of htmlKeys()) assert.ok(key in I18n.ja, 'index.html: ' + key);
  for (const key of scriptKeys()) assert.ok(key in I18n.ja, 'scripts: ' + key);
});

test('every dictionary key is actually used somewhere', () => {
  const used = new Set([...htmlKeys(), ...scriptKeys()]);
  const unused = Object.keys(I18n.ja).filter((key) => !used.has(key));
  assert.deepEqual(unused, []);
});

test('the English dictionary keeps no Japanese, apart from the language button', () => {
  for (const [key, value] of Object.entries(I18n.en)) {
    if (key === 'app.langButton') continue;
    assert.equal(hasJapanese(value), false, key + ': ' + value);
  }
  assert.equal(I18n.en['app.langButton'], '日本語');
});

test('t fills placeholders and refuses an unknown key', () => {
  assert.equal(I18n.t('run.meta.seed', { seed: 42 }), 'シード: 42');
  assert.equal(I18n.t('fixed.cellAria', { plain: 'Q' }), '平文Qに対応する暗号文字');
  assert.equal(I18n.t('status.keyLine', {}), '鍵: {key}');
  assert.throws(() => I18n.t('no.such.key'), /Unknown message: no\.such\.key/);
  assert.equal(I18n.language, 'ja');
});

test('data-i18n never sits on an element that holds child elements', () => {
  for (const match of html.matchAll(/<(\w+)[^>]*data-i18n="[^"]+"[^>]*>([\s\S]*?)<\/\1\s*>/g)) {
    assert.doesNotMatch(match[2], /</, match[0].slice(0, 90));
  }
});

test('slots written by the scripts carry no data-i18n', () => {
  const slots = [
    'statusArea', 'scoreDisplay', 'scoreBreakdown', 'runMeta', 'keyTable', 'highlightedText',
    'highlightCount', 'runMessage', 'runAnnounce', 'fixedKeyMessage', 'copyMessage', 'chartMessage',
    'toggleTheme', 'cipherTextLabel', 'maxTriesLabel', 'reheatLabel',
  ];
  for (const id of slots) {
    const tag = html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))[0];
    assert.doesNotMatch(tag, /data-i18n/, id);
  }
});

test('the only Japanese left in the HTML is the agreed set of fallbacks', () => {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(\w+)[^>]*data-i18n="[^"]+"[^>]*>[\s\S]*?<\/\1\s*>/g, '');
  const allowed = [
    /^<title>/, /^<noscript>/, /aria-label="/,
    /id="cipherTextLabel"/, /id="maxTriesLabel"/, /id="reheatLabel"/, /id="toggleTheme"/,
  ];
  const leftovers = stripped.split('\n').map((line) => line.trim()).filter(hasJapanese);
  for (const line of leftovers) {
    assert.ok(allowed.some((pattern) => pattern.test(line)), line.slice(0, 90));
  }
  assert.equal(leftovers.length, 9);
  assert.match(html, /<noscript>[^<]*JavaScriptを有効にして[^<]*Enable JavaScript[^<]*<\/noscript>/);
});

test('the view scripts hold no Japanese literals of their own', () => {
  for (const file of scriptFiles) {
    assert.equal(hasJapanese(stripComments(read(file))), false, file);
  }
});

test('the search and scoring modules stay free of presentation', () => {
  for (const file of pureFiles) {
    assert.doesNotMatch(read(file), /\bI18n\b|data-i18n/, file);
  }
  // 文言を外に出しただけで、探索の定数は動かしていないことを固定する。
  const solver = read('solver.js');
  for (const line of ['RESTARTS = 5', 'T0 = 1000', 'T_END = 1', 'REHEAT_AFTER = 500',
    'SAMPLE_EVERY = 100', 'REPORT_EVERY = 500']) {
    assert.ok(solver.includes(line), line);
  }
  assert.ok(read('score.js').includes('SCORE_SCALE = 100'));
});

test('README.en.md mirrors the Japanese README and both link to each other', () => {
  const en = read('README.en.md');
  assert.match(read('README.md').split('\n').slice(0, 45).join('\n'), /\[English\]\(README\.en\.md\) · 日本語/);
  assert.match(en, /^English · \[日本語\]\(README\.md\)$/m);
  assert.match(en, /## 📁 Directory structure/);
  assert.ok(en.includes('i18n.js'));
  assert.ok(en.includes('README.en.md'));
  assert.ok(en.includes('test/i18n.test.js') || en.includes('i18n.test.js'));
});
