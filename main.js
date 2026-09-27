import {
  ALPHABET, decrypt, invertKey, highlightSegments, prepareText, formatScore,
  analyzeCipherText, parseMaxTries, parseSeed, findFixedConflicts,
  MAX_CIPHER_CHARS, MAX_TRIES_LIMIT, MAX_SEED, SHORT_TEXT_LETTERS,
} from './utils.js';
import { scoreBreakdown } from './score.js';
import { climb, createRng, RESTARTS, REHEAT_AFTER } from './solver.js';
import { initChart, addPoints, refreshChartLanguage } from './chart.js';
import { DICTIONARIES } from './dictionaries.js';
import { SAMPLE_CIPHER, SAMPLE_FIXED, SAMPLE_PLAIN, SAMPLE_P2C } from './samples.js';
import { initTheme } from './theme.js';

const byId = (id) => document.getElementById(id);
const t = (key, values) => window.I18n.t(key, values);
const MAX_CHARS_TEXT = MAX_CIPHER_CHARS.toLocaleString('en-US');
const spacedKey = (key) => key.split('').join(' ');
let running = false;
let cancelRequested = false;

// 画面に出ている内容は、文言ではなく状態で持つ。言語を変えたら状態から描き直す。
let statusState = null;
let resultState = null;
let runMetaState = null;
let runMessageState = null;
let fixedMessageState = null;
let copyMessageState = null;
let announceState = null;

// 差し込む値には生の値を入れておき、訳すのは描く直前にする。
function renderMessage({ key, values }) {
  const filled = { ...values };
  if (Array.isArray(filled.plains)) filled.plains = filled.plains.join(t('fixed.conflictJoin'));
  return t(key, filled);
}

function joinMessages(items) {
  return items.map(renderMessage).join(t('text.messageJoin'));
}

function conflictItems(conflicts) {
  return conflicts.map(({ cipher, plains }) => ({ key: 'fixed.conflict', values: { cipher, plains } }));
}

function getFixedMapFromUI() {
  const map = {};
  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const sel = document.getElementById('fixed_' + plain);
    const val = sel?.value;
    if (val && /^[A-Z]$/.test(val)) {
      map[plain] = val;
    }
  }
  return map;
}

function buildKeyTableFromDecryptKey(decryptKey, fixedMap = {}, cipherLettersUsed = '') {
  const mapping = invertKey(decryptKey);
  const container = byId('keyTable');
  container.replaceChildren();
  let unused = false;
  for (let start = 0; start < 26; start += 13) {
    const table = document.createElement('table');
    table.className = 'keytable';
    for (const [labelKey, isCipher] of [['key.plain', false], ['key.cipher', true]]) {
      const row = document.createElement('tr');
      const header = document.createElement('th');
      header.scope = 'row';
      header.textContent = t(labelKey);
      row.append(header);
      for (let i = start; i < start + 13; i++) {
        const cell = document.createElement('td');
        cell.textContent = isCipher ? mapping[i] : ALPHABET[i];
        if (fixedMap[ALPHABET[i]]) cell.classList.add('fixed');
        if (isCipher && !cipherLettersUsed.includes(mapping[i])) {
          cell.classList.add('unused');
          unused = true;
        }
        row.append(cell);
      }
      table.append(row);
    }
    container.append(table);
  }
  if (unused) {
    const note = document.createElement('p');
    note.className = 'meta-info';
    note.textContent = t('key.unusedNote');
    container.append(note);
  }
}

function renderConstantLabels() {
  byId('cipherTextLabel').textContent = t('input.cipherLabel', { max: MAX_CHARS_TEXT });
  byId('maxTriesLabel').textContent = t('run.triesLabel', { max: MAX_TRIES_LIMIT });
  byId('reheatLabel').textContent = t('algo.reheat', { count: REHEAT_AFTER });
}

// 選択を壊さないように、格子は作り直さず読み上げ文だけ入れ替える。
function renderFixedKeyLabels() {
  for (const plain of ALPHABET) {
    byId('fixed_' + plain).setAttribute('aria-label', t('fixed.cellAria', { plain }));
  }
}

function renderFixedMessage() {
  const node = byId('fixedKeyMessage');
  if (!fixedMessageState) {
    node.textContent = '';
  } else if (fixedMessageState.kind === 'sampleNote') {
    node.textContent = t('fixed.sampleNote');
  } else {
    node.textContent = joinMessages(conflictItems(fixedMessageState.conflicts));
  }
}

function renderRunMessage() {
  const node = byId('runMessage');
  if (!runMessageState) {
    node.className = 'message';
    node.textContent = '';
    return;
  }
  node.className = 'message ' + runMessageState.level;
  node.textContent = joinMessages(runMessageState.items);
}

function renderRunMeta() {
  byId('runMeta').textContent = runMetaState ? t('run.meta.seed', { seed: runMetaState.seed }) : '';
}

function renderAnnounce() {
  byId('runAnnounce').textContent = announceState ? renderMessage(announceState) : '';
}

function renderCopyMessage() {
  byId('copyMessage').textContent = copyMessageState ? t(copyMessageState.key) : '';
}

function statusText() {
  if (!statusState) return t('status.placeholder');
  if (statusState.kind === 'blank') return '';
  if (statusState.kind === 'done') {
    const { result } = statusState;
    const note = result.searched
      ? t('status.done', { reheats: result.reheats })
      : t('status.doneNoSearch');
    return [
      note,
      t('status.doneLine', { best: formatScore(result.bestScore), tries: result.triesDone }),
      t('status.keyLine', { key: spacedKey(result.bestKey) }),
    ].join('\n');
  }
  const { snapshot, config } = statusState;
  const method = t(config.useAnnealing ? 'status.method.annealing' : 'status.method.climbing');
  const temperature = config.useAnnealing
    ? t('status.temperature', { value: formatScore(snapshot.temperature) }) : '';
  const lines = [
    t('status.progressLine', {
      method, restart: snapshot.restart + 1, restarts: RESTARTS,
      iteration: snapshot.iteration + 1, maxTries: config.maxTries, temperature,
    }),
    t('status.scoreLine', {
      current: formatScore(snapshot.currentScore),
      restartBest: formatScore(snapshot.restartBestScore),
      best: formatScore(snapshot.bestScore),
    }),
    t('status.keyLine', { key: spacedKey(snapshot.bestKey) }),
  ];
  if (statusState.kind === 'stopped') lines.push(t('status.stopped'));
  return lines.join('\n');
}

function renderStatus() {
  byId('statusArea').textContent = statusText();
}

function renderResult() {
  if (!resultState) {
    byId('keyTable').replaceChildren();
    byId('scoreDisplay').textContent = t('result.scoreEmpty');
    byId('scoreBreakdown').textContent = '';
    byId('highlightedText').replaceChildren();
    byId('highlightCount').textContent = '';
    byId('copyButton').disabled = true;
    return;
  }
  if (resultState.kind === 'computing') {
    byId('keyTable').textContent = t('result.keyComputing');
    byId('scoreDisplay').textContent = t('result.scoreComputing');
    byId('scoreBreakdown').textContent = '';
    byId('highlightedText').textContent = t('result.decrypting');
    byId('highlightCount').textContent = '';
    byId('copyButton').disabled = true;
    return;
  }
  const { result, config } = resultState;
  const plainText = result.plainText ?? decrypt(config.cipherText, result.bestKey);
  buildKeyTableFromDecryptKey(result.bestKey, config.fixedMap, prepareText(config.cipherText).cipherLettersUsed);
  byId('scoreDisplay').textContent = t('result.score', { value: formatScore(result.bestScore) });
  const breakdown = scoreBreakdown(plainText, config.scoring);
  const off = (enabled) => enabled ? '' : t('result.off');
  byId('scoreBreakdown').textContent = t('result.breakdown', {
    letter: formatScore(breakdown.letter), letterOff: off(config.scoring.useLetter),
    ngram: formatScore(breakdown.ngram), ngramOff: off(config.scoring.useNgram),
    dict: formatScore(breakdown.dict), dictOff: off(config.scoring.useDict),
  });
  const highlighted = highlightSegments(plainText, config.scoring.dictionary);
  const nodes = highlighted.segments.map((segment) => {
    if (!segment.highlight) return document.createTextNode(segment.text);
    const mark = document.createElement('mark');
    mark.className = 'highlight-word';
    mark.textContent = segment.text;
    return mark;
  });
  byId('highlightedText').replaceChildren(...nodes);
  byId('highlightCount').textContent = t('result.highlightCount', { count: highlighted.count });
  byId('copyButton').disabled = false;
}

function renderAll() {
  renderConstantLabels();
  renderFixedKeyLabels();
  renderFixedMessage();
  renderRunMessage();
  renderStatus();
  renderResult();
  renderRunMeta();
  renderAnnounce();
  renderCopyMessage();
  refreshChartLanguage();
}

function setSampleFixedKey() {
  for (const plain of ALPHABET) byId('fixed_' + plain).value = SAMPLE_FIXED[plain] || '';
  validateFixedKeyConflicts();
  if (byId('cipherText').value.trim() !== SAMPLE_CIPHER) {
    fixedMessageState = { kind: 'sampleNote' };
    renderFixedMessage();
  }
}

function readRunConfig() {
  const cipherText = byId('cipherText').value;
  const fixedMap = getFixedMapFromUI();
  const analysis = analyzeCipherText(cipherText);
  const tries = parseMaxTries(byId('maxTries').value);
  const seed = parseSeed(byId('seedInput').value);
  const scoring = {
    useLetter: byId('score_letter').checked, useNgram: byId('score_ngram').checked,
    useDict: byId('score_dict').checked, dictWeight: Number(byId('dictWeight').value),
    usePartial: byId('usePartialMatch').checked,
    dictionary: DICTIONARIES[byId('dictSource').value].words,
  };
  const conflicts = findFixedConflicts(fixedMap);
  let error = conflicts.length ? conflictItems(conflicts) : null;
  if (!error && !analysis.letters) error = [{ key: 'run.error.noLetters' }];
  if (!error && analysis.tooLong) {
    error = [{ key: 'run.error.tooLong', values: { length: analysis.length, max: MAX_CHARS_TEXT } }];
  }
  if (!error && !tries.ok) error = [{ key: 'run.error.tries', values: { max: MAX_TRIES_LIMIT } }];
  if (!error && !seed.ok) error = [{ key: 'run.error.seed', values: { max: MAX_SEED } }];
  if (!error && !scoring.useLetter && !scoring.useNgram && !scoring.useDict) {
    error = [{ key: 'run.error.scoring' }];
  }
  const warnings = [];
  if (analysis.short) {
    warnings.push({ key: 'run.warn.short', values: { letters: analysis.letters, minimum: SHORT_TEXT_LETTERS } });
  }
  if (analysis.fullwidth) {
    warnings.push({ key: 'run.warn.fullwidth', values: { count: analysis.fullwidth } });
  }
  runMessageState = error ? { level: 'error', items: error } : { level: 'warning', items: warnings };
  renderRunMessage();
  if (error) return null;
  const runSeed = seed.value ?? crypto.getRandomValues(new Uint32Array(1))[0];
  return {
    cipherText, fixedMap, maxTries: tries.value, scoring, runSeed, rng: createRng(runSeed),
    useAnnealing: byId('useAnnealing').checked, enableReheat: byId('enableReheat').checked,
    cooling: byId('coolingRateSelect').value,
  };
}

async function startClimb() {
  if (running) return;
  const config = readRunConfig();
  if (!config) return;
  running = true;
  cancelRequested = false;
  byId('startButton').disabled = true;
  byId('stopButton').disabled = false;
  copyMessageState = null;
  renderCopyMessage();
  const progressBar = byId('progressBar');
  progressBar.max = RESTARTS * config.maxTries;
  progressBar.value = 0;
  statusState = { kind: 'blank' };
  renderStatus();
  resultState = { kind: 'computing' };
  renderResult();
  runMetaState = { seed: config.runSeed };
  renderRunMeta();
  announceState = { key: 'run.announce.start' };
  renderAnnounce();
  byId('highlightedText').classList.add('processing');

  const iterator = climb(config);
  let pointCount = 0;
  try {
    initChart();
    while (true) {
      const step = iterator.next();
      if (step.done) {
        addPoints(step.value.history.slice(pointCount));
        resultState = { kind: 'result', result: step.value, config };
        renderResult();
        progressBar.value = step.value.totalTries;
        statusState = { kind: 'done', result: step.value, config };
        renderStatus();
        announceState = step.value.searched
          ? { key: 'status.done', values: { reheats: step.value.reheats } }
          : { key: 'status.doneNoSearch' };
        renderAnnounce();
        break;
      }
      const snapshot = step.value;
      addPoints(snapshot.points);
      pointCount += snapshot.points.length;
      statusState = { kind: 'progress', snapshot, config };
      renderStatus();
      progressBar.value = snapshot.triesDone;
      if (cancelRequested) {
        resultState = { kind: 'result', result: snapshot, config };
        renderResult();
        statusState = { kind: 'stopped', snapshot, config };
        renderStatus();
        announceState = { key: 'status.stopped' };
        renderAnnounce();
        iterator.return();
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } catch {
    runMessageState = { level: 'error', items: [{ key: 'run.error.runtime' }] };
    renderRunMessage();
    announceState = { key: 'run.announce.error' };
    renderAnnounce();
  } finally {
    running = false;
    byId('startButton').disabled = false;
    byId('stopButton').disabled = true;
    byId('highlightedText').classList.remove('processing');
  }
}

function cancelClimb() {
  cancelRequested = true;
}

function showHelp() {
  byId('helpModal').hidden = false;
  document.body.classList.add('modal-open');
  byId('helpModal').querySelector('.close').focus();
}

function hideHelp() {
  byId('helpModal').hidden = true;
  document.body.classList.remove('modal-open');
  byId('helpButton').focus();
}

async function copyResult() {
  if (byId('copyButton').disabled) return;
  try {
    await navigator.clipboard.writeText(byId('highlightedText').textContent);
    copyMessageState = { key: 'result.copied' };
  } catch {
    copyMessageState = { key: 'result.copyFailed' };
  }
  renderCopyMessage();
}

function validateFixedKeyConflicts() {
  const conflicts = findFixedConflicts(getFixedMapFromUI());
  const duplicate = new Set(conflicts.flatMap(({ plains }) => plains));
  for (const plain of ALPHABET) byId('fixed_' + plain).classList.toggle('duplicate', duplicate.has(plain));
  fixedMessageState = conflicts.length ? { kind: 'conflicts', conflicts } : null;
  renderFixedMessage();
}

function createFixedKeyGrid() {
  for (const plain of ALPHABET) {
    const label = document.createElement('label');
    label.className = 'fixed-cell';
    const caption = document.createElement('span');
    caption.textContent = plain;
    const select = document.createElement('select');
    select.id = 'fixed_' + plain;
    for (const value of ['', ...ALPHABET]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value || '?';
      select.append(option);
    }
    label.append(caption, select);
    byId('fixedKeyGrid').append(label);
  }
}

function init() {
  window.I18n.init();
  byId('cipherText').value = SAMPLE_CIPHER;
  byId('samplePlainHelp').textContent = SAMPLE_PLAIN;
  byId('sampleKeyHelp').textContent = [...ALPHABET].map((plain, i) => plain + '→' + SAMPLE_P2C[i]).join(', ');
  createFixedKeyGrid();
  initTheme();
  byId('fixedKeyGrid').addEventListener('change', validateFixedKeyConflicts);
  byId('sampleFixedButton').addEventListener('click', setSampleFixedKey);
  byId('clearFixedButton').addEventListener('click', () => {
    for (const plain of ALPHABET) byId('fixed_' + plain).value = '';
    validateFixedKeyConflicts();
  });
  byId('startButton').addEventListener('click', startClimb);
  byId('stopButton').addEventListener('click', cancelClimb);
  byId('copyButton').addEventListener('click', copyResult);
  byId('helpButton').addEventListener('click', showHelp);
  byId('langToggle').addEventListener('click',
    () => window.I18n.setLanguage(window.I18n.language === 'ja' ? 'en' : 'ja'));
  document.addEventListener('languagechange', renderAll);
  byId('helpModal').querySelector('.close').addEventListener('click', hideHelp);
  byId('helpModal').addEventListener('click', (event) => {
    if (event.target === byId('helpModal')) hideHelp();
  });
  byId('helpModal').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      hideHelp();
    }
    if (event.key === 'Tab') {
      const focusable = [...byId('helpModal').querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  });
  const updateAnnealing = () => {
    byId('enableReheat').disabled = !byId('useAnnealing').checked;
    byId('coolingRateSelect').disabled = !byId('useAnnealing').checked;
  };
  byId('useAnnealing').addEventListener('change', updateAnnealing);
  updateAnnealing();
  renderAll();
}

init();
