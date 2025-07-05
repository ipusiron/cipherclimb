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
