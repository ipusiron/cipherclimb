import { refreshChartTheme } from './chart.js';

export function initTheme() {
  const root = document.documentElement;
  const button = document.getElementById('toggleTheme');
  // 状態で変わる文言なので data-i18n は付けず、毎回 t() で組み立てる。
  const updateButton = () => {
    const dark = root.classList.contains('dark-mode');
    button.textContent = window.I18n.t(dark ? 'theme.light' : 'theme.dark');
    button.setAttribute('aria-pressed', String(dark));
  };
  updateButton();
  document.addEventListener('languagechange', updateButton);
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
