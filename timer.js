// Study Hub focus timer, shared by every page.
// It saves the moment the timer ends instead of counting down in memory,
// so it keeps going while you open a subject, reload, or lock your phone.
(() => {
  const KEY = 'studyhub:timer';
  const LENGTH = 25 * 60e3;
  const pad = n => String(n).padStart(2, '0');
  const fmt = ms => {
    const s = Math.ceil(ms / 1000);
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  };
  const idle = () => ({ running: false, left: LENGTH, end: 0, done: false });

  const load = () => {
    try {
      const t = JSON.parse(localStorage.getItem(KEY));
      if (t && typeof t.running === 'boolean' && Number.isFinite(t.left) && Number.isFinite(t.end)) {
        return { running: t.running, left: Math.min(Math.max(t.left, 0), LENGTH), end: t.end, done: t.done === true };
      }
    } catch {}
    return idle();
  };
  // storage throws in some private modes; the timer then just won't survive a page change
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  let state = load();
  let loop = 0;
  let audio;
  const remaining = () => (state.running ? Math.max(0, state.end - Date.now()) : state.left);
  const baseTitle = document.title;

  // Dashboard has the full timer; every other page gets a small badge in the top bar.
  const $ = id => document.getElementById(id);
  const clock = $('clock');
  const toggle = $('timer-toggle');
  const reset = $('timer-reset');
  const status = $('timer-status');
  const fill = $('timer-fill');
  let badge = null;
  if (!clock) {
    const bar = document.querySelector('.bar');
    if (bar) {
      badge = document.createElement('a');
      badge.className = 'timer-badge';
      badge.href = 'index.html';
      badge.hidden = true;
      bar.append(badge);
    }
  }

  const say = text => { if (status) status.textContent = text; };

  const render = () => {
    const ms = remaining();
    const text = fmt(ms);
    if (clock) {
      clock.textContent = text;
      fill.style.transform = `scaleX(${(1 - ms / LENGTH).toFixed(4)})`;
      toggle.textContent = state.running ? 'Pauze' : ms < LENGTH ? 'Verder' : 'Start';
      reset.disabled = !state.running && ms === LENGTH && !state.done;
    }
    if (badge) {
      badge.hidden = !state.running && !state.done && ms === LENGTH;
      badge.textContent = state.done ? 'Timer klaar' : state.running ? text : `${text} · pauze`;
      badge.setAttribute('aria-label', state.done
        ? 'Focustimer klaar, ga naar het dashboard'
        : `Focustimer ${state.running ? 'loopt' : 'gepauzeerd'}, nog ${text}, ga naar het dashboard`);
      badge.classList.toggle('is-done', state.done);
    }
    document.title = state.running ? `${text} · ${baseTitle}` : state.done ? `Klaar · ${baseTitle}` : baseTitle;
  };

  const chime = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio = audio || new Ctx();
      const t0 = audio.currentTime;
      [0, .25, .5].forEach((at, k) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.frequency.value = k === 2 ? 1046 : 784;
        gain.gain.setValueAtTime(.0001, t0 + at);
        gain.gain.exponentialRampToValueAtTime(.2, t0 + at + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, t0 + at + .22);
        osc.connect(gain).connect(audio.destination);
        osc.start(t0 + at);
        osc.stop(t0 + at + .25);
      });
    } catch {}
  };

  const stopLoop = () => { clearInterval(loop); loop = 0; };
  const finish = quiet => {
    stopLoop();
    state = { ...idle(), done: true };
    save();
    render();
    if (!quiet) chime();
    say('Klaar! Neem 5 minuten pauze, daarna start je een nieuwe ronde.');
  };
  const tick = () => (state.running && remaining() <= 0 ? finish(false) : render());
  const startLoop = () => { stopLoop(); loop = setInterval(tick, 250); };

  if (clock) {
    toggle.addEventListener('click', () => {
      if (state.running) {
        state = { running: false, left: remaining(), end: 0, done: false };
        stopLoop();
        say('Gepauzeerd. Druk op Verder om door te gaan.');
      } else {
        const left = state.left > 0 ? state.left : LENGTH;
        state = { running: true, left, end: Date.now() + left, done: false };
        startLoop();
        say('Bezig. Open gerust een vak, de timer loopt door.');
        // unlock sound during this tap so the end chime is allowed to play
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx && !audio) audio = new Ctx();
          if (audio && audio.state === 'suspended') audio.resume();
        } catch {}
      }
      save();
      render();
    });
    reset.addEventListener('click', () => {
      stopLoop();
      state = idle();
      save();
      render();
      say('Druk op Start voor 25 minuten focus.');
    });
  }

  // phones slow timers down in the background, so snap to the real time on return
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  // keep two open tabs in step
  addEventListener('storage', e => {
    if (e.key !== KEY) return;
    state = load();
    if (state.running) startLoop(); else stopLoop();
    render();
  });

  if (state.running && remaining() <= 0) {
    finish(true); // ran out while the page was closed
  } else {
    render();
    if (state.running) {
      startLoop();
      say('Bezig. Open gerust een vak, de timer loopt door.');
    } else if (state.done) {
      say('Klaar! Neem 5 minuten pauze, daarna start je een nieuwe ronde.');
    } else if (state.left < LENGTH) {
      say('Gepauzeerd. Druk op Verder om door te gaan.');
    }
  }
})();
