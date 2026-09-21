import {
  ALPHABET, decrypt, invertKey, highlightSegments, prepareText, formatScore,
  analyzeCipherText, parseMaxTries, parseSeed, findFixedConflicts,
} from './utils.js';
import { scoreBreakdown } from './score.js';
import { climb, createRng, RESTARTS } from './solver.js';
import { initChart, addPoints } from './chart.js';
import { DICTIONARIES } from './dictionaries.js';
import { SAMPLE_CIPHER, SAMPLE_FIXED, SAMPLE_PLAIN, SAMPLE_P2C } from './samples.js';
import { initTheme } from './theme.js';

const byId = (id) => document.getElementById(id);
let running = false;
let cancelRequested = false;

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
    for (const [label, isCipher] of [['平文', false], ['暗号文', true]]) {
      const row = document.createElement('tr');
      const header = document.createElement('th');
      header.scope = 'row';
      header.textContent = label;
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
    note.textContent = '薄い文字は暗号文に現れないため、対応が決まりません';
    container.append(note);
  }
}

function setSampleFixedKey() {
  for (const plain of ALPHABET) byId('fixed_' + plain).value = SAMPLE_FIXED[plain] || '';
  validateFixedKeyConflicts();
  if (byId('cipherText').value.trim() !== SAMPLE_CIPHER) {
    byId('fixedKeyMessage').textContent =
      'サンプルの固定鍵は、サンプルの暗号文のためのものです。暗号文を変えた場合は「固定鍵をクリア」で外してください';
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
  const conflict = conflictMessage(findFixedConflicts(fixedMap));
  let error = conflict;
  if (!error && !analysis.letters) error = '英字（A〜Z）を含む暗号文を入力してください';
  if (!error && analysis.tooLong) error = `暗号文が長すぎます（${analysis.length}文字）。10,000文字以内にしてください`;
  if (!error && !tries.ok) error = '試行回数は1〜20000の整数で入力してください';
  if (!error && !seed.ok) error = 'シードは0〜4294967295の整数で入力するか、空欄にしてください';
  if (!error && !scoring.useLetter && !scoring.useNgram && !scoring.useDict) error = 'スコア構成を1つ以上選んでください';
  const warnings = [];
  if (analysis.short) warnings.push(`暗号文が短い（英字${analysis.letters}字）ため、正しく解けないことがあります。目安は英字100字以上です`);
  if (analysis.fullwidth) warnings.push(`全角の英字${analysis.fullwidth}文字は変換されません。半角に直してください`);
  byId('runMessage').className = 'message ' + (error ? 'error' : 'warning');
  byId('runMessage').textContent = error || warnings.join('／');
  if (error) return null;
  const runSeed = seed.value ?? crypto.getRandomValues(new Uint32Array(1))[0];
  return {
    cipherText, fixedMap, maxTries: tries.value, scoring, runSeed, rng: createRng(runSeed),
    useAnnealing: byId('useAnnealing').checked, enableReheat: byId('enableReheat').checked,
    cooling: byId('coolingRateSelect').value,
  };
}

function showProgress(snapshot, config) {
  const method = config.useAnnealing ? '🔥 焼きなまし法' : '⛰️ ヒルクライミング法';
  const temperature = config.useAnnealing ? ` | 温度 ${formatScore(snapshot.temperature)}` : '';
  byId('statusArea').textContent =
    `${method} ${snapshot.restart + 1}/${RESTARTS} | 試行 ${snapshot.iteration + 1}/${config.maxTries}${temperature}\n`
    + `現在のスコア: ${formatScore(snapshot.currentScore)} | この回のベスト: ${formatScore(snapshot.restartBestScore)} | `
    + `全体のベスト: ${formatScore(snapshot.bestScore)}\n鍵: ${snapshot.bestKey.split('').join(' ')}`;
  byId('progressBar').value = snapshot.triesDone;
}

function showResult(result, config) {
  const plainText = result.plainText ?? decrypt(config.cipherText, result.bestKey);
  buildKeyTableFromDecryptKey(result.bestKey, config.fixedMap, prepareText(config.cipherText).cipherLettersUsed);
  byId('scoreDisplay').textContent = `スコア: ${formatScore(result.bestScore)}`;
  const breakdown = scoreBreakdown(plainText, config.scoring);
  const off = (enabled) => enabled ? '' : '（OFF）';
  byId('scoreBreakdown').textContent =
    `内訳: 文字頻度 ${formatScore(breakdown.letter)}${off(config.scoring.useLetter)} / `
    + `N-gram ${formatScore(breakdown.ngram)}${off(config.scoring.useNgram)} / `
    + `辞書 +${formatScore(breakdown.dict)}${off(config.scoring.useDict)}`;
  const highlighted = highlightSegments(plainText, config.scoring.dictionary);
  const nodes = highlighted.segments.map((segment) => {
    if (!segment.highlight) return document.createTextNode(segment.text);
    const mark = document.createElement('mark');
    mark.className = 'highlight-word';
    mark.textContent = segment.text;
    return mark;
  });
  byId('highlightedText').replaceChildren(...nodes);
  byId('highlightCount').textContent = `🔍 ${highlighted.count} 個の英単語がハイライトされました`;
  byId('copyButton').disabled = false;
}

async function startClimb() {
  if (running) return;
  const config = readRunConfig();
  if (!config) return;
  running = true;
  cancelRequested = false;
  byId('startButton').disabled = true;
  byId('stopButton').disabled = false;
  byId('copyButton').disabled = true;
  byId('copyMessage').textContent = '';
  const progressBar = byId('progressBar');
  progressBar.max = RESTARTS * config.maxTries;
  progressBar.value = 0;
  byId('statusArea').textContent = '';
  byId('keyTable').textContent = '(鍵の計算中...)';
  byId('scoreDisplay').textContent = 'スコア: (計算中)';
  byId('scoreBreakdown').textContent = '';
  byId('runMeta').textContent = `シード: ${config.runSeed}`;
  byId('runAnnounce').textContent = '解読を開始しました';
  byId('highlightedText').textContent = '解読中です...';
  byId('highlightedText').classList.add('processing');
  byId('highlightCount').textContent = '';

  const iterator = climb(config);
  let pointCount = 0;
  try {
    initChart();
    while (true) {
      const step = iterator.next();
      if (step.done) {
        addPoints(step.value.history.slice(pointCount));
        showResult(step.value, config);
        progressBar.value = step.value.totalTries;
        const note = step.value.searched
          ? `✅ 解読完了（再加熱: ${step.value.reheats}回）`
          : '✅ 解読完了。固定鍵だけで鍵が決まるため、探索は行いませんでした';
        byId('statusArea').textContent = note
          + `\n全体のベスト: ${formatScore(step.value.bestScore)} | 総試行回数: ${step.value.triesDone}`
          + `\n鍵: ${step.value.bestKey.split('').join(' ')}`;
        byId('runAnnounce').textContent = note;
        break;
      }
      const snapshot = step.value;
      addPoints(snapshot.points);
      pointCount += snapshot.points.length;
      showProgress(snapshot, config);
      if (cancelRequested) {
        showResult(snapshot, config);
        byId('statusArea').textContent += '\n⏹ 停止しました';
        byId('runAnnounce').textContent = '⏹ 停止しました';
        iterator.return();
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } catch {
    byId('runMessage').className = 'message error';
    byId('runMessage').textContent = '解読中にエラーが発生しました。設定を確認して再実行してください';
    byId('runAnnounce').textContent = '解読中にエラーが発生しました';
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
    byId('copyMessage').textContent = '解読結果をコピーしました';
  } catch {
    byId('copyMessage').textContent = 'コピーできませんでした。テキストを選択してコピーしてください';
  }
}

function conflictMessage(conflicts) {
  return conflicts.map(({ cipher, plains }) =>
    `固定鍵に重複があります: 暗号文字 ${cipher} を ${plains.join(' と ')} に割り当てています`).join('／');
}

function validateFixedKeyConflicts() {
  const conflicts = findFixedConflicts(getFixedMapFromUI());
  const duplicate = new Set(conflicts.flatMap(({ plains }) => plains));
  for (const plain of ALPHABET) byId('fixed_' + plain).classList.toggle('duplicate', duplicate.has(plain));
  byId('fixedKeyMessage').textContent = conflictMessage(conflicts);
}

function createFixedKeyGrid() {
  for (const plain of ALPHABET) {
    const label = document.createElement('label');
    label.className = 'fixed-cell';
    const caption = document.createElement('span');
    caption.textContent = plain;
    const select = document.createElement('select');
    select.id = 'fixed_' + plain;
    select.setAttribute('aria-label', `平文${plain}に対応する暗号文字`);
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
}

init();
