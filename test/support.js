import { DICTIONARIES } from '../dictionaries.js';
import { SAMPLE_CIPHER } from '../samples.js';
import { createRng } from '../solver.js';
import { prepareText } from '../utils.js';

export const scoring = {
  useLetter: true, useNgram: true, useDict: true, dictWeight: 100,
  usePartial: false, dictionary: DICTIONARIES.google10000.words,
};
export function config(seed = 1, overrides = {}, scoreOverrides = {}) {
  return {
    cipherText: SAMPLE_CIPHER, fixedMap: {}, maxTries: 3000,
    useAnnealing: true, enableReheat: true, cooling: 'auto',
    ...overrides, rng: createRng(seed), scoring: { ...scoring, ...scoreOverrides },
  };
}
export function accuracy(expected, actual) {
  const a = prepareText(expected).letters;
  const b = prepareText(actual).letters;
  return (100 * a.filter((ch, i) => ch === b[i]).length / a.length).toFixed(2);
}
