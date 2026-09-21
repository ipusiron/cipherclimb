import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const textPairs = [
  ['text', 'bg'], ['text', 'card-bg'], ['text', 'result-bg'], ['text', 'box-bg'], ['text', 'pre-bg'],
  ['text', 'modal-bg'], ['field-text', 'field-bg'], ['button-text', 'button-bg'], ['button-text', 'button-hover-bg'],
  ['accent-text', 'pre-bg'], ['accent-text', 'card-bg'], ['accent-text', 'result-bg'],
  ['muted-text', 'result-bg'], ['muted-text', 'card-bg'], ['muted-text', 'box-bg'],
  ['link', 'bg'], ['link', 'modal-bg'], ['hl-text', 'hl-bg'], ['dup-text', 'dup-bg'],
  ['error-text', 'error-bg'], ['warning-text', 'warning-bg'], ['info-text', 'info-bg'], ['chart-text', 'chart-bg'],
];
const nonTextPairs = [
  ['field-border', 'field-bg'], ['field-border', 'card-bg'], ['dup-border', 'card-bg'],
  ['chart-best', 'chart-bg'], ['chart-current', 'chart-bg'],
];
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((s) => parseInt(s, 16) / 255);
  const [r, g, b] = channels.map((s) => s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
for (const selector of [':root', '.dark-mode']) {
  test(`${selector}: 23 text and 5 non-text contrast pairs`, () => {
    const body = css.slice(css.indexOf(selector)).match(/\{([^}]+)\}/)[1];
    const vars = Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[a-f0-9]{6})/gi)].map((m) => [m[1], m[2]]));
    assert.equal(Object.keys(vars).length, 33);
    assert.equal(textPairs.length, 23);
    assert.equal(nonTextPairs.length, 5);
    for (const [pairs, minimum] of [[textPairs, 4.5], [nonTextPairs, 3]]) {
      for (const [fg, bg] of pairs) {
        const values = [luminance(vars[fg]), luminance(vars[bg])].sort((a, b) => a - b);
        const ratio = (values[1] + 0.05) / (values[0] + 0.05);
        assert.ok(ratio >= minimum, `${fg}/${bg}: ${ratio}`);
      }
    }
  });
}
test('colors outside variable definitions are not hard-coded', () => {
  const rest = css.replace(/(?::root|\.dark-mode)\s*\{[^}]*\}/g, '');
  assert.doesNotMatch(rest, /(?:^|[\s:])#[0-9a-f]{3,8}\b|\brgb\(/i);
});
