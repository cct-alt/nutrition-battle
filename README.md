# 🍎⚔️ 營養大作戰

兩人實時搶答對戰網頁遊戲，專為 iPad 設計。學生用瀏覽器即開即玩，無須安裝任何 App。

**玩法**：一人建立房間 → 將 4 位房號話俾對方 → 對方輸入房號加入 → 開波！
10 條題目鬥快搶答：答得快分越高、連擊有倍數、三連擊送道具、終極題雙倍、答錯扣血歸零即敗（KO）。

---

## 技術架構

| 部分 | 技术 |
|---|---|
| 前端 | 純 HTML/CSS/JS（`public/`），iPad 觸控優化 |
| 後端 | Cloudflare Workers + Durable Objects（每個房間一個實例） |
| 即時通訊 | WebSocket（伺服器權威制：正確答案唔會提早傳去客戶端，防作弊） |

---

## 🚀 部署方法（完全不用安裝 Node.js）

全程只使用瀏覽器，學校電腦都做到。

### 第 1 步：上傳去 GitHub

1. 登入 [github.com](https://github.com)（免費註冊），按右上角 **＋ → New repository**
2. 名稱填 `nutrition-battle`，揀 **Private** 或 Public 都可以，按 **Create repository**
3. 在新頁面揀 **「uploading an existing file」**
4. 將本資料夾內嘅 **所有檔案同子資料夾**（`src/`、`public/`、`package.json`、`wrangler.jsonc` 等）拖放入上傳區
   - 💡 拖放整個資料夾會自動保留結構；確認 `src/index.js` 等路徑正確先好 commit
5. 按 **Commit changes**

### 第 2 步：連接 Cloudflare 自動部署

1. 登入 [dash.cloudflare.com](https://dash.cloudflare.com)（免費註冊）
2. 左邊揀 **Workers & Pages → Create application → 選「Import from Git」／Connect to Git**
3. 授權 GitHub 揀剛才個 repo
4. Build 設定：
   - **Build command**：留空（或 `npm install`）
   - **Deploy command**：`npx wrangler deploy`
   - Framework preset：None
5. 按 **Deploy**。Cloudflare 伺服器會自動幫你執行安裝同部署

完成後會得到網址，例如：
```
https://nutrition-battle.<你的帳戶>.workers.dev
```

之後每次改嘢 push 上 GitHub，Cloudflare 自動重新部署。

> ⚠️ 如果 deploy 報錯提及 Durable Objects：免費計劃已支援 SQLite 版 DO（本項目已設定 `new_sqlite_classes`），確認無刪走 `wrangler.jsonc` 內嘅 `migrations` 一段即可。

### 第 3 步（可選）：喺 iPad 加到主畫面

用 Safari 打開網址 → 分享 → **加入主畫面**。之後似一個 App 咁全螢幕玩。

---

## 🧪 想本地測試？（不用學校電腦）

用 [GitHub Codespaces](https://github.com/codespaces)（瀏覽器版 VS Code，免費時數足夠）：

1. 在 repo 頁面按 **Code → Codespaces → Create codespace**
2. 在 terminal 執行：
   ```bash
   npm install
   npx wrangler login     # 第一次要授權（瀏覽器彈出）
   npm run dev            # 本地測試
   ```
3. 用 Codespaces 彈出嘅 forwarded port 網址，喺 iPad 打開就可以試玩

---

## 📂 檔案結構

```
├── wrangler.jsonc        ← Cloudflare 設定（房間綁定、靜態檔案）
├── package.json
├── src/
│   ├── index.js          ← 入口：WebSocket 轉駁 + 靜態檔案
│   ├── room.js           ← GameRoom 對戰邏輯（計時/計分/道具/斷線處理）
│   └── questions.js      ← 題庫 ⭐ 改呢度加題目
└── public/
    ├── index.html        ← 畫面
    ├── style.css         ← 樣式（iPad 大按鈕）
    └── app.js            ← 客戶端邏輯
```

## ✏️ 常見修改

| 想改乜 | 去邊度 |
|---|---|
| 加題目／改題目 | `src/questions.js`（照抄一格，`a` = 正確選項索引，由 0 數起） |
| 每場題數 | `src/room.js` 頂 `TOTAL_Q` |
| 每題秒數 | `src/room.js` 頂 `QUESTION_MS`（同 `public/app.js` 嘅 timerLoop 內 15000 一齊改） |
| 答錯扣血量 | `WRONG_HP` |
| 凍結秒數／偷分金額 | `FREEZE_MS` / `STEAL_AMT` |

## 🎮 遊戲規則速覽

- 每題 15 秒，兩人同時搶答，**答對即刻完該題**
- 得分 = 基本 100 + 速度加成（最多 100）× 連擊倍數（最高 ×2）
- 答錯：扣血 20、本題出局（對手可以慢慢諗）、連擊歸零
- 血量歸零 → 即刻 KO 判負
- 每 3 連擊隨機獲得道具（最多持有 2 個）：
  - 🗑️ **50/50**：移除兩個錯誤選項
  - ❄️ **凍結**：對手 5 秒內不能搶答
  - 💰 **偷分**：由對手偷取 150 分
- 最後一題 🔥 **終極題分數 ×2**，隨時反敗為勝
- 賽後顯示你最弱嘅知識範疇，鼓勵溫書再戰

## 🎯 單人練習模式

喺主頁撳「單人練習模式」就一個人玩得（屋企搵唔到對手都 OK）：

- 同一題庫、同一計分規則（速度分、連擊、終極題雙倍）
- **本機最高分**紀錄，鼓勵破紀錄
- 賽後有**錯題重溫**（列出席你答錯嘅題目＋正確答案）
- 最弱環節分析 → 一鍵跳去溫習頁

## 📖 溫習頁

主頁同賽後報告都可以入「溫習範圍」：13 種營養素嘅食物來源／功能／缺乏病，最底有**缺乏病速記表**（考試必背配對）。
