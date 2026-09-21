import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
test('source remains readable, including model and dictionaries', () => {
  const files = readdirSync(root).filter((file) => /\.(js|css)$/.test(file));
  files.push(...readdirSync(new URL('test/', root)).filter((f) => f.endsWith('.js')).map((f) => 'test/' + f));
  files.push('index.html');
  for (const file of files) {
    const lines = readFileSync(new URL(file, root), 'utf8').split(/\r?\n/);
    const max = file === 'index.html' ? 250 : 160;
    lines.forEach((line, index) => assert.ok(line.length <= max, `${file}:${index + 1}: ${line.length} > ${max}`));
  }
  for (const [file, minimum] of Object.entries({
    'main.js': 250, 'style.css': 300, 'index.html': 200, 'solver.js': 130, 'utils.js': 100, 'score.js': 70,
  })) {
    assert.ok(readFileSync(new URL(file, root), 'utf8').split('\n').length >= minimum, file);
  }
});
