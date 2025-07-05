let scoreChart = null;

export function renderChart(scores) {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  if (scoreChart) scoreChart.destroy();
  scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: scores.map((_, i) => i + 1),
      datasets: [{
        label: 'スコア',
        data: scores,
        borderColor: 'blue',
        fill: false,
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

// 初期化（最初に呼ぶ）

export function initChart() {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  if (scoreChart) {
    scoreChart.destroy();  // 前回のグラフを破棄
  }
  scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'スコア',
        data: [],
        borderColor: 'blue',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: { title: { display: true, text: '試行回数' }},
        y: { title: { display: true, text: 'スコア' }}
      }
    }
  });
}

// スコアを1件追加する（毎回呼ぶ）
export function addScore(value) {
  if (!scoreChart) return;
  const nextIndex = scoreChart.data.labels.length + 1;
  scoreChart.data.labels.push(nextIndex);
  scoreChart.data.datasets[0].data.push(value);
  scoreChart.update('none'); // アニメーションなしで即時更新
}
