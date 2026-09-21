// tools/build-ngram-model.mjs
// パブリックドメインの英文（Project Gutenberg のプレーンテキスト）から、
// 英語の文字 n-gram 統計 ngramModel.js を作り直すためのスクリプト。依存なし（Node 22 以上）。
//
// 使い方:
//   node tools/build-ngram-model.mjs <pg*.txt を置いたフォルダー> [出力先。省略時は ./ngramModel.js]
//
// 数え方はツールのスコア計算と同じにしてある。
//   - Project Gutenberg のヘッダーとフッター（*** START OF … *** と *** END OF … *** の外側）を捨てる
//   - アクセント記号を外し、大文字にし、A〜Z 以外をすべて捨てる（単語の境界をまたいで数える）
//   - 値は round(log10(出現確率) × 100)。コーパスに 1 度も現れない n-gram は round(log10(0.01 / 総数) × 100)
import fs from 'node:fs';
import path from 'node:path';

const SCALE = 100;
const SOURCES = {
  11: { title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll' },
  76: { title: 'Adventures of Huckleberry Finn', author: 'Mark Twain' },
  84: { title: 'Frankenstein', author: 'Mary Wollstonecraft Shelley' },
  98: { title: 'A Tale of Two Cities', author: 'Charles Dickens' },
  174: { title: 'The Picture of Dorian Gray', author: 'Oscar Wilde' },
  345: { title: 'Dracula', author: 'Bram Stoker' },
  1342: { title: 'Pride and Prejudice', author: 'Jane Austen' },
  1400: { title: 'Great Expectations', author: 'Charles Dickens' },
  1661: { title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle' },
  2701: { title: 'Moby Dick; Or, The Whale', author: 'Herman Melville' },
};

const dir = process.argv[2];
const outFile = process.argv[3] || './ngramModel.js';
if (!dir) {
  console.error('usage: node tools/build-ngram-model.mjs <corpus dir> [output file]');
  process.exit(1);
}

function lettersOf(raw, file) {
  const start = raw.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i);
  const end = raw.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i);
  if (start < 0 || end < 0) throw new Error(`Project Gutenberg の目印が見つからない: ${file}`);
  const body = raw.slice(raw.indexOf('\n', start) + 1, end);
  return body.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}

const files = fs.readdirSync(dir)
  .filter((f) => /^pg\d+\.txt$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (files.length === 0) throw new Error('pg<番号>.txt が 1 つもない');

const counts = [null, new Int32Array(26), new Int32Array(26 ** 2), new Int32Array(26 ** 3)];
const sources = [];
let totalLetters = 0;
for (const f of files) {
  const id = Number(f.match(/\d+/)[0]);
  const letters = lettersOf(fs.readFileSync(path.join(dir, f), 'utf8'), f);
  const meta = SOURCES[id] || { title: `Project Gutenberg #${id}`, author: '' };
  sources.push({ id, title: meta.title, author: meta.author, letters: letters.length });
  totalLetters += letters.length;
  const idx = Int8Array.from(letters, (ch) => ch.charCodeAt(0) - 65);
  for (let i = 0; i < idx.length; i++) {
    counts[1][idx[i]]++;
    if (i + 1 < idx.length) counts[2][idx[i] * 26 + idx[i + 1]]++;
    if (i + 2 < idx.length) counts[3][idx[i] * 676 + idx[i + 1] * 26 + idx[i + 2]]++;
  }
}

function toScores(c) {
  let total = 0;
  for (const v of c) total += v;
  const floor = Math.round(Math.log10(0.01 / total) * SCALE);
  const scores = Array.from(c, (v) => (v === 0 ? floor : Math.round(Math.log10(v / total) * SCALE)));
  return { scores, floor, seen: Array.from(c).filter((v) => v > 0).length };
}
const uni = toScores(counts[1]);
const bi = toScores(counts[2]);
const tri = toScores(counts[3]);
if (uni.floor !== bi.floor || bi.floor !== tri.floor) throw new Error('floor が n によって違う。出力形式を見直すこと');

// 値の符号を反転して 36 進数 2 桁にする（0〜1295 の範囲に収まることを確かめる）
function encodeRows(scores) {
  const rows = [];
  for (let r = 0; r < scores.length / 26; r++) {
    let s = '';
    for (let c = 0; c < 26; c++) {
      const v = -scores[r * 26 + c];
      if (!Number.isInteger(v) || v < 0 || v > 1295) throw new Error(`36 進数 2 桁に収まらない値: ${-v}`);
      s += v.toString(36).padStart(2, '0');
    }
    rows.push(s);
  }
  return rows;
}

const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const lines = [];
lines.push('// ngramModel.js — 英語の文字 n-gram 統計（自動生成。手で編集しない）');
lines.push('// 作り直し: node tools/build-ngram-model.mjs <Project Gutenberg のテキストを置いたフォルダー>');
lines.push('// 値は round(log10(出現確率) × 100)。コーパスに現れない n-gram は NGRAM_FLOOR。');
lines.push('// BIGRAM_ROWS と TRIGRAM_ROWS は、値の符号を反転して 36 進数 2 桁にしたものを 26 個ずつ並べた文字列。');
lines.push('//   BIGRAM_ROWS[i] の j 番目  = 1 文字目が i、2 文字目が j のバイグラム');
lines.push('//   TRIGRAM_ROWS[i * 26 + j] の k 番目 = 3 文字が i, j, k のトライグラム（A=0 … Z=25）');
lines.push(`export const NGRAM_SCALE = ${SCALE};`);
lines.push(`export const NGRAM_FLOOR = ${uni.floor};`);
lines.push(`export const NGRAM_TOTAL_LETTERS = ${totalLetters};`);
lines.push(`export const NGRAM_SEEN = { unigram: ${uni.seen}, bigram: ${bi.seen}, trigram: ${tri.seen} };`);
lines.push('export const NGRAM_SOURCES = [');
for (const s of sources) lines.push(`  { id: ${s.id}, title: ${q(s.title)}, author: ${q(s.author)}, letters: ${s.letters} },`);
lines.push('];');
lines.push('export const UNIGRAM = [');
lines.push('  ' + uni.scores.slice(0, 13).join(', ') + ',');
lines.push('  ' + uni.scores.slice(13).join(', ') + ',');
lines.push('];');
lines.push('export const BIGRAM_ROWS = [');
for (const r of encodeRows(bi.scores)) lines.push(`  '${r}',`);
lines.push('];');
lines.push('export const TRIGRAM_ROWS = [');
for (const r of encodeRows(tri.scores)) lines.push(`  '${r}',`);
lines.push('];');
fs.writeFileSync(outFile, lines.join('\n') + '\n');
console.log(`wrote ${outFile}: letters=${totalLetters} seen=${uni.seen}/${bi.seen}/${tri.seen} floor=${uni.floor}`);
