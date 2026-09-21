// 描画前にテーマを反映する。保存領域が使えなくてもOS設定で起動する。
(() => {
  let saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch {
    // 保存なしとして扱う。
  }
  const dark = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark-mode', dark);
})();
