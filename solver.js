import { ALPHABET, decrypt, prepareText, normalizeFixedMap, findFixedConflicts } from './utils.js';
import { createScorer } from './score.js';

export const RESTARTS = 5;
export const T0 = 1000;
export const T_END = 1;
export const REHEAT_AFTER = 500;
export const SAMPLE_EVERY = 100;
export const REPORT_EVERY = 500;
export const COOLING_CHOICES = ['auto', '0.995', '0.999', '0.9995'];

export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function freeLetters(fixedMap) {
  const fixed = normalizeFixedMap(fixedMap);
  const used = new Set(Object.values(fixed));
  return {
    freePlain: [...ALPHABET].filter((plain) => !(plain in fixed)),
    freeCipher: [...ALPHABET].filter((cipher) => !used.has(cipher)),
  };
}

export function randomInitialKey(fixedMap, rng) {
  const fixed = normalizeFixedMap(fixedMap);
  const { freePlain, freeCipher } = freeLetters(fixed);
  const perm = freePlain.slice();
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const key = Array(26).fill('?');
  for (const [plain, cipher] of Object.entries(fixed)) key[cipher.charCodeAt(0) - 65] = plain;
  freeCipher.forEach((cipher, k) => { key[cipher.charCodeAt(0) - 65] = perm[k]; });
  return key.join('');
}

export function coolingRate(choice, maxTries) {
  return choice === 'auto' || !COOLING_CHOICES.includes(choice)
    ? Math.pow(T_END / T0, 1 / maxTries) : Number(choice);
}

const keyToIdx = (key) => Int8Array.from(key, (ch) => ch.charCodeAt(0) - 65);
const idxToKey = (idx) => Array.from(idx, (i) => ALPHABET[i]).join('');

// 乱数の呼び出し順も再現性の契約に含む。中間報告では乱数を消費しない。
export function* climb(config) {
  const fixed = normalizeFixedMap(config.fixedMap);
  if (findFixedConflicts(fixed).length) throw new Error('fixed map has conflicts');
  const score = createScorer(prepareText(config.cipherText), config.scoring);
  const free = freeLetters(fixed).freeCipher.map((ch) => ch.charCodeAt(0) - 65);
  const m = free.length;
  const { rng, maxTries } = config;
  const history = [];
  let pending = [];
  let gBest = -Infinity;
  let gKey = null;
  let gRestart = -1;
  let reheats = 0;
  let triesDone = 0;

  if (m < 2) {
    const key = randomInitialKey(fixed, () => 0);
    return {
      searched: false, bestScore: score(keyToIdx(key)), bestKey: key, bestRestart: 0,
      plainText: decrypt(config.cipherText, key), reheats: 0, triesDone: 0, totalTries: 0, history,
    };
  }

  const totalTries = RESTARTS * maxTries;
  const rate = coolingRate(config.cooling, maxTries);
  for (let r = 0; r < RESTARTS; r++) {
    const key = keyToIdx(randomInitialKey(fixed, rng));
    let cur = score(key);
    let best = cur;
    const bestKey = key.slice();
    let T = T0;
    let rejects = 0;
    for (let i = 0; i < maxTries; i++) {
      const a = Math.floor(rng() * m);
      let b = Math.floor(rng() * (m - 1));
      if (b >= a) b++;
      const ia = free[a];
      const ib = free[b];
      [key[ia], key[ib]] = [key[ib], key[ia]];
      const s = score(key);
      const d = s - cur;
      if (d > 0 || (config.useAnnealing && Math.exp(d / T) > rng())) {
        cur = s;
        rejects = 0;
        if (s > best) {
          best = s;
          bestKey.set(key);
        }
      } else {
        [key[ia], key[ib]] = [key[ib], key[ia]];
        rejects++;
      }
      if (config.useAnnealing && config.enableReheat && rejects >= REHEAT_AFTER) {
        T = T0;
        rejects = 0;
        reheats++;
      }
      if (config.useAnnealing) T *= rate;
      triesDone++;
      if (i % SAMPLE_EVERY === 0) {
        const point = { x: r * maxTries + i + 1, current: cur, best };
        history.push(point);
        pending.push(point);
      }
      if (i % REPORT_EVERY === 0) {
        yield {
          restart: r, iteration: i, triesDone, totalTries, temperature: T,
          currentScore: cur, restartBestScore: best,
          bestScore: best > gBest ? best : gBest,
          bestKey: best > gBest ? idxToKey(bestKey) : gKey, points: pending,
        };
        pending = [];
      }
    }
    if (best > gBest) {
      gBest = best;
      gKey = idxToKey(bestKey);
      gRestart = r;
    }
  }
  return {
    searched: true, bestScore: gBest, bestKey: gKey, bestRestart: gRestart,
    plainText: decrypt(config.cipherText, gKey), reheats, triesDone, totalTries, history,
  };
}

export function solve(config) {
  const iterator = climb(config);
  let step = iterator.next();
  let snapshots = 0;
  while (!step.done) {
    snapshots++;
    step = iterator.next();
  }
  return { ...step.value, snapshots };
}
