# Remake 第一階段：整條流程打通 + Design System + 新功能後端，執行計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 在新 flow 上，搜尋到分享連結審核批准整條流程打通，而且每一步都存後端。另外交付一套 Design System（token 加規範），以及按秒數留言、頻道分析、Google 登入結構、發佈結構、發佈後數據和 A/B 結構。

**Architecture：**
- 前端是 React 19 + Vite（`src/`），後端是 FastAPI + SQLite（`backend/`）。
- 後端資料有兩種存法：
  - 大部分是 `store` 表的 key/value，用 `load(key)` / `save(key, items)`，例如 `"clients"`、`"ideas"`、`"share:<token>"`。
  - 帳號和 session 存在 `users` / `sessions` 表。
- 新功能沿用這個模式，只有發佈和數據開新表，因為它們要用 id 查詢、要排序。
- 前端的登入、存後端、分享審核，都從舊分支 `feat/remake-monday-mvp` 搬 `src/lib/auth.ts`、`src/lib/live.ts`（存取部分）、`src/lib/share.ts` 過來，畫面用 Veralyn 的設計重做。

**Tech Stack：** React 19、TypeScript、Vite、FastAPI、pydantic、SQLite、pytest、`node --test`、Playwright MCP（端到端）。

**Spec：** `pivots/02-content/docs/specs/2026-10-31-remake-end-to-end-design.md`（本計畫依據它，執行者兩份都要讀）

## Global Constraints

- 以下路徑相對於 `pivots/02-content/app/trend-finder`，除非寫明是 repo 根目錄。
- 基底：`feat/port-onto-remake-flow` @ `0d21f04`。整合分支 `feat/remake-e2e`。各條線的分支：`feat/remake-ds`、`feat/remake-flow-wiring`、`feat/remake-new-backend`。
- 不新增任何 npm 或 pip 依賴。
- 不碰 port 8787、8801、5195、8798。各條線的測試 port：
  - 線 1：8795
  - 線 2：8797
  - 線 3：8796
  - 隔天的環境：8805
- 啟動測試用的後端：`bash bin/isolated-backend.sh <port> --demo-data --user test@example.com:pw-for-e2e`（repo 根目錄執行；dist 要先 `npm run build`）。
- 不讀 `.env`，不 source `~/.config/fish/api-keys.fish`，不做任何付費呼叫。不按「分析頻道」「產生 shot list」「重新抓趨勢」。
- 每個 task 結束前，在 repo 根目錄跑 `bash bin/verify.sh`，要印出 `verify: GREEN`。動到前端的 task 還要跑 `npm run build` 和 `npm run lint`，兩個都不能有錯。
- 正式模式（沒有 `--demo-data`）下，不能出現範例或假數據，包括假的發佈結果和成效數字。
- 新畫面只能用 `src/styles/tokens.css` 裡的 token 和 `pivots/02-content/docs/design-system.md` 裡的元件。真的沒有才新增，新增了要寫進規範。
- commit 格式 `<type>(trend-finder): <英文描述>`，結尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。
- 拍攝剪輯不在這份計畫裡，是第二階段。

## Review Focus

1. **session 在流程中途過期**：任何 API 回 401，畫面要回到登入，登入後回到原本的畫面，而且還沒存的 plan 編輯不能丟。測試在 Task 3。
2. **兩個分頁同時改 ideas**：`PUT /api/ideas` 帶 `If-Match`，版本不符就回 412。前端要重新載入後合併，不能默默覆蓋。測試在 Task 4。
3. **審核人打開已經關掉的連結**：顯示「這條連結已經關閉」，不能白屏，也不能是通用錯誤。測試在 Task 6。
4. **審核人連按兩次批准，或審一個已經不是待審的 idea**：第二次後端回 404，畫面顯示「已經審過了」並重新載入清單。測試在 Task 5 和 Task 6。
5. **舊的 localStorage ideas 只上傳一次**：重新登入、重新整理都不能重複上傳，也不能蓋掉後端已有的資料。測試在 Task 4。

---

## 執行順序

```
Task 0 (setup)
  ├─ 線1: Task 1 (tokens) ──> Task 2 (規範)
  ├─ 線2: [等 Task 1] Task 3 → 4 → 5 → 6 → 7
  └─ 線3: Task 9 → 10 | Task 11 | Task 12 | Task 13 → 14   (互相獨立，可平行)
合併：Task 1 → 線2 → Task 2 → 線3 各項（每合一項重跑 Task 7 的端到端）→ Task 8
```

### Task 0：建立分支和 worktree

- [ ] **Step 1：** 從 `feat/port-onto-remake-flow` 建整合分支，再為三條線各開一個 worktree：
```bash
cd /Users/tommy/orca/workspaces/BuildClub/port-onto-remake-flow
git branch feat/remake-e2e 0d21f04
for b in remake-ds remake-flow-wiring remake-new-backend; do
  git worktree add ../$b -b feat/$b feat/remake-e2e
done
```
- [ ] **Step 2：** 在每個新 worktree 的 `pivots/02-content/app/trend-finder` 建 `node_modules` symlink，指到 port-onto-remake-flow 的 `node_modules`（不要 npm install）。然後跑 `bash bin/verify.sh`，三個都要 GREEN。

---

## 線 1：Design System（worktree `remake-ds`）

### Task 1：把 token 整理到單一來源

**Files：**
- Modify：`src/styles/tokens.css`
- Modify：線 2 會碰到的畫面用到的樣式檔：`src/styles/login.css`、`src/styles/drawer-plan.css`、`src/styles/approvals.css`、`src/styles/layout.css`、`src/styles/components.css`

**Interfaces：**
- Produces：CSS 自訂屬性，命名規則 `--color-*`、`--font-*`、`--text-*`（字級）、`--space-*`、`--radius-*`、`--shadow-*`、`--z-*`、`--duration-*`。後面所有 task 都只用這些名稱。保留 `tokens.css` 現有的變數名稱，可以加別名，但不能改名或刪除。

- [ ] **Step 1：** 先拍「改之前」的截圖：
  - 用 port 8795 起後端（見 Global Constraints）。
  - 用 Playwright MCP 在 1440 寬截這些畫面：登入、總覽、shortlist 看板、plan、Review as Annie、客戶設定。
  - 存到 scratchpad 的 `ds-before/`。
- [ ] **Step 2：** 整理 token：
  - 盤點 `src/styles/*.css` 和 `src/components/themes/` 裡寫死的顏色、字體、間距、圓角、陰影、z-index、動畫時間，整理進 `tokens.css`。
  - 上面 Files 列的五個檔，把寫死的數值換成 token。其他檔案不動。
- [ ] **Step 3：** `npm run build` 後重起後端，截同一組畫面存到 `ds-after/`，逐張比對。要求沒有肉眼可見的差異；有差就修到一樣。
- [ ] **Step 4：** `bash bin/verify.sh`，要 GREEN；`npm run lint` 沒有錯。
- [ ] **Step 5：** Commit：`refactor(trend-finder): consolidate design tokens into tokens.css`

### Task 2：Design System 規範文件和給使用者看的頁面

**Files：**
- Create：`pivots/02-content/docs/design-system.md`（repo 根目錄的相對路徑，繁體中文）

**Interfaces：**
- Consumes：Task 1 的 token 名稱。
- Produces：元件清單和對應的 class 或元件名稱。Task 6、10、11 照這份做。

- [ ] **Step 1：** 寫規範文件：
  - 先列 token 表：名稱、值、用途。
  - 再寫元件，每個元件包括用途、什麼時候用、不能怎麼用、對應的 class 或 `.tsx` 名稱。
  - 至少涵蓋：按鈕、卡片、標籤或 chip、側邊欄、看板欄、抽屜、表單欄位、空狀態、錯誤訊息。
  - 每條規則都要在程式碼裡找得到出處（檔名:行號），不能自己發明。
- [ ] **Step 2：** 做一頁 claude.ai Artifact：先跑 Artifact `quickstart`（intent `other`），每個 token 附色塊或範例，每個元件附實際長相。內容和 `design-system.md` 一致。把連結回報給 orchestrator。
- [ ] **Step 3：** Commit：`docs(trend-finder): add Remake design system guide`

---

## 線 2：整條流程打通（worktree `remake-flow-wiring`，Task 1 合進整合分支後 rebase 一次）

### Task 3：真登入

**Files：**
- Create：`src/lib/auth.ts`（從舊分支複製）
- Modify：`src/components/LoginScreen.tsx`、`src/App.tsx`
- Create：`src/lib/authGate.ts`
- Test：`unit/authGate.test.mjs`

**Interfaces：**
- Consumes：舊分支 `src/lib/auth.ts` 的 `me(): Promise<AuthState>`、`login(email, password): Promise<Account>`、`logout(): Promise<void>`。
- Produces：
  - `authGate.ts` 匯出 `nextView(auth: AuthState, requested: string): string`：沒登入時回 `'login'`，登入後回 `requested`。
  - `authGate.ts` 匯出 `onUnauthorized(handler: () => void): void`：全域 fetch 收到 401 時呼叫。

- [ ] **Step 1：寫會失敗的測試** `unit/authGate.test.mjs`：
  - `nextView({signedIn:false}, 'plan') === 'login'`
  - `nextView({signedIn:true, account:{...}}, 'plan') === 'plan'`
  - 收到 401 回應時，`onUnauthorized` 註冊的 handler 被呼叫一次（用假的 fetch）。
- [ ] **Step 2：** `node --test unit/authGate.test.mjs`，結果要 FAIL（模組不存在）。
- [ ] **Step 3：實作。**
  - Staff 登入表單接 `login()`，表單沿用 Veralyn 的樣式，加 email 和密碼欄位。
  - 帳密錯誤時顯示「Wrong email or password.」。
  - Client 身分維持 coming soon。
  - `App.tsx` 啟動時呼叫 `me()`。
  - 收到 401 時：記下目前畫面和還沒存的 plan 草稿（存 sessionStorage）→ 回登入 → 登入後還原（Review Focus 1）。
  - 側邊欄的登出接 `logout()`。
- [ ] **Step 4：** `node --test unit/` 全過；`npm run build` 沒有錯。
- [ ] **Step 5：** Commit：`feat(trend-finder): real email/password sign-in on the Remake flow`

### Task 4：客戶、ideas、plan 存後端

**Files：**
- Modify：`src/state.ts`、`src/lib/live.ts`（加入舊分支的 `loadList`、`saveList`、`loadIdeas`、`saveIdeas`、`loadLibrary`、`saveLibrary`）
- Create：`src/lib/migrateLocal.ts`
- Test：`unit/migrateLocal.test.mjs`

**Interfaces：**
- Consumes：後端 `GET/PUT /api/clients`、`GET/PUT /api/ideas`（ETag 和 `If-Match`）、`GET/PUT /api/library`。
- Produces：`migrateLocal.ts` 匯出 `pickInitialIdeas(remote: SavedIdea[] | null, local: SavedIdea[] | null, alreadyMigrated: boolean): { ideas: SavedIdea[]; upload: boolean }`。

- [ ] **Step 1：寫會失敗的測試**：
  - remote 是 `null`、local 有 2 筆、還沒搬過 → `{ideas: local, upload: true}`
  - remote 有 1 筆、local 有 2 筆 → `{ideas: remote, upload: false}`
  - 已經搬過 → 一律 `{ideas: remote ?? [], upload: false}`（Review Focus 5）
- [ ] **Step 2：** 跑測試，結果要 FAIL。
- [ ] **Step 3：實作。**
  - `state.ts` 載入時讀後端。localStorage 的 `trend-finder.ideas.v4` 只當快取和第一次搬家用。
  - 搬過之後寫入 `trend-finder.migrated.v1 = "1"`。
  - 每次改動都存後端，帶 `If-Match`。
  - 收到 412 時：重新 `loadIdeas()` → 把本地這次的改動套上去 → 再存一次（Review Focus 2）。
  - 客戶和 library 也一樣存後端。
- [ ] **Step 4：** `node --test unit/` 全過。用 port 8797 起後端，手動確認：加一個 shortlist → 開新的 browser context 登入同一個帳號 → 看得到那筆 shortlist。
- [ ] **Step 5：** Commit：`feat(trend-finder): save clients, ideas and plans on the server`

### Task 5：後端加退回歷史，審核人的決定優先

**Files：**
- Modify：`backend/models.py`（`SavedIdea`）、`backend/share.py`（`decide_idea`、`merge_ideas`）
- Test：`backend/tests/test_share.py`、`backend/tests/test_ideas_merge.py`（加測試）

**Interfaces：**
- Produces：
  - `models.py`：新增 `class Decision(BaseModel): decision: Literal["approved","rejected"]; reason: Optional[str]; tags: Optional[list[Tag]]; decidedAt: int`。
  - `SavedIdea` 加 `history: Optional[list[Decision]] = None`。
  - 前端 `src/types.ts` 的 `SavedIdea` 也要加同樣的 `history?: Decision[]`（這一步在 Task 6 做）。

- [ ] **Step 1：寫會失敗的測試**：
  - `test_reject_then_resend_keeps_history`：
    - 第一次退回（reason "too long", tags ["Too hard or costly"]），之後 staff 把 status 改回 `waiting` 並清掉 `rejectReason`。
    - 再批准之後，`history` 有兩筆，順序是 `[rejected, approved]`；第一筆的 reason 是 "too long"。
  - `test_merge_keeps_newer_reviewer_decision`：
    - stored 是 `{status:"approved", decidedAt:2000}`，incoming 是 `{status:"waiting", decidedAt:1000}`。
    - merge 之後 status 是 `"approved"`，decidedAt 是 2000。
  - `test_merge_allows_resend_after_decision`：
    - stored 是 `{status:"rejected", decidedAt:2000}`，incoming 是 `{status:"waiting", sentAt:3000}`，`sentAt` 比 `decidedAt` 新。
    - merge 之後 status 是 `"waiting"`，`history` 保留。
  - `test_decide_twice_returns_404`：同一個 idea 決定第二次，回 404（Review Focus 4）。
- [ ] **Step 2：** 跑 `backend/.venv/bin/python -m pytest backend/tests/test_share.py backend/tests/test_ideas_merge.py -q`，結果要 FAIL。
- [ ] **Step 3：實作。**
  - `decide_idea` 每次決定都 append 到 `history`。
  - `merge_ideas` 的規則：決定欄位（`status`、`rejectReason`、`rejectTags`、`decidedAt`）取 stored 和 incoming 之間時間戳較新的那一方。時間戳是 `decidedAt` 和 `sentAt` 兩者取最大值。
  - `history` 永遠取比較長的那一份，不能變短。
- [ ] **Step 4：** 測試全過；`bash bin/verify.sh` GREEN。
- [ ] **Step 5：** Commit：`feat(trend-finder): keep review history and let the reviewer's decision win`

### Task 6：送審產生分享連結，審核頁用新設計重做

**Files：**
- Create：`src/lib/share.ts`（從舊分支複製）
- Create：`src/components/SharedReviewPage.tsx`
- Create：`src/styles/shared-review.css`
- Modify：
  - `src/App.tsx`（`/review/<token>` 路由，不用登入）
  - `src/components/ShortlistBoard.tsx`（批次送審時建立連結，顯示可以複製的連結和「關掉連結」按鈕）
  - `src/components/PlanScreen.tsx`、`src/components/ClientMemory.tsx`（顯示退回標籤和 `history`）
  - `src/types.ts`（加 `Decision`、`history`）
- Test：`unit/share.test.mjs`

**Interfaces：**
- Consumes：
  - 舊分支 `share.ts` 的 `createShareLink`、`revokeClientLinks`、`loadReview`、`sendDecision`、`reviewTokenFromPath`、`REJECT_TAGS`。
  - Task 5 的 `history`。
  - Task 2 的元件規範（Task 2 還沒完成的話，照 Task 1 的 token 做）。
- Produces：`/review/<token>` 頁面，元件 `SharedReviewPage`。Task 10 會在上面加留言。

- [ ] **Step 1：寫會失敗的測試**：
  - `reviewTokenFromPath('/review/abc_-123') === 'abc_-123'`
  - `reviewTokenFromPath('/plan') === null`
  - `REJECT_TAGS` 有 5 個，內容和舊分支一樣。
  - `loadReview` 遇到 404 回 `null`，頁面要能分辨「連結已關閉」和其他錯誤。
- [ ] **Step 2：** 跑測試，結果要 FAIL。
- [ ] **Step 3：實作。**
  - 審核頁列出這個客戶所有待審的 plan，每個顯示參考影片、shot list、給審核人的備註。
  - 「批准」直接送出。「退回」先展開 5 個標籤（可多選）和文字欄，再送出。
  - 送出後收到 404：顯示「已經審過了」，重新載入清單（Review Focus 4）。
  - 連結已關閉：整頁顯示「這條連結已經關閉，請向寄件人要新的連結」（Review Focus 3）。
  - staff 端的看板和 plan 顯示退回標籤、文字和上一次的歷史。客戶記憶把標籤算進去。
  - 「Review as Annie」保留，標成預覽。
- [ ] **Step 4：** `node --test unit/` 全過；`npm run build`、`npm run lint` 沒有錯。
- [ ] **Step 5：** Commit：`feat(trend-finder): share-link review page on the Remake design`

### Task 7：端到端驗收（Playwright MCP）

**Files：** 不改程式碼。結果寫進 orchestrator 的回報。

- [ ] **Step 1：** 準備環境：
  - `npm run build`。
  - 用 port 8797 起後端，參數 `--demo-data --user test@example.com:pw-for-e2e`。
- [ ] **Step 2：** 1440 寬，staff 這邊跑：
  - 登入（先輸入錯的密碼，確認看到錯誤訊息，再用對的登入）
  - 選客戶 → 搜尋 "tofu" → 打開影片抽屜，確認看得到計算公式
  - 加進 shortlist → 開 plan → 寫給審核人的備註 → 批次送審 → 複製連結
- [ ] **Step 3：** 開一個**新的 browser context（沒登入）**打開連結，選兩個標籤，寫文字，退回。
- [ ] **Step 4：** 回 staff：
  - 確認看板上看得到兩個標籤和文字。
  - 重新整理後還在，證明有存後端。
  - 再送審一次。
- [ ] **Step 5：** 回審核頁：
  - 重新整理，批准。
  - 再按一次批准，確認看到「已經審過了」。
- [ ] **Step 6：** 回 staff：
  - 確認狀態是批准、歷史有兩筆。
  - 客戶記憶有更新。
- [ ] **Step 7：** 關掉連結，審核頁要顯示「這條連結已經關閉」。
- [ ] **Step 8：** 在 390 寬重跑 Step 2–6，標準是流程走得完、沒有元件被擋住或點不到。
- [ ] **Step 9：** 每一步都截圖，存到 scratchpad 的 `e2e/`。任何一步失敗就算整個 task 失敗，要回報是哪一步、截圖和 console 錯誤。

---

## 線 3：新功能後端（worktree `remake-new-backend`）

### Task 9：按秒數留言的後端

**Files：**
- Create：`backend/comments.py`
- Modify：`backend/models.py`、`backend/server.py`（`app.include_router`）、`backend/share.py`（只加一個供 `comments.py` 使用的 `active_link(token)`）
- Test：`backend/tests/test_comments.py`

**Interfaces：**
- Produces：
  - `models.py` 新增兩個 model：
    - `class Comment(BaseModel)`，欄位 `id: str`、`ideaId: str`、`videoId: str`、`atSec: float`（≥0）、`text: str`（1–500 字）、`author: str`（1–60 字）、`createdAt: int`
    - `class NewComment(BaseModel)`，欄位 `videoId`、`atSec`、`text`、`author`
  - 儲存：key `"comments:<ideaId>"`，值是 `list[Comment]`。
  - 端點：
    - `GET /api/ideas/{idea_id}/comments` → `list[Comment]`，依 `atSec` 排序，要登入
    - `POST /api/ideas/{idea_id}/comments`（`NewComment`）→ `Comment`，要登入
    - `GET /api/review/{token}/ideas/{idea_id}/comments` 和 `POST /api/review/{token}/ideas/{idea_id}/comments`：不用登入，但 idea 必須屬於這條連結的客戶
  - 不提供修改和刪除的端點。

- [ ] **Step 1：寫會失敗的測試**：
  - `test_post_and_list_sorted_by_time`：先存 12.5 秒的留言，再存 3.0 秒的，列出來的順序是 3.0、12.5。
  - `test_text_over_500_rejected`：501 字回 422。
  - `test_200_per_video_cap`：同一支影片第 201 則回 409。
  - `test_share_link_can_comment_only_own_client`：用別的客戶的 idea 回 404。
  - `test_revoked_link_cannot_comment_but_staff_still_sees`：連結關掉之後，從分享端 POST 回 404；staff 端 GET 還看得到舊留言。
  - `test_no_edit_or_delete_routes`：PUT 和 DELETE 回 405。
- [ ] **Step 2：** 跑 `pytest backend/tests/test_comments.py -q`，結果要 FAIL。
- [ ] **Step 3：實作。** 用 `threading.Lock` 包住讀寫。
- [ ] **Step 4：** 測試全過；`verify.sh` GREEN。
- [ ] **Step 5：** Commit：`feat(trend-finder): timestamped comments on plan reference videos`

### Task 10：按秒數留言的前端（等 Task 6 合進整合分支後 rebase 再做）

**Files：**
- Create：`src/lib/comments.ts`、`src/components/TimedComments.tsx`
- Modify：`src/components/PlanScreen.tsx`、`src/components/SharedReviewPage.tsx`
- Test：`unit/comments.test.mjs`

**Interfaces：**
- Consumes：Task 9 的端點。
- Produces：
  - `comments.ts` 匯出 `formatAt(sec: number): string`（`75.4 → "1:15"`）
  - `comments.ts` 匯出 `sortByTime(c: Comment[]): Comment[]`

- [ ] **Step 1：寫會失敗的測試**：
  - `formatAt(0) === "0:00"`
  - `formatAt(75.4) === "1:15"`
  - `formatAt(3725) === "1:02:05"`
  - `sortByTime` 照 `atSec` 由小到大排。
- [ ] **Step 2：** 跑測試，結果要 FAIL。
- [ ] **Step 3：實作。**
  - 留言時自動帶入播放器目前的秒數。拿不到秒數就讓使用者自己輸入「分:秒」。
  - 審核頁第一次留言時問作者名稱，存在 localStorage 的 `remake.reviewer-name`。
  - 點秒數時，播放器支援跳秒就跳過去（可以用 `src/lib/` 現有的 tiktokPlayer 相關程式），不支援就只顯示秒數。
- [ ] **Step 4：** `node --test unit/` 全過；`npm run build`、`npm run lint` 沒有錯；重跑 Task 7。
- [ ] **Step 5：** Commit：`feat(trend-finder): timestamped comments on the plan and review page`

### Task 11：頻道分析接進新 flow

**Files：**
- Create：
  - `src/lib/channel.ts`（從舊分支複製）
  - `src/components/ChannelScreen.tsx`（用新設計重做）
  - `src/styles/channel.css`
- Modify：`src/components/Sidebar.tsx`、`src/App.tsx`

**Interfaces：**
- Consumes：後端 `/api/channel`（已經存在，不用改）。

- [ ] **Step 1：** 從舊分支搬功能，版面照 Design System 重做。「分析頻道」按鈕旁邊寫明「會使用抓取額度」。
- [ ] **Step 2：** `npm run build`、`npm run lint` 沒有錯；`verify.sh` GREEN。用 port 8796 起後端截空狀態的畫面，不按分析。
- [ ] **Step 3：** Commit：`feat(trend-finder): channel analysis screen on the Remake flow`

### Task 12：Google 登入的後端結構

**Files：**
- Create：`backend/google_auth.py`
- Modify：
  - `backend/auth.py`：`users` 表在啟動時檢查欄位，沒有 `google_sub TEXT` 就 `ALTER TABLE` 加上去，舊資料不能動
  - `backend/server.py`：`include_router`；`needs_session` 放行 `/api/auth/config` 和 `/api/auth/google/*`
  - `src/components/LoginScreen.tsx`：只有 `google: true` 時才顯示按鈕
- Test：`backend/tests/test_google_auth.py`

**Interfaces：**
- Produces：
  - `GET /api/auth/config` → `{"google": bool}`。設了 `GOOGLE_CLIENT_ID` 才是 `true`。
  - `GET /api/auth/google/start` → 沒啟用時回 404 `{"error":"Google sign-in is not enabled."}`；啟用時 302 導向 Google。
  - `GET /api/auth/google/callback?code=&state=` → 驗證成功後，用 email 找已存在的帳號、寫入 `google_sub`、開 session。找不到帳號回 403，不自動開帳號。
  - 驗證函式可以替換：`google_auth.exchange_code: Callable[[str], dict]`，回 `{"sub","email","email_verified"}`。測試時用 monkeypatch 換掉。

- [ ] **Step 1：寫會失敗的測試**：
  - `test_config_false_without_env`
  - `test_start_404_when_disabled`
  - `test_callback_links_existing_user`：設 env 並換掉 `exchange_code` → 有 session cookie，`users.google_sub` 有值
  - `test_callback_unknown_email_403`
  - `test_callback_bad_state_400`
  - `test_existing_db_without_column_migrates`：先建舊的 `users` 表，啟動後欄位存在、資料不變
- [ ] **Step 2：** 跑測試，結果要 FAIL。
- [ ] **Step 3：實作。** `state` 用簽名過的隨機值，存在短期 cookie。不打真的 Google。
- [ ] **Step 4：** 測試全過；`verify.sh` GREEN；`npm run build` 沒有錯。
- [ ] **Step 5：** Commit：`feat(trend-finder): Google sign-in endpoints, off until keys are set`

### Task 13：發佈的後端結構

**Files：**
- Create：`backend/publishing.py`
- Modify：`backend/server.py`（`include_router`）
- Test：`backend/tests/test_publishing.py`

**Interfaces：**
- Produces：
  - 資料表 `publications`，欄位：
    - `id TEXT PRIMARY KEY`、`idea_id TEXT`、`variant TEXT`（預設 `"A"`）、`platform TEXT`（`tiktok|instagram|youtube`）
    - `scheduled_at INTEGER NULL`、`status TEXT`（`draft|scheduled|published|failed`）
    - `external_id TEXT NULL`、`error TEXT NULL`、`created_at INTEGER`
  - `class Publisher(Protocol): def publish(self, pub: dict) -> str`（回外部貼文 ID，失敗就 raise）
  - `class FakePublisher`：回 `"fake-<id>"`
  - `get_publisher() -> Publisher | None`：
    - 有 `AYRSHARE_API_KEY` 時，回一個 `AyrsharePublisher` 空殼，`publish` 直接 raise `NotImplementedError("Ayrshare not wired yet")`
    - 範例模式回 `FakePublisher`
    - 其他情況回 `None`
  - 端點：
    - `POST /api/publications`，body 是 `{ideaId, platform, variant?, scheduledAt?}` → 建立草稿
    - `POST /api/publications/{id}/publish` → publisher 是 `None` 時回 503 `{"error":"Publishing is not enabled."}`
    - `GET /api/ideas/{idea_id}/publications`
  - 只有 `approved` 的 idea 可以建立發佈，其他狀態回 409。

- [ ] **Step 1：寫會失敗的測試**：
  - `test_create_draft_for_approved_idea`
  - `test_create_for_waiting_idea_409`
  - `test_publish_503_when_no_publisher`
  - `test_publish_with_fake_in_demo_sets_published_and_external_id`
  - `test_publisher_error_sets_failed_and_error_text`
- [ ] **Step 2：** 跑測試，結果要 FAIL。
- [ ] **Step 3：實作。** 判斷是不是範例模式，沿用 `bin/isolated-backend.sh --demo-data` 和 server 現有的旗標。先讀 `server.py` 確認旗標名稱，沒有的話加一個環境變數 `REMAKE_DEMO=1`，並在 `isolated-backend.sh` 的 `--demo-data` 分支設定它。
- [ ] **Step 4：** 測試全過；`verify.sh` GREEN。
- [ ] **Step 5：** Commit：`feat(trend-finder): publishing model with a pluggable publisher`

### Task 14：發佈後數據和 A/B 比較的後端結構

**Files：**
- Modify：`backend/publishing.py`
- Test：`backend/tests/test_publication_metrics.py`

**Interfaces：**
- Consumes：Task 13 的 `publications`。
- Produces：
  - 資料表 `publication_metrics`，欄位：`publication_id`、`views`、`likes`、`comments`、`shares`（都是 INTEGER NULL）、`fetched_at INTEGER`、`source TEXT`
  - `POST /api/publications/{id}/metrics`（要登入，之後給抓數據的工作用）
  - `GET /api/ideas/{idea_id}/compare` → `{"variants":[{"variant","publicationId","platform","latest":{...}|null,"viewsVsBest": float|null}]}`
    - `viewsVsBest` 等於這個版本的 `views` 除以所有版本中最高的 `views`
    - 只有一個版本，或缺數據時，`viewsVsBest` 是 `null`
  - 範例模式第一次啟動時寫入一組範例 A/B 數據，正式模式不寫。

- [ ] **Step 1：寫會失敗的測試**：
  - `test_compare_two_variants_latest_snapshot_wins`：A 有兩筆快照，取 `fetched_at` 較新的那筆
  - `test_views_vs_best`：A 1000、B 500 → B 的 `viewsVsBest` 是 0.5，A 是 1.0
  - `test_single_variant_vs_best_null`
  - `test_missing_metrics_latest_null`
  - `test_no_demo_metrics_in_real_mode`
- [ ] **Step 2：** 跑測試，結果要 FAIL。
- [ ] **Step 3：實作。**
- [ ] **Step 4：** 測試全過；`verify.sh` GREEN。
- [ ] **Step 5：** Commit：`feat(trend-finder): post-publish metrics and A/B compare API`

---

## 合併和隔天的環境

### Task 8：合併、最終驗收、隔天的環境

- [ ] **Step 1：** 照「執行順序」把各分支合進 `feat/remake-e2e`。用 `git merge --no-ff`，有衝突就停下來回報，不能自己丟掉任何一邊的改動。每合一個分支：
  - `bash bin/verify.sh` 要 GREEN
  - `npm run build`、`npm run lint` 沒有錯
  - 線 2 合進去之後，每次再重跑 Task 7
- [ ] **Step 2：** 全部合完，最後跑一次 Task 7，1440 和 390 都要過。
- [ ] **Step 3：** 起隔天的環境，port 8805：
  - 真實模式，不加 `--demo-data`。
  - 新的資料庫。
  - 釘選的搜尋從 `backend/pinned` 帶過去。
  - 用 `add-user` 建使用者的帳號，email `tommycat997@gmail.com`，密碼隨機產生，只顯示在回報裡，不寫進任何檔案。
  - 用背景方式啟動，確認 `curl -s http://127.0.0.1:8805/api/health` 有回應。
- [ ] **Step 4：** 更新 repo 根目錄的 `docs/STATUS.md`（檔案不存在就建一個）：
  - 一行狀態
  - 今天的驗證結果和日期
  - 8805 的啟動和停止指令
  - 已知問題
  - 下一步：使用者測試，接著第二階段拍攝剪輯的盤點
- [ ] **Step 5：** push 所有分支到 `fork`（`minchiaHuang/BuildClub`）。開一個 PR，從 `feat/remake-e2e` 到 fork 的 `feat/port-onto-remake-flow`。PR 內文附上 Task 7 的結果。不要開 PR 到 upstream。
