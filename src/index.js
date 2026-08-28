import { GameRoom } from './room.js';
import { buildDeck } from './questions.js';
import { Leaderboard } from './room.js';

export { GameRoom, Leaderboard };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 排行榜 API - 必須在 /api/ws 之前，處理 GET/POST
    if (url.pathname === '/api/leaderboard') {
      const id = env.LEADERBOARD.idFromName('LEADERBOARD_GLOBAL');
      const stub = env.LEADERBOARD.get(id);
      return stub.fetch(request);
    }

    // 單人練習模式：隨機抽一套題目（連答案，自行批改）
    if (url.pathname === '/api/deck') {
      return new Response(JSON.stringify({ deck: buildDeck(10) }), {
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    // WebSocket：轉交畀對應房間嘅 Durable Object
    if (url.pathname === '/api/ws') {
      const code = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(code)) {
        return new Response('bad room code', { status: 400 });
      }
      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    // 其餘請求：靜態檔案（public 資料夾）
    return env.ASSETS.fetch(request);
  }
};
