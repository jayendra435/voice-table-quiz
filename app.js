// Hands-free math self-check quiz using browser speech synthesis
(() => {
  const $ = id => document.getElementById(id);
  const startBtn = $('start');
  const stopBtn = $('stop');
  const qEl = $('question');
  let synth = window.speechSynthesis;

  const MODE_LABELS = {
    multiplication: 'Tables',
    squares: 'Squares',
    cubes: 'Cubes',
    squareRoots: 'Square roots',
    cubeRoots: 'Cube roots',
    fractionToPercent: 'Fraction → Percentage',
    percentToFraction: 'Percentage → Fraction',
    fractionToDecimal: 'Fraction → Decimal',
    decimalToFraction: 'Decimal → Fraction'
  };

  const MODE_SETTINGS = {
    multiplication: [
      ['minTable', 'Min table', 1, 30], ['maxTable', 'Max table', 30, 30],
      ['minMultiplier', 'Min multiplier', 1, 30], ['maxMultiplier', 'Max multiplier', 30, 30]
    ],
    squares: [['minTable', 'Min square', 1, 50], ['maxTable', 'Max square', 50, 50]],
    cubes: [['minTable', 'Min cube', 1, 30], ['maxTable', 'Max cube', 30, 30]],
    squareRoots: [['minTable', 'Min square', 1, 50], ['maxTable', 'Max square', 50, 50]],
    cubeRoots: [['minTable', 'Min cube', 1, 30], ['maxTable', 'Max cube', 30, 30]],
    fractionToPercent: [], percentToFraction: [], fractionToDecimal: [], decimalToFraction: []
  };

  function getSelectedMode(){
    return $('practiceMode') ? $('practiceMode').value : 'multiplication';
  }

  function updateModeControls(){
    const mode = getSelectedMode();
    const settings = MODE_SETTINGS[mode] || [];
    const settingMap = new Map(settings.map(item => [item[0], item]));
    document.querySelectorAll('.mode-setting').forEach(el => {
      const setting = settingMap.get(el.dataset.setting);
      el.style.display = setting ? 'flex' : 'none';
      if(setting){
        el.querySelector('label').textContent = setting[1] + ':';
        const input = el.querySelector('input');
        input.max = setting[3];
        if(!input.value || Number(input.value) > setting[3] || Number(input.value) < 1) input.value = setting[2];
      }
    });
  }


  function speak(text, onend){
    if(!synth){
      console.log('TTS not available', text);
      if(onend) onend();
      return;
    }
    const u = new SpeechSynthesisUtterance(speechText(text));
    u.rate = 0.9;
    if(onend) u.onend = onend;
    synth.speak(u);
  }

  function speechText(text){
    return String(text).replace(/(\d+)\s*\/\s*(\d+)/g, '$1 by $2');
  }

  function randomInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

  function updateUI(){
    const pct = Number.isFinite(state.count) && state.count > 0 ? Math.round((state.asked / state.count) * 100) : 0;
    $('progressFill').style.width = pct + '%';
    $('progressText').textContent = Number.isFinite(state.count) ? `${state.asked}/${state.count}` : `${state.asked}/∞`;
  }

  function getSelectedCategories(){
    const mode = getSelectedMode();
    return [mode || 'multiplication'];
  }

  function parseQuestionCount(){
    const text = $('count').value.trim().toLowerCase();
    return text === '' || text === 'infinity' || text === 'inf' ? Infinity : Math.max(1, parseInt(text, 10) || 10);
  }

  function buildQuestion(type, key){
    const q = {};
    const squarePool = Array.from({ length: 50 }, (_, i) => (i + 1) * (i + 1));
    const cubePool = Array.from({ length: 30 }, (_, i) => (i + 1) * (i + 1) * (i + 1));
    const fractionPercentPairs = [
      { text: '1/2', answer: '50' }, { text: '1/4', answer: '25' }, { text: '3/4', answer: '75' },
      { text: '1/5', answer: '20' }, { text: '2/5', answer: '40' }, { text: '3/5', answer: '60' },
      { text: '4/5', answer: '80' }, { text: '1/10', answer: '10' }, { text: '3/10', answer: '30' },
      { text: '7/10', answer: '70' }, { text: '9/10', answer: '90' }
    ];
    const percentFractionPairs = [
      { text: '25%', answer: '1/4' }, { text: '50%', answer: '1/2' }, { text: '75%', answer: '3/4' },
      { text: '20%', answer: '1/5' }, { text: '40%', answer: '2/5' }, { text: '60%', answer: '3/5' },
      { text: '80%', answer: '4/5' }, { text: '10%', answer: '1/10' }, { text: '30%', answer: '3/10' },
      { text: '70%', answer: '7/10' }, { text: '90%', answer: '9/10' }
    ];
    const fractionDecimalPairs = [
      { text: '1/2', answer: '0.5' }, { text: '1/4', answer: '0.25' }, { text: '3/4', answer: '0.75' },
      { text: '1/5', answer: '0.2' }, { text: '2/5', answer: '0.4' }, { text: '3/5', answer: '0.6' },
      { text: '4/5', answer: '0.8' }, { text: '1/8', answer: '0.125' }, { text: '3/8', answer: '0.375' },
      { text: '5/8', answer: '0.625' }, { text: '7/8', answer: '0.875' }
    ];
    const decimalFractionPairs = [
      { text: '0.5', answer: '1/2' }, { text: '0.25', answer: '1/4' }, { text: '0.75', answer: '3/4' },
      { text: '0.2', answer: '1/5' }, { text: '0.4', answer: '2/5' }, { text: '0.6', answer: '3/5' },
      { text: '0.8', answer: '4/5' }, { text: '0.125', answer: '1/8' }, { text: '0.375', answer: '3/8' },
      { text: '0.625', answer: '5/8' }, { text: '0.875', answer: '7/8' }
    ];

    switch(type){
      case 'multiplication': {
        const minTable = Math.max(1, Number(state.minTable) || 1);
        const maxTable = Math.max(minTable, Number(state.maxTable) || 12);
        const minMultiplier = Math.max(1, Number(state.minMultiplier) || 1);
        const maxMultiplier = Math.max(minMultiplier, Number(state.maxMultiplier) || 12);
        const a = key ? key.a : randomInt(minTable, maxTable);
        const b = key ? key.b : randomInt(minMultiplier, maxMultiplier);
        q.type = 'multiplication';
        q.prompt = `What is ${a} × ${b}?`;
        q.answer = String(a * b);
        return q;
      }
      case 'squares': {
        const n = key ? key.n : randomInt(state.minRange || 1, state.maxRange || 50);
        q.type = 'squares';
        q.prompt = `What is ${n}²?`;
        q.answer = String(n * n);
        return q;
      }
      case 'cubes': {
        const n = key ? key.n : randomInt(state.minRange || 1, state.maxRange || 30);
        q.type = 'cubes';
        q.prompt = `What is ${n}³?`;
        q.answer = String(n * n * n);
        return q;
      }
      case 'squareRoots': {
        const root = key ? key.root : randomInt(state.minRange || 1, state.maxRange || 50);
        const n = root * root;
        q.type = 'squareRoots';
        q.prompt = `What is √${n}?`;
        q.answer = String(Math.sqrt(n));
        return q;
      }
      case 'cubeRoots': {
        const root = key ? key.root : randomInt(state.minRange || 1, state.maxRange || 30);
        const n = root * root * root;
        q.type = 'cubeRoots';
        q.prompt = `What is ∛${n}?`;
        q.answer = String(Math.cbrt(n));
        return q;
      }
      case 'fractionToPercent': {
        const pair = fractionPercentPairs[key ? key.index : randomInt(0, fractionPercentPairs.length - 1)];
        q.type = 'fractionToPercent';
        q.prompt = `What is ${pair.text} as a percentage?`;
        q.answer = pair.answer;
        return q;
      }
      case 'percentToFraction': {
        const pair = percentFractionPairs[key ? key.index : randomInt(0, percentFractionPairs.length - 1)];
        q.type = 'percentToFraction';
        q.prompt = `What is ${pair.text} as a fraction in simplest form?`;
        q.answer = pair.answer;
        return q;
      }
      case 'fractionToDecimal': {
        const pair = fractionDecimalPairs[key ? key.index : randomInt(0, fractionDecimalPairs.length - 1)];
        q.type = 'fractionToDecimal';
        q.prompt = `What is ${pair.text} as a decimal?`;
        q.answer = pair.answer;
        return q;
      }
      case 'decimalToFraction': {
        const pair = decimalFractionPairs[key ? key.index : randomInt(0, decimalFractionPairs.length - 1)];
        q.type = 'decimalToFraction';
        q.prompt = `What is ${pair.text} as a fraction in simplest form?`;
        q.answer = pair.answer;
        return q;
      }
      default:
        return buildQuestion('multiplication');
    }
  }

  let state = { running: false, count: Infinity, asked: 0, current: null, waitSeconds: 5, timer: null, selected: ['multiplication'] };

  function shuffle(items){
    for(let index = items.length - 1; index > 0; index -= 1){
      const swapIndex = randomInt(0, index);
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function getPoolSignature(){
    const mode = getSelectedMode();
    const values = [mode, $('minTable').value, $('maxTable').value, $('minMultiplier').value, $('maxMultiplier').value];
    return values.join('|');
  }

  function createQuestionPool(){
    const mode = getSelectedMode();
    const pool = [];

    if(mode === 'multiplication'){
      for(let a = state.minTable; a <= state.maxTable; a += 1){
        for(let b = state.minMultiplier; b <= state.maxMultiplier; b += 1){
          pool.push({a, b});
        }
      }
    } else if(mode === 'squares' || mode === 'cubes'){
      for(let n = state.minRange; n <= state.maxRange; n += 1) pool.push({n});
    } else if(mode === 'squareRoots' || mode === 'cubeRoots'){
      for(let root = state.minRange; root <= state.maxRange; root += 1) pool.push({root});
    } else {
      const pairCount = 11;
      for(let index = 0; index < pairCount; index += 1) pool.push({index});
    }

    return shuffle(pool);
  }

  function resetQuestionPool(){
    state.pool = [];
    state.poolSignature = getPoolSignature();
  }

  function prepareQuestionSettings(){
    state.minTable = parseInt($('minTable').value, 10) || 1;
    state.maxTable = Math.max(state.minTable, parseInt($('maxTable').value, 10) || 30);
    state.minMultiplier = parseInt($('minMultiplier').value, 10) || 1;
    state.maxMultiplier = Math.max(state.minMultiplier, parseInt($('maxMultiplier').value, 10) || 30);
    state.minRange = state.minTable;
    state.maxRange = Math.max(state.minRange, state.maxTable);
  }

  function takeNextQuestionKey(){
    const signature = getPoolSignature();
    if(state.poolSignature !== signature || !state.pool || state.pool.length === 0){
      state.poolSignature = signature;
      state.pool = createQuestionPool();
    }
    return state.pool.pop();
  }

  function nextQuestion(){
    if(Number.isFinite(state.count) && state.asked >= state.count){
      stopQuiz();
      qEl.textContent = `Done — ${state.count} questions completed`;
      $('countdownText').textContent = 'Session complete';
      $('answerText').textContent = '';
      return;
    }

    const type = getSelectedMode();
    const questionKey = takeNextQuestionKey();
    state.current = buildQuestion(type, questionKey);
    state.current.type = state.current.type || type;
    state.asked += 1;
    const countLabel = Number.isFinite(state.count) ? state.count : '∞';
    qEl.textContent = `Question ${state.asked}/${countLabel}: ${state.current.prompt}`;
    $('answerText').textContent = '';
    updateUI();
    speak(`Question ${state.asked}. ${state.current.prompt}`, revealAnswerAfterDelay);
  }

  function revealAnswerAfterDelay(){
    clearInterval(state.timer);
    let remaining = state.waitSeconds;
    $('countdownText').textContent = `Answer reveal in ${remaining} seconds`;
    state.timer = setInterval(() => {
      remaining -= 1;
      if(remaining > 0){
        $('countdownText').textContent = `Answer reveal in ${remaining} seconds`;
        return;
      }
      clearInterval(state.timer);
      if(!state.running || !state.current) return;
      $('countdownText').textContent = 'Answer';
      $('answerText').textContent = state.current.answer;
      speak(`The answer is ${state.current.answer}`);
      state.current = null;
      state.timer = setTimeout(nextQuestion, 1500);
    }, 1000);
  }

  function startQuiz(){
    state.count = parseQuestionCount();
    state.waitSeconds = Math.max(1, parseInt($('waitSeconds').value, 10) || 5);
    prepareQuestionSettings();
    state.selected = getSelectedCategories();
    updateModeControls();
    resetQuestionPool();
    state.asked = 0; state.running = true;
    startBtn.disabled = true; stopBtn.disabled = false;
    updateUI();
    nextQuestion();
  }

  function stopQuiz(){
    state.running = false;
    clearInterval(state.timer);
    clearTimeout(state.timer);
    state.current = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    $('countdownText').textContent = 'Stopped';
    $('answerText').textContent = '';
  }

  $('practiceMode').addEventListener('change', updateModeControls);
  $('practiceMode').addEventListener('change', () => {
    prepareQuestionSettings();
    resetQuestionPool();
    if(state.running){
      clearInterval(state.timer);
      clearTimeout(state.timer);
      if(synth) synth.cancel();
      state.current = null;
      nextQuestion();
    }
  });
  document.querySelectorAll('.mode-setting input').forEach(input => {
    input.addEventListener('change', () => {
      prepareQuestionSettings();
      resetQuestionPool();
      if(state.running){
        clearInterval(state.timer);
        clearTimeout(state.timer);
        if(synth) synth.cancel();
        state.current = null;
        nextQuestion();
      }
    });
  });
  $('count').addEventListener('input', () => {
    if(state.running) state.count = parseQuestionCount();
    updateUI();
  });

  startBtn.addEventListener('click', startQuiz);
  stopBtn.addEventListener('click', stopQuiz);

  updateModeControls();
})();
