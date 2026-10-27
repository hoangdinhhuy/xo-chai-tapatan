/* XO CHAI — TGB Store minigame.
   Render thuần canvas 2D, không thư viện. Logic nằm ở logic.js. */
(() => {
  'use strict';

  const XO = window.XO;
  if (!XO) throw new Error('Thiếu logic.js');

  const W = 1280;
  const H = 720;
  const $ = (id) => document.getElementById(id);
  const META = XO.META;
  const TABLE = { cx: 640, cy: 420, size: 400, cell: 400 / 3 };
  const WIDE = { cx: 744, cy: 474, size: 348, cell: 348 / 3 };
  // y là gốc thân (ngang hông), không phải chân — giống actor gốc TGBStore.
  const SEATS = {
    shinv: { x: 640, y: 660 },
    brb: { x: 640, y: 210 }
  };
  const WIDE_SEATS = {
    shinv: { x: 744, y: 670 },
    brb: { x: 744, y: 270 }
  };

  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const dom = {
    stage: $('stage'),
    startScreen: $('startScreen'),
    startBtn: $('startBtn'),
    startHelpBtn: $('startHelpBtn'),
    scoreboard: $('scoreboard'),
    cardShinv: $('cardShinv'),
    cardBrb: $('cardBrb'),
    avatarShinv: $('avatarShinv'),
    avatarBrb: $('avatarBrb'),
    pipsShinv: $('pipsShinv'),
    pipsBrb: $('pipsBrb'),
    roundLabel: $('roundLabel'),
    matchScore: $('matchScore'),
    turnBanner: $('turnBanner'),
    turnEyebrow: $('turnEyebrow'),
    turnTitle: $('turnTitle'),
    turnHint: $('turnHint'),
    turnClock: $('turnClock'),
    ruleCard: $('ruleCard'),
    ruleToggle: $('ruleToggle'),
    ruleBody: $('ruleBody'),
    cockpit: $('cockpit'),
    contextHint: $('contextHint'),
    inventory: $('inventory'),
    invShinv: $('invShinv'),
    invBrb: $('invBrb'),
    moveMeter: $('moveMeter'),
    stockShinv: $('stockShinv'),
    stockBrb: $('stockBrb'),
    dialogBox: $('dialogBox'),
    dialogPortrait: $('dialogPortrait'),
    dialogSpeaker: $('dialogSpeaker'),
    dialogTag: $('dialogTag'),
    dialogText: $('dialogText'),
    dialogNext: $('dialogNext'),
    dialogSkip: $('dialogSkip'),
    roundOverlay: $('roundOverlay'),
    roundEyebrow: $('roundEyebrow'),
    roundTitle: $('roundTitle'),
    roundSub: $('roundSub'),
    roundScore: $('roundScore'),
    nextRoundBtn: $('nextRoundBtn'),
    resultOverlay: $('resultOverlay'),
    resultTitle: $('resultTitle'),
    resultSub: $('resultSub'),
    resultScore: $('resultScore'),
    resultChat: $('resultChat'),
    rematchBtn: $('rematchBtn'),
    menuBtn: $('menuBtn'),
    helpModal: $('helpModal'),
    helpBtn: $('helpBtn'),
    helpClose: $('helpClose'),
    startOnlineBtn: $('onlineBtn'),
    onlineLobby: $('onlineLobby'),
    onlineName: $('onlineName'),
    findMatchBtn: $('findMatchBtn'),
    cancelQueueBtn: $('cancelQueueBtn'),
    onlineBackBtn: $('onlineBackBtn'),
    queueStatus: $('queueStatus'),
    leaderboardList: $('leaderboardList'),
    speakerBtn: $('speakerBtn'),
    speakerModal: $('speakerModal'),
    youtubeUrl: $('youtubeUrl'),
    playYoutubeBtn: $('playYoutubeBtn'),
    stopYoutubeBtn: $('stopYoutubeBtn'),
    speakerCloseBtn: $('speakerCloseBtn'),
    ytWrap: $('ytWrap'),
    ytFrame: $('ytFrame'),
    soundBtn: $('soundBtn'),
    footSound: $('footSound'),
    fullscreenBtn: $('fullscreenBtn'),
    skipBtn: $('skipBtn'),
    statusText: $('statusText'),
    footHint: $('footHint'),
    toast: $('toast'),
    chatFeed: $('chatFeed'),
    shout: $('shout'),
    subtitle: $('subtitle'),
    flash: $('flash'),
    fade: $('fade')
  };

  const G = {
    mode: 'menu',
    match: null,
    cursors: { shinv: 4, brb: 4 },
    locked: true,
    anim: null,
    winFx: null,
    particles: [],
    floaters: [],
    confetti: [],
    shake: 0,
    last: 0,
    intro: null,
    outro: null,
    helpOpen: false,
    pending: null,
    autoNextTimer: null,
    typeTimer: null,
    autoDialogTimer: null,
    toastTimer: null,
    outroTimer: null,
    clockTimer: null,
    moveClock: null,
    online: {
      active: false,
      token: null,
      name: '',
      you: null,
      poll: null,
      state: null,
      selected: null,
      sending: false,
      ended: false,
      outroStarted: false,
      resultShown: false,
      clock: null
    },
    sound: true,
    music: true,
    lastChatAt: 0
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIn = (t) => Math.pow(clamp(t, 0, 1), 2);
  const easeInOut = (t) => {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pname = (p) => META[p]?.name || p;
  const pcolor = (p) => META[p]?.color || '#fff';
  const other = (p) => (p === 'shinv' ? 'brb' : 'shinv');

  function cellRect(index, table = TABLE) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = table.cx - table.size / 2 + col * table.cell;
    const y = table.cy - table.size / 2 + row * table.cell;
    return { x, y, w: table.cell, h: table.cell, cx: x + table.cell / 2, cy: y + table.cell / 2, index };
  }

  function cellName(index) {
    return 'ABC'[index % 3] + (Math.floor(index / 3) + 1);
  }

  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function roundRect(c, x, y, w, h, rad, color) {
    c.fillStyle = color;
    c.beginPath();
    const r = Math.min(rad, w / 2, h / 2);
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
    c.fill();
  }

  function text(str, x, y, size = 12, color = '#fff', align = 'left', weight = 'bold') {
    ctx.font = `${weight} ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = Math.max(2, size * 0.18);
    ctx.strokeStyle = '#08100a';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------------------------
  // Sound
  // ---------------------------------------------------------------------------
  const Sound = (() => {
    let ac = null;
    let master = null;
    let musicTimer = null;
    let musicStep = 0;

    function init() {
      if (ac) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.38;
      master.connect(ac.destination);
    }

    function resume() {
      init();
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    }

    function beep(freq, dur = 0.08, type = 'square', vol = 0.06, slide = 0) {
      if (!G.sound) return;
      init();
      if (!ac || !master) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(30, freq), t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    function noise(dur = 0.15, vol = 0.08, cutoff = 1200) {
      if (!G.sound) return;
      init();
      if (!ac || !master) return;
      const len = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const g = ac.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start();
    }

    function sfx(name) {
      if (!G.sound) return;
      switch (name) {
        case 'tick': beep(720, 0.03, 'square', 0.025); break;
        case 'select': beep(460, 0.07, 'square', 0.05, 130); break;
        case 'place': beep(210, 0.09, 'triangle', 0.075, 80); noise(0.07, 0.035, 800); break;
        case 'move': beep(340, 0.07, 'square', 0.055, 130); noise(0.06, 0.03, 600); break;
        case 'bad': beep(150, 0.16, 'sawtooth', 0.06, -50); break;
        case 'turn': beep(620, 0.045, 'square', 0.025); break;
        case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'square', 0.055), i * 85)); break;
        case 'lose': [330, 277, 220, 165].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.06), i * 120)); break;
        case 'pop': beep(880, 0.055, 'square', 0.055, -420); noise(0.05, 0.04, 2400); break;
        case 'strip': noise(0.15, 0.055, 3000); beep(1100, 0.05, 'square', 0.035, -700); break;
        case 'run': noise(0.22, 0.05, 900); break;
        case 'shout': beep(220, 0.42, 'sawtooth', 0.07, 120); noise(0.34, 0.05, 1300); break;
        case 'start': [262, 330, 392, 523].forEach((f, i) => setTimeout(() => beep(f, 0.1, 'square', 0.05), i * 90)); break;
        default: beep(620, 0.05, 'square', 0.035); break;
      }
    }

    function startMusic() {
      if (!G.sound || !G.music || musicTimer) return;
      init();
      if (!ac) return;
      resume();
      const melody = [196, 247, 294, 392, 330, 294, 247, 220, 196, 247, 330, 392, 440, 392, 330, 247];
      const bass = [98, 98, 123, 123, 87, 87, 110, 110];
      musicStep = 0;
      musicTimer = setInterval(() => {
        if (!G.sound || !G.music) return;
        const s = musicStep++;
        const f = melody[s % melody.length];
        if (s % 2 === 0) beep(f, 0.11, 'triangle', 0.012);
        if (s % 4 === 0) beep(bass[(s / 4) % bass.length], 0.22, 'sine', 0.018);
        if (s % 8 === 4) noise(0.03, 0.006, 5000);
      }, 265);
    }

    function stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    }

    return {
      init, resume, beep, noise, sfx,
      startMusic, stopMusic,
      get ready() { return !!ac; },
      get musicPlaying() { return !!musicTimer; }
    };
  })();

  // ---------------------------------------------------------------------------
  // Actor / portrait drawing
  // ---------------------------------------------------------------------------
  // Nhân vật lấy đúng tỉ lệ / bảng màu từ actor gốc của TGBStore:
  // ShinV = nhân viên áo đỏ Manchester United, BRB = sếp áo Real (trắng + vàng).
  function actorPalette(player) {
    if (player === 'shinv') {
      return {
        skin: '#dfb48e', skinShade: '#c98f6d', arm: '#d7a37c',
        hair: '#18211e', hairHi: '#222a24',
        shirt: '#c51d2e', trim: '#faf5e9', sleeve: '#fff5dd',
        crest: '#e4c36a', crestInner: '#92272d',
        pants: '#252b32', shoe: '#d8ddce'
      };
    }
    return {
      skin: '#dfb48e', skinShade: '#c98f6d', arm: '#d7a37c',
      hair: '#18211e', hairHi: '#222a24',
      shirt: '#f4f0df', trim: '#dcc294', sleeve: '#d5b780',
      crest: '#e2bf75', crestInner: '#6682a0',
      pants: '#252b32', shoe: '#d8ddce'
    };
  }

  function drawActor(c, x, y, o = {}) {
    const player = o.player || 'shinv';
    const pal = actorPalette(player);
    const scale = o.scale ?? 1;
    const seated = !!o.seated;
    const clothes = Object.assign({ shirt: true, shorts: true, shoes: true }, o.clothes || {});
    const censor = o.censor !== false && !clothes.shirt && !clothes.shorts;
    const run = !!o.run;
    const moving = run || !!o.walk;
    const alpha = o.alpha ?? 1;
    const phase = (o.time || 0) * (run ? 13 : 8);
    const st = moving ? Math.sin(phase) * (run ? 3.4 : 2) : 0;
    const bounce = run ? Math.abs(Math.sin(phase)) * 2 : 0;
    const back = !!o.back;

    c.save();
    c.globalAlpha = alpha;
    c.translate(Math.round(x), Math.round(y - bounce));
    c.scale(scale, scale);
    c.imageSmoothingEnabled = false;

    const p = (dx, dy, w, h, col) => {
      c.fillStyle = col;
      c.fillRect(Math.round(dx), Math.round(dy), Math.round(w), Math.round(h));
    };

    if (!seated) {
      p(-18, 36, 37, 6, 'rgba(0,0,0,.28)');
    }

    // Chân: quần xanh đen, giày trắng giống actor gốc.
    if (!seated) {
      const legColor = clothes.shorts ? pal.pants : pal.skin;
      p(-11, 21 + st, 9, 17, legColor);
      p(3, 21 - st, 9, 17, legColor);
      p(-11, 21 + st, 3, 17, clothes.shorts ? '#1d2228' : pal.skinShade);
      p(3, 21 - st, 3, 17, clothes.shorts ? '#1d2228' : pal.skinShade);
      if (clothes.shoes) {
        p(-12, 36 + st, 12, 5, pal.shoe);
        p(2, 36 - st, 13, 5, pal.shoe);
        p(-12, 39 + st, 12, 2, '#b9c0b2');
        p(2, 39 - st, 13, 2, '#b9c0b2');
      } else {
        p(-12, 36 + st, 12, 5, pal.skin);
        p(2, 36 - st, 13, 5, pal.skin);
      }
    }

    // Thân áo.
    if (clothes.shirt) {
      p(-18, -1, 36, 28, pal.shirt);
      p(-18, -1, 4, 28, player === 'shinv' ? '#a61b24' : '#d8d0ba');
    } else {
      p(-18, -1, 36, 28, pal.skin);
      p(-18, -1, 4, 28, pal.skinShade);
      p(-6, 9, 13, 1, pal.skinShade);
    }

    // Tay áo / cánh tay.
    p(-22, 3, 7, 21, pal.arm);
    p(15, 3, 7, 21, pal.arm);
    if (clothes.shirt) {
      p(-20, 5, 4, 8, pal.sleeve);
      p(16, 5, 4, 8, pal.sleeve);
    }

    // Đầu, tóc, mặt.
    p(-13, -25, 27, 25, pal.skin);
    p(-15, -28, 31, 11, pal.hair);
    p(-12, -32, 25, 9, pal.hair);
    p(-15, -21, 6, 12, pal.hair);
    p(11, -22, 5, 12, pal.hair);
    p(-12, -33, 21, 2, pal.hairHi);
    if (!back) {
      p(-11, -15, 10, 7, '#adc6ba');
      p(2, -15, 11, 7, '#adc6ba');
      p(-1, -12, 3, 2, '#adc6ba');
      if (o.blink) {
        p(-8, -13, 4, 1, '#1c2521');
        p(5, -13, 4, 1, '#1c2521');
      } else {
        p(-8, -13, 3, 3, '#1c2521');
        p(5, -13, 3, 3, '#1c2521');
      }
      p(-5, -1, 11, 2, '#9a614e');
    } else {
      p(-14, -22, 29, 20, pal.hair);
    }

    // Chi tiết áo đấu.
    if (clothes.shirt) {
      if (player === 'shinv') {
        p(-18, 0, 36, 3, pal.trim);
        p(-20, 1, 3, 12, pal.sleeve);
        p(18, 1, 3, 12, pal.sleeve);
        p(-12, 4, 3, 8, '#1c1f28');
        p(-8, 4, 3, 8, '#f4f2e3');
        p(-4, 4, 3, 8, '#181b24');
        p(9, 4, 5, 6, pal.crest);
        p(10, 5, 3, 3, pal.crestInner);
        p(-9, 16, 18, 2, '#eee9d9');
        p(-5, 20, 10, 3, '#e5d8b7');
        if (back) {
          p(-18, 3, 3, 12, '#1d2029');
          p(-14, 3, 3, 12, '#f7f0df');
          p(-10, 3, 3, 12, '#1d2029');
          p(-5, 7, 11, 9, '#f7eee0');
        }
      } else {
        p(-18, 0, 36, 3, pal.trim);
        p(-20, 1, 3, 11, pal.sleeve);
        p(18, 1, 3, 11, pal.sleeve);
        p(-13, 5, 3, 9, '#aa8c61');
        p(-9, 5, 3, 9, '#b49a6c');
        p(-5, 5, 3, 9, '#a98c61');
        p(9, 5, 5, 6, pal.crest);
        p(10, 6, 3, 3, pal.crestInner);
        p(-7, 17, 14, 3, '#b9a17b');
        if (back) p(-5, 9, 11, 8, '#d5bf99');
      }
    }

    // Censor pixel khi đã tụt hết đồ; nhân vật vẫn là chibi khối màu da, không chi tiết.
    if (censor && !seated) {
      p(-4, 23, 9, 5, '#1c211c');
    }

    c.restore();
  }

  function paintAvatar(container, player) {
    container.innerHTML = '';
    const c = document.createElement('canvas');
    c.width = 92;
    c.height = 92;
    const d = c.getContext('2d');
    d.imageSmoothingEnabled = false;
    d.fillStyle = player === 'shinv' ? '#26150f' : '#242015';
    d.fillRect(0, 0, 92, 92);
    d.fillStyle = 'rgba(255,255,255,.05)';
    for (let y = 0; y < 92; y += 8) d.fillRect(0, y, 92, 1);
    d.fillStyle = player === 'shinv' ? 'rgba(240,138,60,.18)' : 'rgba(226,191,117,.2)';
    d.beginPath();
    d.arc(46, 46, 42, 0, Math.PI * 2);
    d.fill();
    drawActor(d, 46, 50, { player, scale: 0.98, time: 0, blink: true });
    container.appendChild(c);
  }

  function paintDialogPortrait(speaker) {
    dom.dialogPortrait.innerHTML = '';
    const c = document.createElement('canvas');
    c.width = 172;
    c.height = 172;
    const d = c.getContext('2d');
    d.imageSmoothingEnabled = false;
    d.fillStyle = '#0c1a11';
    d.fillRect(0, 0, 172, 172);
    if (speaker === 'shinv' || speaker === 'brb') {
      d.fillStyle = speaker === 'shinv' ? '#3e2117' : '#22203d';
      d.beginPath();
      d.arc(86, 86, 78, 0, Math.PI * 2);
      d.fill();
      drawActor(d, 86, 92, { player: speaker, scale: 1.75, time: 0.6 });
    } else {
      d.fillStyle = '#243b2a';
      d.fillRect(0, 0, 172, 172);
      d.fillStyle = '#f0e4c4';
      d.fillRect(28, 54, 116, 64);
      d.fillStyle = '#16291d';
      d.fillRect(34, 60, 104, 52);
      d.fillStyle = '#f08a3c';
      d.font = 'bold 34px "Courier New", monospace';
      d.textAlign = 'center';
      d.fillText('TGB', 86, 96);
      d.fillStyle = '#a8d36d';
      d.font = 'bold 12px "Courier New", monospace';
      d.fillText('STORE', 86, 112);
      d.textAlign = 'left';
    }
    dom.dialogPortrait.appendChild(c);
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  function setHudVisible(visible) {
    [dom.scoreboard, dom.turnBanner, dom.ruleCard, dom.cockpit, dom.inventory].forEach((el) => {
      el.classList.toggle('hidden', !visible);
    });
  }

  function setTopStatus(str) {
    dom.statusText.textContent = str;
  }

  function updateSoundUI() {
    dom.soundBtn.innerHTML = `${G.sound ? '🔊' : '🔇'}<span>ÂM THANH</span>`;
    dom.soundBtn.setAttribute('aria-pressed', String(G.sound));
    dom.footSound.textContent = G.music ? '♫ NHẠC: BẬT' : '♫ NHẠC: TẮT';
  }

  function updatePips(container, wins) {
    container.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const d = document.createElement('span');
      d.className = 'score-pip' + (i < wins ? ' won' : '');
      container.appendChild(d);
    }
  }

  function buildMiniBottles(container, player, placed) {
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('span');
      b.className = 'mini-bottle' + (i < placed ? ' used' : '');
      b.style.setProperty('--bottle-color', player === 'shinv' ? '#ee7c2f' : '#302b4b');
      container.appendChild(b);
    }
  }

  function phaseHintText(round, player) {
    const phase = XO.phaseFor(round, player);
    if (phase === 'place') {
      return `Đặt chai • còn ${3 - XO.countOnBoard(round, player)} chai trên kệ`;
    }
    if (round.selected === null) {
      return 'Chọn một chai của bạn • chỉ đi kề cạnh • 3 giây';
    }
    return `Cầm chai ${cellName(round.selected)} • chọn ô trống kề cạnh`;
  }

  function clearMoveClock() {
    clearInterval(G.clockTimer);
    G.clockTimer = null;
    G.moveClock = null;
    if (dom.turnClock) {
      dom.turnClock.classList.add('hidden');
      dom.turnClock.classList.remove('danger');
      dom.turnClock.textContent = '3.0';
    }
  }

  function startMoveClock(player) {
    clearMoveClock();
    if (G.mode !== 'game' || !G.match || G.match.status !== 'playing') return;
    if (G.online && G.online.active) return;
    if (XO.currentPhase(G.match) !== 'move') return;
    const endsAt = performance.now() + 3000;
    G.moveClock = { player, endsAt };
    dom.turnClock.classList.remove('hidden', 'danger');
    dom.turnClock.textContent = '3.0';
    G.clockTimer = setInterval(() => {
      if (G.mode !== 'game' || !G.match || G.match.status !== 'playing') {
        clearMoveClock();
        return;
      }
      if (G.match.round.turn !== player) {
        clearMoveClock();
        return;
      }
      const left = Math.max(0, (endsAt - performance.now()) / 1000);
      dom.turnClock.textContent = left.toFixed(1);
      dom.turnClock.classList.toggle('danger', left <= 1);
      if (left <= 0) {
        clearMoveClock();
        if (!G.locked) handleTimeoutLocal(player);
      }
    }, 80);
  }

  function handleTimeoutLocal(player) {
    if (!G.match || G.match.status !== 'playing' || G.match.round.turn !== player) return;
    const result = XO.applyTimeout(G.match, player);
    if (!result.ok) return;
    G.locked = true;
    G.shake = 10;
    G.anim = null;
    clearMoveClock();
    Sound.sfx('lose');
    showToast(`${pname(player)} hết 3 giây — thua ván!`, 'bad', 2600);
    setTimeout(() => showRoundResult(result), 450);
  }

  function refreshHUD() {
    const m = G.match;
    if (!m) return;
    const round = m.round;
    const turn = round.turn;
    const phase = XO.phaseFor(round, turn);
    const turnMeta = META[turn];
    dom.cardShinv.classList.toggle('active', turn === 'shinv');
    dom.cardBrb.classList.toggle('active', turn === 'brb');
    dom.roundLabel.textContent = `VÁN ${m.roundNo}`;
    dom.matchScore.textContent = `${m.wins.shinv} — ${m.wins.brb}`;
    updatePips(dom.pipsShinv, m.wins.shinv);
    updatePips(dom.pipsBrb, m.wins.brb);

    dom.turnBanner.style.setProperty('--turn-color', turnMeta.color);
    dom.turnEyebrow.textContent = `LƯỢT ${turn === 'shinv' ? 'P1' : 'P2'} • ${phase === 'place' ? 'ĐẶT CHAI' : 'DI CHUYỂN'}`;
    dom.turnTitle.textContent = turnMeta.name;
    dom.turnHint.textContent = phaseHintText(round, turn);
    dom.turnClock.classList.toggle('hidden', !(phase === 'move' && m.status === 'playing'));
    if (phase === 'place') {
      dom.turnClock.classList.add('hidden');
    }

    const actionKey = turn === 'shinv' ? 'E' : 'ENTER';
    const context = phase === 'place'
      ? `${turnMeta.name}: chọn ô trống rồi bấm ${actionKey} để đặt.`
      : round.selected === null
        ? `${turnMeta.name}: chọn chai của mình, bấm ${actionKey}. Chỉ đi kề cạnh trong 3 giây.`
        : `Đang cầm chai ${cellName(round.selected)}: chọn ô trống kề cạnh rồi bấm ${actionKey}.`;
    dom.contextHint.textContent = context;

    const stockS = 3 - XO.countOnBoard(round, 'shinv');
    const stockB = 3 - XO.countOnBoard(round, 'brb');
    dom.stockShinv.textContent = stockS > 0 ? `CÒN ${stockS} CHAI` : 'ĐỦ 3 • PHẢI NHẤC';
    dom.stockBrb.textContent = stockB > 0 ? `CÒN ${stockB} CHAI` : 'ĐỦ 3 • PHẢI NHẤC';
    dom.stockShinv.classList.toggle('warn', stockS === 0);
    dom.stockBrb.classList.toggle('warn', stockB === 0);
    buildMiniBottles(dom.invShinv, 'shinv', XO.countOnBoard(round, 'shinv'));
    buildMiniBottles(dom.invBrb, 'brb', XO.countOnBoard(round, 'brb'));
    dom.moveMeter.innerHTML = `NƯỚC <b>${round.moves + 1}</b>`;
    dom.footHint.textContent = phase === 'place'
      ? 'Đặt đủ 3 chai rồi... luật sẽ đổi.'
      : 'Hết chai để đặt. Giờ là lúc nhấc chai đi ăn hàng.';
    setTopStatus(`ĐANG ĐẤU • VÁN ${m.roundNo} • ${m.wins.shinv}-${m.wins.brb}`);
    if (G.online.active) {
      setTopStatus(`ONLINE • ${G.online.name || 'BẠN'} • VS ${G.online.state?.opponentName || 'ĐỐI THỦ'}`);
      if (turn !== G.online.you) {
        dom.turnHint.textContent = `Đợi ${G.online.state?.opponentName || pname(turn)} hạ chai...`;
        dom.footHint.textContent = 'Đối thủ đang suy nghĩ. Bạn chỉ cần chờ.';
      } else {
        dom.footHint.textContent = phase === 'place'
          ? 'Lượt bạn: đặt chai vào ô trống.'
          : 'Lượt bạn: nhấc chai, đi kề cạnh, hạ trong 3 giây.';
      }
    }
    dom.turnBanner.classList.remove('pulse');
    void dom.turnBanner.offsetWidth;
    dom.turnBanner.classList.add('pulse');
  }

  function showToast(msg, type = '', duration = 2200) {
    clearTimeout(G.toastTimer);
    dom.toast.textContent = msg;
    dom.toast.className = 'toast show ' + type;
    G.toastTimer = setTimeout(() => {
      dom.toast.className = 'toast ' + type;
    }, duration);
  }

  function pushChat(who, message, special = false) {
    const line = document.createElement('div');
    line.className = 'chat-line' + (who === 'BRB' ? ' p2' : '') + (special ? ' special' : '');
    const b = document.createElement('b');
    b.textContent = who + ': ';
    line.appendChild(b);
    line.appendChild(document.createTextNode(message));
    dom.chatFeed.appendChild(line);
    while (dom.chatFeed.children.length > 8) dom.chatFeed.removeChild(dom.chatFeed.firstChild);
    dom.chatFeed.classList.remove('hidden');
  }

  function showOverlay(el, show) {
    el.classList.toggle('hidden', !show);
  }

  // ---------------------------------------------------------------------------
  // Loa YouTube
  // ---------------------------------------------------------------------------
  function youtubeId(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    if (/^[\w-]{11}$/.test(raw)) return raw;
    const patterns = [
      /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/i,
      /(?:youtu\.be\/)([\w-]{11})/i,
      /(?:youtube\.com\/shorts\/)([\w-]{11})/i,
      /(?:youtube\.com\/embed\/)([\w-]{11})/i,
      /(?:youtube\.com\/live\/)([\w-]{11})/i
    ];
    for (const p of patterns) {
      const m = raw.match(p);
      if (m) return m[1];
    }
    return null;
  }

  function openSpeaker() {
    dom.speakerModal.classList.remove('hidden');
    dom.youtubeUrl.value = localStorage.getItem('xo-youtube-url') || '';
    setTimeout(() => dom.youtubeUrl.focus(), 50);
  }

  function closeSpeaker() {
    dom.speakerModal.classList.add('hidden');
  }

  function playYoutube() {
    const id = youtubeId(dom.youtubeUrl.value);
    if (!id) {
      showToast('Link YouTube không hợp lệ. Dán link đầy đủ hoặc mã 11 ký tự.', 'bad', 2600);
      return;
    }
    localStorage.setItem('xo-youtube-url', dom.youtubeUrl.value.trim());
    dom.ytFrame.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    dom.ytWrap.classList.remove('hidden');
    if (G.music) {
      G.music = false;
      Sound.stopMusic();
      updateSoundUI();
    }
    showToast('Loa đang phát YouTube. Bấm ■ TẮT LOA để dừng.', 'good', 2400);
  }

  function stopYoutube() {
    dom.ytFrame.src = 'about:blank';
    dom.ytWrap.classList.add('hidden');
    showToast('Đã tắt loa YouTube.', '');
  }

  // ---------------------------------------------------------------------------
  // Online 1v1: matchmaking + server-authoritative board
  // ---------------------------------------------------------------------------
  async function onlineFetch(url, body) {
    const opts = body === undefined ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    };
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      const err = new Error(data.error || `Lỗi mạng (${res.status})`);
      err.state = data.state || null;
      throw err;
    }
    return data;
  }

  function setQueueStatus(text, cls = '') {
    dom.queueStatus.textContent = text;
    dom.queueStatus.className = 'queue-status ' + cls;
  }

  async function loadLeaderboard() {
    try {
      const data = await onlineFetch('/api/online/leaderboard');
      const rows = data.leaderboard || [];
      if (!rows.length) {
        dom.leaderboardList.innerHTML = '<li class="muted">Chưa có ai thắng trận online. Người đầu tiên là bạn?</li>';
        return;
      }
      dom.leaderboardList.innerHTML = rows.map((r, i) =>
        `<li><b>#${i + 1}</b><span>${escapeHtml(r.name)}</span><strong>${r.wins} / ${r.losses}</strong></li>`
      ).join('');
    } catch {
      dom.leaderboardList.innerHTML = '<li class="muted">Không tải được BXH. Server online chưa bật?</li>';
    }
  }

  function openOnlineLobby() {
    dom.onlineLobby.classList.remove('hidden');
    dom.onlineName.value = localStorage.getItem('xo-online-name') || '';
    dom.findMatchBtn.disabled = false;
    dom.cancelQueueBtn.classList.add('hidden');
    setQueueStatus('Nhập tên rồi bấm ghép trận. Chỉ lưu tên, không lưu mật khẩu.');
    loadLeaderboard();
    setTimeout(() => dom.onlineName.focus(), 50);
  }

  function closeOnlineLobby() {
    dom.onlineLobby.classList.add('hidden');
  }

  function stopOnlinePolling() {
    clearInterval(G.online.poll);
    G.online.poll = null;
    clearInterval(G.online.clock);
    G.online.clock = null;
  }

  async function leaveOnline(notify = true) {
    stopOnlinePolling();
    const token = G.online.token;
    if (notify && token) {
      try { await onlineFetch('/api/online/leave', { token }); } catch { /* server có thể đã tắt */ }
    }
    G.online.active = false;
    G.online.token = null;
    G.online.you = null;
    G.online.selected = null;
    G.online.state = null;
    G.online.outroStarted = false;
    G.online.resultShown = false;
  }

  async function findOnlineMatch() {
    const name = dom.onlineName.value.trim().slice(0, 18);
    if (name.length < 2) {
      setQueueStatus('Tên cần từ 2 đến 18 ký tự.', 'error');
      dom.onlineName.focus();
      return;
    }
    localStorage.setItem('xo-online-name', name);
    dom.findMatchBtn.disabled = true;
    setQueueStatus('Đang kết nối server...', 'waiting');
    try {
      if (G.online.token) await leaveOnline(false);
      const joined = await onlineFetch('/api/online/join', { name });
      G.online.token = joined.token;
      G.online.name = name;
      G.online.ended = false;
      const queued = await onlineFetch('/api/online/queue', { token: G.online.token });
      if (queued.state) {
        enterOnlineMatch(queued.state);
        return;
      }
      setQueueStatus('Đang tìm đối thủ ngẫu nhiên... (giữ tab này mở)', 'waiting');
      dom.cancelQueueBtn.classList.remove('hidden');
      dom.findMatchBtn.classList.add('hidden');
      startOnlinePolling();
    } catch (e) {
      dom.findMatchBtn.disabled = false;
      setQueueStatus(e.message || 'Không kết nối được server online.', 'error');
    }
  }

  function startOnlinePolling() {
    clearInterval(G.online.poll);
    const tick = async () => {
      if (!G.online.token) return;
      try {
        const data = await onlineFetch(`/api/online/state?token=${encodeURIComponent(G.online.token)}`);
        if (!data.state) {
          if (data.status === 'waiting') setQueueStatus('Đang tìm đối thủ ngẫu nhiên...', 'waiting');
          else if (data.status === 'idle' && G.online.active) onlineEnded('Đối thủ đã rời trận.');
          return;
        }
        applyOnlineState(data.state);
      } catch (e) {
        setQueueStatus(e.message || 'Mất kết nối server.', 'error');
      }
    };
    G.online.poll = setInterval(tick, 650);
    tick();
  }

  function enterOnlineMatch(state) {
    clearInterval(G.online.clock);
    dom.onlineLobby.classList.add('hidden');
    dom.startScreen.classList.add('hidden');
    dom.resultOverlay.classList.add('hidden');
    dom.roundOverlay.classList.add('hidden');
    dom.helpModal.classList.add('hidden');
    dom.chatFeed.classList.add('hidden');
    dom.shout.classList.add('hidden');
    dom.subtitle.classList.add('hidden');
    dom.skipBtn.classList.add('hidden');
    G.mode = 'game';
    G.online.active = true;
    G.online.you = state.you;
    G.online.state = state;
    G.online.outroStarted = false;
    G.online.resultShown = false;
    G.match = state.match;
    G.cursors[state.you] = firstOnlineCursor(state.you);
    G.locked = false;
    clearMoveClock();
    setHudVisible(true);
    refreshHUD();
    startOnlineClock();
    setTopStatus(`ONLINE • BẠN LÀ ${META[state.you].name} • VS ${state.opponentName}`);
    showToast(`ĐÃ GHÉP TRẬN • BẠN LÀ ${META[state.you].name}`, 'good', 3000);
    Sound.sfx('start');
    Sound.startMusic();
    startOnlinePolling();
  }

  function firstOnlineCursor(player) {
    const round = G.match?.round;
    if (!round) return 4;
    if (XO.phaseFor(round, player) === 'move') {
      return XO.ownCells(round, player)[0] ?? 4;
    }
    const empty = XO.emptyCells(round);
    return empty.includes(4) ? 4 : (empty[0] ?? 4);
  }

  function startOnlineClock() {
    clearInterval(G.online.clock);
    G.online.clock = setInterval(() => {
      if (!G.online.active || !G.online.state || G.mode !== 'game' || !G.match) return;
      const state = G.online.state;
      if (state.status !== 'playing' || XO.currentPhase(G.match) !== 'move' || !state.turnEndsAt) {
        dom.turnClock.classList.add('hidden');
        return;
      }
      const left = Math.max(0, (state.turnEndsAt - Date.now()) / 1000);
      dom.turnClock.classList.remove('hidden');
      dom.turnClock.textContent = left.toFixed(1);
      dom.turnClock.classList.toggle('danger', left <= 1);
    }, 100);
  }

  function applyOnlineState(state) {
    if (!state) return;
    if (state.status === 'waiting') {
      setQueueStatus('Đang tìm đối thủ ngẫu nhiên...', 'waiting');
      return;
    }
    if (state.status === 'idle' || state.status === 'ended') {
      if (G.online.active) onlineEnded('Đối thủ đã rời trận hoặc phiên đã hết.');
      return;
    }
    G.online.state = state;
    if (!G.online.active) {
      enterOnlineMatch(state);
      return;
    }
    G.match = state.match;
    G.online.you = state.you;
    if (G.online.selected !== null) {
      const round = G.match.round;
      if (round.turn === state.you && round.board[G.online.selected] === state.you) {
        round.selected = G.online.selected;
      } else {
        G.online.selected = null;
      }
    }
    if (state.status === 'playing') {
      dom.roundOverlay.classList.add('hidden');
      dom.nextRoundBtn.disabled = false;
      G.locked = false;
      ensureCursorValid(state.you);
      refreshHUD();
      startOnlineClock();
      return;
    }
    clearMoveClock();
    G.locked = true;
    if (state.status === 'roundOver') G.online.selected = null;
    refreshHUD();
    if (state.status === 'roundOver') {
      showOnlineRoundOverlay(state);
    } else if (state.status === 'matchOver') {
      G.online.selected = null;
      dom.roundOverlay.classList.add('hidden');
      if (!G.online.outroStarted) {
        G.online.outroStarted = true;
        stopOnlinePolling();
        startOutro();
      }
    }
  }

  function showOnlineRoundOverlay(state) {
    const m = state.match;
    const winner = m.round.winner;
    const loser = XO.other(winner);
    const reason = m.round.winReason || 'line';
    dom.roundOverlay.classList.remove('hidden');
    dom.roundEyebrow.textContent = 'ONLINE • KẾT THÚC VÁN';
    dom.roundTitle.textContent = winner === state.you ? 'BẠN THẮNG VÁN!' : 'BẠN THUA VÁN.';
    dom.roundSub.textContent = reason === 'timeout'
      ? `${pname(loser)} hết 3 giây.`
      : reason === 'stalemate'
        ? `${pname(loser)} bị khóa đường.`
        : reason === 'repeat'
          ? `${pname(loser)} lặp nước quá 3 lần.`
          : `Ba chai ${META[winner]?.bottle || ''} thẳng hàng.`;
    dom.roundScore.textContent = `${m.wins['shinv']} — ${m.wins.brb}`;
    dom.nextRoundBtn.textContent = state.readyYou ? 'ĐANG CHỜ ĐỐI THỦ...' : 'SẴN SÀNG VÁN TIẾP ▶';
    dom.nextRoundBtn.disabled = !!state.readyYou;
  }

  async function sendReadyOnline() {
    if (!G.online.active || !G.online.token) return;
    dom.nextRoundBtn.disabled = true;
    try {
      const data = await onlineFetch('/api/online/ready', { token: G.online.token });
      if (data.state) applyOnlineState(data.state);
    } catch (e) {
      showToast(e.message || 'Không gửi được trạng thái sẵn sàng.', 'bad');
    }
  }

  async function onlineAction(player, cell) {
    if (!G.online.active || G.online.ended || !G.match) return;
    if (player !== G.online.you) return;
    if (G.match.round.turn !== player || G.match.status !== 'playing') return;
    if (G.online.sending) return;
    const round = G.match.round;
    const phase = XO.phaseFor(round, player);
    let payload = null;
    if (phase === 'place') {
      payload = { token: G.online.token, to: cell };
    } else if (G.online.selected === null) {
      if (round.board[cell] !== player) {
        showToast('Chọn một chai của bạn trên bàn để nhấc lên.', 'bad');
        return;
      }
      G.online.selected = cell;
      round.selected = cell;
      Sound.sfx('select');
      refreshHUD();
      return;
    } else if (cell === G.online.selected) {
      G.online.selected = null;
      round.selected = null;
      Sound.sfx('tick');
      refreshHUD();
      return;
    } else if (round.board[cell] === player) {
      G.online.selected = cell;
      round.selected = cell;
      Sound.sfx('select');
      refreshHUD();
      return;
    } else {
      payload = { token: G.online.token, from: G.online.selected, to: cell };
    }
    if (!payload) return;
    G.online.sending = true;
    try {
      const data = await onlineFetch('/api/online/action', payload);
      if (data.state) {
        G.online.selected = null;
        applyOnlineState(data.state);
      }
    } catch (e) {
      showToast(e.message || 'Nước đi không hợp lệ.', 'bad');
      if (e.state) applyOnlineState(e.state);
    } finally {
      G.online.sending = false;
    }
  }

  function onlineEnded(message) {
    G.online.ended = true;
    G.locked = true;
    stopOnlinePolling();
    showToast(message, 'bad', 3000);
    setTimeout(() => {
      if (!dom.resultOverlay.classList.contains('hidden')) return;
      dom.resultOverlay.classList.remove('hidden');
      dom.resultTitle.textContent = 'PHIÊN ONLINE ĐÃ KẾT THÚC';
      dom.resultSub.textContent = message;
      dom.resultScore.textContent = '—';
      dom.resultChat.innerHTML = '<div><b>@tgb_store</b> Kết nối online đã đóng. Bấm “TÌM TRẬN MỚI” để vào hàng đợi.</div>';
      dom.rematchBtn.textContent = 'TÌM TRẬN MỚI';
      dom.menuBtn.textContent = 'VỀ MENU';
    }, 500);
  }

  function cancelOnlineQueue() {
    leaveOnline(true).finally(() => {
      G.online.ended = true;
      dom.findMatchBtn.disabled = false;
      dom.findMatchBtn.classList.remove('hidden');
      dom.cancelQueueBtn.classList.add('hidden');
      setQueueStatus('Đã hủy tìm trận.');
    });
  }

  // ---------------------------------------------------------------------------
  // Dialogue
  // ---------------------------------------------------------------------------
  const INTRO_LINES = [
    {
      who: 'narrator', name: 'TGB STORE', tag: '21:47 • SAU CA',
      text: 'Một tối mưa. Quán vắng như ví của khách. Đồng hồ treo tường kêu to hơn tiếng doanh thu.'
    },
    {
      who: 'shinv', name: 'SHINV', tag: 'NHÂN VIÊN • ĐANG Ế',
      text: 'Hôm nay bán được đúng 0 box. Tao đang cân nhắc đóng cửa đi học nghề... bán nước.'
    },
    {
      who: 'brb', name: 'BRB', tag: 'KHÁCH QUEN • CŨNG Ế',
      text: 'Đóng đi. Nhưng trước khi đóng, làm ván XO chai không? Bàn trắng, ba chai mỗi đứa.'
    },
    {
      who: 'shinv', name: 'SHINV', tag: 'ĐANG TÍNH TOÁN',
      text: 'XO chai? Đặt ba chai rồi nhấc qua nhấc lại như mấy ông già ngoài hè hả?'
    },
    {
      who: 'brb', name: 'BRB', tag: 'ĐỀ XUẤT KHÔNG THỂ TỪ CHỐI',
      text: 'BO3. Thua thì cởi đồ, chạy ra đường hét “TAO LÀ THẰNG BIẾN THÁI”. Dám không?'
    },
    {
      who: 'shinv', name: 'SHINV', tag: 'HƠI DO DỰ',
      text: 'Mày bị gì vậy BRB? ... Nhưng thôi, khách ế sinh ra rảnh. Vào bàn!'
    },
    {
      who: 'brb', name: 'BRB', tag: 'CHỐT KÈO',
      text: 'Luật là luật. Ba chai của tao màu đen, của mày màu cam. Thắng 2 ván là thắng. Bắt đầu!'
    }
  ];

  function clearDialogTimers() {
    clearInterval(G.typeTimer);
    clearTimeout(G.autoDialogTimer);
    G.typeTimer = null;
    G.autoDialogTimer = null;
  }

  function showDialogLine({ who, name, tag, text: lineText }) {
    clearDialogTimers();
    dom.dialogBox.classList.remove('hidden');
    dom.dialogSpeaker.textContent = name;
    dom.dialogTag.textContent = tag;
    dom.dialogText.textContent = '';
    dom.dialogNext.textContent = 'TIẾP ▶';
    paintDialogPortrait(who);
    G.dialogFull = lineText;
    G.dialogShown = 0;
    G.dialogTyping = true;
    G.dialogAuto = false;
    G.typeTimer = setInterval(() => {
      G.dialogShown += 1;
      dom.dialogText.textContent = G.dialogFull.slice(0, G.dialogShown);
      if (G.dialogShown >= G.dialogFull.length) finishTyping();
    }, 12);
  }

  function finishTyping() {
    if (!G.dialogTyping) return;
    clearInterval(G.typeTimer);
    G.typeTimer = null;
    G.dialogShown = G.dialogFull.length;
    dom.dialogText.textContent = G.dialogFull;
    G.dialogTyping = false;
    dom.dialogNext.textContent = 'TIẾP ▶';
  }

  function scheduleAutoDialog(delay) {
    clearTimeout(G.autoDialogTimer);
    G.autoDialogTimer = setTimeout(() => {
      if (G.mode === 'intro') nextIntroLine();
      else if (G.mode === 'outro') finishOutro();
    }, delay);
  }

  function nextIntroLine() {
    if (G.mode !== 'intro' || !G.intro) return;
    if (G.dialogTyping) {
      finishTyping();
      return;
    }
    clearDialogTimers();
    G.intro.line += 1;
    if (G.intro.line >= INTRO_LINES.length) {
      finishIntro();
      return;
    }
    if (G.intro.line === 4) G.intro.walkStart = performance.now();
    showIntroLine();
  }

  function showIntroLine() {
    const line = INTRO_LINES[G.intro.line];
    showDialogLine(line);
    G.dialogAuto = true;
    const wait = 1200 + Math.min(1300, line.text.length * 12);
    scheduleAutoDialog(wait);
  }

  function startIntro() {
    if (G.mode === 'intro') return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    Sound.resume();
    Sound.sfx('start');
    Sound.startMusic();
    G.mode = 'intro';
    G.intro = { start: performance.now(), line: 0, walkStart: 0, finishing: false };
    G.locked = true;
    dom.startScreen.classList.add('hidden');
    dom.resultOverlay.classList.add('hidden');
    dom.roundOverlay.classList.add('hidden');
    dom.helpModal.classList.add('hidden');
    dom.chatFeed.classList.add('hidden');
    dom.chatFeed.innerHTML = '';
    dom.shout.classList.add('hidden');
    dom.subtitle.classList.add('hidden');
    setHudVisible(false);
    dom.skipBtn.classList.remove('hidden');
    dom.skipBtn.innerHTML = '⏭<span>BỎ QUA</span>';
    setTopStatus('KHÁCH Ế • 0 KHÁCH');
    showIntroLine();
  }

  function finishIntro() {
    if (G.mode !== 'intro' || G.intro?.finishing) return;
    if (G.intro) G.intro.finishing = true;
    clearDialogTimers();
    dom.dialogBox.classList.add('hidden');
    dom.fade.classList.add('on');
    setTimeout(() => {
      startMatch();
      setTimeout(() => dom.fade.classList.remove('on'), 120);
    }, 420);
  }

  function skipIntro() {
    if (G.mode === 'intro') finishIntro();
  }

  // ---------------------------------------------------------------------------
  // Match flow
  // ---------------------------------------------------------------------------
  function startMatch() {
    clearTimeout(G.autoNextTimer);
    clearTimeout(G.outroTimer);
    clearMoveClock();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    G.mode = 'game';
    G.match = XO.createMatch();
    dom.nextRoundBtn.disabled = false;
    G.cursors = { shinv: 4, brb: 4 };
    G.locked = false;
    G.anim = null;
    G.winFx = null;
    G.particles = [];
    G.floaters = [];
    G.confetti = [];
    G.pending = null;
    G.helpOpen = false;
    dom.startScreen.classList.add('hidden');
    dom.dialogBox.classList.add('hidden');
    dom.roundOverlay.classList.add('hidden');
    dom.resultOverlay.classList.add('hidden');
    dom.helpModal.classList.add('hidden');
    dom.chatFeed.classList.add('hidden');
    dom.chatFeed.innerHTML = '';
    dom.shout.classList.add('hidden');
    dom.subtitle.classList.add('hidden');
    dom.skipBtn.classList.add('hidden');
    setHudVisible(true);
    setTopStatus('ĐANG ĐẤU • VÁN 1 • 0-0');
    ensureCursorValid('shinv');
    refreshHUD();
    showToast('VÁN 1 • SHINV MỞ MÀN • BO3', 'good', 2800);
    Sound.sfx('start');
    Sound.startMusic();
  }

  function ensureCursorValid(player) {
    const m = G.match;
    if (!m) return;
    const round = m.round;
    const phase = XO.phaseFor(round, player);
    let cur = G.cursors[player];
    if (phase === 'place') {
      if (round.board[cur] !== null) {
        const empty = XO.emptyCells(round);
        G.cursors[player] = empty.includes(4) ? 4 : (empty[0] ?? 4);
      }
    } else if (round.selected === null) {
      const own = XO.ownCells(round, player);
      if (!own.includes(cur)) G.cursors[player] = own[0] ?? 4;
    }
  }

  function moveCursor(player, dx, dy) {
    if (G.mode !== 'game' || G.locked || !G.match) return;
    if (G.online.active && player !== G.online.you) return;
    if (G.match.round.turn !== player) return;
    let col = G.cursors[player] % 3;
    let row = Math.floor(G.cursors[player] / 3);
    col = clamp(col + dx, 0, 2);
    row = clamp(row + dy, 0, 2);
    const next = row * 3 + col;
    if (next !== G.cursors[player]) {
      G.cursors[player] = next;
      Sound.sfx('tick');
    }
  }

  function cancelSelection(player) {
    if (G.mode !== 'game' || G.locked || !G.match) return;
    if (G.online.active) {
      if (player !== G.online.you) return;
      G.online.selected = null;
      if (G.match.round) G.match.round.selected = null;
      Sound.sfx('tick');
      refreshHUD();
      return;
    }
    const round = G.match.round;
    if (round.turn !== player || round.selected === null) return;
    round.selected = null;
    Sound.sfx('tick');
    refreshHUD();
  }

  function pressAction(player) {
    if (G.mode !== 'game' || G.locked || !G.match) return;
    if (G.online.active && player !== G.online.you) return;
    if (G.match.round.turn !== player) {
      showToast(`Chưa tới lượt ${pname(player)}.`, 'bad');
      return;
    }
    handleAction(player, G.cursors[player]);
  }

  function handleAction(player, cell) {
    if (G.mode !== 'game' || G.locked || !G.match) return;
    if (G.online.active) {
      onlineAction(player, cell);
      return;
    }
    const result = XO.applyAction(G.match, player, cell);
    if (!result.ok) {
      Sound.sfx('bad');
      G.shake = 3;
      showToast(result.message, 'bad', 1800);
      return;
    }

    if (result.type === 'select') {
      Sound.sfx('select');
      showToast(`${pname(player)} nhấc chai ${cellName(result.from)} lên.`, 'good', 1300);
      refreshHUD();
      return;
    }
    if (result.type === 'deselect') {
      Sound.sfx('tick');
      refreshHUD();
      return;
    }

    G.locked = true;
    clearMoveClock();
    const now = performance.now();
    const from = result.type === 'move'
      ? cellRect(result.from)
      : { cx: player === 'shinv' ? 560 : 720, cy: player === 'shinv' ? 760 : 150 };
    G.anim = {
      start: now,
      duration: 360,
      player,
      type: result.type,
      from,
      to: cellRect(result.to)
    };
    G.shake = result.wins ? 9 : 3;
    spawnDust(cellRect(result.to).cx, cellRect(result.to).cy, player === 'shinv' ? '#f0a15a' : '#b8a7ff', 9);
    addFloater(result.type === 'move' ? 'NHẤC!' : 'ĐẶT!', cellRect(result.to).cx, cellRect(result.to).cy - 30, pcolor(player));
    if (result.wins) {
      G.winFx = { start: now, line: result.line, player };
      spawnConfetti(110);
      Sound.sfx('win');
    } else {
      Sound.sfx(result.type === 'move' ? 'move' : 'place');
    }

    if (result.wins || result.stalemate || result.repeatLoss || result.draw) {
      setTimeout(() => showRoundResult(result), 900);
      return;
    }

    setTimeout(() => {
      if (G.mode !== 'game') return;
      G.locked = false;
      G.anim = null;
      ensureCursorValid(G.match.round.turn);
      refreshHUD();
      const next = G.match.round.turn;
      if (XO.currentPhase(G.match) === 'move') {
        startMoveClock(next);
        if (G.match.round.selected === null) {
          showToast(`${pname(next)}: 3 giây để hạ chai kề cạnh!`, 'good', 2200);
        }
      } else {
        clearMoveClock();
        if (XO.countOnBoard(G.match.round, next) === 3) {
          showToast(`${pname(next)} đã đủ 3 chai — chờ đối thủ đặt chai cuối!`, 'good', 2200);
        }
      }
    }, 400);
  }

  function showRoundResult(result) {
    if (G.mode !== 'game' || !G.match) return;
    G.locked = true;
    clearMoveClock();
    const m = G.match;
    const winner = result.winner || m.round.winner;
    const loser = other(winner);
    const reason = m.round.winReason || 'line';
    const isFinal = m.status === 'matchOver';
    const reasonText = {
      timeout: `${pname(loser)} không hạ chai trong 3 giây — xử thua.`,
      stalemate: `${pname(loser)} bị khóa đường: cả 3 chai không còn ô trống kề cạnh.`,
      repeat: `${pname(loser)} lặp nước quá 3 lần giữa cùng 2 ô — xử thua.`,
      line: `Ba chai ${META[winner]?.bottle || ''} thẳng hàng. ${pname(loser)} vào ván tiếp với tâm thế... khác.`
    };
    G.pending = isFinal ? 'outro' : 'round';
    dom.roundOverlay.classList.remove('hidden');
    dom.roundEyebrow.textContent = isFinal
      ? 'KẾT THÚC BO3'
      : (reason === 'timeout' ? 'HẾT 3 GIÂY' : reason === 'stalemate' ? 'KHÓA ĐƯỜNG' : reason === 'repeat' ? 'LẶP NƯỚC' : `KẾT THÚC VÁN ${m.roundNo}`);
    dom.roundTitle.textContent = isFinal
      ? `${pname(winner)} THẮNG BO3!`
      : reason === 'timeout'
        ? `${pname(loser)} HẾT GIỜ!`
        : reason === 'stalemate'
          ? `${pname(loser)} BỊ KHÓA ĐƯỜNG!`
          : reason === 'repeat'
            ? `${pname(loser)} LẶP NƯỚC!`
            : `${pname(winner)} THẮNG VÁN ${m.roundNo}!`;
    dom.roundSub.textContent = isFinal
      ? `${pname(loser)} thua chung cuộc. Hình phạt đang chờ ở ngoài cửa.`
      : reasonText[reason] || reasonText.line;
    dom.roundScore.textContent = `${m.wins['shinv']} — ${m.wins.brb}`;
    dom.nextRoundBtn.textContent = isFinal ? 'XEM HÌNH PHẠT ▶' : 'VÁN TIẾP ▶';
    dom.nextRoundBtn.disabled = false;
    refreshHUD();
    clearTimeout(G.autoNextTimer);
    G.autoNextTimer = setTimeout(() => {
      if (G.mode === 'game' && !dom.roundOverlay.classList.contains('hidden')) proceedFromRound();
    }, isFinal ? 5200 : 6000);
  }

  function proceedFromRound() {
    clearTimeout(G.autoNextTimer);
    clearMoveClock();
    if (G.mode !== 'game') return;
    dom.roundOverlay.classList.add('hidden');
    if (G.pending === 'outro') {
      startOutro();
      return;
    }
    const next = XO.nextRound(G.match);
    if (!next.ok) {
      startOutro();
      return;
    }
    G.pending = null;
    G.locked = false;
    G.anim = null;
    G.winFx = null;
    G.confetti = [];
    G.particles = [];
    ensureCursorValid(G.match.round.turn);
    refreshHUD();
    showToast(`VÁN ${G.match.roundNo} • ${pname(G.match.round.turn)} MỞ MÀN`, 'good', 2600);
    Sound.sfx('start');
  }

  // ---------------------------------------------------------------------------
  // Outro / punishment
  // ---------------------------------------------------------------------------
  function outroChats(winner, loser) {
    return [
      { at: 0.6, who: pname(winner), text: 'Luật là luật. Không ai ép.' },
      { at: 1.6, who: pname(loser), text: '...tao biết rồi, khỏi nhắc.' },
      { at: 3.2, who: 'khán giả', text: 'Ủa làm thiệt hả =)))' },
      { at: 4.2, who: 'TGB Store', text: 'Cảnh báo: quán không chịu trách nhiệm về danh dự.' },
      { at: 5.2, who: 'khán giả', text: 'Áo bay kìa =))))' },
      { at: 6.3, who: pname(loser), text: 'Lạnh... lạnh quá...' },
      { at: 7.6, who: 'khán giả', text: 'CHẠY ĐI ÔNG ƠI =)))))' },
      { at: 8.8, who: pname(winner), text: 'Quay lại đây tao tính tiền nước!' },
      { at: 10.0, who: 'TGB Store', text: 'Video đã đạt 1 triệu lượt xem.' }
    ];
  }

  function startOutro() {
    if (!G.match?.matchWinner) return;
    clearTimeout(G.autoNextTimer);
    clearTimeout(G.outroTimer);
    clearMoveClock();
    G.mode = 'outro';
    G.locked = true;
    G.anim = null;
    G.winFx = null;
    G.particles = [];
    G.confetti = [];
    dom.roundOverlay.classList.add('hidden');
    dom.resultOverlay.classList.add('hidden');
    dom.dialogBox.classList.add('hidden');
    setHudVisible(false);
    dom.skipBtn.classList.remove('hidden');
    dom.skipBtn.innerHTML = '⏭<span>BỎ QUA</span>';
    dom.chatFeed.innerHTML = '';
    dom.chatFeed.classList.remove('hidden');
    dom.shout.classList.add('hidden');
    dom.subtitle.classList.remove('hidden');
    const winner = G.match.matchWinner;
    const loser = other(winner);
    G.outro = {
      start: performance.now(),
      winner,
      loser,
      stripStep: 0
    };
    dom.subtitle.innerHTML = `<b>HÌNH PHẠT:</b> ${pname(loser)} phải cởi đồ, chạy ra đường và hét thật to.`;
    setTopStatus('HẬU TRƯỜNG • HÌNH PHẠT');
    dom.footHint.textContent = 'Không có ai bị tổn thương ngoài lòng tự trọng.';
    Sound.sfx('lose');
    outroChats(winner, loser).forEach((c) => {
      setTimeout(() => {
        if (G.mode === 'outro') pushChat(c.who, c.text, c.who === 'khán giả' || c.who === 'TGB Store');
      }, c.at * 1000);
    });
    setTimeout(() => {
      if (G.mode !== 'outro') return;
      dom.shout.classList.remove('hidden');
      dom.shout.querySelector('span').textContent = 'TAO LÀ THẰNG BIẾN THÁI!!!';
      Sound.sfx('shout');
      dom.subtitle.innerHTML = `<b>${pname(loser)}:</b> “TAO LÀ THẰNG BIẾN THÁI!!!” — âm lượng: cả khu phố nghe.`;
    }, 6800);
    G.outroTimer = setTimeout(finishOutro, 14200);
  }

  function finishOutro() {
    if (G.mode !== 'outro') return;
    clearTimeout(G.outroTimer);
    clearMoveClock();
    G.mode = 'result';
    G.locked = true;
    dom.chatFeed.classList.add('hidden');
    dom.shout.classList.add('hidden');
    dom.subtitle.classList.add('hidden');
    dom.skipBtn.classList.add('hidden');
    const winner = G.match.matchWinner;
    const loser = other(winner);
    dom.resultOverlay.classList.remove('hidden');
    dom.resultTitle.textContent = `${pname(winner)} THẮNG BO3!`;
    dom.resultSub.textContent = `${pname(loser)} đã thi hành án phạt. Danh dự: 0. Lượt xem: +1.`;
    dom.resultScore.textContent = `${G.match.wins.shinv} — ${G.match.wins.brb}`;
    dom.resultChat.innerHTML = [
      `<div><b>@tgb_store</b> chúc mừng ${pname(winner)}. Người thua đã rời hiện trường.</div>`,
      `<div><b>@khan_gia_01</b> ván này căng hơn cả giá box =)))</div>`,
      `<div><b>@khan_gia_02</b> ${pname(loser)} chạy nhanh thật, đúng là có tố chất.</div>`,
      `<div><b>@shinv_fan</b> BO3 tiếp không? Tao bao nước.</div>`
    ].join('');
    setTopStatus('KẾT THÚC • DANH DỰ ĐÃ ĐƯỢC GIỮ');
    dom.footHint.textContent = 'Đấu lại đi, biết đâu người thua là bạn.';
    if (G.online.active) {
      const names = G.online.state?.names || {};
      const winnerLabel = names[winner] || pname(winner);
      const loserLabel = names[loser] || pname(loser);
      dom.resultTitle.textContent = `${winnerLabel} (${pname(winner)}) THẮNG BO3!`;
      dom.resultSub.textContent = `${loserLabel} (${pname(loser)}) đã thi hành án phạt. BXH đã cập nhật theo tên hiển thị.`;
      dom.rematchBtn.textContent = 'TÌM TRẬN MỚI';
      dom.menuBtn.textContent = 'VỀ MENU';
      dom.resultChat.innerHTML = [
        `<div><b>@online</b> BO3 kết thúc. BXH đã cập nhật theo tên hiển thị.</div>`,
        `<div><b>@online</b> Không lưu tài khoản/mật khẩu — chỉ tên và kết quả trận.</div>`,
        `<div><b>@online</b> Bấm “TÌM TRẬN MỚI” để vào hàng đợi ngẫu nhiên.</div>`
      ].join('');
      G.online.resultShown = true;
    } else {
      dom.rematchBtn.textContent = 'ĐẤU LẠI BO3';
      dom.menuBtn.textContent = 'VỀ MENU';
    }
    Sound.sfx('win');
    Sound.startMusic();
  }

  function goMenu() {
    clearTimeout(G.autoNextTimer);
    clearTimeout(G.outroTimer);
    clearMoveClock();
    clearDialogTimers();
    if (G.online.token) leaveOnline(true);
    stopOnlinePolling();
    closeOnlineLobby();
    closeSpeaker();
    G.mode = 'menu';
    G.match = null;
    G.locked = true;
    G.outro = null;
    G.intro = null;
    G.pending = null;
    G.particles = [];
    G.confetti = [];
    G.floaters = [];
    dom.startScreen.classList.remove('hidden');
    dom.resultOverlay.classList.add('hidden');
    dom.roundOverlay.classList.add('hidden');
    dom.dialogBox.classList.add('hidden');
    dom.helpModal.classList.add('hidden');
    dom.chatFeed.classList.add('hidden');
    dom.shout.classList.add('hidden');
    dom.subtitle.classList.add('hidden');
    dom.skipBtn.classList.add('hidden');
    setHudVisible(false);
    setTopStatus('KHÁCH Ế • 0 KHÁCH');
    dom.footHint.textContent = 'Khách ế không phải lỗi của chai.';
    Sound.startMusic();
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------
  function spawnDust(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      G.particles.push({
        x, y,
        vx: rand(-55, 55),
        vy: rand(-65, 15),
        life: rand(0.25, 0.55),
        maxLife: 0.55,
        size: rand(2, 5),
        color,
        gravity: 120,
        kind: 'square'
      });
    }
  }

  function spawnConfetti(count = 80) {
    const colors = ['#f3d06a', '#f08a3c', '#a8d36d', '#9a83f0', '#ff6b57', '#fff2d0'];
    for (let i = 0; i < count; i++) {
      G.confetti.push({
        x: rand(300, 980),
        y: rand(90, 250),
        vx: rand(-80, 80),
        vy: rand(-40, 30),
        rot: rand(0, Math.PI * 2),
        vr: rand(-6, 6),
        w: rand(4, 9),
        h: rand(6, 14),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: rand(1.6, 3.2),
        maxLife: 3.2
      });
    }
  }

  function addFloater(str, x, y, color) {
    G.floaters.push({ str, x, y, color, life: 0.9, maxLife: 0.9, vy: -38 });
  }

  function updateParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life -= dt;
      if (p.life <= 0) { G.particles.splice(i, 1); continue; }
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = G.confetti.length - 1; i >= 0; i--) {
      const p = G.confetti[i];
      p.life -= dt;
      if (p.life <= 0) { G.confetti.splice(i, 1); continue; }
      p.vy += 90 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    for (let i = G.floaters.length - 1; i >= 0; i--) {
      const f = G.floaters[i];
      f.life -= dt;
      if (f.life <= 0) { G.floaters.splice(i, 1); continue; }
      f.y += f.vy * dt;
    }
  }

  function drawParticles() {
    for (const p of G.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      px(p.x, p.y, p.size, p.size, p.color);
    }
    ctx.globalAlpha = 1;
    for (const p of G.confetti) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const f of G.floaters) {
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
      text(f.str, f.x, f.y, 14, f.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // Canvas scenes
  // ---------------------------------------------------------------------------
  function drawFloor(x, y, w, h, tile = 48) {
    px(x, y, w, h, '#6e765d');
    for (let yy = y; yy < y + h; yy += tile) {
      for (let xx = x; xx < x + w; xx += tile) {
        const odd = ((xx / tile) + (yy / tile)) % 2 === 0;
        px(xx, yy, tile - 1, tile - 1, odd ? '#747c63' : '#7b836b');
        px(xx + 2, yy + 2, tile - 4, 1, 'rgba(255,255,255,.05)');
      }
    }
  }

  function drawWallTop() {
    px(0, 0, W, 166, '#3e4d3c');
    for (let y = 0; y < 166; y += 22) {
      px(0, y, W, 1, '#51604d');
      for (let x = (y % 44 ? 28 : 0); x < W; x += 62) px(x, y, 1, 22, '#4b5948');
    }
    px(0, 164, W, 5, '#2a382b');
  }

  function drawNeonSign(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.shadowColor = '#f08a3c';
    ctx.shadowBlur = 14;
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillStyle = '#ffb15f';
    ctx.fillText('TGB', 0, 0);
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#f0e4c4';
    ctx.fillText('STORE', 1, 16);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#7a3b1b';
    ctx.fillRect(0, 4, 52, 2);
    ctx.restore();
  }

  function drawShelfBank(x, y, w, h, now, wide = false) {
    px(x, y, w, h, '#26392b');
    px(x - 4, y - 4, w + 8, 6, '#c5b98d');
    const cols = wide ? 6 : 6;
    const rows = wide ? 3 : 4;
    const cellW = (w - 18) / cols;
    const cellH = (h - 24) / rows;
    for (let r = 0; r < rows; r++) {
      px(x + 6, y + 10 + r * cellH + cellH - 4, w - 12, 4, '#caa66c');
      for (let c = 0; c < cols; c++) {
        const bx = x + 10 + c * cellW;
        const by = y + 13 + r * cellH;
        const colors = ['#d9c47c', '#c8a662', '#e4d9a7', '#b58c50', '#d8b96f'];
        const bw = cellW - 7;
        const bh = cellH - 10;
        px(bx, by, bw, bh, colors[(c + r) % colors.length]);
        px(bx, by, bw, 3, '#f1e2ad');
        px(bx + 4, by + 5, bw - 8, 2, '#8f6e3d');
        px(bx + 4, by + 8, bw - 14, 1, '#8f6e3d');
      }
    }
    if (!wide) {
      text('THẺ BÀI • BOX', x + 8, y + h + 16, 9, '#cfdbb7');
    }
    // tiny flickering price labels
    for (let i = 0; i < 5; i++) {
      const fx = x + 22 + i * (w / 6);
      const fl = Math.sin(now / 900 + i) > 0.2;
      px(fx, y + h - 15, 18, 8, fl ? '#e8dfb9' : '#d4caa1');
      px(fx + 5, y + h - 12, 8, 1, '#5d4b2f');
    }
  }

  function drawCounter(x, y, w, h) {
    px(x + 5, y + 8, w, h, 'rgba(0,0,0,.35)');
    px(x, y, w, h, '#2c4434');
    px(x, y, w, 12, '#cbbf96');
    px(x + 5, y + 16, w - 10, h - 20, '#243b2e');
    px(x + 12, y + 26, 92, 60, '#12261c');
    px(x + 16, y + 30, 84, 52, '#e9e5cf');
    ctx.font = 'bold 21px "Courier New", monospace';
    ctx.fillStyle = '#1b2b20';
    ctx.fillText('TGB', x + 33, y + 61);
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.fillStyle = '#7e9a6e';
    ctx.fillText('STORE', x + 36, y + 73);
    px(x + 12, y + 88, 90, 5, '#0f1c14');
    px(x + 116, y + 28, 34, 20, '#0d1b12');
    px(x + 120, y + 32, 26, 3, '#b8e477');
    px(x + 120, y + 38, 26, 3, '#7d9b65');
    px(x + 116, y + 51, 65, 29, '#1a2d20');
    px(x + 121, y + 56, 20, 3, '#e2d9b4');
    px(x + 121, y + 62, 30, 2, '#9a926f');
    // register
    px(x + w - 80, y + 22, 56, 35, '#3c4f3b');
    px(x + w - 74, y + 27, 44, 18, '#98b58b');
    px(x + w - 69, y + 31, 34, 3, '#203923');
    px(x + w - 69, y + 37, 22, 2, '#203923');
    px(x + w - 70, y + 49, 40, 5, '#203923');
  }

  function drawSpeakerBox(x, y, now) {
    ctx.save();
    ctx.translate(x, y);
    px(-34, -27, 68, 42, '#1b2b20');
    px(-38, -31, 76, 10, '#bbaa7d');
    px(-30, -23, 27, 34, '#31453a');
    px(-27, -20, 21, 28, '#0e1811');
    px(-23, -16, 13, 18, '#5d7560');
    px(3, -23, 27, 34, '#31453a');
    px(6, -20, 21, 28, '#0e1811');
    px(10, -16, 13, 18, '#5d7560');
    px(-12, 20, 24, 5, '#0c140e');
    const beat = 2 + Math.sin(now / 180) * 2;
    ctx.globalAlpha = .7;
    px(-1, -20, 1, 1, '#f4df99');
    ctx.globalAlpha = 1;
    text('♪', 22, -34 - beat, 15, '#f3d06a', 'center');
    text('LOA', 0, 13, 8, '#d9e4c5', 'center');
    ctx.restore();
  }

  function drawPlant(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    px(-10, -3, 20, 12, '#b66c4c');
    px(-8, -7, 16, 6, '#7b4631');
    px(-2, -35, 4, 30, '#4d6a3e');
    for (const [dx, dy, w, h, color] of [
      [-15, -38, 15, 8, '#517a44'], [1, -42, 16, 8, '#5d8a4b'],
      [-12, -29, 12, 7, '#446b3b'], [4, -31, 12, 7, '#527d44']
    ]) px(dx, dy, w, h, color);
    ctx.restore();
  }

  function drawChair(x, y, facing = 'bottom', scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const backY = facing === 'bottom' ? 10 : -36;
    px(-26, backY, 52, 12, '#3d2c23');
    px(-26, backY + 2, 52, 3, '#7a5b40');
    px(-21, backY + 12, 7, 10, '#2c2019');
    px(14, backY + 12, 7, 10, '#2c2019');
    ctx.restore();
  }

  function drawTable(cx, cy, size, opts = {}) {
    const cell = size / 3;
    const x = cx - size / 2;
    const y = cy - size / 2;
    ctx.save();
    // shadow and thickness
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x + 13, y + 17, size + 4, size + 4);
    px(x - 10, y + 9, size + 26, size + 17, '#b7ae94');
    px(x - 7, y + 6, size + 20, size + 17, '#d8d0b9');
    px(x - 3, y + 2, size + 11, size + 11, '#eee7d3');
    px(x, y, size, size, '#f5f0df');
    // subtle cell shading
    for (let i = 0; i < 9; i++) {
      const r = cellRect(i, { cx, cy, size, cell });
      px(r.x + 2, r.y + 2, cell - 4, cell - 4, i % 2 ? '#f5f0df' : '#f8f3e4');
      px(r.x + 4, r.y + 4, cell - 8, 1, 'rgba(255,255,255,.55)');
    }
    // grid
    const grid = Math.max(6, Math.round(size * 0.018));
    for (let i = 1; i <= 2; i++) {
      px(x + i * cell - grid / 2, y + 4, grid, size - 8, '#1a201a');
      px(x + 4, y + i * cell - grid / 2, size - 8, grid, '#1a201a');
    }
    // outer border
    ctx.strokeStyle = '#151b15';
    ctx.lineWidth = Math.max(5, size * 0.017);
    ctx.strokeRect(x, y, size, size);
    ctx.strokeStyle = '#fffdf1';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 8, size - 16, size - 16);
    // corner screws
    for (const [sx, sy] of [[x + 16, y + 16], [x + size - 16, y + 16], [x + 16, y + size - 16], [x + size - 16, y + size - 16]]) {
      px(sx - 3, sy - 3, 7, 7, '#b4aa8e');
      px(sx - 1, sy - 1, 3, 3, '#6e654e');
    }
    if (opts.label) {
      ctx.globalAlpha = 0.13;
      text(opts.label, cx, cy + 6, Math.round(size * 0.055), '#6f6751', 'center');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawBottle(x, y, player, o = {}) {
    const s = o.scale ?? 1;
    const lift = o.lift || 0;
    const alpha = o.alpha ?? 1;
    const selected = !!o.selected;
    const isShin = player === 'shinv';
    const body = isShin ? '#e8752b' : '#2c2845';
    const bodyHi = isShin ? '#ffb15f' : '#6b5fa0';
    const bodyDark = isShin ? '#a53f14' : '#171429';
    const cap = isShin ? '#f3d38f' : '#cfc5f1';
    const label = isShin ? '#ffe8b0' : '#d94a52';
    const labelDark = isShin ? '#c86927' : '#872d34';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y - lift));
    ctx.scale(s, s);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.26)';
    ctx.beginPath();
    ctx.ellipse(0, 19, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (selected) {
      ctx.shadowColor = isShin ? '#ffbe75' : '#c7b8ff';
      ctx.shadowBlur = 18;
    }
    // body
    ctx.fillStyle = body;
    ctx.fillRect(-12, -17, 24, 36);
    ctx.fillStyle = bodyHi;
    ctx.fillRect(-9, -16, 5, 31);
    ctx.fillStyle = bodyDark;
    ctx.fillRect(8, -16, 4, 31);
    // shoulder / neck
    ctx.fillStyle = body;
    ctx.fillRect(-8, -27, 16, 12);
    ctx.fillStyle = bodyHi;
    ctx.fillRect(-6, -26, 3, 10);
    ctx.fillStyle = bodyDark;
    ctx.fillRect(5, -26, 3, 10);
    // cap
    ctx.fillStyle = cap;
    ctx.fillRect(-6, -34, 12, 8);
    ctx.fillStyle = isShin ? '#fff1c8' : '#e5ddff';
    ctx.fillRect(-5, -33, 3, 3);
    ctx.fillStyle = '#171a16';
    ctx.fillRect(-6, -27, 12, 2);
    // label
    ctx.fillStyle = '#fff5dc';
    ctx.fillRect(-10, -9, 20, 15);
    ctx.fillStyle = label;
    ctx.fillRect(-10, -2, 20, 5);
    ctx.fillStyle = labelDark;
    ctx.fillRect(-10, 3, 20, 2);
    ctx.font = `bold ${isShin ? 5 : 6}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = isShin ? '#7e3e17' : '#2a1c25';
    ctx.fillText(isShin ? 'CAM' : 'REAL', 0, -4);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(-7, -15, 2, 6);
    ctx.restore();
  }

  function drawWinLine(line, progress, color) {
    if (!line || progress <= 0) return;
    const a = cellRect(line[0]);
    const c = cellRect(line[2]);
    ctx.save();
    ctx.lineCap = 'round';
    for (const [width, alpha] of [[16, 0.12], [10, 0.3], [4, 0.95]]) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.cx, a.cy);
      ctx.lineTo(lerp(a.cx, c.cx, progress), lerp(a.cy, c.cy, progress));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff5d6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(lerp(a.cx, c.cx, progress), lerp(a.cy, c.cy, progress));
    ctx.stroke();
    ctx.restore();
  }

  function drawCursorFor(player, cell, phase, selected) {
    if (cell == null) return;
    const r = cellRect(cell);
    const color = pcolor(player);
    const pulse = 0.55 + Math.sin(performance.now() / 160) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.fillRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.setLineDash([13, 9]);
    ctx.strokeRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
    ctx.setLineDash([]);
    // corner brackets
    const L = 18;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fff4d4';
    for (const [cx, cy, dx, dy] of [
      [r.x + 10, r.y + 10, 1, 1],
      [r.x + r.w - 10, r.y + 10, -1, 1],
      [r.x + 10, r.y + r.h - 10, 1, -1],
      [r.x + r.w - 10, r.y + r.h - 10, -1, -1]
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * L, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * L);
      ctx.stroke();
    }
    if (selected) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.cx, r.cy, 34 + Math.sin(performance.now() / 120) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLegalTargets(round, player) {
    if (round.selected === null) return;
    const targets = XO.legalMoves(round, player)
      .filter((m) => m.from === round.selected)
      .map((m) => m.to);
    const pulse = 0.55 + Math.sin(performance.now() / 150) * 0.25;
    for (const to of targets) {
      const r = cellRect(to);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#a8d36d';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 7]);
      ctx.strokeRect(r.x + 22, r.y + 22, r.w - 44, r.h - 44);
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#a8d36d';
      ctx.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
      ctx.globalAlpha = 0.9;
      text('KỀ', r.cx, r.cy + 6, 12, '#d9ffb0', 'center');
      ctx.restore();
    }
  }

  function drawTurnHighlights(round, player) {
    if (round.turn !== player) return;
    const phase = XO.phaseFor(round, player);
    if (phase !== 'move' || round.selected === null) {
      if (phase === 'move') {
        for (const i of XO.ownCells(round, player)) {
          const r = cellRect(i);
          const bob = Math.sin(performance.now() / 240 + i) * 4;
          text('↑', r.cx, r.y + 22 + bob, 18, pcolor(player), 'center');
        }
      }
      return;
    }
  }

  function drawTableScene(now) {
    drawWallTop();
    drawFloor(0, 166, W, H - 166, 52);
    // lighting strips
    px(0, 166, W, 2, 'rgba(240, 230, 190, .2)');
    drawNeonSign(36, 206, 0.9);
    drawCounter(0, 240, 246, 196);
    drawShelfBank(272, 185, 158, 178, now);
    drawShelfBank(1004, 185, 250, 280, now);
    drawPlant(988, 488, 1.2);
    drawPlant(20, 600, 1.1);
    drawSpeakerBox(148, 548, now);
    // distant table / boxes
    px(88, 482, 82, 39, '#4a573f');
    px(92, 474, 74, 11, '#c1b589');
    px(98, 456, 54, 20, '#d7c37b');
    px(102, 459, 46, 4, '#f2e3aa');
    px(1010, 532, 118, 18, '#49563f');
    px(1016, 522, 105, 12, '#bdb18b');
    // chairs
    drawChair(TABLE.cx, TABLE.cy + TABLE.size / 2 + 4, 'bottom', 1.12);
    drawChair(TABLE.cx, TABLE.cy - TABLE.size / 2 - 4, 'top', 1.12);
    drawTable(TABLE.cx, TABLE.cy, TABLE.size, { label: '' });

    const round = G.match?.round;
    if (round) {
      // bottle shadows then bodies
      for (let i = 0; i < 9; i++) {
        const player = round.board[i];
        if (!player) continue;
        if (G.anim && G.anim.to.index === i && G.anim.type) continue;
        const r = cellRect(i);
        drawBottle(r.cx, r.cy + 4, player, { scale: 1, selected: round.selected === i, lift: round.selected === i ? 6 + Math.sin(now / 150) * 3 : 0 });
      }
      if (G.anim) {
        const t = clamp((now - G.anim.start) / G.anim.duration, 0, 1);
        const e = easeInOut(t);
        const lift = Math.sin(t * Math.PI) * 38;
        const x = lerp(G.anim.from.cx, G.anim.to.cx, e);
        const y = lerp(G.anim.from.cy, G.anim.to.cy, e) - lift;
        drawBottle(x, y + 4, G.anim.player, { scale: 1, lift: 0, alpha: 1 });
        if (t > 0.55) {
          ctx.globalAlpha = (1 - t) * 0.45;
          px(G.anim.to.cx - 12, G.anim.to.cy + 18, 24, 3, pcolor(G.anim.player));
          ctx.globalAlpha = 1;
        }
      }
      const active = round.turn;
      drawTurnHighlights(round, active);
      drawCursorFor(active, G.cursors[active], XO.phaseFor(round, active), round.selected);
      drawLegalTargets(round, active);
      if (G.winFx) {
        const p = clamp((now - G.winFx.start) / 500, 0, 1);
        drawWinLine(G.winFx.line, easeOut(p), pcolor(G.winFx.player));
      }
    }

    // Hai người ngồi hai phía, đủ thân áo để nhận ra Man Utd / Real.
    drawActor(ctx, SEATS.brb.x, SEATS.brb.y, {
      player: 'brb', scale: 1.4, seated: true, time: now / 1000,
      blink: Math.sin(now / 2300) > 0.96,
      celebrate: G.winFx?.player === 'brb' ? 1 : 0
    });
    drawActor(ctx, SEATS.shinv.x, SEATS.shinv.y, {
      player: 'shinv', scale: 1.4, seated: true, time: now / 1000,
      blink: Math.sin(now / 2100 + 1) > 0.96,
      celebrate: G.winFx?.player === 'shinv' ? 1 : 0
    });

    drawParticles();
    // ambient dust
    for (let i = 0; i < 9; i++) {
      const x = (i * 151 + now * 0.008 * (i % 3 + 1)) % W;
      const y = 210 + ((i * 67 + now * 0.01) % 420);
      ctx.globalAlpha = 0.18;
      px(x, y, 2, 2, '#f5e7b5');
      ctx.globalAlpha = 1;
    }
  }

  function drawWideStore(now, opts = {}) {
    // street to the left of the shop
    px(0, 0, W, H, '#3c4c51');
    px(0, 0, 154, H, '#2d3e46');
    for (let y = 0; y < H; y += 42) {
      px(12, y, 3, 20, '#6e858b');
      px(128, y + 10, 2, 26, '#5d747b');
    }
    px(0, 244, 154, 7, '#b4b59d');
    px(0, 500, 154, 7, '#b4b59d');
    px(150, 0, 18, H, '#aeb7a6');
    // rain
    ctx.strokeStyle = 'rgba(190, 224, 232, .32)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 46; i++) {
      const x = (i * 73 + now * 0.045) % 150;
      const y = (i * 97 + now * 0.34) % H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 13);
      ctx.stroke();
    }
    // shop floor and wall
    drawFloor(168, 0, W - 168, H, 48);
    drawWallTop();
    px(168, 164, W - 168, 5, '#2a382b');
    // door
    px(168, 520, 20, 128, '#263c34');
    px(188, 530, 12, 108, '#8a5f43');
    px(188, 534, 12, 5, '#c9a66d');
    px(188, 630, 12, 8, '#d8c89c');
    // sign above door
    ctx.save();
    ctx.shadowColor = '#f08a3c';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#f4e6c0';
    ctx.fillRect(178, 468, 200, 38);
    ctx.fillStyle = '#223322';
    ctx.font = 'bold 21px "Courier New", monospace';
    ctx.fillText('TGB STORE', 192, 495);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f08a3c';
    ctx.fillRect(178, 506, 200, 5);
    ctx.restore();
    drawNeonSign(214, 90, 1.2);
    drawShelfBank(320, 70, 374, 170, now, true);
    drawShelfBank(1018, 70, 232, 210, now, true);
    // photo wall
    px(716, 56, 268, 132, '#1b2c21');
    for (let i = 0; i < 4; i++) {
      const px1 = 724 + i * 64;
      px(px1, 66, 56, 52, '#e1d7b5');
      px(px1 + 4, 70, 48, 44, ['#61836c', '#7d6a55', '#4a6072', '#795b62'][i]);
      px(px1 + 13, 80, 17, 17, '#d6a87f');
      px(px1 + 13, 97, 17, 11, '#3c4c3d');
    }
    px(724, 126, 244, 42, '#f0e7c8');
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.fillStyle = '#4f5c43';
    ctx.fillText('TGB STORE • 0175 • TRADING CARD GAMES', 731, 151);
    // counter
    drawCounter(236, 264, 250, 174);
    drawPlant(193, 444, 1.1);
    // extra seating right
    drawChair(1052, 548, 'top', 1);
    drawChair(1120, 548, 'top', 1);
    px(1024, 566, 146, 14, '#f1eddd');
    px(1032, 580, 8, 20, '#d8d3c1');
    px(1150, 580, 8, 20, '#d8d3c1');
    px(1074, 555, 9, 12, '#c26d55');
    // table + chairs
    drawChair(WIDE.cx, WIDE.cy + WIDE.size / 2 + 8, 'bottom', 1.05);
    drawChair(WIDE.cx, WIDE.cy - WIDE.size / 2 - 8, 'top', 1.05);
    drawTable(WIDE.cx, WIDE.cy, WIDE.size, { label: '' });
    // board bottles in wide view
    const showBoard = opts.board && opts.board.some(Boolean);
    if (showBoard) {
      opts.board.forEach((player, i) => {
        if (!player) return;
        const r = cellRect(i, WIDE);
        drawBottle(r.cx, r.cy + 3, player, { scale: 0.78, lift: 3 });
      });
    }
    // characters
    if (opts.intro) drawIntroActors(now, opts.intro);
    else if (opts.outro) drawOutroActors(now, opts.outro);
    else if (opts.menu) drawMenuActors(now);
    else drawMenuActors(now);
    drawParticles();
    // empty-shop sign
    if (opts.intro || opts.menu) {
      const flicker = Math.sin(now / 380) > -0.65;
      px(1090, 214, 162, 28, '#101d14');
      ctx.strokeStyle = '#844e2c';
      ctx.strokeRect(1090, 214, 162, 28);
      text('KHÁCH: 0', 1171, 233, 12, flicker ? '#f0a35c' : '#7c5c3c', 'center');
    }
  }

  function drawMenuActors(now) {
    drawActor(ctx, WIDE_SEATS.shinv.x, WIDE_SEATS.shinv.y, { player: 'shinv', scale: 1.18, seated: true, time: now / 1000 });
    drawActor(ctx, WIDE_SEATS.brb.x, WIDE_SEATS.brb.y, { player: 'brb', scale: 1.18, seated: true, time: now / 1000 + 1 });
    // speech bubble
    const bob = Math.sin(now / 500) * 2;
    roundRect(ctx, 842, 226 + bob, 138, 34, 4, '#f4ecd6');
    ctx.fillStyle = '#1b271d';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillText('Làm ván không?', 852, 247 + bob);
    px(850, 258 + bob, 8, 8, '#f4ecd6');
  }

  function drawIntroActors(now, intro) {
    const walk = intro.line >= 4 ? easeInOut((now - (intro.walkStart || now)) / 2100) : 0;
    const shinvFrom = { x: 348, y: 430 };
    const brbFrom = { x: 940, y: 406 };
    const shinvTo = WIDE_SEATS.shinv;
    const brbTo = WIDE_SEATS.brb;
    const shx = lerp(shinvFrom.x, shinvTo.x, walk);
    const shy = lerp(shinvFrom.y, shinvTo.y, walk);
    const brx = lerp(brbFrom.x, brbTo.x, walk);
    const bry = lerp(brbFrom.y, brbTo.y, walk);
    const seated = walk > 0.96;
    drawActor(ctx, brx, bry, {
      player: 'brb', scale: 1.2, seated, walk: walk > 0.02 && !seated ? 1 : 0,
      time: now / 1000 + 0.4
    });
    drawActor(ctx, shx, shy, {
      player: 'shinv', scale: 1.2, seated, walk: walk > 0.02 && !seated ? 1 : 0,
      time: now / 1000
    });
    if (!seated) {
      text('...', shx + 24, shy - 84, 14, '#e8d8a9', 'center');
    }
  }

  function drawOutroActors(now, outro) {
    const t = (now - outro.start) / 1000;
    const loser = outro.loser;
    const winner = outro.winner;
    const loserSeat = WIDE_SEATS[loser];
    const winnerSeat = WIDE_SEATS[winner];
    const stand = clamp((t - 1.8) / 0.8, 0, 1);
    const runP = clamp((t - 6.8) / 3.9, 0, 1);
    const clothes = {
      shirt: t < 3.7,
      shorts: t < 4.5,
      shoes: t < 5.3
    };
    const naked = t >= 4.5;
    // winner stands and claps
    const wx = winnerSeat.x + (winner === 'shinv' ? -76 : 76);
    const wy = winnerSeat.y + (winner === 'brb' ? 16 : -16);
    drawActor(ctx, wx, wy, {
      player: winner, scale: 1.2, seated: false, celebrate: t > 2.4 ? 1 : 0,
      time: now / 1000, blink: false
    });
    const bubble = { x: wx + (winner === 'shinv' ? -60 : 60), y: wy - 84 };
    roundRect(ctx, bubble.x - 54, bubble.y - 15, 116, 30, 4, '#f3ead4');
    ctx.fillStyle = '#26301f';
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t < 4 ? 'Luật là luật.' : 'Nhớ quay lại nhé!', bubble.x + 4, bubble.y + 4);
    ctx.textAlign = 'left';

    // loser: seated -> standing -> running
    let lx = loserSeat.x;
    let ly = loserSeat.y;
    if (t > 1.8) {
      lx += (loser === 'shinv' ? -64 : 64) * stand;
      ly += (loser === 'shinv' ? -12 : 12) * stand;
    }
    if (runP > 0) {
      const p = easeIn(runP);
      lx = lerp(lx, -90, p);
      ly = lerp(ly, 566, p);
    }
    const running = runP > 0;
    drawActor(ctx, lx, ly, {
      player: loser,
      scale: 1.2,
      seated: t < 2.1 && runP === 0,
      run: running ? 1 : 0,
      walk: t > 1.8 && runP === 0 ? 1 : 0,
      clothes: {
        shirt: clothes.shirt,
        shorts: clothes.shorts,
        shoes: clothes.shoes
      },
      censor: naked,
      time: now / 1000 + 0.2,
      alpha: runP > 0.92 ? clamp((1 - runP) / 0.08, 0, 1) : 1
    });
    if (naked && !running) {
      text('...', lx + 30, ly - 55, 16, '#e9d8a9', 'center');
    }
    if (running) {
      // speed lines
      for (let i = 0; i < 7; i++) {
        const sx = lx + 30 + i * 18;
        const sy = ly - 18 + (i % 3) * 12;
        px(sx, sy, 20 + i * 4, 2, 'rgba(248,236,208,.45)');
      }
    }
    // clothes flying
    const pieces = [
      { at: 3.7, color: '#c51d2e', w: 30, h: 24, label: 'ÁO' },
      { at: 4.5, color: '#252b32', w: 26, h: 16, label: 'QUẦN' },
      { at: 5.3, color: '#d8ddce', w: 18, h: 9, label: 'GIÀY' }
    ];
    for (const piece of pieces) {
      const age = t - piece.at;
      if (age < 0 || age > 2.2) continue;
      const px1 = loserSeat.x + (loser === 'shinv' ? -50 : 50) + age * 50 + Math.sin(age * 6) * 18;
      const py1 = loserSeat.y - 80 - age * 55 + age * age * 18;
      ctx.save();
      ctx.translate(px1, py1);
      ctx.rotate(age * 4 + piece.at);
      ctx.globalAlpha = clamp(1 - age / 2.2, 0, 1);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.strokeStyle = '#0b100c';
      ctx.strokeRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.restore();
      if (age < 0.8) text(piece.label, px1 + 22, py1 - 8, 7, '#fff0c7');
    }
  }

  // ---------------------------------------------------------------------------
  // Render loop / transitions
  // ---------------------------------------------------------------------------
  function render(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (G.shake > 0.2) {
      ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
    }
    if (G.mode === 'menu') {
      drawWideStore(now, { menu: true });
    } else if (G.mode === 'intro') {
      drawWideStore(now, { intro: G.intro });
    } else if (G.mode === 'outro') {
      drawWideStore(now, { outro: G.outro, board: G.match?.round.board });
    } else if (G.mode === 'game' || G.mode === 'result') {
      drawTableScene(now);
    } else {
      drawWideStore(now, { menu: true });
    }
    ctx.restore();
    // subtle screen light
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,240,190,.05)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(0,0,0,.16)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function loop(now) {
    const dt = G.last ? Math.min(0.06, (now - G.last) / 1000) : 0;
    G.last = now;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);
    updateParticles(dt);
    if (G.mode === 'outro' && G.outro) {
      const t = (now - G.outro.start) / 1000;
      if (t > 3.6 && !G.outro.strip1) { G.outro.strip1 = true; Sound.sfx('strip'); G.shake = 5; }
      if (t > 4.4 && !G.outro.strip2) { G.outro.strip2 = true; Sound.sfx('strip'); G.shake = 7; }
      if (t > 5.2 && !G.outro.strip3) { G.outro.strip3 = true; Sound.sfx('pop'); G.shake = 4; }
      if (t > 6.8 && !G.outro.runSound) { G.outro.runSound = true; Sound.sfx('run'); }
      if (t > 12.5) dom.fade.classList.add('on');
    } else {
      dom.fade.classList.remove('on');
    }
    render(now);
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------------------
  // Input / bindings
  // ---------------------------------------------------------------------------
  function openHelp() {
    if (G.helpOpen) return;
    G.helpOpen = true;
    dom.helpModal.classList.remove('hidden');
    setTimeout(() => dom.helpClose.focus(), 30);
  }

  function closeHelp() {
    G.helpOpen = false;
    dom.helpModal.classList.add('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function bind() {
    dom.startBtn.addEventListener('click', startIntro);
    dom.startOnlineBtn.addEventListener('click', openOnlineLobby);
    $('startSpeakerBtn').addEventListener('click', openSpeaker);
    dom.startHelpBtn.addEventListener('click', openHelp);
    dom.findMatchBtn.addEventListener('click', findOnlineMatch);
    dom.cancelQueueBtn.addEventListener('click', cancelOnlineQueue);
    dom.onlineBackBtn.addEventListener('click', async () => {
      if (G.online.active) return;
      await leaveOnline(true);
      closeOnlineLobby();
    });
    dom.onlineName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); findOnlineMatch(); }
    });
    dom.helpBtn.addEventListener('click', openHelp);
    dom.helpClose.addEventListener('click', closeHelp);
    dom.helpModal.addEventListener('click', (e) => { if (e.target === dom.helpModal) closeHelp(); });
    dom.speakerBtn.addEventListener('click', openSpeaker);
    dom.speakerModal.addEventListener('click', (e) => { if (e.target === dom.speakerModal) closeSpeaker(); });
    dom.playYoutubeBtn.addEventListener('click', playYoutube);
    dom.stopYoutubeBtn.addEventListener('click', stopYoutube);
    dom.speakerCloseBtn.addEventListener('click', closeSpeaker);
    dom.youtubeUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); playYoutube(); }
    });
    dom.soundBtn.addEventListener('click', () => {
      G.sound = !G.sound;
      updateSoundUI();
      if (G.sound) {
        Sound.resume();
        Sound.sfx('tick');
        if (G.music) Sound.startMusic();
      } else {
        Sound.stopMusic();
      }
    });
    dom.footSound.addEventListener('click', () => {
      G.music = !G.music;
      if (G.music && G.sound) Sound.startMusic(); else Sound.stopMusic();
      updateSoundUI();
    });
    dom.fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else dom.stage.requestFullscreen?.().catch(() => {});
    });
    dom.skipBtn.addEventListener('click', () => {
      if (G.mode === 'intro') skipIntro();
      else if (G.mode === 'outro') finishOutro();
    });
    dom.dialogNext.addEventListener('click', () => {
      if (G.mode === 'intro') nextIntroLine();
      else if (G.mode === 'outro') finishOutro();
    });
    dom.dialogSkip.addEventListener('click', () => {
      if (G.mode === 'intro') skipIntro();
      else if (G.mode === 'outro') finishOutro();
    });
    dom.nextRoundBtn.addEventListener('click', () => {
      if (G.online.active) sendReadyOnline();
      else proceedFromRound();
    });
    dom.rematchBtn.addEventListener('click', async () => {
      if (G.online.active) {
        await leaveOnline(true);
        dom.resultOverlay.classList.add('hidden');
        G.mode = 'menu';
        dom.startScreen.classList.remove('hidden');
        openOnlineLobby();
        return;
      }
      startMatch();
    });
    dom.menuBtn.addEventListener('click', async () => {
      if (G.online.active) await leaveOnline(true);
      goMenu();
    });
    dom.ruleToggle.addEventListener('click', () => {
      const collapsed = dom.ruleBody.classList.toggle('hidden');
      dom.ruleToggle.textContent = collapsed ? '+' : '−';
      dom.ruleToggle.setAttribute('aria-expanded', String(!collapsed));
    });
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button') : null;
      if (btn) setTimeout(() => btn.blur(), 0);
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (G.mode !== 'game' || !G.match || G.locked) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * W;
      const y = (e.clientY - rect.top) / rect.height * H;
      if (x > 104 && x < 194 && y > 508 && y < 596) {
        openSpeaker();
        return;
      }
      if (x < TABLE.cx - TABLE.size / 2 - 8 || x > TABLE.cx + TABLE.size / 2 + 8) return;
      if (y < TABLE.cy - TABLE.size / 2 - 8 || y > TABLE.cy + TABLE.size / 2 + 8) return;
      const col = clamp(Math.floor((x - (TABLE.cx - TABLE.size / 2)) / TABLE.cell), 0, 2);
      const row = clamp(Math.floor((y - (TABLE.cy - TABLE.size / 2)) / TABLE.cell), 0, 2);
      const cell = row * 3 + col;
      const player = G.online.active ? G.online.you : G.match.round.turn;
      if (G.match.round.turn !== player) return;
      G.cursors[player] = cell;
      handleAction(player, cell);
    });
    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.target && e.target.closest && e.target.closest('button')) {
        if (k === 'escape' && G.helpOpen) closeHelp();
        if (k === 'enter' || k === ' ') return; // để nút tự xử lý click native
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter', 'backspace'].includes(k)) {
        if (!(e.target instanceof HTMLButtonElement && k === 'enter')) e.preventDefault();
      }
      if (G.helpOpen) {
        if (k === 'escape') closeHelp();
        return;
      }
      if (G.mode === 'menu') {
        if (k === 'enter') startIntro();
        if (k === 'h') openHelp();
        return;
      }
      if (G.mode === 'intro') {
        if (k === ' ' || k === 'enter') nextIntroLine();
        if (k === 'escape') skipIntro();
        return;
      }
      if (G.mode === 'outro') {
        if (k === ' ' || k === 'enter' || k === 'escape') finishOutro();
        return;
      }
      if (G.mode === 'game') {
        if (G.match && G.match.status !== 'playing') {
          if (k === 'enter' || k === ' ') {
            if (G.online.active) sendReadyOnline();
            else proceedFromRound();
          }
          return;
        }
        if (k === 'h') { openHelp(); return; }
        if (G.locked || !G.match) return;
        const turn = G.match.round.turn;
        if (turn === 'shinv') {
          if (k === 'w') moveCursor('shinv', 0, -1);
          else if (k === 's') moveCursor('shinv', 0, 1);
          else if (k === 'a') moveCursor('shinv', -1, 0);
          else if (k === 'd') moveCursor('shinv', 1, 0);
          else if (k === 'e') pressAction('shinv');
          else if (k === 'q') cancelSelection('shinv');
        } else {
          if (k === 'arrowup') moveCursor('brb', 0, -1);
          else if (k === 'arrowdown') moveCursor('brb', 0, 1);
          else if (k === 'arrowleft') moveCursor('brb', -1, 0);
          else if (k === 'arrowright') moveCursor('brb', 1, 0);
          else if (k === 'enter') pressAction('brb');
          else if (k === 'backspace') cancelSelection('brb');
        }
      }
      if (G.mode === 'result') {
        if (k === 'enter') startMatch();
        if (k === 'escape') goMenu();
      }
    });
  }

  function debugFinal(winner = 'shinv') {
    const loser = other(winner);
    G.match = XO.createMatch();
    G.match.wins[winner] = 2;
    G.match.wins[loser] = 1;
    G.match.matchWinner = winner;
    G.match.status = 'matchOver';
    G.match.round.winner = winner;
    G.match.round.winLine = [0, 1, 2];
    G.match.round.board = [
      winner, winner, winner,
      loser, loser, null,
      null, null, null
    ];
    startOutro();
  }

  function debugGame() {
    startMatch();
    G.match.round.board = [
      'shinv', 'brb', null,
      'shinv', 'brb', null,
      null, null, null
    ];
    G.match.round.placed = { shinv: 2, brb: 2 };
    G.match.round.moves = 4;
    G.match.round.turn = 'shinv';
    ensureCursorValid('shinv');
    refreshHUD();
    G.locked = false;
  }

  function init() {
    paintAvatar(dom.avatarShinv, 'shinv');
    paintAvatar(dom.avatarBrb, 'brb');
    bind();
    updateSoundUI();
    setHudVisible(false);
    setTopStatus('KHÁCH Ế • 0 KHÁCH');
    dom.skipBtn.classList.add('hidden');
    updatePips(dom.pipsShinv, 0);
    updatePips(dom.pipsBrb, 0);
    if (new URLSearchParams(location.search).has('debug')) {
      window.__XO = { G, XO, startIntro, startMatch, startOutro, finishOutro, debugFinal, debugGame, refreshHUD };
    }
    requestAnimationFrame(loop);
  }

  init();
})();
