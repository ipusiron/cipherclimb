
import { decrypt, shuffleKey, swapTwo, highlightWords } from './utils.js';
import { scoreText } from './score.js';
import { renderChart } from './chart.js';

let cancelRequested = false;

export function cancelClimb() {
  cancelRequested = true;
}

export function showHelp() {
  document.getElementById("helpModal").style.display = "block";
}

export function hideHelp() {
  document.getElementById("helpModal").style.display = "none";
}

export function copyResult() {
  const temp = document.createElement("textarea");
  temp.value = document.getElementById("highlightedText").innerText;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
  alert("解読結果をコピーしました！");
}

export async function startClimb() {
  cancelRequested = false;

  const cipherText = document.getElementById("cipherText").value.toUpperCase();
  const maxTriesRaw = parseInt(document.getElementById("maxTries").value);
  const maxTries = Math.min(maxTriesRaw, 5000);
  if (maxTriesRaw > 5000) {
    alert("試行回数の上限は5000回です。5000回に制限されました。");
  }

  const useAnnealing = document.getElementById("useAnnealing")?.checked ?? true;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const progressBar = document.getElementById("progressBar");
  const statusArea = document.getElementById("statusArea");
  progressBar.value = 0;

  const repeatCount = 5;
  const totalSteps = repeatCount * maxTries;
  progressBar.max = totalSteps;

  let globalBestScore = -Infinity;
  let globalBestKey = '';
  let globalBestPlain = '';
  let globalBestHistory = [];

  let progress = 0;

  for (let r = 0; r < repeatCount; r++) {
    if (cancelRequested) {
      statusArea.textContent += "\n🛑 処理はキャンセルされました";
      return;
    }

    let currentKey = shuffleKey(alphabet);
    let currentScore = scoreText(decrypt(cipherText, currentKey));
    let bestKey = currentKey;
    let bestScore = currentScore;
    const scoreHistory = [currentScore];

    // let T = 10.0;
    // const Tmin = 0.01;
    // const coolingRate = Math.pow(Tmin / T, 1 / maxTries);
    
    let T = 10.0;
    const coolingRate = 0.9995; // ← 非常に緩やかに冷却

    for (let i = 0; i < maxTries; i++) {
      if (cancelRequested) {
        statusArea.textContent += "\n🛑 処理はキャンセルされました";
        return;
      }

      const newKey = swapTwo(currentKey);
      const newScore = scoreText(decrypt(cipherText, newKey));
      const delta = newScore - currentScore;

      if (useAnnealing) {
        // 焼きなまし法
        if (delta > 0 || Math.exp(delta / T) > Math.random()) {
          currentKey = newKey;
          currentScore = newScore;
        }
      } else {
        // ヒルクライミング法
        if (delta > 0) {
          currentKey = newKey;
          currentScore = newScore;
        }
      }

      if (currentScore > bestScore) {
        bestKey = currentKey;
        bestScore = currentScore;
      }

      T *= coolingRate;
      scoreHistory.push(bestScore);
      progress++;
      progressBar.value = progress;

      if (i % 250 === 0) {
        statusArea.textContent =
          `🔥 ${useAnnealing ? '焼きなまし' : 'ヒルクライミング'} ${r + 1} / ${repeatCount} | 試行 ${i + 1} / ${maxTries}\n` +
          `現在スコア: ${currentScore.toFixed(2)} | ベスト: ${bestScore.toFixed(2)}\n` +
          `鍵: ${bestKey.split('').join(' ')}`;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (bestScore > globalBestScore) {
      globalBestScore = bestScore;
      globalBestKey = bestKey;
      globalBestPlain = decrypt(cipherText, bestKey);
      globalBestHistory = scoreHistory;
    }
  }

  const keyLine1 = "Plain : " + alphabet.split('').join(' ') + "\n";
  const keyLine2 = "Cipher: " + globalBestKey.split('').join(' ');
  document.getElementById("keyTable").textContent = keyLine1 + keyLine2;
  document.getElementById("scoreDisplay").textContent = `スコア: ${globalBestScore.toFixed(2)}`;

  const highlighted = highlightWords(globalBestPlain);
  document.getElementById("highlightedText").innerHTML = highlighted.html;
  document.getElementById("highlightCount").textContent =
    `🔍 ${highlighted.count} 個の英単語がハイライトされました`;

  renderChart(globalBestHistory);
  progressBar.value = totalSteps;
  statusArea.textContent += "\n✅ 解読完了（" + (useAnnealing ? '焼きなまし' : 'ヒルクライミング') + "×複数回）";
}
