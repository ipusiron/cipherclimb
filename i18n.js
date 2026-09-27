// 日本語と英語の文言。画面を組み立てるスクリプトは言語ごとの文字列を持たない。
// 探索のロジック（solver.js・score.js・utils.js）はこのファイルを参照しない。
const I18n = (() => {
  const ja = {
    'app.title': 'サイファー・クライム（Cipher Climb）— 単一換字式暗号の解読ツール',
    'app.heading': '🧗 サイファー・クライム（Cipher Climb）',
    'app.intro1': 'このツールは',
    'app.introStrong': '単一換字式暗号',
    'app.intro2': 'の解読専用です（ヴィジュネルなど非対応）。',
    'app.langButton': 'English',
    'app.langAria': '表示言語を英語に切り替える',
    'app.helpButton': '❔ ヘルプ',
    'theme.dark': '🌙 ダークモード',
    'theme.light': '☀️ ライトモード',

    'input.heading': '🔐 暗号文の入力',
    'input.cipherLabel': '暗号文（{max}文字まで）',

    'fixed.heading': '🔒 固定鍵マッピング',
    'fixed.hint': '確定のマッピングを指定（上段が平文文字、下段が暗号文文字）。未確定は「?」のままでOK。',
    'fixed.sampleButton': '🔒 サンプルの固定鍵をセット',
    'fixed.clearButton': '固定鍵をクリア',
    'fixed.cellAria': '平文{plain}に対応する暗号文字',
    'fixed.sampleNote':
      'サンプルの固定鍵は、サンプルの暗号文のためのものです。暗号文を変えた場合は「固定鍵をクリア」で外してください',
    'fixed.conflict': '固定鍵に重複があります: 暗号文字 {cipher} を {plains} に割り当てています',
    'fixed.conflictJoin': ' と ',
    'text.messageJoin': '／',

    'algo.heading': '🧠 アルゴリズム設定',
    'algo.useAnnealing': '焼きなまし法を使用',
    'algo.coolingLabel': '焼きなまし冷却速度:',
    'algo.cooling.auto': '自動（指数式）',
    'algo.cooling.fast': '0.995（やや早い）',
    'algo.cooling.slow': '0.999（やや緩やか）',
    'algo.cooling.slower': '0.9995（かなり緩やか）',
    'algo.reheat': '不採択が{count}回続いたら温度をリセット（局所最適脱出）',

    'dict.heading': '📚 辞書設定',
    'dict.sourceLabel': '使用する辞書:',
    'dict.google10000': 'Google 10000語（3文字以上の9,578語）',
    'dict.basic343': '基本語343語（小さい辞書）',

    'score.heading': '⚙️ スコア構成',
    'score.letter': '文字頻度',
    'score.ngram': 'N-gram',
    'score.dict': '辞書照合',
    'score.weightLabel': '単語の重み:',
    'score.weight30': '30（弱め）',
    'score.weight50': '50',
    'score.weight100': '100（バランス型）',
    'score.weight150': '150',
    'score.weight200': '200（超重視）',
    'score.partial': '単語を部分一致でも評価する',

    'run.triesLabel': '試行回数（1〜{max}）:',
    'run.seedLabel': '乱数のシード（空欄なら毎回ランダム）:',
    'run.start': 'スタート',
    'run.stop': '停止',
    'run.error.noLetters': '英字（A〜Z）を含む暗号文を入力してください',
    'run.error.tooLong': '暗号文が長すぎます（{length}文字）。{max}文字以内にしてください',
    'run.error.tries': '試行回数は1〜{max}の整数で入力してください',
    'run.error.seed': 'シードは0〜{max}の整数で入力するか、空欄にしてください',
    'run.error.scoring': 'スコア構成を1つ以上選んでください',
    'run.error.runtime': '解読中にエラーが発生しました。設定を確認して再実行してください',
    'run.warn.short': '暗号文が短い（英字{letters}字）ため、正しく解けないことがあります。目安は英字{minimum}字以上です',
    'run.warn.fullwidth': '全角の英字{count}文字は変換されません。半角に直してください',
    'run.announce.start': '解読を開始しました',
    'run.announce.error': '解読中にエラーが発生しました',
    'run.meta.seed': 'シード: {seed}',

    'progress.heading': '⏳ 進行状況',
    'progress.aria': '探索の進み具合',

    'status.placeholder': '(ステータス表示)',
    'status.method.annealing': '🔥 焼きなまし法',
    'status.method.climbing': '⛰️ ヒルクライミング法',
    'status.temperature': ' | 温度 {value}',
    'status.progressLine': '{method} {restart}/{restarts} | 試行 {iteration}/{maxTries}{temperature}',
    'status.scoreLine': '現在のスコア: {current} | この回のベスト: {restartBest} | 全体のベスト: {best}',
    'status.keyLine': '鍵: {key}',
    'status.done': '✅ 解読完了（再加熱: {reheats}回）',
    'status.doneNoSearch': '✅ 解読完了。固定鍵だけで鍵が決まるため、探索は行いませんでした',
    'status.doneLine': '全体のベスト: {best} | 総試行回数: {tries}',
    'status.stopped': '⏹ 停止しました',

    'result.heading': '📋 解読結果',
    'result.statusHeading': '🔄 解読中の情報',
    'result.chartHeading': '📈 スコアの推移',
    'result.chartAria': 'スコアの推移のグラフ',
    'result.scoreHeading': '📊 スコア',
    'result.keyHeading': '🔑 鍵の対応表',
    'result.textHeading': '📝 解読結果',
    'result.copyButton': 'コピー',
    'result.scoreEmpty': 'スコア: -',
    'result.scoreComputing': 'スコア: (計算中)',
    'result.score': 'スコア: {value}',
    'result.keyComputing': '(鍵の計算中...)',
    'result.decrypting': '解読中です...',
    'result.breakdown':
      '内訳: 文字頻度 {letter}{letterOff} / N-gram {ngram}{ngramOff} / 辞書 +{dict}{dictOff}',
    'result.off': '（OFF）',
    'result.highlightCount': '🔍 {count} 個の英単語がハイライトされました',
    'result.copied': '解読結果をコピーしました',
    'result.copyFailed': 'コピーできませんでした。テキストを選択してコピーしてください',

    'key.plain': '平文',
    'key.cipher': '暗号文',
    'key.unusedNote': '薄い文字は暗号文に現れないため、対応が決まりません',

    'chart.unavailable': 'グラフを表示できません',
    'chart.restartBest': 'この回のベスト',
    'chart.current': '現在のスコア',
    'chart.xAxis': '試行回数（通算）',
    'chart.yAxis': 'スコア',

    'help.title': '❔ ヘルプ：Cipher Climbの使い方',
    'help.close': 'ヘルプを閉じる',
    'help.about.heading': '🔎 Cipher Climbについて',
    'help.about.body':
      'このツールは、単一換字式暗号を焼きなまし法やヒルクライミング法で解読する教育ツールです。',
    'help.input.heading': '📝 入力項目',
    'help.input.cipher.term': '暗号文の入力',
    'help.input.cipher.body':
      ': A〜Zの英字を含む暗号文を入力します。小文字は大文字として扱い、ほかの文字は残します。10,000文字までです。',
    'help.input.fixed.term': '固定鍵マッピング',
    'help.input.fixed.body': ': 特定の平文文字に対応する暗号文文字を固定する機能です。',
    'help.input.fixed.ex1': '例: ',
    'help.input.fixed.exCode': 'E → R',
    'help.input.fixed.ex2': ' とすれば「Eは必ずRに対応」',
    'help.input.fixed.noteTerm': '注意:',
    'help.input.fixed.noteBody':
      ' 複数の平文文字が同じ暗号文文字に割り当てられると、背景が赤くなります。',
    'help.input.fixed.warnTerm': 'その状態では解読が始まりません。',
    'help.input.fixed.warnBody': '「固定鍵に重複があります」と警告されます。',
    'help.algo.heading': '⚙️ アルゴリズム設定',
    'help.algo.annealing.term': '焼きなまし法',
    'help.algo.annealing.body':
      ': 解の探索にランダム性を持たせて局所最適を回避します（デフォルトON）',
    'help.algo.cooling.term': '冷却速度',
    'help.algo.cooling.body':
      ': 自動では最後の試行で温度が0.01になるように率を決めます。数値を選ぶと、その率を毎回掛けます。',
    'help.algo.escape.term': '局所最適脱出',
    'help.algo.escape.body': ': 不採択が500回続いたら温度を10に戻します。',
    'help.algo.tries':
      '試行回数は1〜20000、既定値は3000です。乱数で作った別の鍵から5回再始動し、いちばん良い結果を採用します。',
    'help.algo.seed': 'シードを指定すると同じ結果を再現できます。空欄なら実行ごとに種を生成します。',
    'help.algo.short': '短い暗号文（目安は英字100字未満）は一意に決まらないことがあります。',
    'help.score.heading': '📚 スコア構成',
    'help.score.letter.term': '文字頻度スコア',
    'help.score.letter.body': ': 1文字の対数尤度です。0に近いほど英語らしいと評価します。',
    'help.score.ngram.term': 'N-gramスコア',
    'help.score.ngram.body': ': 2文字と3文字の並びの対数尤度を加算します。',
    'help.score.dict.term': '辞書スコア',
    'help.score.dict.body':
      ': 3文字以上の語が1語一致するごとに、重み÷100を加えます。部分一致では接頭辞も評価します。',
    'help.score.toggle': '各スコアはチェックボックスでON/OFF可能',
    'help.score.weight': '辞書スコアには重みを設定できます（弱〜超重視）',
    'help.score.corpus':
      'N-gramの統計はパブリックドメインの英文学10作品（英字5,141,270字）から集計しています。サンプルの平文は含めていません。',
    'help.score.dicts':
      '辞書はGoogle 10000語（3文字以上の9,578語）と基本語343語から選べます。基本語の照合対象は320語です。',
    'help.viz.heading': '📈 可視化と結果',
    'help.viz.chart.term': 'スコアの推移',
    'help.viz.chart.body': ': 100回ごとに、この回のベストと現在のスコアを描きます。',
    'help.viz.key.term': '鍵の対応表',
    'help.viz.key.body': ': Plain → Cipher の表を出力',
    'help.viz.highlight.term': '単語ハイライト',
    'help.viz.highlight.body':
      ': 3文字以上で辞書に完全一致する単語を黄色で強調します。部分一致の設定には従いません。',
    'help.viz.copy.term': 'コピー機能',
    'help.viz.copy.body': ': 解読結果をワンクリックでコピー可能',
    'help.other.heading': '🔧 その他',
    'help.other.theme': '🌙 ダークモード対応',
    'help.other.language': '🌐 日本語・英語の切り替えに対応',
    'help.other.sample': '🔄 サンプル固定鍵の自動設定と「固定鍵をクリア」での解除',
    'help.sample.heading': '🔐 デフォルトの暗号文について',
    'help.sample.body1': 'アメリカ独立宣言の一節を以下の換字表（「平文文字→',
    'help.sample.bodyStrong': '暗号文',
    'help.sample.body2': '文字」の対応）で暗号化したものです。',
    'help.sample.plainLead': '元の平文は以下のとおりです。',

    'footer.before': '🔗 GitHubリポジトリーはこちら（',
    'footer.after': '）',
  };

  const en = {
    'app.title': 'Cipher Climb — Monoalphabetic Substitution Cipher Solver',
    'app.heading': '🧗 Cipher Climb',
    'app.intro1': 'This tool only breaks ',
    'app.introStrong': 'monoalphabetic substitution ciphers',
    'app.intro2': ' (Vigenere and other polyalphabetic ciphers are out of scope).',
    'app.langButton': '日本語',
    'app.langAria': 'Switch the interface to Japanese',
    'app.helpButton': '❔ Help',
    'theme.dark': '🌙 Dark mode',
    'theme.light': '☀️ Light mode',

    'input.heading': '🔐 Ciphertext input',
    'input.cipherLabel': 'Ciphertext (up to {max} characters)',

    'fixed.heading': '🔒 Fixed key mapping',
    'fixed.hint':
      'Pin the mappings you already know (plaintext letter on top, ciphertext letter below). Leave the rest as "?".',
    'fixed.sampleButton': '🔒 Load the sample fixed key',
    'fixed.clearButton': 'Clear the fixed key',
    'fixed.cellAria': 'Ciphertext letter for plaintext {plain}',
    'fixed.sampleNote':
      'The sample fixed key belongs to the sample ciphertext. If you changed the ciphertext, drop it with "Clear the fixed key".',
    'fixed.conflict': 'The fixed key conflicts: ciphertext letter {cipher} is assigned to {plains}.',
    'fixed.conflictJoin': ' and ',
    'text.messageJoin': ' / ',

    'algo.heading': '🧠 Search settings',
    'algo.useAnnealing': 'Use simulated annealing',
    'algo.coolingLabel': 'Annealing cooling rate:',
    'algo.cooling.auto': 'Auto (exponential)',
    'algo.cooling.fast': '0.995 (somewhat fast)',
    'algo.cooling.slow': '0.999 (somewhat slow)',
    'algo.cooling.slower': '0.9995 (very slow)',
    'algo.reheat': 'Reset the temperature after {count} rejections in a row (escape a local optimum)',

    'dict.heading': '📚 Word list',
    'dict.sourceLabel': 'Word list to use:',
    'dict.google10000': 'Google 10000 (9,578 words of 3+ letters)',
    'dict.basic343': 'Basic 343 words (small list)',

    'score.heading': '⚙️ Score components',
    'score.letter': 'Letter frequency',
    'score.ngram': 'N-gram',
    'score.dict': 'Word list match',
    'score.weightLabel': 'Word weight:',
    'score.weight30': '30 (light)',
    'score.weight50': '50',
    'score.weight100': '100 (balanced)',
    'score.weight150': '150',
    'score.weight200': '200 (dominant)',
    'score.partial': 'Also credit prefix matches',

    'run.triesLabel': 'Tries (1 to {max}):',
    'run.seedLabel': 'Random seed (blank for a new seed each run):',
    'run.start': 'Start',
    'run.stop': 'Stop',
    'run.error.noLetters': 'Enter a ciphertext that contains the letters A to Z.',
    'run.error.tooLong':
      'The ciphertext is too long ({length} characters). Keep it within {max} characters.',
    'run.error.tries': 'Enter the number of tries as an integer from 1 to {max}.',
    'run.error.seed': 'Enter the seed as an integer from 0 to {max}, or leave it blank.',
    'run.error.scoring': 'Select at least one score component.',
    'run.error.runtime': 'The search failed. Check the settings and run it again.',
    'run.warn.short':
      'The ciphertext is short ({letters} letters), so it may not solve correctly. Aim for {minimum} letters or more.',
    'run.warn.fullwidth':
      '{count} full-width letters are not converted. Replace them with half-width letters.',
    'run.announce.start': 'The search has started.',
    'run.announce.error': 'The search failed.',
    'run.meta.seed': 'Seed: {seed}',

    'progress.heading': '⏳ Progress',
    'progress.aria': 'Search progress',

    'status.placeholder': '(status appears here)',
    'status.method.annealing': '🔥 Simulated annealing',
    'status.method.climbing': '⛰️ Hill climbing',
    'status.temperature': ' | temperature {value}',
    'status.progressLine':
      '{method} {restart}/{restarts} | try {iteration}/{maxTries}{temperature}',
    'status.scoreLine':
      'Current score: {current} | Best of this restart: {restartBest} | Overall best: {best}',
    'status.keyLine': 'Key: {key}',
    'status.done': '✅ Finished (reheats: {reheats})',
    'status.doneNoSearch':
      '✅ Finished. The fixed key alone determined the whole key, so no search was needed.',
    'status.doneLine': 'Overall best: {best} | Total tries: {tries}',
    'status.stopped': '⏹ Stopped',

    'result.heading': '📋 Result',
    'result.statusHeading': '🔄 Live search status',
    'result.chartHeading': '📈 Score history',
    'result.chartAria': 'Chart of the score history',
    'result.scoreHeading': '📊 Score',
    'result.keyHeading': '🔑 Key table',
    'result.textHeading': '📝 Decrypted text',
    'result.copyButton': 'Copy',
    'result.scoreEmpty': 'Score: -',
    'result.scoreComputing': 'Score: (computing)',
    'result.score': 'Score: {value}',
    'result.keyComputing': '(computing the key...)',
    'result.decrypting': 'Solving...',
    'result.breakdown':
      'Breakdown: letter frequency {letter}{letterOff} / n-gram {ngram}{ngramOff} / word list +{dict}{dictOff}',
    'result.off': ' (off)',
    'result.highlightCount': '🔍 {count} English words highlighted',
    'result.copied': 'Copied the decrypted text.',
    'result.copyFailed': 'Could not copy. Select the text and copy it yourself.',

    'key.plain': 'Plain',
    'key.cipher': 'Cipher',
    'key.unusedNote': 'Faded letters never appear in the ciphertext, so their mapping is undecided.',

    'chart.unavailable': 'The chart cannot be drawn.',
    'chart.restartBest': 'Best of this restart',
    'chart.current': 'Current score',
    'chart.xAxis': 'Tries (cumulative)',
    'chart.yAxis': 'Score',

    'help.title': '❔ Help: how to use Cipher Climb',
    'help.close': 'Close the help',
    'help.about.heading': '🔎 About Cipher Climb',
    'help.about.body':
      'This is a teaching tool that breaks monoalphabetic substitution ciphers with simulated annealing or hill climbing.',
    'help.input.heading': '📝 Input fields',
    'help.input.cipher.term': 'Ciphertext input',
    'help.input.cipher.body':
      ': Enter a ciphertext that contains the letters A to Z. Lowercase counts as uppercase, '
      + 'other characters are kept, and the limit is 10,000 characters.',
    'help.input.fixed.term': 'Fixed key mapping',
    'help.input.fixed.body': ': Pins the ciphertext letter for a given plaintext letter.',
    'help.input.fixed.ex1': 'For example, ',
    'help.input.fixed.exCode': 'E → R',
    'help.input.fixed.ex2': ' forces E to map to R.',
    'help.input.fixed.noteTerm': 'Note:',
    'help.input.fixed.noteBody':
      ' If two plaintext letters claim the same ciphertext letter, the background turns red.',
    'help.input.fixed.warnTerm': 'The search will not start in that state.',
    'help.input.fixed.warnBody': ' It warns that the fixed key conflicts.',
    'help.algo.heading': '⚙️ Search settings',
    'help.algo.annealing.term': 'Simulated annealing',
    'help.algo.annealing.body':
      ': Adds randomness to the search so it escapes local optima (on by default).',
    'help.algo.cooling.term': 'Cooling rate',
    'help.algo.cooling.body':
      ': Auto picks a rate so the temperature reaches 0.01 on the last try. A fixed number is applied every try.',
    'help.algo.escape.term': 'Escaping a local optimum',
    'help.algo.escape.body': ': After 500 rejections in a row the temperature returns to 10.',
    'help.algo.tries':
      'Tries range from 1 to 20000 and default to 3000. The search restarts 5 times from different random keys and keeps the best result.',
    'help.algo.seed':
      'A seed reproduces the same result. Leave it blank to draw a new seed on every run.',
    'help.algo.short':
      'A short ciphertext (roughly under 100 letters) may not have a unique solution.',
    'help.score.heading': '📚 Score components',
    'help.score.letter.term': 'Letter frequency score',
    'help.score.letter.body':
      ': The log likelihood of single letters. The closer to 0, the more English-like.',
    'help.score.ngram.term': 'N-gram score',
    'help.score.ngram.body': ': Adds the log likelihood of 2-letter and 3-letter sequences.',
    'help.score.dict.term': 'Word list score',
    'help.score.dict.body':
      ': Adds weight / 100 for every matching word of 3 or more letters. Prefix matching also credits prefixes.',
    'help.score.toggle': 'Each component can be turned on or off with a checkbox.',
    'help.score.weight': 'The word list score takes a weight, from light to dominant.',
    'help.score.corpus':
      'The n-gram statistics come from 10 public-domain works of English literature (5,141,270 letters). The sample plaintext is not part of them.',
    'help.score.dicts':
      'Pick either Google 10000 (9,578 words of 3+ letters) or the basic 343 words. The basic list matches 320 words.',
    'help.viz.heading': '📈 Visualization and results',
    'help.viz.chart.term': 'Score history',
    'help.viz.chart.body':
      ': Every 100 tries it plots the best of this restart and the current score.',
    'help.viz.key.term': 'Key table',
    'help.viz.key.body': ': Prints the Plain to Cipher table.',
    'help.viz.highlight.term': 'Word highlighting',
    'help.viz.highlight.body':
      ': Words of 3 or more letters that match the word list exactly turn yellow. Prefix matching is ignored here.',
    'help.viz.copy.term': 'Copying',
    'help.viz.copy.body': ': Copies the decrypted text in one click.',
    'help.other.heading': '🔧 Other',
    'help.other.theme': '🌙 Dark mode',
    'help.other.language': '🌐 Japanese and English interface',
    'help.other.sample': '🔄 Loading the sample fixed key and clearing it again',
    'help.sample.heading': '🔐 About the default ciphertext',
    'help.sample.body1':
      'It is a passage from the United States Declaration of Independence, encrypted with the table below (plaintext letter to ',
    'help.sample.bodyStrong': 'ciphertext',
    'help.sample.body2': ' letter).',
    'help.sample.plainLead': 'The original plaintext is as follows.',

    'footer.before': '🔗 The GitHub repository is here (',
    'footer.after': ')',
  };

  let language = 'ja';
  const STORAGE_KEY = 'cipherclimb-language';

  function t(key, values = {}) {
    const dict = language === 'en' ? en : ja;
    const message = dict[key];
    if (typeof message !== 'string') throw new Error('Unknown message: ' + key);
    return message.replace(/\{(\w+)\}/g, (whole, name) =>
      (Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole));
  }

  function apply(root = document) {
    document.documentElement.lang = language;
    document.title = t('app.title');
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
      for (const el of root.querySelectorAll('[data-i18n-' + attr + ']')) {
        el.setAttribute(attr, t(el.getAttribute('data-i18n-' + attr)));
      }
    }
  }

  function setLanguage(value) {
    if (value !== 'ja' && value !== 'en') return;
    language = value;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // 保存できない環境では記憶しないだけで、表示は切り替える。
    }
    apply();
    document.dispatchEvent(new Event('languagechange'));
  }

  function init() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // 保存領域が使えない場合は既定に従う。
    }
    const query = new URLSearchParams(location.search).get('lang');
    const preferred = [query, saved].find((value) => value === 'ja' || value === 'en');
    language = preferred || (/^ja\b/i.test(navigator.language || '') ? 'ja' : 'en');
    apply();
  }

  return { ja, en, t, apply, init, setLanguage, get language() { return language; } };
})();

if (typeof window !== 'undefined') window.I18n = I18n;
if (typeof module !== 'undefined' && module.exports) module.exports = I18n;
