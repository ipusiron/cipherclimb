// score.js
export function scoreText(text) {
  const useLetter = document.getElementById("score_letter")?.checked ?? true;
  const useNgram = document.getElementById("score_ngram")?.checked ?? true;
  const useDict  = document.getElementById("score_dict")?.checked ?? true;

  let total = 0;
  if (useLetter) total += letterFrequencyScore(text);
  if (useNgram)  total += ngramScore(text);
  if (useDict)   total += dictionaryMatchScore(text);
  return total;
}

export function letterFrequencyScore(text) {
  const freq = {
    E: 12.70, T: 9.06, A: 8.17, O: 7.51, I: 6.97, N: 6.75,
    S: 6.33, H: 6.09, R: 5.99, D: 4.25, L: 4.03, C: 2.78,
    U: 2.76, M: 2.41, W: 2.36, F: 2.23, G: 2.02, Y: 1.97,
    P: 1.93, B: 1.49, V: 0.98, K: 0.77, X: 0.15, J: 0.15,
    Q: 0.10, Z: 0.07
  };
  const upper = text.toUpperCase().replace(/[^A-Z]/g, '');
  const counts = {};
  for (let c of upper) counts[c] = (counts[c] || 0) + 1;
  let score = 0;
  for (let c in freq) {
    const observed = counts[c] || 0;
    score += freq[c] * observed;
  }
  return score;
}

export function ngramScore(text) {
  let bigramScore = 0;
  let trigramScore = 0;
  const upper = text.toUpperCase().replace(/[^A-Z]/g, '');
  for (let i = 0; i < upper.length - 1; i++) {
    const bg = upper.slice(i, i + 2);
    if (bigramScores[bg]) bigramScore += bigramScores[bg];
  }
  for (let i = 0; i < upper.length - 2; i++) {
    const tg = upper.slice(i, i + 3);
    if (trigramScores[tg]) trigramScore += trigramScores[tg];
  }
  return bigramScore + trigramScore * 2;
}

export function dictionaryMatchScore(text) {
  if (typeof englishWords === "undefined") return 0;
  const words = text.split(/\b/);
  let count = 0;
  for (let w of words) {
    const plain = w.replace(/[^A-Z]/gi, '').toLowerCase();
    if (plain.length >= 3 && englishWords.has(plain)) {
      count++;
    }
  }
  return count * 50;
}
