import { GameRoom } from './room.js';

export { GameRoom };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
