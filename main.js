import { decrypt, swapTwo, highlightWords } from './utils.js';
import { scoreText } from './score.js';
import { initChart, addScore } from './chart.js';

function getFixedMapFromUI() {
  const map = {};
  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const sel = document.getElementById("fixed_" + plain);
    const val = sel?.value?.toUpperCase();
    if (val && /^[A-Z]$/.test(val)) {
      map[plain] = val;
    }
  }
  return map;
}

function generateDecryptKeyFromFixedMap(fixedMap) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const decryptArr = Array(26).fill(null);
  const used = new Set();

  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const cipher = fixedMap[plain];
    if (cipher) {
      const index = cipher.charCodeAt(0) - 65;
      decryptArr[index] = plain;
      used.add(cipher);
    }
  }

  const unusedPlain = alphabet.filter(c => !Object.keys(fixedMap).includes(c));
  const unusedCipher = alphabet.filter(c => !used.has(c));

  for (let i = 0; i < unusedPlain.length; i++) {
    const plain = unusedPlain[i];
    const cipher = unusedCipher[i];
    const index = cipher.charCodeAt(0) - 65;
    decryptArr[index] = plain;
  }

  return decryptArr.join('');
}

function buildKeyTableFromDecryptKey(decryptKey, fixedMap = {}) {
  const plain = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const mapping = {};

  for (let i = 0; i < 26; i++) {
    const cipherChar = String.fromCharCode(65 + i); // A〜Z
    const plainChar = decryptKey[i];
    if (plainChar) {
      mapping[plainChar] = cipherChar;
    }
  }

  const cipherRow = [];
  for (let i = 0; i < 26; i++) {
    const plainChar = String.fromCharCode(65 + i);
    const cipherChar = mapping[plainChar];
    if (!cipherChar) {
      cipherRow.push(".");
    } else if (fixedMap[plainChar]) {
      cipherRow.push(`<span class="fixed">${cipherChar}</span>`);
    } else {
      cipherRow.push(cipherChar);
    }
  }

  return `<div class="keytable">
Plain : ${plain.split('').join(' ')}<br>
Cipher: ${cipherRow.join(' ')}
</div>`;
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

function setSampleFixedKey() {
  const sample = {
    /* 平文: "暗号文" */
    W: "V", E: "R", H: "D", O: "P", L: "B", D: "F", T: "H", S: "X"
  };
  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const sel = document.getElementById("fixed_" + plain);
    if (sel) {
      sel.classList.remove("duplicate");
      sel.value = sample[plain] || "";
    }
  }
  validateFixedKeyConflicts();
}

async function startClimb() {
  cancelRequested = false; //

  const cipherText = document.getElementById("cipherText").value.toUpperCase();
  const maxTriesRaw = parseInt(document.getElementById("maxTries").value);
  const maxTries = Math.min(maxTriesRaw, 5000);
  const useAnnealing = document.getElementById("useAnnealing")?.checked ?? true;
  const enableReheat = document.getElementById("enableReheat")?.checked ?? true;
  const coolingChoice = document.getElementById("coolingRateSelect")?.value || "auto";
  const fixedMap = getFixedMapFromUI();
  const progressBar = document.getElementById("progressBar");
  const statusArea = document.getElementById("statusArea");
  const repeatCount = 5;
  const totalSteps = repeatCount * maxTries;
  progressBar.max = totalSteps;
  progressBar.value = 0;
  statusArea.textContent = "";

  document.getElementById("keyTable").innerHTML = "(鍵の計算中...)";
  document.getElementById("scoreDisplay").textContent = "スコア: (計算中)";
  document.getElementById("highlightedText").innerHTML = "<em>解読中です...</em>";
  document.getElementById("highlightedText").classList.add("processing");
  document.getElementById("highlightCount").textContent = "";

  initChart();

  let globalBestScore = -Infinity;
  let globalBestKey = '';
  let globalBestPlain = '';
  let progress = 0;

 // decryptKey のインデックス位置にマッチさせる
const fixedIndices = new Set();
for (const [plain, cipher] of Object.entries(fixedMap)) {
  const cipherIdx = cipher.charCodeAt(0) - 65;
  fixedIndices.add(cipherIdx); // decryptKey[暗号文字] = 平文文字
}


  for (let r = 0; r < repeatCount; r++) {
    let currentKey = generateDecryptKeyFromFixedMap(fixedMap);
    let currentScore = scoreText(decrypt(cipherText, currentKey));
    let bestKey = currentKey;
    let bestScore = currentScore;
    let noImprovementCount = 0;
    let T = 10.0;
    const T0 = 10.0;
    const coolingRate = coolingChoice === "auto"
      ? Math.pow(0.01 / T, 1 / maxTries)
      : parseFloat(coolingChoice);

    for (let i = 0; i < maxTries; i++) {  
      if (cancelRequested) return;

      const newKey = swapTwoRespectingFixed(bestKey, fixedIndices);
      const score = scoreText(decrypt(cipherText, newKey));
      const delta = score - currentScore;
      const accept = delta > 0 || (useAnnealing && Math.exp(delta / T) > Math.random());

      if (accept) {
        bestKey = newKey;
        currentScore = score;
        if (score > bestScore) {
          bestScore = score;
        }
        noImprovementCount = 0;
      } else {
        noImprovementCount++;
      }

      if (useAnnealing && enableReheat && noImprovementCount >= 500) {
        T = T0;
        noImprovementCount = 0;
        console.log("♻️ 温度リセット");
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

  document.getElementById("keyTable").innerHTML =
    buildKeyTableFromDecryptKey(globalBestKey, fixedMap);
  document.getElementById("scoreDisplay").textContent =
    `スコア: ${globalBestScore.toFixed(2)}`;

  const highlighted = highlightWords(globalBestPlain);
  document.getElementById("highlightedText").innerHTML = highlighted.html;
  document.getElementById("highlightedText").classList.remove("processing");
  document.getElementById("highlightCount").textContent =
    `🔍 ${highlighted.count} 個の英単語がハイライトされました`;

  progressBar.value = totalSteps;
  statusArea.textContent += "\n✅ 解読完了";
}
let cancelRequested = false;

function cancelClimb() {
  cancelRequested = true;
}

function showHelp() { document.getElementById("helpModal").style.display = "block"; }
function hideHelp() { document.getElementById("helpModal").style.display = "none"; }
function copyResult() {
  const text = document.getElementById("highlightedText").innerText;
  navigator.clipboard.writeText(text).then(() => alert("解読結果をコピーしました！"));
}

function validateFixedKeyConflicts() {
  const selected = {};
  const conflicts = new Set();

  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const sel = document.getElementById("fixed_" + plain);
    sel.classList.remove("duplicate");
    const val = sel.value?.toUpperCase();

    if (val && /^[A-Z]$/.test(val)) {
      if (selected[val]) {
        // すでに使われていたら両者に警告
        conflicts.add(val);
      } else {
        selected[val] = plain;
      }
    }
  }

  // 再びループして矛盾のあるselectにclass追加
  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const sel = document.getElementById("fixed_" + plain);
    const val = sel.value?.toUpperCase();
    if (conflicts.has(val)) {
      sel.classList.add("duplicate");
    }
  }
}


window.startClimb = startClimb;
window.cancelClimb = cancelClimb;
window.setSampleFixedKey = setSampleFixedKey;
window.copyResult = copyResult;
window.showHelp = showHelp;
window.hideHelp = hideHelp;

for (let i = 0; i < 26; i++) {
  const id = `fixed_${String.fromCharCode(65 + i)}`;
  const sel = document.getElementById(id);
  sel.addEventListener("input", validateFixedKeyConflicts);
}

