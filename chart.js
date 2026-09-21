let scoreChart = null;

function chartColors() {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(['best', 'current', 'text', 'grid'].map((name) =>
    [name, style.getPropertyValue('--chart-' + name).trim()]));
}

export function initChart() {
  const canvas = document.getElementById('scoreChart');
  const message = document.getElementById('chartMessage');
  if (scoreChart) scoreChart.destroy();
  scoreChart = null;
  message.textContent = '';
  canvas.hidden = false;
  if (!window.Chart) {
    message.textContent = 'グラフを表示できません';
    canvas.hidden = true;
    return;
  }
  const colors = chartColors();
  scoreChart = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      datasets: [
        { label: 'この回のベスト', data: [], borderColor: colors.best, pointRadius: 0, borderWidth: 2 },
        { label: '現在のスコア', data: [], borderColor: colors.current, pointRadius: 0, borderWidth: 1 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { labels: { color: colors.text } } },
      scales: {
        x: {
          type: 'linear', title: { display: true, text: '試行回数（通算）', color: colors.text },
          ticks: { color: colors.text }, grid: { color: colors.grid },
        },
        y: {
          title: { display: true, text: 'スコア', color: colors.text },
          ticks: { color: colors.text }, grid: { color: colors.grid },
        },
      },
    },
  });
}

export function addPoints(points) {
  if (!scoreChart) return;
  for (const point of points) {
    scoreChart.data.datasets[0].data.push({ x: point.x, y: point.best / 100 });
    scoreChart.data.datasets[1].data.push({ x: point.x, y: point.current / 100 });
  }
  scoreChart.update('none');
}

export function refreshChartTheme() {
  if (!scoreChart) return;
  const colors = chartColors();
  scoreChart.data.datasets[0].borderColor = colors.best;
  scoreChart.data.datasets[1].borderColor = colors.current;
  scoreChart.options.plugins.legend.labels.color = colors.text;
  for (const axis of ['x', 'y']) {
    scoreChart.options.scales[axis].title.color = colors.text;
    scoreChart.options.scales[axis].ticks.color = colors.text;
    scoreChart.options.scales[axis].grid.color = colors.grid;
  }
  scoreChart.update('none');
}
