import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SAMPLE_CIPHER, SAMPLE_PLAIN, SAMPLE_P2C, SAMPLE_FIXED, SHORT_SAMPLE_PLAIN } from '../samples.js';
import { encrypt, prepareText } from '../utils.js';

test('サンプルと起動時設定（HTMLの行長との矛盾はユーザー承認で解消）', () => {
  assert.equal(SAMPLE_CIPHER.length, 639);
  assert.equal(createHash('sha256').update(SAMPLE_CIPHER).digest('hex'),
    '86f00ac20906ca326f6bed3ec8bf23b35915a4da85c0c2eedc57e6454315a264');
  assert.equal(encrypt(SAMPLE_PLAIN, SAMPLE_P2C), SAMPLE_CIPHER);
  assert.equal(SAMPLE_PLAIN.split(' ').length, 111);
  assert.equal(prepareText(SHORT_SAMPLE_PLAIN).letters.length, 148);
  assert.equal(Object.keys(SAMPLE_FIXED).length, 8);
  for (const [plain, cipher] of Object.entries(SAMPLE_FIXED)) assert.equal(SAMPLE_P2C[plain.charCodeAt(0) - 65], cipher);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<textarea id="cipherText"[^>]*><\/textarea>/);
  const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  assert.match(main, /byId\('cipherText'\)\.value = SAMPLE_CIPHER/);
});
