// ============================================================
// GameRoom Durable Object
// 每個房間一個實例：管理兩位玩家的 WebSocket、計時、計分、道具
// 所有遊戲邏輯都在伺服器端執行，防止作弊（正確答案不會提早傳出）
// ============================================================
import { buildDeck, shuffleArr } from './questions.js';

const TOTAL_Q = 10;          // 每場題數
const QUESTION_MS = 15000;   // 每題時限（毫秒）
const REVEAL_MS = 3000;      // 公佈答案時間
const COUNTDOWN_MS = 800;    // 倒數每格時間
const WRONG_HP = 20;         // 答錯扣血
const FREEZE_MS = 5000;      // 凍結對手時長
const STEAL_AMT = 150;       // 偷分道具金額
const GRACE_MS = 350;        // 網絡延遲寬限
const FORFEIT_MS = 45000;    // 斷線多久判負
const MAX_POWERS = 2;        // 最多同時持有道具
const POWERS = ['fifty', 'freeze', 'steal'];  // 道具種類

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.reset();
  }

  reset() {
    this.clearTimers();
    this.players = [null, null];
    this.phase = 'waiting';   // waiting | countdown | question | reveal | over | paused
    this.deck = [];
    this.qi = -1;
    this.deadline = 0;
    this.pausedFrom = null;
    this.pausedRemain = 0;
    this.hostSlot = 0;
    this.lastResult = null;
  }

  clearTimers() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.forfeitTimer) { clearTimeout(this.forfeitTimer); this.forfeitTimer = null; }
    if (this.wipeTimer) { clearTimeout(this.wipeTimer); this.wipeTimer = null; }
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const server = pair[1];
    server.accept();
    server.addEventListener('message', (e) => {
      // 任何單一訊息出錯都唔可以令成條線死掉
      try { this.onMessage(server, e.data); }
      catch (err) { console.error('onMessage error:', err); }
    });
    server.addEventListener('close', () => this.onClose(server));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // ---------- 連線處理 ----------

  onMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'ping') { this.send(ws, { type: 'pong' }); return; }
    if (msg.type === 'resume') { this.resume(ws, msg); return; }

    const me = this.byWs(ws);
    if (!me) {
      if (msg.type === 'join') this.join(ws, msg);
      else this.send(ws, { type: 'error', fatal: true, msg: '請先加入房間' });
      return;
    }

    switch (msg.type) {
      case 'start':   // 兩位玩家都在場即可開始
        if (this.phase === 'waiting' || this.phase === 'over') {
          if (this.players.every((p) => p && p.ws)) this.startMatch();
        }
        break;
      case 'answer':
        this.tryAnswer(me, msg);
        break;
      case 'power':
        this.usePower(me, msg);
        break;
      default:
        break;
    }
  }

  join(ws, msg) {
    const name = String(msg.name || '').trim().slice(0, 12) || '玩家';
    const role = msg.role === 'create' ? 'create' : 'join';

    if (role === 'create') {
      if (this.someoneConnected()) {
        this.send(ws, { type: 'error', fatal: true, msg: '此房號已有人使用' });
        return;
      }
      if (['countdown', 'question', 'reveal'].includes(this.phase)) {
        this.send(ws, { type: 'error', fatal: true, msg: '該房間比賽進行中' });
        return;
      }
      this.reset();
    } else {
      if (!this.players[0]) {
        this.send(ws, { type: 'error', fatal: true, msg: '找不到房間，請檢查房號' });
        return;
      }
      if (['countdown', 'question', 'reveal', 'paused'].includes(this.phase)) {
        this.send(ws, { type: 'error', fatal: true, msg: '該房間比賽進行中' });
        return;
      }
      if (this.players.every((p) => p && p.ws)) {
        this.send(ws, { type: 'error', fatal: true, msg: '房間已滿（2 人）' });
        return;
      }
    }

    let slot = this.players.findIndex((p) => p === null || !p.ws);
    if (slot === -1) slot = 0;
    const existed = this.players[slot];
    const sid = crypto.randomUUID();

    this.players[slot] = {
      ws, sid, slot, name,
      score: 0, hp: 100, combo: 0,
      powers: [], stats: {},
      answered: false, choice: -1,
      frozenUntil: 0, pendingFreeze: false,
      fiftyRemoved: []
    };

    if (role === 'join' && existed && existed.sid) {
      // 取回斷線者的位置：沿用原本分數（重連由 resume 處理，此處為過期後重入）
      this.players[slot].score = existed.score;
      this.players[slot].hp = existed.hp;
      this.players[slot].stats = existed.stats || {};
    }

    this.send(ws, {
      type: 'init', slot, sid, hostSlot: this.hostSlot,
      phase: this.phase === 'paused' ? 'paused' : this.phase,
      players: this.publicPlayers(),
      ...(this.phase === 'over' && this.lastResult ? this.lastResult : {})
    });
    this.pushLobby();

    if (this.phase === 'paused') {
      // 對手正在等待重連
      this.unpause();
    }
  }

  resume(ws, msg) {
    const p = this.players.find((x) => x && x.sid === msg.sid);
    if (!p || p.ws) {
      this.send(ws, { type: 'error', fatal: true, msg: '連線已過期' });
      return;
    }
    p.ws = ws;
    if (this.forfeitTimer) { clearTimeout(this.forfeitTimer); this.forfeitTimer = null; }

    this.send(ws, {
      type: 'init', slot: p.slot, sid: p.sid, hostSlot: this.hostSlot,
      phase: this.phase, players: this.publicPlayers(),
      ...(this.phase === 'question'
        ? this.questionPayload(Math.max(500, this.deadline - Date.now()))
        : {}),
      ...(this.phase === 'over' && this.lastResult ? this.lastResult : {})
    });

    if (this.phase === 'paused') this.unpause();
    else this.broadcast({ type: 'lobby', players: this.publicPlayers(), hostSlot: this.hostSlot });
    this.broadcast({ type: 'reconnected', slot: p.slot });
  }

  onClose(ws) {
    const p = this.byWs(ws);
    if (!p) return;
    p.ws = null;
    this.broadcast({ type: 'opponentDisconnected', slot: p.slot });

    const inMatch = ['countdown', 'question', 'reveal'].includes(this.phase) ||
      this.phase === 'paused';
    if (inMatch) {
      this.pause();
      this.broadcast({ type: 'paused', waitSec: FORFEIT_MS / 1000 });
      if (this.forfeitTimer) clearTimeout(this.forfeitTimer);
      this.forfeitTimer = setTimeout(() => {
        this.forfeitTimer = null;
        const alive = this.players.find((x) => x && x.ws);
        if (alive && ['paused', 'countdown', 'question', 'reveal'].includes(this.phase)) {
          this.finishGame(alive.slot, 'forfeit');
        } else {
          this.resetIfEmpty();
        }
      }, FORFEIT_MS);
    } else {
      this.resetIfEmptySoon();
    }
    // 比賽進行中唔好廣播 lobby，否則仲連住線嗰方會被彈返去大廳
    if (this.phase === 'waiting' || this.phase === 'over') {
      this.pushLobby();
    }
  }

  // ---------- 遊戲流程 ----------

  startMatch() {
    this.clearTimers();
    this.deck = buildDeck(TOTAL_Q);
    this.qi = -1;
    for (const p of this.players) {
      if (!p) continue;
      p.score = 0; p.hp = 100; p.combo = 0; p.powers = []; p.stats = {};
    }
    this.broadcast({
      type: 'matchStart',
      players: this.publicPlayers(),
      totalQuestions: TOTAL_Q
    });
    this.countdown(3);
  }

  countdown(n) {
    this.phase = 'countdown';
    this.broadcast({ type: 'countdown', n });
    if (n > 0) {
      this.timer = setTimeout(() => this.countdown(n - 1), COUNTDOWN_MS);
    } else {
      this.timer = setTimeout(() => this.beginQuestion(), COUNTDOWN_MS);
    }
  }

  beginQuestion() {
    this.qi += 1;
    const q = this.deck[this.qi];
    const now = Date.now();
    this.phase = 'question';
    this.deadline = now + QUESTION_MS;
    for (const p of this.players) {
      if (!p) continue;
      p.answered = false; p.choice = -1; p.fiftyRemoved = [];
      if (p.pendingFreeze) {
        p.pendingFreeze = false;
        p.frozenUntil = now + FREEZE_MS;
      }
    }
    this.broadcast(this.questionPayload(QUESTION_MS));
    this.timer = setTimeout(() => this.onDeadline(), QUESTION_MS + GRACE_MS);
  }

  questionPayload(endsInMs) {
    const q = this.deck[this.qi];
    return {
      type: 'question',
      qi: this.qi,
      total: TOTAL_Q,
      cat: q.c,
      text: q.text !== undefined ? q.text : q.q,
      options: q.options !== undefined ? q.options : q.o,
      endsIn: Math.round(endsInMs),
      double: this.qi === TOTAL_Q - 1
    };
  }

  tryAnswer(p, msg) {
    if (this.phase !== 'question' || p.answered) return;
    const now = Date.now();
    if (now > this.deadline + GRACE_MS) return;
    if (now < p.frozenUntil) {
      this.send(p.ws, { type: 'notice', text: '❄️ 你被凍結中，稍等…' });
      return;
    }
    const ch = msg.choice | 0;
    if (!(ch >= 0 && ch <= 3)) return;

    p.answered = true;
    p.choice = ch;
    const q = this.deck[this.qi];

    if (ch === q.a) {
      this.resolveRound(p.slot);
    } else {
      p.hp -= WRONG_HP;
      p.combo = 0;
      this.broadcast({ type: 'wrong', slot: p.slot, hp: p.hp });
      if (p.hp <= 0) {
        this.finishGame(p.slot === 0 ? 1 : 0, 'ko');
        return;
      }
      if (this.players.every((x) => x && x.answered)) {
        this.resolveRound(null);
      }
    }
  }

  resolveRound(winSlot) {
    if (this.phase !== 'question') return;
    this.phase = 'reveal';
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }

    const q = this.deck[this.qi];
    const gains = [0, 0];
    const events = [];

    for (const p of this.players) {
      if (!p) continue;
      const st = p.stats[q.c] || (p.stats[q.c] = [0, 0]);
      st[1] += 1;
      if (winSlot === p.slot) st[0] += 1;
    }

    if (winSlot != null) {
      const p = this.players[winSlot];
      p.combo += 1;
      const frac = Math.max(0, this.deadline - Date.now()) / QUESTION_MS;
      const bonus = Math.round(100 * frac);
      const mult = 1 + 0.25 * Math.min(p.combo - 1, 4);
      let gain = Math.round((100 + bonus) * mult);
      const isDouble = this.qi === TOTAL_Q - 1;
      if (isDouble) gain *= 2;
      gains[winSlot] = gain;
      p.score += gain;
      events.push(`⚡ ${p.name} 答對 +${gain} 分${mult > 1 ? `（連擊 ×${mult}）` : ''}${isDouble ? ' 🔥終極題加倍🔥' : ''}`);
      if (p.combo % 3 === 0 && p.powers.length < MAX_POWERS) {
        const pw = POWERS[Math.floor(Math.random() * POWERS.length)];
        p.powers.push(pw);
        events.push(`🎁 ${p.name} 獲得道具（三連擊獎勵）`);
      }
    } else if (this.players.every((x) => x && x.answered)) {
      events.push('💥 兩人都答錯！正確答案是…');
    } else {
      events.push('⏰ 時間到！正確答案是…');
    }

    this.broadcast({
      type: 'roundResult',
      win: winSlot,
      correctIdx: q.a,
      gains,
      double: this.qi === TOTAL_Q - 1,
      players: this.publicPlayers(),
      events
    });

    this.timer = setTimeout(() => this.afterReveal(), REVEAL_MS);
  }

  afterReveal() {
    if (this.qi + 1 >= TOTAL_Q) this.finishGame(null, 'byScore');
    else this.beginQuestion();
  }

  onDeadline() {
    if (this.phase !== 'question') return;
    this.resolveRound(null);
  }

  finishGame(winSlot, reason) {
    this.clearTimers();
    this.phase = 'over';
    let winner = winSlot;
    if (reason === 'byScore') {
      const s = this.players.map((p) => (p ? p.score : 0));
      winner = s[0] === s[1] ? -1 : s[0] > s[1] ? 0 : 1;
    }
    const report = {};
    for (const p of this.players) {
      if (!p) continue;
      let worst = null;
      for (const [cat, [ok, tot]] of Object.entries(p.stats)) {
        if (tot < 2) continue;
        const ratio = 1 - ok / tot;
        if (!worst || ratio > worst.ratio) worst = { cat, ratio };
      }
      report[p.slot] = worst ? worst.cat : null;
    }
    this.lastResult = {
      type: 'gameOver',
      winner, reason,
      players: this.publicPlayers(),
      weakCat: report
    };
    this.broadcast(this.lastResult);
  }

  // ---------- 道具 ----------

  usePower(p, msg) {
    if (this.phase !== 'question' || p.answered) return;
    const idx = p.powers.indexOf(msg.id);
    if (idx === -1) return;
    const target = this.players[p.slot === 0 ? 1 : 0];
    if (!target) return;

    if (msg.id === 'fifty') {
      p.powers.splice(idx, 1);
      const wrongs = [0, 1, 2, 3].filter((i) => i !== this.deck[this.qi].a);
      shuffleArr(wrongs);
      p.fiftyRemoved = wrongs.slice(0, 2);
      this.send(p.ws, { type: 'fifty', removed: p.fiftyRemoved });
      this.broadcast({ type: 'notice', text: `🗑️ ${p.name} 使用了 50/50` });
    } else if (msg.id === 'freeze') {
      p.powers.splice(idx, 1);
      if (this.phase === 'question') target.frozenUntil = Math.max(target.frozenUntil, Date.now()) + FREEZE_MS;
      else target.pendingFreeze = true;
      this.broadcast({ type: 'notice', text: `❄️ ${p.name} 凍結了 ${target.name} ${FREEZE_MS / 1000} 秒！` });
    } else if (msg.id === 'steal') {
      p.powers.splice(idx, 1);
      const amt = Math.min(STEAL_AMT, target.score);
      target.score -= amt;
      p.score += amt;
      this.broadcast({ type: 'notice', text: `💰 ${p.name} 從 ${target.name} 偷取了 ${amt} 分！` });
      this.broadcast({ type: 'scores', players: this.publicPlayers() });
    }
  }

  // ---------- 斷線暫停 / 重連 ----------

  pause() {
    if (this.phase === 'paused') return;
    this.pausedFrom = this.phase;
    this.phase = 'paused';
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.pausedFrom === 'question') {
      this.pausedRemain = Math.max(1000, this.deadline - Date.now());
    }
  }

  unpause() {
    const from = this.pausedFrom || 'countdown';
    this.pausedFrom = null;
    this.phase = from;
    if (from === 'question') {
      this.deadline = Date.now() + this.pausedRemain;
      this.broadcast(this.questionPayload(this.pausedRemain));
      this.timer = setTimeout(() => this.onDeadline(), this.pausedRemain + GRACE_MS);
    } else if (from === 'reveal') {
      this.afterReveal();
    } else {
      this.countdown(3);
    }
  }

  resetIfEmptySoon() {
    if (this.wipeTimer) clearTimeout(this.wipeTimer);
    this.wipeTimer = setTimeout(() => this.resetIfEmpty(), 8000);
  }

  resetIfEmpty() {
    if (!this.someoneConnected()) this.reset();
  }

  // ---------- 小工具 ----------

  byWs(ws) {
    return this.players.find((p) => p && p.ws === ws) || null;
  }

  someoneConnected() {
    return this.players.some((p) => p && p.ws);
  }

  publicPlayers() {
    return this.players.map((p) => p && ({
      slot: p.slot, name: p.name, score: p.score, hp: p.hp,
      combo: p.combo, powers: p.powers.slice(), connected: !!p.ws
    }));
  }

  pushLobby() {
    this.broadcast({ type: 'lobby', players: this.publicPlayers(), hostSlot: this.hostSlot });
  }

  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch { /* 已關閉 */ }
  }

  broadcast(obj) {
    for (const p of this.players) {
      if (p && p.ws) this.send(p.ws, obj);
    }
  }
}

/* ---------- 排行榜 Durable Object ---------- */
export class Leaderboard {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    if (url.pathname === '/api/leaderboard') {
      if (request.method === 'POST') {
        return this.handleSubmit(request);
      } else if (request.method === 'GET') {
        return this.handleFetch(request);
      }
    }
    return new Response('Not found', { status: 404 });
  }

  async handleSubmit(request) {
    try {
      const { mode, score, class: className, studentId } = await request.json();
      if (!mode || !['solo', 'multi'].includes(mode) || score === undefined || score === null || !studentId) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
      }

      const key = `lb:${mode}`;
      const list = await this.state.storage.get(key) || [];
      
      const entry = {
        name: '',
        score: Math.floor(score),
        class: className || '',
        studentId: String(studentId),
        timestamp: Date.now()
      };

      const playerKey = `player:${studentId}`;
      const playerData = await this.state.storage.get(playerKey) || { name: '', class: '' };
      
      entry.name = playerData.name || `學生${studentId}`;
      entry.class = className || playerData.class || '';

      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      if (list.length > 100) list.length = 100;
      
      await this.state.storage.put(`lb:${mode}`, list);
      return new Response(JSON.stringify({ success: true }), { 
        headers: { 'content-type': 'application/json' } 
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  async handleFetch(request) {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'multi';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    
    const list = await this.state.storage.get(`lb:${mode}`) || [];
    const top = list.slice(0, limit);
    
    return new Response(JSON.stringify(top), {
      headers: { 'content-type': 'application/json' }
    });
  }
}
