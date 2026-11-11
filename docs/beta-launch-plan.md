# Beta 上線計畫（2026-11-16 寄給 Daphne、Collage）

> **給執行的 agent：** 照 superpowers:subagent-driven-development 一個 task 一個 task 做，步驟用 `- [ ]` 勾選。

**目標：** 11/16（週一）讓兩個外部試用者從自己的電腦登入 Remake，試用 storyboard 和剪輯。AI 生成全部關掉，總花費不超過 US$30。

**架構：** 在 Mac mini 上跑兩個獨立的正式版，一個試用者一個（各自的資料庫、media、預算、port）。後端由 launchd 管理，掛掉會自動重啟，對外用 Cloudflare Tunnel 開 https。開發用的 worktree 和正式版完全分開：正式版放在 `~/beta/<name>/`，跑的是固定 commit 的 build。

**技術：** FastAPI 加 uvicorn（現有的 venv）、Vite build 出來的 `dist`、SQLite、launchd、cloudflared（已經裝在 `/opt/homebrew/bin`）。

**分支：** `feat/beta-launch`，worktree 在 `/Users/tommy/orca/workspaces/BuildClub/beta-launch`，從 `origin/feat/canvas-restore`（c960f9c）開出來。PR 的 base 是 `feat/canvas-restore`，不碰 main（main 要合併得使用者明說）。

## 已經查清楚的事（2026-11-12，查程式碼得來）

- 同一個後端裡所有帳號共用同一份資料（`clients`、`workspaces` 沒有使用者欄位）。所以一個試用者要一個 instance。這樣「每個人的上限」也直接變成「每個 instance 的總上限」。
- 把 `DAILY_GEN_IMAGE_USD`、`DAILY_GEN_VIDEO_USD`、`DAILY_GEN_VOICE_USD` 設成 0，後端的 `over_budget` 就會回 429，拒絕所有生成（`backend/server.py:958`、`:1053`）。後端擋花費只要改 env。
- 所有 USD 的花費都會經過 `spend(wallet, usd, cap)`（`server.py` 約 1180 行），唯一例外是 `gen_budget(..., conn=...)` 那條路徑。花費依「當天、每個 wallet」記在 `store` 表，key 是 `spend:YYYY-MM-DD`。`scrapecreators` 這個 wallet 記的是 credits，不是 USD。
- 單一素材檔上限已經有了：`MAX_TAKE_BYTES = 200MB`（`backend/takes.py:31`）。
- 帳號只能用 `server.py add-user` 在命令列開，沒有自助註冊。
- `bin/isolated-backend.sh --state <dir>` 已經會把 DB 和 media 留在指定目錄。正式版的啟動腳本可以照它的做法寫，但不要把它的「零花費、沒有 .env」行為抄過來。

## 全域限制

- 預算：Daphne instance `BETA_TOTAL_USD=12`，Collage instance `BETA_TOTAL_USD=8`，保留 US$10 給我們自己測試。
- 每個 instance 的生成 cap 都是 0：`DAILY_GEN_IMAGE_USD=0`、`DAILY_GEN_VIDEO_USD=0`、`DAILY_GEN_VOICE_USD=0`。
- Port：daphne `8801`，collage `8802`。Remotion 的 port 每個 instance 要不一樣：`8811` 和 `8812`。
- 不讀、不印 `.env` 的值。複製 key 時只依名稱搬，不 echo 內容。
- 不新增任何依賴（npm、pip、brew 都不行）。
- 不動另一個 agent 正在做的剪輯器程式碼（`src/components/editor/**`、`backend/editing.py`、`backend/editor_ai.py`），只能讀。
- 開發用的付費測試，單次要在 US$1 以下，而且全部記在 `docs/test-log.md`。

## 要特別盯的地方（沒有 task 的測試會自然測到，最可能出事的）

1. **畫布深處還有生成入口**，例如右鍵選單、快捷鍵、Assistant 建議「幫你生成」。按下去要看到「beta 沒有開放」的說明，不能是 429 錯誤畫面。Task A 已取消，所以 Task E 只要記錄有哪些入口，並確認按下去只拿到 429、沒有花錢。
2. **預算剛好用完時，背景工作已經在跑**（影片分析、channel summary）。工作要能正常收尾，不能卡在 loading。Task B 要測「total 已滿時 spend 回 False」，Task E 要看 UI 怎麼呈現。
3. **tunnel 是 https，本機是 http**，登入 cookie 的 Secure 屬性可能讓試用者登不進去。Task C 要用 tunnel 網址實際登入一次。
4. **iPhone 拍的 HDR 或直式 .mov 素材。** Collage 一定會傳。Task E 要用一支真實 iPhone 素材走完上傳、分析、剪輯、匯出。
5. **mini 重開機之後**，launchd 要把兩個後端和 tunnel 都帶起來。Task C 用 `launchctl kickstart -k` 模擬，真正的重開機由使用者決定要不要測。

---

## 階段和分工

| 階段 | 什麼時候 | 誰做 | 內容 |
|---|---|---|---|
| 0 | 現在 | 主 session | 開 worktree（完成）、跑 baseline verify |
| 1 | 平行 | 2 個 subagent，各開 worktree | Task B 總預算上限、Task C 正式版部署腳本 |
| 2 | 1 完成後 | 主 session | 合進 `feat/beta-launch`、full verify、架兩個 instance 和 tunnel（Task D） |
| 3 | 2 完成後 | 1 個測試 subagent | 用 tunnel 網址扮兩種角色走 E2E，含付費 smoke（Task E） |
| 4 | 和 3 同時 | 主 session | 試用者文件草稿、回饋問卷題目、寄信草稿（Task F），只寫草稿不寄 |
| 5 | 週六、週日 | 主 session | 把剪輯 agent 的修正併進來，重 build、重測、凍結版本 |

為什麼這樣切：B、C 改的檔案沒有重疊（`server.py` 的 spend、`bin/` 的新腳本），可以平行。D 要等兩個都完成。E 必須在真正部署好的網址上測，不能在 dev server 上測。

---

### Task A：畫布藏起 AI 生成（2026-11-12 取消）

使用者決定不做：畫布交給另一個剪輯 agent。後端仍會把生成的 cap 設成 0，所以畫面上看得到生成按鈕，但按了只會拿到 429 訊息，不會花錢。

### Task B：總預算上限（跨天加總）

**檔案：**
- 改：`pivots/02-content/app/trend-finder/backend/server.py`（`spend`、`gen_budget` 的 conn 路徑、`over_budget` 的文字）
- 測試：`backend/tests/test_beta_total_budget.py`（新）

**介面：**
- 產出：env `BETA_TOTAL_USD`（float，沒有設定時表示不限，維持現狀）。`total_spent_usd() -> float` 把所有 `spend:*` key 裡的 USD wallet 加起來（排除 `scrapecreators`）。`spend()` 和 `gen_budget(conn=...)` 在「今天的 cap」之外，再檢查「total + usd 不超過 BETA_TOTAL_USD」。`refund()` 也要從 total 退回（因為 total 是從每日紀錄加總出來的，退回每日紀錄就會自動退回）。
- 超過時回 429：`The beta budget for this workspace is used up. Saved work still opens; new AI analysis is paused. Contact the Remake team to add more.`

- [ ] 寫失敗的測試：
  - 已經花了 11.9（分散在兩天），`BETA_TOTAL_USD=12`，`spend("claude", 0.2, 1.0)` 回 `False` 而且沒有記帳
  - `spend("claude", 0.05, 1.0)` 回 `True`
  - scrapecreators 的 credits 不算進 total
  - 沒有設 `BETA_TOTAL_USD` 時行為和現在一樣
  - `gen_budget("image", 0.1, conn)` 在 total 已滿時回 429
  - refund 之後 total 會跟著變少
- [ ] 跑 `bash bin/verify.sh`（或只跑 `pytest backend/tests/test_beta_total_budget.py -v`），確認紅燈
- [ ] 實作
- [ ] 跑 `bash bin/verify.sh full`，確認全綠
- [ ] Commit：`feat(budget): cap total beta spend across days with BETA_TOTAL_USD`

### Task C：正式版部署腳本（launchd、tunnel、備份）

**檔案：**
- 新：`bin/beta-instance.sh`：`bash bin/beta-instance.sh <install|update|status|backup|add-user> <name>`
- 新：`bin/beta/instance.env.template`（只放非機密的 cap 和 port，key 名稱留空）
- 測試：`bin/test_beta_instance.sh`，用暫存的 HOME 跑，不碰真正的 `~/beta`

**介面：**
- `install <name>`：建立 `~/beta/<name>/{app,state,backups,logs}`，把 `backend`（排除 `.venv`、`data.db`、`jobs`、`cache`、`__pycache__`、`.env`）和 `dist` 複製到 `app/`，從 template 加上指定的 key 名稱產生 `app/.env`。key 名稱是 `ANTHROPIC_API_KEY`、`APIFY_TOKEN`、`APIFY_*_ACTOR`，值從 `/Users/tommy/Desktop/BuildClub/pivots/02-content/app/trend-finder/.env` 搬，不印出來；`FAL_KEY`、`GEMINI_API_KEY`、`ELEVENLABS_*` 一律不搬。接著寫兩個 launchd plist（`~/Library/LaunchAgents/com.remake.beta.<name>.plist` 跑 uvicorn、`com.remake.beta.<name>.tunnel.plist` 跑 cloudflared），兩個都設 `KeepAlive=true`、`RunAtLoad=true`。
- `update <name>`：重新複製 app、保留 state、重啟服務。
- `backup <name>`：用 `sqlite3 data.db ".backup"` 加上 rsync media，存到 `backups/<日期>/`，只留最近 7 份。另外寫一個每天 03:00 跑的 launchd job。
- `status`：每個 instance 的 pid、port、tunnel 網址、今天和累計的花費。
- `add-user <name> <email>`：呼叫 `server.py add-user`，密碼從 stdin 讀。
- `name` 只接受 `daphne` 或 `collage`。port、Remotion port、`BETA_TOTAL_USD` 依名稱對應全域限制裡的值。
- tunnel：預設用 quick tunnel（`cloudflared tunnel --url http://localhost:<port>`），網址從 log 裡讀出來。named tunnel（固定網域）等使用者買了網域、做完 `cloudflared tunnel login` 之後再換，這次不做。

- [ ] 寫失敗的測試：在暫存的 HOME 裡 `install daphne`，要產生正確的目錄、`.env` 要有 `BETA_TOTAL_USD=12` 和三個生成 cap 都是 0、`.env` 裡沒有 `FAL_KEY`、plist 通過 `plutil -lint`。輸入 `install foo` 要失敗
- [ ] 跑測試，確認紅燈
- [ ] 實作
- [ ] 跑測試確認綠燈，並把 `bin/test_beta_instance.sh` 加進 `bin/verify_offline.py` 的 run_step
- [ ] 確認 `session_cookie_secure` 在 https tunnel 後面會怎麼運作。如果需要 env 才能開 Secure cookie，就寫進 template
- [ ] Commit：`feat(deploy): add beta-instance script for launchd + tunnel + backups`

### Task D：合併並架起兩個 instance（主 session）

- [ ] 把 B、C 的分支合進 `feat/beta-launch`，跑 `bash bin/verify.sh full`，要全綠
- [ ] `npm run build`
- [ ] 依序跑 `bash bin/beta-instance.sh install daphne` 和 `install collage`，再跑 `status`，兩個都要回 200、各有一個 tunnel 網址
- [ ] 各開一個我們自己的測試帳號（`beta-test+daphne@…`），試用者的帳號等使用者給 email 之後再開
- [ ] 跑 `launchctl kickstart -k`，確認後端在 10 秒內回來
- [ ] 跑一次 `backup daphne`，再還原到暫存目錄，確認 DB 打得開
- [ ] Push `feat/beta-launch`，開 PR，base 是 `feat/canvas-restore`

### Task E：在正式網址上的 E2E（測試 subagent，用 Playwright MCP）

用 tunnel 網址從外部進去（不是 localhost）。每走完一步就截圖，存到 scratchpad 的 `beta-e2e/`。

- [ ] **角色 1，Daphne（影片公司）：** 登入 → 建立 client → 規劃一支影片 → storyboard → 每個鏡頭上傳真人素材（用 reseed.md 裡的 3 個 take 加音樂）→ 開剪輯器 → 剪 → 匯出 → 下載成片並確認能播
- [ ] **角色 2，Collage（學生社團）：** 登入 → 「下週活動宣傳」的短片 → 上傳一支 iPhone 直式 .mov（HDR）→ 剪輯 → 匯出 9:16
- [ ] **兩個 instance 的資料互相看不到**
- [ ] **按生成按鈕不會花錢**：只會拿到 429 訊息，花費紀錄沒有增加（Review Focus 第 1 點）
- [ ] **付費 smoke：** 在 daphne instance 跑一次 Trend 搜尋和一次影片分析，記下實際花費（預估不到 US$1）
- [ ] **預算用完的畫面：** 暫時把 collage 的 `BETA_TOTAL_USD` 調成 0.01，觸發一次分析，確認看到 Task B 的訊息、畫面沒有卡住，再改回 8
- [ ] 1440x900 和 1280x800 都要看
- [ ] 把問題分成「上線前一定要修」和「可以接受」兩類，寫進 `docs/test-log.md`

### Task F：給試用者的東西（只寫草稿，不寄）

- [ ] 試用說明（英文，1 頁）：試什麼、大概花多久、哪些功能沒開、請用電腦開、上傳上限 200MB、怎麼回報問題
- [ ] 回饋問卷題目（英文，8–10 題）。Daphne 問工作流程和願不願意付錢，Collage 問每週會不會用、等待時間能不能接受
- [ ] 寄給兩個人的訊息草稿
- [ ] 每天看花費的方法：`bash bin/beta-instance.sh status`

### 週六、週日（之後的 session）

- [ ] 把 `feat/canvas-restore` 上剪輯 agent 的新修正合進 `feat/beta-launch`，跑 full verify，再跑 `beta-instance.sh update` 兩次，最後重跑一次 Task E 的角色 1 和 2
- [ ] 週日晚上凍結版本：記下部署的 commit sha，寫進 `docs/STATUS.md`

## 需要使用者做的事

1. 給 Daphne 和 Collage 試用者的 email（用來開帳號）
2. 決定要不要買網域。不買的話，quick tunnel 的網址只要 cloudflared 重啟就會變，要重新寄給試用者
3. 問卷要放哪裡（Google Form 或 Tally 等）。我們準備題目，表單由使用者自己建
4. 看過訊息草稿後自己寄出
5. mini 的系統設定：關掉睡眠、開啟「停電後自動開機」
