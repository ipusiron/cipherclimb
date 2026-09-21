import { refreshChartTheme } from './chart.js';

export function initTheme() {
  const root = document.documentElement;
  const button = document.getElementById('toggleTheme');
  const updateButton = () => {
    const dark = root.classList.contains('dark-mode');
    button.textContent = dark ? '☀️ ライトモード' : '🌙 ダークモード';
    button.setAttribute('aria-pressed', String(dark));
  };
  updateButton();
  button.addEventListener('click', () => {
    const dark = root.classList.toggle('dark-mode');
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      // 保存できない場合も画面のテーマは切り替える。
    }
    updateButton();
    refreshChartTheme();
  });
}
