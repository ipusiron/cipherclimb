import { decrypt, shuffleKey, swapTwo, highlightWords } from './utils.js';
import { scoreText } from './score.js';
import { initChart, addScore } from './chart.js';

let cancelRequested = false;

export function cancelClimb() {
  cancelRequested = true;
}

export function showHelp() {
  document.getElementById('helpModal').style.display = 'block';
}

export function hideHelp() {
  document.getElementById('helpModal').style.display = 'none';
}

export function copyResult() {
  const temp = document.createElement('textarea');
  temp.value = document.getElementById('highlightedText').innerText;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);
  alert('解読結果をコピーしました！');
}

function parseFixedMap(input) {
  const map = {};
  const pairs = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const pair of pairs) {
    const m = pair.match(/^([A-Z])→([A-Z])$/i);
    if (m) {
      map[m[1].toUpperCase()] = m[2].toUpperCase();
    }
  }
  return map;
}

function generateConstrainedKey(fixedMap) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const used = new Set();
  const result = [];

  for (let c of alphabet) {
    if (fixedMap[c]) {
      result.push(fixedMap[c]);
      used.add(fixedMap[c]);
    } else {
      result.push(null);
    }
  }

  const remaining = alphabet.filter((c) => !used.has(c));
  for (let i = 0; i < result.length; i++) {
    if (result[i] === null) {
      const pick = remaining.splice(
        Math.floor(Math.random() * remaining.length),
        1
      )[0];
      result[i] = pick;
    }
  }

  return result.join('');
}

function swapTwoRespectingFixed(str, fixedIndices) {
  let a, b;
  do {
    a = Math.floor(Math.random() * 26);
    b = Math.floor(Math.random() * 26);
  } while (a === b || fixedIndices.has(a) || fixedIndices.has(b));
  const arr = str.split('');
  [arr[a], arr[b]] = [arr[b], arr[a]];
  return arr.join('');
}

export async function startClimb() {
  cancelRequested = false;

  const cipherText = document.getElementById('cipherText').value.toUpperCase();
  const maxTriesRaw = parseInt(document.getElementById('maxTries').value);
  const maxTries = Math.min(maxTriesRaw, 5000);
  const useAnnealing = document.getElementById('useAnnealing')?.checked ?? true;
  const enableReheat = document.getElementById('enableReheat')?.checked ?? true;
  const coolingChoice =
    document.getElementById('coolingRateSelect')?.value || 'auto';
  const fixedMap = parseFixedMap(
    document.getElementById('fixedMappings')?.value || ''
  );
  const fixedIndices = new Set(
    Object.keys(fixedMap).map((c) => c.charCodeAt(0) - 65)
  );

  // 処理中の表示を初期化
  document.getElementById("keyTable").textContent = "(鍵の計算中...)";
  document.getElementById("scoreDisplay").textContent = "スコア: (計算中)";
  document.getElementById("highlightedText").innerHTML = "<em>解読中です...</em>";
  document.getElementById("highlightedText").classList.add("processing");
  document.getElementById("highlightCount").textContent = "";

  let T = 10.0;
  const T0 = 10.0;
  const coolingRate =
    coolingChoice === 'auto'
      ? Math.pow(0.01 / T, 1 / maxTries)
      : parseFloat(coolingChoice);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const progressBar = document.getElementById('progressBar');
  const statusArea = document.getElementById('statusArea');
  progressBar.value = 0;

  const repeatCount = 5;
  const totalSteps = repeatCount * maxTries;
  progressBar.max = totalSteps;

  initChart(); // グラフ初期化

  let globalBestScore = -Infinity;
  let globalBestKey = '';
  let globalBestPlain = '';

  let progress = 0;

  for (let r = 0; r < repeatCount; r++) {
    let currentKey = generateConstrainedKey(fixedMap);
    let currentScore = scoreText(decrypt(cipherText, currentKey));
    let bestKey = currentKey;
    let bestScore = currentScore;
    let noImprovementCount = 0;

    for (let i = 0; i < maxTries; i++) {
      if (cancelRequested) return;

      const newKey = swapTwoRespectingFixed(currentKey, fixedIndices);
      const newScore = scoreText(decrypt(cipherText, newKey));
      const delta = newScore - currentScore;

      if (useAnnealing) {
        if (delta > 0 || Math.exp(delta / T) > Math.random()) {
          currentKey = newKey;
          currentScore = newScore;
        }
      } else {
        if (delta > 0) {
          currentKey = newKey;
          currentScore = newScore;
        }
      }

      if (currentScore > bestScore) {
        bestKey = currentKey;
        bestScore = currentScore;
        noImprovementCount = 0;
      } else {
        noImprovementCount++;
      }

      if (useAnnealing && enableReheat && noImprovementCount >= 500) {
        T = T0;
        noImprovementCount = 0;
      }

      T *= coolingRate;
      progress++;
      progressBar.value = progress;

      if (i % 100 === 0) {
        addScore(bestScore, progress);
      }

      if (i % 250 === 0) {
        statusArea.textContent =
          `🔥 ${useAnnealing ? '焼きなまし' : 'ヒルクライミング'} ${
            r + 1
          }/${repeatCount} | 試行 ${i + 1}/${maxTries}
` +
          `現在スコア: ${currentScore.toFixed(2)} | ベスト: ${bestScore.toFixed(
            2
          )}
` +
          `鍵: ${bestKey.split('').join(' ')}`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (bestScore > globalBestScore) {
      globalBestScore = bestScore;
      globalBestKey = bestKey;
      globalBestPlain = decrypt(cipherText, bestKey);
    }
  }

  const keyLine1 = 'Plain : ' + alphabet.split('').join(' ') + '\n';
  const keyLine2 = 'Cipher: ' + globalBestKey.split('').join(' ');
  document.getElementById('keyTable').textContent = keyLine1 + keyLine2;
  document.getElementById('scoreDisplay').textContent = `スコア: ${globalBestScore.toFixed(2)}`;

  const highlighted = highlightWords(globalBestPlain);
  document.getElementById('highlightedText').innerHTML = highlighted.html;
  document.getElementById('highlightedText').classList.remove("processing");
  document.getElementById('highlightCount').textContent =
    `🔍 ${highlighted.count} 個の英単語がハイライトされました`;

  progressBar.value = totalSteps;
  statusArea.textContent +=
    '\n✅ 解読完了（' +
    (useAnnealing ? '焼きなまし' : 'ヒルクライミング') +
    '×複数回）';
}

export function setSampleFixedKey() {
  document.getElementById('fixedMappings').value =
    'V→W,R→E,D→H,P→O,B→L,F→D,H→T,X→S';
}
