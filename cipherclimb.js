let cancelRequested = false;

function cancelClimb() {
  cancelRequested = true;
}

function scoreText(text) {
  let bigramScore = 0;
  let trigramScore = 0;
  const upper = text.toUpperCase().replace(/[^A-Z]/g, '');
  for (let i = 0; i < upper.length - 1; i++) {
    const bigram = upper.slice(i, i + 2);
    if (bigram in bigramScores) {
      bigramScore += bigramScores[bigram];
    }
  }
  for (let i = 0; i < upper.length - 2; i++) {
    const trigram = upper.slice(i, i + 3);
    if (trigram in trigramScores) {
      trigramScore += trigramScores[trigram];
    }
  }
  return bigramScore + trigramScore * 2;
}

function decrypt(text, key) {
  let result = '';
  for (let c of text.toUpperCase()) {
    if (c >= 'A' && c <= 'Z') {
      const index = c.charCodeAt(0) - 65;
      result += key[index];
    } else {
      result += c;
    }
  }
  return result;
}

function shuffleKey(key) {
  const arr = key.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

function swapTwo(str) {
  let a = Math.floor(Math.random() * str.length);
  let b = Math.floor(Math.random() * str.length);
  if (a === b) b = (b + 1) % str.length;
  let arr = str.split('');
  [arr[a], arr[b]] = [arr[b], arr[a]];
  return arr.join('');
}

let scoreChart = null;

function renderChart(scores) {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  if (scoreChart) scoreChart.destroy();
  scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: scores.map((_, i) => i + 1),
      datasets: [{
        label: 'スコア',
        data: scores,
        fill: false,
        borderColor: 'blue',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: '試行回数' }},
        y: { title: { display: true, text: 'スコア' }}
      }
    }
  });
}

async function startClimb() {
  cancelRequested = false;

  const cipherText = document.getElementById("cipherText").value.toUpperCase();
  const maxTriesRaw = parseInt(document.getElementById("maxTries").value);
  const maxTries = Math.min(maxTriesRaw, 5000);
  if (maxTriesRaw > 5000) {
    alert("試行回数の上限は5000回です。5000回に制限されました。");
  }

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

    let T = 10.0;
    const Tmin = 0.01;
    const coolingRate = Math.pow(Tmin / T, 1 / maxTries);

    for (let i = 0; i < maxTries; i++) {
      if (cancelRequested) {
        statusArea.textContent += "\n🛑 処理はキャンセルされました";
        return;
      }

      const newKey = swapTwo(currentKey);
      const newScore = scoreText(decrypt(cipherText, newKey));
      const delta = newScore - currentScore;

      if (delta > 0 || Math.exp(delta / T) > Math.random()) {
        currentKey = newKey;
        currentScore = newScore;
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
          `🔥 焼きなまし ${r + 1} / ${repeatCount} | 試行 ${i + 1} / ${maxTries}\n` +
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

  // 復号結果をハイライト表示（辞書読み込みがなければ素のまま）
  let highlighted;
  try {
    highlighted = highlightWords(globalBestPlain);
  } catch (e) {
    highlighted = globalBestPlain.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  document.getElementById("highlightedText").innerHTML = highlighted;

  renderChart(globalBestHistory);
  progressBar.value = totalSteps;
  statusArea.textContent += "\n✅ 解読完了（焼きなまし×複数回）";
}

function copyResult() {
  const temp = document.createElement("textarea");
  temp.value = document.getElementById("highlightedText").innerText;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
  alert("解読結果をコピーしました！");
}


function highlightWords(text) {
  if (typeof englishWords === "undefined") return text; // 読み込み失敗時はそのまま

  const words = text.split(/\\b/);  // 単語境界で分割
  return words.map(w => {
    const plain = w.replace(/[^A-Z]/gi, '').toUpperCase();
    if (plain.length >= 3 && englishWords.has(plain)) {
      return `<span class="highlight-word">${w}</span>`;
    } else {
      return w;
    }
  }).join('');
}
