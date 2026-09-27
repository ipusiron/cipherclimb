let scoreChart = null;
let unavailable = false;

const t = (key) => window.I18n.t(key);

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
  unavailable = false;
  message.textContent = '';
  canvas.hidden = false;
  if (!window.Chart) {
    unavailable = true;
    message.textContent = t('chart.unavailable');
    canvas.hidden = true;
    return;
  }
  const colors = chartColors();
  scoreChart = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      datasets: [
        {
          label: t('chart.restartBest'), data: [],
          borderColor: colors.best, pointRadius: 0, borderWidth: 2,
        },
        {
          label: t('chart.current'), data: [],
          borderColor: colors.current, pointRadius: 0, borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { labels: { color: colors.text } } },
      scales: {
        x: {
          type: 'linear', title: { display: true, text: t('chart.xAxis'), color: colors.text },
          ticks: { color: colors.text }, grid: { color: colors.grid },
        },
        y: {
          title: { display: true, text: t('chart.yAxis'), color: colors.text },
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

// 描き終えたグラフも、凡例と軸の文言だけ訳し直す。データ点には触れない。
export function refreshChartLanguage() {
  const message = document.getElementById('chartMessage');
  if (message && unavailable) message.textContent = t('chart.unavailable');
  if (!scoreChart) return;
  scoreChart.data.datasets[0].label = t('chart.restartBest');
  scoreChart.data.datasets[1].label = t('chart.current');
  scoreChart.options.scales.x.title.text = t('chart.xAxis');
  scoreChart.options.scales.y.title.text = t('chart.yAxis');
  scoreChart.update('none');
}
