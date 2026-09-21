import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DICTIONARIES } from '../dictionaries.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const tagById = (id) => html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))?.[0];

test('strict local CSP and safe HTML attributes', () => {
  const csp = html.match(/<meta http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
  assert.equal(csp, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
    + "font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
  assert.doesNotMatch(html, /frame-ancestors|unsafe-inline|unsafe-eval|cdn\.jsdelivr\.net/);
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /<noscript>.+<\/noscript>/);
  assert.doesNotMatch(html, /\s(?:on\w+|style)\s*=/i);
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)];
  assert.equal(scripts.length, 3);
  for (const [, attributes] of scripts) assert.doesNotMatch(attributes, /src="(?:https?:|\/\/)/);
  assert.match(html, /<script type="module" src="main.js"><\/script>/);
  assert.match(html.split('</head>')[0], /<script src="theme-init.js"><\/script>/);
  assert.ok(html.indexOf('vendor/chartjs/chart.umd.min.js') < html.indexOf('src="main.js"'));
  for (const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert.match(tag, /rel="noopener noreferrer"/);
  }
  assert.ok(html.split('\n').length <= 500);
});

test('controls, labels, dialog and live announcements match the UI contract', () => {
  const ids = [
    'cipherText', 'fixedKeyGrid', 'fixedKeyMessage', 'sampleFixedButton', 'clearFixedButton',
    'useAnnealing', 'coolingRateSelect', 'enableReheat', 'dictSource', 'score_letter', 'score_ngram',
    'score_dict', 'dictWeight', 'usePartialMatch', 'maxTries', 'seedInput', 'startButton', 'stopButton',
    'progressBar', 'runMessage', 'runAnnounce', 'runMeta', 'statusArea', 'scoreChart', 'scoreDisplay',
    'scoreBreakdown', 'keyTable', 'highlightedText', 'highlightCount', 'copyButton', 'copyMessage',
    'helpButton', 'toggleTheme', 'helpModal', 'helpTitle',
  ];
  for (const id of ids) assert.ok(tagById(id), id);
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(allIds).size, allIds.length);
  assert.match(tagById('helpModal'), /role="dialog"/);
  assert.match(tagById('helpModal'), /aria-modal="true"/);
  assert.match(tagById('helpModal'), /aria-labelledby="helpTitle"/);
  assert.match(tagById('runMessage'), /role="alert"/);
  assert.match(tagById('runAnnounce'), /role="status"/);
  assert.doesNotMatch(tagById('statusArea'), /aria-live/);
  for (const id of ['fixedKeyMessage', 'copyMessage']) assert.match(tagById(id), /aria-live="polite"/);
  for (const attribute of ['value="3000"', 'min="1"', 'max="20000"']) {
    assert.ok(tagById('maxTries').includes(attribute));
  }
  const select = html.match(/<select id="dictSource"[^>]*>([\s\S]*?)<\/select>/)[1];
  const options = [...select.matchAll(/<option value="([^"]+)"([^>]*)>([^<]+)<\/option>/g)];
  assert.deepEqual(options.map((m) => m[1]), ['google10000', 'basic343']);
  assert.match(options[0][2], /selected/);
  for (const [, value, , label] of options) assert.equal(label, DICTIONARIES[value].label);
});
