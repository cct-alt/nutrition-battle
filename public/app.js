/* ============================================================
   營養大作戰 — 前端邏輯
   負責：WebSocket 連線／斷線重連、畫面渲染、計時動畫、音效、彩帶
   ============================================================ */

'use strict';

/* ---------- 分類名稱（與題庫同步） ---------- */
const CAT_LABELS = {
  CARB: '碳水化合物',
  FAT: '脂質',
  PROTEIN: '蛋白質',
  VIT: '維生素',
  MIN: '礦物質',
  FIBER: '食用纖維',
  WATER: '水'
};

/* ---------- 全域狀態 ---------- */
const S = {
  ws: null,
  code: '',
  sid: null,
  role: 'create',
  name: '',
  slot: -1,
  hostSlot: 0,
  players: [null, null],
  phase: 'home',
  myChoice: -1,
  locked: false,
  removed: [],
  qDeadline: 0,
  lastTickSec: -1,
  lastRecv: Date.now(),
  muted: localStorage.getItem('nb_muted') === '1'
};

let rafId = null;
let reconnTimer = null;
let reconnTries = 0;

/* ---------- DOM 快取 ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const screens = $$('.screen');

function showScreen(name) {
  S.phase = name === 'game' ? 'game' : name;
  screens.forEach((sc) => sc.classList.toggle('active', sc.id === 'screen-' + name));
}

function toast(text, ms = 2200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/* ---------- 音效 ---------- */
const FX = {
  ctx: null,
  tone(f, d = 0.12, type = 'sine', g = 0.16, when = 0) {
    if (S.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const v = this.ctx.createGain();
      o.type = type; o.frequency.value = f;
      v.gain.setValueAtTime(g, t);
      v.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(v); v.connect(this.ctx.destination);
      o.start(t); o.stop(t + d + 0.03);
    } catch (e) { /* 忽略 */ }
  },
  ok()   { this.tone(660, 0.09, 'triangle', 0.2); this.tone(880, 0.14, 'triangle', 0.2, 0.09); },
  bad()  { this.tone(150, 0.3, 'sawtooth', 0.18); },
  tick() { this.tone(950, 0.05, 'square', 0.07); },
  count(){ this.tone(520, 0.11, 'sine', 0.17); },
  go()   { this.tone(784, 0.24, 'sine', 0.2); },
  power(){ this.tone(1180, 0.07, 'sine', 0.12); this.tone(1560, 0.1, 'sine', 0.1, 0.06); },
  win()  { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.17, 'triangle', 0.2, i * 0.13)); },
  lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.22, 'sawtooth', 0.13, i * 0.16)); }
};
document.addEventListener('pointerdown', () => {
  if (!FX.ctx) {
    try { FX.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (FX.ctx && FX.ctx.state === 'suspended') FX.ctx.resume();
}, { once: false });

$('#muteBtn').textContent = S.muted ? '🔇' : '🔊';
$('#muteBtn').addEventListener('click', () => {
  S.muted = !S.muted;
  localStorage.setItem('nb_muted', S.muted ? '1' : '0');
  $('#muteBtn').textContent = S.muted ? '🔇' : '🔊';
});

/* ---------- 彩帶 ---------- */
const cvs = $('#fx');
const ctx2d = cvs.getContext('2d');
let parts = [];
let fxRunning = false;

function sizeCanvas() { cvs.width = innerWidth; cvs.height = innerHeight; }
sizeCanvas();
addEventListener('resize', sizeCanvas);

function confetti() {
  const colors = ['#ffb020', '#2ecc71', '#4aa3ff', '#ff6fa5', '#ffd166'];
  for (let i = 0; i < 140; i++) {
    parts.push({
      x: Math.random() * cvs.width,
      y: -20 - Math.random() * cvs.height * 0.5,
      vy: 2 + Math.random() * 3.5,
      vx: -1.5 + Math.random() * 3,
      s: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      c: colors[(Math.random() * colors.length) | 0]
    });
  }
  if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
}

function fxLoop() {
  ctx2d.clearRect(0, 0, cvs.width, cvs.height);
  parts = parts.filter((p) => p.y < cvs.height + 30);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    ctx2d.save();
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rot);
    ctx2d.fillStyle = p.c;
    ctx2d.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
    ctx2d.restore();
  }
  if (parts.length) requestAnimationFrame(fxLoop);
  else { fxRunning = false; ctx2d.clearRect(0, 0, cvs.width, cvs.height); }
}

/* ---------- 工具 ---------- */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
  return s;
}

function sessKey(code) { return 'nb_sess_' + code; }

function me() { return S.players[S.slot]; }
function opp() { return S.players[S.slot === 0 ? 1 : 0]; }

function send(obj) {
  if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(obj));
}

/* ---------- 連線 ---------- */
function connect(code, opts = {}) {
  clearTimeout(reconnTimer);
  S.code = code;
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  const ws = new WebSocket(proto + location.host + '/api/ws?room=' + encodeURIComponent(code));
  S.ws = ws;

  ws.onopen = () => {
    const sess = JSON.parse(localStorage.getItem(sessKey(code)) || 'null');
    if (sess && sess.sid && !opts.freshJoin) {
      S.sid = sess.sid;
      send({ type: 'resume', sid: sess.sid });
    } else {
      send({ type: 'join', role: S.role, name: S.name });
    }
  };

  ws.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch (err) { return; }
    handleMsg(m);
  };

  ws.onclose = () => {
    if (S.phase === 'home' || opts.noReconnect) return;
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (S.phase === 'home') return;
  reconnTries += 1;
  $('#reconnOverlay').classList.remove('hidden');
  if (reconnTries > 40) {
    backHome('連線中斷，請重新加入');
    return;
  }
  clearTimeout(reconnTimer);
  reconnTimer = setTimeout(() => connect(S.code), 1500);
}

function backHome(msg) {
  clearTimeout(reconnTimer);
  if (S.ws) { try { S.ws.onclose = null; S.ws.close(); } catch (e) {} }
  S.ws = null;
  S.sid = null;
  S.slot = -1;
  S.phase = 'home';
  $('#reconnOverlay').classList.add('hidden');
  $('#pauseOverlay').classList.add('hidden');
  $('#countOverlay').classList.add('hidden');
  if (msg) toast(msg);
  showScreen('home');
}

/* ---------- 心跳 + 斷線偵測（對付學校 Wi-Fi 不穩／iPad 睡屏斷線） ---------- */
setInterval(() => {
  if (S.ws && S.ws.readyState === 1) send({ type: 'ping' });
}, 12000);

// 半開連線偵測：15 秒無收到任何伺服器訊息（包括 pong）就強制重連
setInterval(() => {
  if (S.phase === 'home' || !S.ws) return;
  if (Date.now() - S.lastRecv > 15000) {
    try { if (S.ws.readyState <= 1) S.ws.close(); } catch (e) {}
  }
}, 4000);

// iPad 睡屏後返回：即刻嘗試重連
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && S.phase !== 'home' &&
      (!S.ws || S.ws.readyState !== 1)) {
    reconnTries = 0;
    clearTimeout(reconnTimer);
    connect(S.code);
  }
});

/* ---------- 訊息處理 ---------- */
function handleMsg(m) {
  S.lastRecv = Date.now();
  switch (m.type) {
    case 'init': return onInit(m);
    case 'lobby': return onLobby(m);
    case 'matchStart': return onMatchStart(m);
    case 'countdown': return onCountdown(m.n);
    case 'question': return onQuestion(m);
    case 'wrong': return onWrong(m);
    case 'fifty': return onFifty(m);
    case 'roundResult': return onRoundResult(m);
    case 'scores': return onPlayers(m.players);
    case 'notice':
      $('#notice').textContent = m.text || '';
      if ((m.text || '').indexOf('🎁') !== -1) FX.power();
      return;
    case 'opponentDisconnected':
      toast('⚠️ 對手斷線了…');
      return;
    case 'paused':
      $('#pauseHint').textContent = `等待重連中…（${m.waitSec} 秒後判負）`;
      $('#pauseOverlay').classList.remove('hidden');
      return;
    case 'reconnected':
      $('#pauseOverlay').classList.add('hidden');
      if (m.slot !== S.slot) toast('✅ 對手已重新連線！');
      return;
    case 'gameOver': return onGameOver(m);
    case 'error':
      onError(m);
      return;
    default: return;
  }
}

function onInit(m) {
  reconnTries = 0;
  $('#reconnOverlay').classList.add('hidden');
  S.slot = m.slot;
  S.sid = m.sid;
  S.hostSlot = m.hostSlot;
  if (m.players) onPlayers(m.players);

  localStorage.setItem(sessKey(S.code), JSON.stringify({ sid: S.sid, role: S.role, name: S.name }));
  $('#roomCode').textContent = S.code;

  if (m.phase === 'question' && m.options) {
    showScreen('game');
    onQuestion(m);
  } else if (m.phase === 'over' && m.winner !== undefined) {
    onGameOver(m);
  } else if (m.phase === 'paused' || m.phase === 'reveal') {
    showScreen('game');
    if (m.phase === 'paused') {
      $('#pauseHint').textContent = '等待對手重連…';
      $('#pauseOverlay').classList.remove('hidden');
    }
  } else {
    showScreen('lobby');
  }
}

function onPlayers(players) {
  if (!players) return;
  S.players = players;
  renderLobbySlots();
  renderHUD();
  renderPowers();
}

function onLobby(m) {
  S.hostSlot = m.hostSlot;
  onPlayers(m.players);
  // 比賽進行中（或等對手重連時）千萬不要彈返去大廳畫面
  if (S.phase === 'game' || S.phase === 'paused' || S.phase === 'over') return;
  showScreen('lobby');
}

function renderLobbySlots() {
  for (let i = 0; i < 2; i++) {
    const el = $(i === 0 ? '#slot0' : '#slot1');
    const p = S.players[i];
    if (p) {
      el.classList.toggle('filled', !!p.connected);
      el.querySelector('.avatar').textContent = p.connected ? '🧑‍🎓' : '📴';
      el.querySelector('.pname').textContent = p.name + (i === S.hostSlot ? '（房主）' : '') + (p.connected ? '' : '（斷線）');
    } else {
      el.classList.remove('filled');
      el.querySelector('.avatar').textContent = '🧑‍🎓';
      el.querySelector('.pname').textContent = '等待中…';
    }
  }
  const ready = S.players.every((p) => p && p.connected);
  $('#btnStart').disabled = !ready;
}

function onMatchStart(m) {
  onPlayers(m.players);
  $('#pauseOverlay').classList.add('hidden');
  showScreen('game');
  $('#notice').textContent = '';
  renderHUD();
  renderPowers();
}

function onCountdown(n) {
  if (S.phase !== 'game') showScreen('game');
  $('#pauseOverlay').classList.add('hidden');
  const ov = $('#countOverlay');
  const num = $('#countNum');
  ov.classList.remove('hidden');
  num.textContent = n > 0 ? String(n) : 'GO!';
  num.classList.remove('pop');
  void num.offsetWidth;
  num.classList.add('pop');
  if (n > 0) FX.count(); else FX.go();
}

/* ---------- 題目 ---------- */
function onQuestion(p) {
  showScreen('game');
  $('#pauseOverlay').classList.add('hidden');
  $('#countOverlay').classList.add('hidden');

  S.myChoice = -1;
  S.locked = false;
  S.removed = [];

  $('#qNum').textContent = `Q${p.qi + 1}/${p.total}`;
  $('#qCat').textContent = CAT_LABELS[p.cat] || p.cat;
  $('#qDouble').classList.toggle('hidden', !p.double);
  $('#buzzed').classList.add('hidden');
  $('#notice').textContent = '';
  $('#qText').textContent = p.text;

  $$('.opt').forEach((b) => {
    const i = b.dataset.i | 0;
    b.querySelector('.otext').textContent = p.options[i];
    b.className = 'opt';
    b.style.opacity = '';
  });

  renderPowers();

  S.qDeadline = performance.now() + p.endsIn;
  S.lastTickSec = -1;
  if (rafId) cancelAnimationFrame(rafId);
  timerLoop();
}

function timerLoop() {
  const remain = S.qDeadline - performance.now();
  const pct = Math.max(0, Math.min(1, remain / 15000));
  const fill = $('#timerFill');
  fill.style.width = (pct * 100).toFixed(1) + '%';
  fill.style.background = pct > 0.5 ? '#2ecc71' : pct > 0.2 ? '#ffb020' : '#ff4d5a';

  const secLeft = Math.ceil(remain / 1000);
  if (secLeft <= 3 && secLeft >= 1 && secLeft !== S.lastTickSec) {
    S.lastTickSec = secLeft;
    FX.tick();
  }

  if (remain <= 0) {
    fill.style.width = '0%';
    return;
  }
  rafId = requestAnimationFrame(timerLoop);
}

function stopTimer() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

$$('.opt').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (S.locked || S.phase !== 'game') return;
    const i = b.dataset.i | 0;
    if (S.removed.includes(i)) return;
    S.myChoice = i;
    S.locked = true;
    FX.tone(700, 0.06, 'sine', 0.12);
    b.classList.add('picked');
    $$('.opt').forEach((o) => {
      if (o !== b) o.classList.add('dimmed');
    });
    $('#notice').textContent = '已搶答！等緊結果…';
    send({ type: 'answer', choice: i });
  });
});

function onWrong(m) {
  const p = S.players[m.slot];
  if (p) p.hp = m.hp;
  renderHUD();
  const isMe = m.slot === S.slot;
  const wrongCard = $(isMe ? '#hudMe' : '#hudOpp');
  wrongCard.classList.remove('buzzedflash');
  void wrongCard.offsetWidth;
  wrongCard.classList.add('buzzedflash');

  if (isMe) {
    FX.bad();
    const btn = $(`.opt[data-i="${S.myChoice}"]`);
    if (btn) btn.classList.add('wrongpick');
    $$('.opt').forEach((o) => o.classList.add('lockedall'));
    $('#notice').textContent = '❌ 答錯！扣血 -20，本題出局';
  } else {
    $('#buzzed').classList.remove('hidden');
    $('#notice').textContent = '🎯 對手答錯被鎖定！快啲搶答！';
  }
  renderPowers();
}

function onFifty(m) {
  S.removed = m.removed || [];
  S.removed.forEach((i) => {
    $(`.opt[data-i="${i}"]`).classList.add('dimmed');
  });
}

function onRoundResult(m) {
  stopTimer();
  onPlayers(m.players);

  $$('.opt').forEach((o) => o.classList.add('lockedall'));
  const correctBtn = $(`.opt[data-i="${m.correctIdx}"]`);
  if (correctBtn) correctBtn.classList.add('correct');

  if (m.win != null) {
    if (m.win === S.slot) {
      FX.ok();
      $('#notice').textContent = m.events.join('　');
    } else {
      FX.bad();
      $('#notice').textContent = m.events.join('　');
    }
    const gain = m.gains[m.win];
    const card = m.win === S.slot ? '#hudMe' : '#hudOpp';
    floatGain(card, '+' + gain);
  } else {
    $('#notice').textContent = m.events.join('　');
    if (S.myChoice === -1) FX.bad();
  }

  $('#buzzed').classList.add('hidden');
  renderPowers();
}

function floatGain(sel, txt) {
  const card = $(sel);
  const el = document.createElement('div');
  el.className = 'floatgain';
  el.textContent = txt;
  card.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/* ---------- HUD ---------- */
function renderHUD() {
  const pairs = [['#hudMe', me()], ['#hudOpp', opp()]];
  for (const [sel, p] of pairs) {
    const card = $(sel);
    if (!card) continue;
    if (!p) { card.style.opacity = 0.35; continue; }
    card.style.opacity = p.connected === false ? 0.45 : 1;
    card.querySelector('.pname').textContent = p.name + (p.slot === S.slot ? '（你）' : '');
    card.querySelector('.pscore').textContent = p.score;
    const hf = card.querySelector('.hpfill');
    hf.style.width = Math.max(0, p.hp) + '%';
    const cb = card.querySelector('.combo');
    if (p.combo >= 2) {
      cb.textContent = '🔥x' + p.combo;
      cb.classList.add('on');
    } else {
      cb.textContent = '';
      cb.classList.remove('on');
    }
    card.querySelector('.ppowers').textContent =
      (p.powers || []).map((w) => ({ fifty: '🗑️', freeze: '❄️', steal: '💰' }[w] || '')).join('');
  }
}

function renderPowers() {
  const mine = (me() && me().powers) || [];
  $$('.pw').forEach((b) => {
    const id = b.dataset.p;
    const cnt = mine.filter((w) => w === id).length;
    b.querySelector('.cnt').textContent = cnt;
    const usable = cnt > 0 && S.phase === 'game' && !S.locked &&
      $('#screen-game').classList.contains('active');
    b.classList.toggle('off', !usable);
  });
}

$$('.pw').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (b.classList.contains('off')) return;
    FX.power();
    send({ type: 'power', id: b.dataset.p });
  });
});

/* ---------- 結果 ---------- */
function onGameOver(m) {
  stopTimer();
  onPlayers(m.players);
  $('#pauseOverlay').classList.add('hidden');
  $('#countOverlay').classList.add('hidden');

  const won = m.winner === S.slot;
  const draw = m.winner === -1;
  const banner = $('#overBanner');
  banner.textContent = draw ? '🤝 平手！' : won ? '🏆 你贏咗！' : '😵 你輸咗…';

  if (m.reason === 'ko' && !draw) {
    banner.textContent += won ? ' ⚡KO勝利' : ' ⚡被KO';
  }
  if (m.reason === 'forfeit' && !draw) {
    banner.textContent += won ? '（對手離場）' : '（斷線太久）';
  }

  $('.fscore.me .fname').textContent = (me() || {}).name || '你';
  $('.fscore.opp .fname').textContent = (opp() || {}).name || '對手';
  $('.fscore.me .fpts').textContent = (me() || {}).score || 0;
  $('.fscore.opp .fpts').textContent = (opp() || {}).score || 0;

  const wk = m.weakCat && m.weakCat[S.slot];
  const tip = $('#weakTip');
  if (wk) {
    tip.textContent = `📚 溫書提示：你今舖最弱嘅環節係「${CAT_LABELS[wk] || wk}」，快啲溫返呢部分，下舖報仇！`;
    tip.classList.remove('hidden');
  } else {
    tip.classList.add('hidden');
  }

  showScreen('over');
  renderPowers();
  if (won) { FX.win(); confetti(); } else if (draw) { FX.ok(); } else { FX.lose(); }
}

function onError(m) {
  if (!m.fatal) { toast(m.msg || '錯誤'); return; }

  // 房號撞名（建立時）：自動換過個新號再試
  if (S.role === 'create' && m.msg && m.msg.indexOf('已有人使用') !== -1 && reconnTries < 3) {
    reconnTries += 1;
    if (S.ws) { try { S.ws.onclose = null; S.ws.close(); } catch (e) {} }
    connect(genCode(), { freshJoin: true });
    return;
  }

  // 重連失敗（房間已被清走）：自動用原本身份重新加入一次
  const sess = JSON.parse(localStorage.getItem(sessKey(S.code)) || 'null');
  if (sess && m.msg && m.msg.indexOf('過期') !== -1 && reconnTries < 4) {
    reconnTries += 1;
    if (S.ws) { try { S.ws.onclose = null; S.ws.close(); } catch (e) {} }
    S.sid = null;
    connect(S.code, { freshJoin: true });
    return;
  }

  backHome(m.msg || '無法加入房間');
}

/* ---------- 主頁互動 ---------- */
$('#nameInput').value = localStorage.getItem('nb_name') || '';

function readName() {
  const n = $('#nameInput').value.trim().slice(0, 12);
  if (!n) {
    toast('請先輸入名字！');
    $('#nameInput').focus();
    return null;
  }
  localStorage.setItem('nb_name', n);
  S.name = n;
  return n;
}

$('#btnCreate').addEventListener('click', () => {
  if (!readName()) return;
  S.role = 'create';
  reconnTries = 0;
  localStorage.removeItem(sessKey(S.code));
  connect(genCode(), { freshJoin: true });
});

$('#btnJoin').addEventListener('click', () => {
  if (!readName()) return;
  const code = $('#codeInput').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) {
    toast('房號必須係 4 位英文／數字');
    return;
  }
  S.role = 'join';
  reconnTries = 0;
  localStorage.removeItem(sessKey(code));
  connect(code, { freshJoin: true });
});

$('#codeInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#btnJoin').click();
});

/* ---------- 大廳 ---------- */
$('#btnStart').addEventListener('click', () => send({ type: 'start' }));
$('#btnLeaveLobby').addEventListener('click', () => backHome());

/* ---------- 結果 ---------- */
$('#btnRematch').addEventListener('click', () => {
  send({ type: 'start' });
  toast('等緊開波…');
});
$('#btnHomeOver').addEventListener('click', () => {
  localStorage.removeItem(sessKey(S.code));
  backHome();
});

/* 防止 iOS 雙擊縮放／長按選字 */
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
