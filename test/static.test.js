import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('runtime scripts use safe rendering and isolated pure modules', () => {
  const storage = [];
  for (const file of readdirSync(root).filter((name) => name.endsWith('.js'))) {
    const source = read(file);
    assert.doesNotMatch(source, /Math\.random|console\.log|\balert\s*\(|innerHTML|onclick\s*=/, file);
    if (/localStorage/.test(source)) storage.push(file);
  }
  assert.deepEqual(storage.sort(), ['theme-init.js', 'theme.js']);
  for (const file of ['utils.js', 'score.js', 'solver.js', 'samples.js', 'dictionaries.js']) {
    assert.doesNotMatch(read(file), /\b(?:document|window|localStorage)\b/, file);
  }
  for (const file of ['bigramScores.js', 'trigramScores.js', 'englishWords_ngsl1000.js']) {
    assert.equal(existsSync(new URL(file, root)), false, file);
  }
  assert.equal(readFileSync(new URL('.nojekyll', root)).length, 0);
});

test('dependency-free package and push/PR workflow', () => {
  assert.deepEqual(JSON.parse(read('package.json')), {
    name: 'cipherclimb', private: true, type: 'module', scripts: { test: 'node --test' },
  });
  const workflow = read('.github/workflows/test.yml');
  for (const pattern of [/push/, /pull_request/, /contents: read/, /node-version: 22/, /npm test/]) {
    assert.match(workflow, pattern);
  }
  assert.doesNotMatch(workflow, /npm (?:install|ci)|pip install/);
});
