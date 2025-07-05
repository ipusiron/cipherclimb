import { decrypt, shuffleKey, swapTwo, highlightWords } from './utils.js';
import { scoreText } from './score.js';
import { initChart, addScore } from './chart.js';

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

export function getFixedMapFromUI() {
  const map = {};
  const seen = new Map();

  for (let i = 0; i < 26; i++) {
    const plainChar = String.fromCharCode(65 + i);
    document.getElementById("fixed_" + plainChar)?.classList.remove("duplicate");
  }

  let hasError = false;

  for (let i = 0; i < 26; i++) {
    const plainChar = String.fromCharCode(65 + i);
    const sel = document.getElementById("fixed_" + plainChar);
    const val = sel.value.toUpperCase();

    if (/^[A-Z]$/.test(val)) {
      if (seen.has(val)) {
        sel.classList.add("duplicate");
        document.getElementById("fixed_" + seen.get(val))?.classList.add("duplicate");
        hasError = true;
      } else {
        map[plainChar] = val;
        seen.set(val, plainChar);
      }
    }
  }

  if (hasError) {
    throw new Error("固定鍵に矛盾があります（同じ暗号文文字が複数指定されています）");
  }

  return map;
}

export function attachFixedKeyValidation() {
  for (let i = 0; i < 26; i++) {
    const plainChar = String.fromCharCode(65 + i);
    const sel = document.getElementById("fixed_" + plainChar);
    if (sel) {
      sel.addEventListener("change", () => {
        try {
          getFixedMapFromUI();
        } catch (_) {}
      });
    }
  }
}

export function setSampleFixedKey() {
  const sample = {
    W: "V", E: "R", H: "D", O: "P", L: "B", D: "F", T: "H", S: "X"
  };

  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const sel = document.getElementById("fixed_" + plain);
    if (sel) {
      sel.classList.remove("duplicate");  // ← すべてから削除
      sel.value = sample[plain] || "";    // ← セット or 未指定は ?
    }
  }
}

function generateKeyFromFixedMap(fixedMap) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const used = new Set(Object.values(fixedMap));
  const remain = alphabet.filter(c => !used.has(c));
  const key = Array(26).fill(null);

  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const cipher = fixedMap[plain];
    if (cipher) {
      key[i] = cipher;
    } else {
      key[i] = remain.pop();
    }
  }
  return key.join('');
}

function buildKeyTable(key, fixedMap = {}) {
  const plain = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const mapping = {};
  for (let i = 0; i < 26; i++) {
    const cipherChar = key[i];
    const plainChar = String.fromCharCode(65 + i);
    mapping[plainChar] = cipherChar;
  }

  let cipherRow = [];
  for (let ch of plain) {
    const c = mapping[ch];
    if (!c) {
      cipherRow.push(".");
    } else if (fixedMap[ch]) {
      cipherRow.push(`<span class="fixed">${c}</span>`);
    } else {
      cipherRow.push(c);
    }
  }

  const html = `<div class="keytable">
Plain : ${plain.split('').join(' ')}<br>
Cipher: ${cipherRow.join(' ')}
</div>`;
  return html;
}

export async function startClimb() {
  cancelRequested = false;

  let fixedMap;
  try {
    fixedMap = getFixedMapFromUI();
  } catch (err) {
    alert(err.message);
    return;
  }

  const cipherText = document.getElementById("cipherText").value.toUpperCase();
  const maxTriesRaw = parseInt(document.getElementById("maxTries").value);
  const maxTries = Math.min(maxTriesRaw, 5000);
  const useAnnealing = document.getElementById("useAnnealing")?.checked ?? true;
  const enableReheat = document.getElementById("enableReheat")?.checked ?? true;
  const coolingChoice = document.getElementById("coolingRateSelect")?.value || "auto";

  document.getElementById("keyTable").innerHTML = "(鍵の計算中...)";
  document.getElementById("scoreDisplay").textContent = "スコア: (計算中)";
  document.getElementById("highlightedText").innerHTML = "<em>解読中です...</em>";
  document.getElementById("highlightedText").classList.add("processing");
  document.getElementById("highlightCount").textContent = "";

  let T = 10.0;
  const T0 = 10.0;
  const coolingRate = coolingChoice === "auto"
    ? Math.pow(0.01 / T, 1 / maxTries)
    : parseFloat(coolingChoice);

  const progressBar = document.getElementById("progressBar");
  const statusArea = document.getElementById("statusArea");
  progressBar.value = 0;

  const repeatCount = 5;
  const totalSteps = repeatCount * maxTries;
  progressBar.max = totalSteps;

  initChart();

  let globalBestScore = -Infinity;
  let globalBestKey = "";
  let globalBestPlain = "";

  let progress = 0;

  for (let r = 0; r < repeatCount; r++) {
    let currentKey = generateKeyFromFixedMap(fixedMap);
    let currentScore = scoreText(decrypt(cipherText, currentKey));
    let bestKey = currentKey;
    let bestScore = currentScore;
    let noImprovementCount = 0;

    for (let i = 0; i < maxTries; i++) {
      if (cancelRequested) return;

      const newKey = swapTwo(bestKey);
      const score = scoreText(decrypt(cipherText, newKey));
      const delta = score - currentScore;

      const accept = delta > 0 || (useAnnealing && Math.exp(delta / T) > Math.random());
      if (accept) {
        bestKey = newKey;
        currentScore = score;
        if (score > bestScore) bestScore = score;
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

      if (i % 100 === 0) addScore(bestScore, progress);

      if (i % 250 === 0) {
        statusArea.textContent =
          `🔥 ${useAnnealing ? "焼きなまし" : "ヒルクライミング"} ${r + 1}/${repeatCount} | 試行 ${i + 1}/${maxTries}
` +
          `現在スコア: ${currentScore.toFixed(2)} | ベスト: ${bestScore.toFixed(2)}
` +
          `鍵: ${bestKey.split("").join(" ")}`;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (bestScore > globalBestScore) {
      globalBestScore = bestScore;
      globalBestKey = bestKey;
      globalBestPlain = decrypt(cipherText, bestKey);
    }
  }

  document.getElementById("keyTable").innerHTML = buildKeyTable(globalBestKey, fixedMap);
  document.getElementById("scoreDisplay").textContent = `スコア: ${globalBestScore.toFixed(2)}`;

  const highlighted = highlightWords(globalBestPlain);
  document.getElementById("highlightedText").innerHTML = highlighted.html;
  document.getElementById("highlightedText").classList.remove("processing");
  document.getElementById("highlightCount").textContent =
    `🔍 ${highlighted.count} 個の英単語がハイライトされました`;

  progressBar.value = totalSteps;
  statusArea.textContent += "\n✅ 解読完了";
}

document.addEventListener("DOMContentLoaded", () => {
  attachFixedKeyValidation();
});