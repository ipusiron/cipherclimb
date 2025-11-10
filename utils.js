// utils.js
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function decrypt(text, key) {
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

export function shuffleKey(key) {
  const arr = key.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export function swapTwo(str) {
  let a = Math.floor(Math.random() * str.length);
  let b = Math.floor(Math.random() * str.length);
  if (a === b) b = (b + 1) % str.length;
  let arr = str.split('');
  [arr[a], arr[b]] = [arr[b], arr[a]];
  return arr.join('');
}

export function highlightWords(text) {
  if (typeof englishWords === "undefined") return { html: escapeHtml(text), count: 0 };

  // 小文字に変換した辞書セットを作成
  const lowerDict = new Set([...englishWords].map(w => w.toLowerCase()));

  const words = text.split(/\b/);
  let count = 0;

  const html = words.map(w => {
    const plain = w.replace(/[^A-Z]/gi, '').toLowerCase();
    if (plain.length >= 3 && lowerDict.has(plain)) {
      count++;
      return `<span class="highlight-word">${escapeHtml(w)}</span>`;
    }
    return escapeHtml(w);
  }).join('');

  return { html, count };
}
