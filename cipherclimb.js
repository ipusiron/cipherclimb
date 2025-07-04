// 2-gram スコアテーブル（簡易版）
const bigramScores = {
  'TH': 2.71, 'HE': 2.33, 'IN': 2.03, 'ER': 1.78, 'AN': 1.61,
  'RE': 1.41, 'ND': 1.32, 'AT': 1.21, 'ON': 1.13, 'NT': 1.13,
  'HA': 1.00, 'ES': 0.99, 'ST': 0.89, 'EN': 0.88, 'ED': 0.85,
  'TO': 0.76, 'IT': 0.76, 'OU': 0.74, 'EA': 0.74, 'HI': 0.73,
  'IS': 0.70, 'OR': 0.69, 'TI': 0.69, 'AS': 0.68, 'TE': 0.67
};

function scoreText(text) {
  let score = 0;
  const upper = text.toUpperCase().replace(/[^A-Z]/g, '');
  for (let i = 0; i < upper.length - 1; i++) {
    const bigram = upper.slice(i, i + 2);
    if (bigram in bigramScores) {
      score += bigramScores[bigram];
    }
  }
  return score;
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

function startClimb() {
  const cipherText = document.getElementById("cipherText").value.toUpperCase();
  const maxTries = parseInt(document.getElementById("maxTries").value);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let bestKey = shuffleKey(alphabet);
  let bestScore = scoreText(decrypt(cipherText, bestKey));
  const scoreHistory = [bestScore];

  for (let i = 0; i < maxTries; i++) {
    let newKey = swapTwo(bestKey);
    let newScore = scoreText(decrypt(cipherText, newKey));

    if (newScore > bestScore) {
      bestKey = newKey;
      bestScore = newScore;
    }

    scoreHistory.push(bestScore);
  }

  const finalPlain = decrypt(cipherText, bestKey);

  // 鍵対応表を表示
  let keyLine1 = "Plain : " + alphabet.split('').join(' ') + "\n";
  let keyLine2 = "Cipher: " + bestKey.split('').join(' ');
  document.getElementById("keyTable").textContent = keyLine1 + keyLine2;

  // スコア表示
  document.getElementById("scoreDisplay").textContent = `スコア: ${bestScore.toFixed(2)}`;

  // 解読結果表示
  document.getElementById("decryptedText").value = finalPlain;

  renderChart(scoreHistory);
}

function copyResult() {
  const textArea = document.getElementById("decryptedText");
  textArea.select();
  document.execCommand("copy");
  alert("解読結果をコピーしました！");
}
