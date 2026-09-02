// Voice-enabled math quiz using Web Speech API (browser)
(() => {
  const $ = id => document.getElementById(id);
  const startBtn = $('start');
  const stopBtn = $('stop');
  const qEl = $('question');
  const logEl = $('log');
  const submitTyped = $('submitTyped');
  const typedInput = $('typedAnswer');

  let recognition = null;
  let synth = window.speechSynthesis;
  const STATS_KEY = 'quiz_stats_v0.2';
  const REVISION_KEY = 'quiz_revision_v0.2';

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

  function getSelectedMode(){
    return $('practiceMode') ? $('practiceMode').value : 'multiplication';
  }

  function updateModeControls(){
    const mode = getSelectedMode();
    const isTableMode = mode === 'multiplication';
    document.querySelectorAll('.table-settings').forEach(el => {
      el.style.display = isTableMode ? 'flex' : 'none';
    });
  }

  function loadStats(){
    try{ const s = localStorage.getItem(STATS_KEY); return s ? JSON.parse(s) : {attempted:0,correct:0,wrong:0,accuracy:0,streak:0,bestStreak:0,totalResponseMs:0,responses:0,lastPlayed:null}; }catch(e){return {attempted:0,correct:0,wrong:0,accuracy:0,streak:0,bestStreak:0,totalResponseMs:0,responses:0,lastPlayed:null}; }
  }
  function saveStats(st){ localStorage.setItem(STATS_KEY, JSON.stringify(st)); }
  function resetStats(){ localStorage.removeItem(STATS_KEY); }

  function updateStatsOnResult(ok, responseMs){
    const s = loadStats();
    s.attempted = (s.attempted||0) + 1;
    if(ok){ s.correct = (s.correct||0) + 1; s.streak = (s.streak||0) + 1; s.bestStreak = Math.max(s.bestStreak||0, s.streak); }
    else { s.wrong = (s.wrong||0) + 1; s.streak = 0; }
    s.responses = (s.responses||0) + (responseMs ? 1 : 0);
    s.totalResponseMs = (s.totalResponseMs||0) + (responseMs||0);
    s.accuracy = s.attempted ? Math.round((s.correct||0) / s.attempted * 100) : 0;
    s.lastPlayed = new Date().toISOString();
    saveStats(s);
    renderStats();
  }

  function getAvgResponseMs(){ const s = loadStats(); return s.responses ? Math.round((s.totalResponseMs||0)/s.responses) : 0; }

  function loadRevision(){ try{ const r = localStorage.getItem(REVISION_KEY); return r ? JSON.parse(r) : []; }catch(e){ return []; } }
  function saveRevision(arr){ localStorage.setItem(REVISION_KEY, JSON.stringify(arr)); }
  function addRevision(item){ const q = loadRevision(); if(!q.find(x=>x.question===item.question)) q.push(Object.assign({fails:0}, item)); saveRevision(q); }
  function recordRevisionCorrect(questionText){ const q = loadRevision(); const idx = q.findIndex(x=>x.question===questionText); if(idx===-1) return; q[idx].fails = (q[idx].fails||0) + 1; if(q[idx].fails >= 2) { q.splice(idx,1); } saveRevision(q); }

  function renderStats(){
    const s = loadStats();
    $('statAccuracy').textContent = (s.accuracy||0) + '%';
    $('statBestStreak').textContent = s.bestStreak||0;
    $('statSolved').textContent = s.attempted||0;
    $('statAvgTime').textContent = (getAvgResponseMs()||'--') + ' ms';
    $('statRevisionSize').textContent = loadRevision().length;
    $('statLastPlayed').textContent = s.lastPlayed ? new Date(s.lastPlayed).toLocaleString() : '--';
  }

  function speak(text, onend){
    if(!synth){
      console.log('TTS not available', text);
      if(onend) onend();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    if(onend) u.onend = onend;
    synth.speak(u);
  }

  function playBeep(duration = 150, freq = 800, vol = 0.2){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(()=>{ o.stop(); ctx.close(); }, duration);
    }catch(e){ console.warn('Beep failed', e); }
  }

  function randomInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

  function gcd(a, b){
    a = Math.abs(a); b = Math.abs(b);
    while(b){ const t = a % b; a = b; b = t; }
    return a || 1;
  }

  function reduceFraction(n, d){
    if(d === 0) return {n: 0, d: 1};
    const g = gcd(n, d);
    return {n: n / g, d: d / g};
  }

  function parseRational(value){
    const t = String(value || '').trim().toLowerCase();
    if(!t) return null;
    const cleaned = t
      .replace(/^(answer|is|equals|the|it|=)\s*/g, '')
      .replace(/%/g, ' percent ')
      .replace(/\bpercent\b/g, ' percent ')
      .replace(/\bminus\b/g, '-')
      .replace(/\bpoint\b/g, '.')
      .replace(/\bslash\b/g, '/')
      .replace(/[.,!?]/g, ' ')
      .replace(/[^0-9a-z\s\/%.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if(!cleaned) return null;

    if(cleaned.includes('/')){
      const parts = cleaned.split('/').map(p=>p.trim());
      if(parts.length === 2){
        const num = Number(parts[0].replace(/[^0-9.-]/g, ''));
        const den = Number(parts[1].replace(/[^0-9.-]/g, ''));
        if(Number.isFinite(num) && Number.isFinite(den) && den !== 0){
          return reduceFraction(num, den);
        }
      }
    }

    const percentMatch = cleaned.match(/(-?\d+(?:\.\d+)?)\s+percent/);
    if(percentMatch){
      return reduceFraction(Number(percentMatch[1]), 100);
    }

    const dec = Number(cleaned.replace(/[^0-9.-]/g, ''));
    if(Number.isFinite(dec)){
      const text = cleaned.replace(/[^0-9.-]/g, '');
      const decimals = text.includes('.') ? text.split('.')[1].length : 0;
      if(decimals > 0){
        return reduceFraction(Math.round(dec * (10 ** decimals)), 10 ** decimals);
      }
      return reduceFraction(dec, 1);
    }

    const wordsNum = wordsToNum(cleaned);
    if(Number.isFinite(wordsNum)) return reduceFraction(wordsNum, 1);
    return null;
  }

  function wordsToNum(text){
    if(!text) return null;
    const t = text.toLowerCase().trim();
    if(/^-?\d+$/.test(t)) return parseInt(t, 10);
    const map = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
    let total = 0; let cur = 0;
    const parts = t.replace(/-/g, ' ').split(/\s+/);
    parts.forEach(tok => {
      if(tok === 'hundred'){ cur = Math.max(1, cur) * 100; }
      else if(tok === 'thousand'){ total += cur * 1000; cur = 0; }
      else if(map[tok] !== undefined){ cur += map[tok]; }
      else if(!Number.isNaN(Number(tok))){ cur += Number(tok); }
    });
    return total + cur;
  }

  function normalizeAnswer(raw){
    if(raw === null || raw === undefined) return null;
    const t = String(raw).toLowerCase().trim();
    if(!t) return null;
    const stripped = t.replace(/\b(answer|is|equals|the|it|=)\b/g, '').replace(/[.,!?]/g, ' ');
    const parsed = parseRational(stripped);
    if(parsed){ return { kind: 'rational', ...parsed }; }
    return { kind: 'text', value: stripped.replace(/\s+/g, ' ') };
  }

  function areFractionsEquivalent(a, b){
    const ra = parseRational(a);
    const rb = parseRational(b);
    if(!ra || !rb) return false;
    return ra.n * rb.d === rb.n * ra.d;
  }

  function isAnswerCorrect(candidate, current){
    if(!current) return false;
    const value = normalizeAnswer(candidate);
    const expected = normalizeAnswer(current.answer);

    if(!value || !expected) return false;

    switch(current.type){
      case 'multiplication':
      case 'squares':
      case 'cubes':
      case 'squareRoots':
      case 'cubeRoots':
        return Math.abs(Number(candidate) - Number(current.answer)) < 0.001 ||
               (parseRational(candidate) && parseRational(current.answer) && areFractionsEquivalent(candidate, current.answer));

      case 'fractionToPercent':
        return Math.abs(Number(candidate) - Number(current.answer)) < 0.01 ||
               Math.abs(parseRational(candidate).n / parseRational(candidate).d * 100 - Number(current.answer)) < 0.01;

      case 'percentToFraction':
        return areFractionsEquivalent(candidate, current.answer);

      case 'fractionToDecimal':
        return Math.abs(Number(candidate) - Number(current.answer)) < 0.01 ||
               areFractionsEquivalent(candidate, current.answer);

      case 'decimalToFraction':
        return areFractionsEquivalent(candidate, current.answer);

      default:
        return String(candidate).trim().toLowerCase() === String(current.answer).trim().toLowerCase();
    }
  }

  function log(msg){
    const p = document.createElement('div');
    p.className = 'log-entry';
    p.textContent = msg;
    logEl.prepend(p);
    const entries = logEl.querySelectorAll('.log-entry');
    if(entries.length > 15) entries[entries.length-1].remove();
  }

  function updateUI(){
    const s = loadStats();
    const pct = state.count > 0 ? Math.round((state.asked / state.count) * 100) : 0;
    $('progressFill').style.width = pct + '%';
    $('progressText').textContent = `${state.asked}/${state.count}`;
    $('scoreDisplay').textContent = state.correct;
    $('streakDisplay').textContent = s.streak || 0;
    $('accuracyDisplay').textContent = (s.accuracy || 0) + '%';
  }

  function getSelectedCategories(){
    const mode = getSelectedMode();
    return [mode || 'multiplication'];
  }

  function buildQuestion(type){
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
        const a = randomInt(minTable, maxTable);
        const b = randomInt(minMultiplier, maxMultiplier);
        q.type = 'multiplication';
        q.prompt = `What is ${a} × ${b}?`;
        q.answer = String(a * b);
        return q;
      }
      case 'squares': {
        const n = randomInt(1, 50);
        q.type = 'squares';
        q.prompt = `What is ${n}²?`;
        q.answer = String(n * n);
        return q;
      }
      case 'cubes': {
        const n = randomInt(1, 30);
        q.type = 'cubes';
        q.prompt = `What is ${n}³?`;
        q.answer = String(n * n * n);
        return q;
      }
      case 'squareRoots': {
        const n = squarePool[randomInt(0, squarePool.length - 1)];
        q.type = 'squareRoots';
        q.prompt = `What is √${n}?`;
        q.answer = String(Math.sqrt(n));
        return q;
      }
      case 'cubeRoots': {
        const n = cubePool[randomInt(0, cubePool.length - 1)];
        q.type = 'cubeRoots';
        q.prompt = `What is ∛${n}?`;
        q.answer = String(Math.cbrt(n));
        return q;
      }
      case 'fractionToPercent': {
        const pair = fractionPercentPairs[randomInt(0, fractionPercentPairs.length - 1)];
        q.type = 'fractionToPercent';
        q.prompt = `What is ${pair.text} as a percentage?`;
        q.answer = pair.answer;
        return q;
      }
      case 'percentToFraction': {
        const pair = percentFractionPairs[randomInt(0, percentFractionPairs.length - 1)];
        q.type = 'percentToFraction';
        q.prompt = `What is ${pair.text} as a fraction in simplest form?`;
        q.answer = pair.answer;
        return q;
      }
      case 'fractionToDecimal': {
        const pair = fractionDecimalPairs[randomInt(0, fractionDecimalPairs.length - 1)];
        q.type = 'fractionToDecimal';
        q.prompt = `What is ${pair.text} as a decimal?`;
        q.answer = pair.answer;
        return q;
      }
      case 'decimalToFraction': {
        const pair = decimalFractionPairs[randomInt(0, decimalFractionPairs.length - 1)];
        q.type = 'decimalToFraction';
        q.prompt = `What is ${pair.text} as a fraction in simplest form?`;
        q.answer = pair.answer;
        return q;
      }
      default:
        return buildQuestion('multiplication');
    }
  }

  let state = { running: false, count: 10, asked: 0, correct: 0, current: null, commute: false, waiting: false, maxTable: 12, maxMultiplier: 12, selected: ['multiplication'] };

  function nextQuestion(){
    if(state.asked >= state.count){
      speak(`Quiz complete. You got ${state.correct} out of ${state.count} correct.`);
      qEl.textContent = `Done — ${state.correct}/${state.count} correct`;
      stopQuiz();
      return;
    }

    const revisionQ = loadRevision();
    state._responseStart = null;
    state._responseFinish = null;

    if(revisionQ.length > 0 && state.asked > 0 && state.asked % 5 === 0){
      const item = revisionQ[0];
      state.current = { type: 'revision', questionText: item.question, answer: item.answer, isRevision: true };
      state.asked += 1;
      qEl.textContent = `Revision ${state.asked}/${state.count}: ${item.question}`;
      if(state.commute){
        speak(item.question);
        state.waiting = false;
        setTimeout(()=>{ playBeep(); state.waiting = true; state._responseStart = performance.now(); log('Beep! Listening now.'); }, 5000);
      } else {
        state.waiting = false;
        speak(item.question, () => {
          if(state.running && state.current){
            state.waiting = true;
            state._responseStart = performance.now();
            $('listeningStatus').style.display = 'inline';
          }
        });
      }
      return;
    }

    const selected = getSelectedCategories();
    const type = selected[Math.floor(Math.random() * selected.length)];
    state.current = buildQuestion(type);
    state.current.type = state.current.type || type;
    state.asked += 1;
    qEl.textContent = `Question ${state.asked}/${state.count}: ${state.current.prompt}`;

    if(state.commute){
      state.waiting = false;
      setTimeout(()=>{ playBeep(); state.waiting = true; state._responseStart = performance.now(); log('Beep! Listening now.'); }, 5000);
    } else {
      state.waiting = false;
      speak(`Question ${state.asked}. ${state.current.prompt}`, () => {
        if(state.running && state.current){
          state.waiting = true;
          state._responseStart = performance.now();
          $('listeningStatus').style.display = 'inline';
        }
      });
    }

    if(!state.commute && state.waiting){
      $('listeningStatus').style.display = 'inline';
    }
    updateUI();
    if(recognition){
      log('Listening for answer...');
    }
  }

  function startQuiz(){
    state.count = parseInt($('count').value, 10) || 10;
    state.minTable = parseInt($('minTable').value, 10) || 1;
    state.maxTable = parseInt($('maxTable').value, 10) || 12;
    state.minMultiplier = parseInt($('minMultiplier').value, 10) || 1;
    state.maxMultiplier = parseInt($('maxMultiplier').value, 10) || 12;
    state.selected = getSelectedCategories();
    updateModeControls();
    state.asked = 0; state.correct = 0; state.running = true;
    startBtn.disabled = true; stopBtn.disabled = false;
    renderStats();
    startRecognition();
    state.commute = $('commuteToggle').checked;
    if(state.commute){ $('commuteBadge').style.display = 'inline-block'; } else { $('commuteBadge').style.display = 'none'; }
    updateUI();
    nextQuestion();
  }

  function stopQuiz(){
    state.running = false; startBtn.disabled = false; stopBtn.disabled = true;
    if(recognition){
      state.recognitionShouldRun = false;
      clearTimeout(state.recognitionRestartTimer);
      try{ recognition.stop(); log('Recognition stopped'); }catch(e){}
    }
  }

  function handleAnswer(value){
    if(!state.current) return;
    const now = performance.now();
    const finish = state._responseFinish || now;
    const responseMs = state._responseStart ? Math.round(finish - state._responseStart) : 0;

    let qtext = state.current.questionText || state.current.prompt;
    let correctVal = state.current.answer || '';
    const ok = isAnswerCorrect(value, state.current);

    if(ok){
      state.correct += 1;
      speak('Correct');
      log(`Correct: ${qtext} = ${correctVal}`);
    } else {
      speak(`Incorrect. The answer is ${correctVal}`);
      log(`Wrong (${value}): ${qtext} = ${correctVal}`);
    }

    updateStatsOnResult(ok, responseMs);

    if(state.current.isRevision){
      if(ok) recordRevisionCorrect(state.current.questionText);
    } else if(!ok){
      addRevision({question:qtext, answer: String(correctVal)});
    }

    state.current = null;
    $('listeningStatus').style.display = 'none';
    $('responseTime').textContent = `Response: ${responseMs} ms`;
    updateUI();
    setTimeout(() => { nextQuestion(); }, 1500);
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if(SpeechRecognition){
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.continuous = true;

    recognition.onresult = (ev) => {
      const text = Array.from(ev.results)
        .slice(ev.resultIndex)
        .map(r => r[0].transcript)
        .join(' ')
        .trim();
      log('Heard: ' + text);
      if(!state.running || !state.waiting || !state.current){
        log('Ignoring input (not waiting for answer)');
        return;
      }
      state.waiting = false;
      state._responseFinish = performance.now();
      handleAnswer(text);
    };

    recognition.onstart = () => { state.recognitionActive = true; };
    recognition.onerror = (ev) => {
      state.recognitionActive = false;
      if(ev.error !== 'no-speech' && ev.error !== 'aborted') log('Recognition error: ' + ev.error);
    };
    recognition.onend = () => {
      state.recognitionActive = false;
      if(state.running && state.recognitionShouldRun){
        clearTimeout(state.recognitionRestartTimer);
        state.recognitionRestartTimer = setTimeout(startRecognition, 250);
      }
    };
    log('Using browser Web Speech API for recognition (online)');
  } else {
    log('Web Speech API not available in this browser — typed input only.');
  }

  $('practiceMode').addEventListener('change', updateModeControls);

  function startRecognition(){
    if(!recognition || !state.running) return;
    state.recognitionShouldRun = true;
    if(state.recognitionActive) return;
    try{ recognition.start(); }catch(e){
      clearTimeout(state.recognitionRestartTimer);
      state.recognitionRestartTimer = setTimeout(startRecognition, 500);
    }
  }

  startBtn.addEventListener('click', startQuiz);
  stopBtn.addEventListener('click', stopQuiz);
  submitTyped.addEventListener('click', () => {
    const txt = typedInput.value.trim();
    if(!txt) return;
    state._responseFinish = performance.now();
    handleAnswer(txt);
    typedInput.value = '';
  });

  typedInput.addEventListener('keyup', (e) => { if(e.key === 'Enter') submitTyped.click(); });

  $('showStats').addEventListener('click', () => { const p = $('statsPanel'); p.classList.toggle('show'); renderStats(); });
  $('clearStats').addEventListener('click', () => { if(confirm('Clear stored stats and revision queue?')){ resetStats(); saveRevision([]); renderStats(); alert('Cleared'); }});

  updateModeControls();
  renderStats();
})();
