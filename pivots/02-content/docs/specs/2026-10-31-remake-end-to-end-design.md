# Remake：整條流程打通 + Design System + 新功能後端，設計文件

- 日期：2026-10-31（雪梨），目標當天做完
- 隔天（2026-11-01）：使用者自己扮客戶，從頭到尾跑一遍，邊用邊改
- 依據：
  - 2026-10-31 的對話（使用者的決定標「使用者決定」）
  - 後端盤點和 71 張畫面截圖（2026-10-31），截圖在 Figma：https://www.figma.com/design/Ul8CfDLJnzHZb1ldkk9UmO
  - 前一份設計 `2026-10-30-remake-monday-mvp-design.md`（W1–W7 已做完，本文件不重複）
- 標「〔我的判斷〕」的是寫文件時替使用者做的決定，可以推翻。

以下路徑都相對於 `pivots/02-content/app/trend-finder`。「舊分支」指 `feat/remake-monday-mvp`（PR #3），「新 flow」指 `feat/port-onto-remake-flow`（Veralyn 在 main 上重做的 Remake flow，加上第一批搬過來的功能）。

## 1. 為什麼

隊友 Veralyn 想繼續做設計，但速度跟不上。使用者決定不等她：先把她目前的設計整理成一套規範，前端照規範走；後端今天全部做完。

隔天使用者要自己當客戶測試。**這次測試成不成功只看一件事（使用者決定）：搜尋完到審核批准，整條流程跑得通。** 跑不通，其他功能做再多都白做。

## 2. 目標、非目標、反目標

**目標**

- G1 新 flow 上，這條路從頭到尾不斷：登入 → 搜尋 → 看結果 → 加進 shortlist → 做 plan → 送審（產生分享連結）→ 審核人打開連結批准或退回 → staff 的看板和客戶記憶看到結果。每一步都存在後端，重新整理或換一台電腦都還在。
- G2 一套 Design System：token 檔加規範文件，只依據 Veralyn 的程式碼。
- G3 新功能：按秒數留言（前後端）、頻道分析接進新 flow、Google 登入和發佈的後端結構、發佈後數據和 A/B 比較的後端結構。
- G4 一個給使用者隔天用的新環境，新 port、新資料庫、使用者的帳號。

**非目標（今天不做）**

- 拍攝剪輯（從 reel-studio 或 brand-studio 搬過來）：第一階段不做，排成**第二階段**，等本文件的三條線全部合完、端到端測試通過才開始（使用者決定，2026-10-31）。第二階段開跑前，要先盤點 reel-studio 和 brand-studio 有什麼，另外寫一份範圍說明給使用者確認。
- 真的接上 Google OAuth 和 Ayrshare。等使用者拿到金鑰再接（使用者決定）
- Figma 元件庫（使用者決定，Design System 給 agent 和使用者自己用）
- 客戶登入入口（新 flow 的 Client 身分目前是 coming soon，維持不變）
- 手機寬度的重新設計（但不能比現在更壞）

**反目標（做了也算失敗）**

- 為了做 G3 弄壞 G1 的流程。
- 正式模式下出現範例或假數據，包括假的發佈結果和假的成效數字。
- 自己發明新樣式。新畫面要用 Design System 裡已有的 token 和元件，真的沒有才加，加了要寫進規範。
- 任何付費呼叫沒經過使用者核准（Apify、Anthropic、Ayrshare 等）。

## 3. 限制

- 基底是 `feat/port-onto-remake-flow`（HEAD `0d21f04`，worktree `/Users/tommy/orca/workspaces/BuildClub/port-onto-remake-flow`）。每條線開自己的分支，最後合回一條整合分支。
- 不新增任何 npm 或 pip 依賴。
- 不碰 port 8787、8801、5195、8798。測試用 `bin/isolated-backend.sh <port> --demo-data --user test@example.com:pw-for-e2e`，各條線用不同 port，不能撞。
- 不讀 `.env`，不 source `~/.config/fish/api-keys.fish`。
- 每次合併前 `bash bin/verify.sh` 要 GREEN（目前 4/4，後端 235 個測試）。
- 後端在新 flow 和舊分支完全一樣（2026-10-31 `diff -rq` 確認），所以這次幾乎都是前端接線，加上 G3 的新後端。

## 4. 現況（2026-10-31 盤點）

新 flow 已經有的：搜尋、結果、影片抽屜（含計算公式和證據）、shortlist 看板、plan、主管預覽審核（「Review as Annie」）、客戶記憶、方法頁、快取標記。

新 flow 斷掉的地方，舊分支都已經做好，可以參考：

| 斷點 | 新 flow 現況 | 舊分支的做法 |
|---|---|---|
| 登入 | `LoginScreen.tsx` 是假的，選身分就進去；後端其實要求登入，真帳號一開就 401 | `src/lib/auth.ts`，`/api/auth/login`、`/api/auth/logout`、`/api/auth/me` |
| 存後端 | ideas 存在 localStorage（`src/state.ts:44`，key `trend-finder.ideas.v4`），客戶也沒存後端 | `src/lib/live.ts:374-392` 呼叫 `/api/clients`、`/api/ideas`、`/api/library`、`/api/pulses` |
| 分享審核 | 只有同一台電腦的「Review as Annie」預覽 | `/api/share` 產生連結，`/api/review/{token}` 不用登入；`ReviewPage.tsx`、`src/lib/share.ts`；退回理由標籤（最多 5 個、每個 40 字） |
| 頻道分析 | 沒有畫面 | 後端 `/api/channel`（`backend/channels.py`）；`ChannelScreen.tsx`、`lib/channel.ts` |

Design System 的原料：`src/styles/tokens.css` 已經有一份 token，其他樣式散在 `src/styles/` 的十幾個 css 檔和 `components/themes`。

## 5. 要做的事

三條線同時跑。第 2 線最優先、驗收最嚴；第 1 線先出 token，第 2 線的新畫面要用它。

### 線 1：Design System

- **來源只看 Veralyn 的程式碼**：main 上的 `src/styles/`、`components/`、`landing/`、`themes/`。不看舊分支的樣式。
- **token 檔**：整理成單一來源，放 `src/styles/tokens.css`（擴充現有的，不另開檔）。內容包括顏色、字體和字級、間距、圓角、陰影、z-index、動畫時間。散落各處的寫死數值，有對應 token 的就改用 token，視覺不能變〔我的判斷〕。
- **規範文件**：`pivots/02-content/docs/design-system.md`。每個元件寫用途、什麼時候用、不能怎麼用、對應的 class 或元件名稱。至少涵蓋：按鈕、卡片、標籤或 chip、側邊欄、看板欄、抽屜、表單欄位、空狀態、錯誤訊息。
- **給使用者看的版本**：一頁 claude.ai Artifact，每個 token 和元件附實際樣子。
- **驗收**：改用 token 之後，用 Playwright 截主要畫面，和改之前比對沒有肉眼可見的差異；`verify.sh` GREEN。

### 線 2：整條流程打通（最優先）

1. **真登入**：新 flow 的登入畫面接上後端帳密登入，畫面沿用 Veralyn 的設計。Staff 身分走真登入。Client 身分維持 coming soon。沒登入時打 API 拿到 401，要回到登入畫面，不能白屏。
2. **存後端**：客戶、ideas、plan 改存後端，用舊分支已有的 API。localStorage 只能當快取。
   - 舊的 localStorage 資料〔我的判斷〕：第一次登入時，後端沒有資料、localStorage 有，就上傳一次；之後以後端為準。
3. **分享連結審核（使用者決定：用分享連結，不用登入）**：
   - plan 的「送審」產生分享連結，可以複製，也可以關掉連結。
   - 審核頁用 Veralyn 的設計重做，功能照舊分支：看 plan 和 shot list、批准、退回、理由標籤加自由文字。
   - 審核結果寫回後端。staff 的 shortlist 看板和客戶記憶看得到結果，包含退回的標籤和文字。
   - 「Review as Annie」保留，當作預覽，不當正式路線〔我的判斷〕。
4. **端到端測試**：一支 Playwright 測試跑完整條路。staff 登入 → 搜尋（範例資料或釘選的搜尋）→ 加 shortlist → plan → 送審 → 用**另一個沒登入的瀏覽器 context** 打開連結 → 退回並選標籤 → staff 看到退回 → 再送 → 批准 → staff 看到批准。1440 寬跑一次，390 寬跑一次。
5. **隔天的環境**：在新 port 起一個環境，用新資料庫，建使用者的帳號。port 和帳號由實作者挑，避開第 3 節列的 port；啟動指令寫進 `docs/STATUS.md`。不跑付費搜尋，只用釘選和快取的搜尋。

### 線 3：新功能後端

每一項都要有後端測試。只要碰到畫面就用 Design System。

1. **按秒數留言（前後端都做）**
   - 留言掛在 plan 裡的某支參考影片上，帶秒數。欄位：秒數、文字、作者名稱、建立時間。
   - 審核頁（分享連結）可以留言，staff 的 plan 畫面也可以，兩邊都看得到。
   - 審核頁的作者名稱讓審核人自己填一次，存在那個瀏覽器〔我的判斷〕。
   - 點留言的秒數，影片跳到那一秒；平台嵌入播放器不支援跳秒的，就只顯示秒數〔我的判斷〕。
2. **頻道分析接進新 flow**：側邊欄加入口，畫面用 Design System 重做，功能照舊分支的 `ChannelScreen.tsx`。「分析頻道」會花 Apify 額度，按下去前畫面要寫明，測試時不按。
3. **Google 登入（只做後端結構，使用者決定）**
   - 後端加 OAuth 的進入點和回呼端點，帳號加一個可選的 Google 連結欄位。
   - 環境變數沒設時，端點回「未啟用」，登入畫面不出現 Google 按鈕。
   - 測試用假的 token 驗證流程，不打真的 Google。
4. **發佈影片（只做後端結構，使用者決定）**
   - 一個「發佈」的資料結構：哪個 plan、哪個平台、排程時間、狀態（草稿、排程中、已發佈、失敗）、外部貼文 ID。
   - 一個發佈服務的介面，現在接假的實作，之後換 Ayrshare 只改一個地方。
   - 假的實作只在範例模式或測試裡啟用，正式模式下沒設金鑰就回「未啟用」（反目標：正式模式不出現假數據）。
5. **發佈後數據和 A/B 比較（只做後端結構）**
   - 每次發佈可以存多次成效快照：觀看、按讚、留言、分享、抓取時間、來源。
   - A/B：同一個 plan 可以有兩個以上的發佈版本，一個比較 API 回各版本最新的數字和差距。
   - 範例模式有範例數據可以看，正式模式沒有。
   - 前端今天不做畫面〔我的判斷〕，因為還沒有真的發佈，做了也只能看到假的。

## 6. 合併順序和驗收

1. 線 1 的 token 先合進整合分支（如果線 2 已經開工，線 2 rebase 一次）。
2. 線 2 合進去。端到端測試要過，`verify.sh` 要 GREEN。
3. 線 3 各項分開合，每合一項重跑一次端到端測試。
4. 全部合完，起隔天的環境，寫 `docs/STATUS.md`。

**今天的完成標準**：

- 端到端測試在 1440 和 390 寬都過。
- `verify.sh` GREEN。
- 使用者拿到環境網址和帳號。
- Design System 的規範頁連結交給使用者。

## 7. 審稿後補的決定（2026-10-31，全部〔我的判斷〕）

1. **plan 就是 idea。** 新 flow 的 plan 是帶 `shots` 的 `SavedIdea`（`src/types.ts:124`），不新增 plan 實體。審核以 idea 為單位，一條分享連結對應一個客戶，列出這個客戶所有「待審」的 idea。這也對得上新 flow 看板的批次送審（`ShortlistBoard.tsx` 的「Send N to manager」）。
2. **資料不分租戶。** 隔天的測試只有一個 agency，沿用後端現在的全域清單。多 agency 隔離是非目標。localStorage 的舊資料上傳一次，就歸到這份全域資料。
3. **退回後再送：**
   - 沿用同一條客戶連結，不另發新 token。
   - idea 狀態從 `rejected` 回到 `waiting`。
   - 上一次的退回理由和標籤保留成歷史，不覆蓋。實作者自己決定怎麼存，但 staff 和審核頁都要看得到上一次為什麼被退。
   - 衝突規則：審核人的決定欄位（status、理由、標籤、決定時間）以後端最新的一筆為準，staff 端不能用舊資料蓋掉它；其他欄位照現在 `merge_ideas` 的規則。
4. **分享頁上的留言權限：**
   - 拿到連結的人可以留言，但只能新增，不能改、不能刪。
   - 每則最多 500 字，每支影片最多 200 則。
   - 連結關掉之後就不能再留言，舊留言保留，staff 端看得到。
5. **隔天的環境不用 `--demo-data`**，跑真實模式，用 `backend/pinned` 裡已有的釘選搜尋（目前 3 份），所以畫面上全是真的影片。按秒數留言要能播放；平台播放器不能跳秒時，照第 5 節線 3 第 1 點只顯示秒數。
6. **390 寬的端到端測試：** 標準是整條流程走得完、沒有東西被擋住或點不到，不要求好看。走不完就修到走得完。
7. **Design System 的範圍有上限：**
   - token 抽出來，寫好規範文件。
   - 把寫死的數值換成 token，只做線 2 會碰到的畫面：登入、plan、看板、審核頁、客戶記憶。其他檔案只記錄在規範文件裡，不改。
   - 線 1 只有「token 檔先出來」這一步擋線 2。其他部分和線 2 同時跑，只影響合併順序。

## 8. 留給實作者決定的

- 元件拆法、檔名、css 放在哪個檔。前提是遵守 Design System。
- 後端新資料表和欄位的名稱，以及遷移方式。前提是不能弄壞現有的 `data.db` 資料。
- 測試寫法照專案現有慣例：後端 pytest，前端 `unit/` 下的 `node --test`，端到端用 Playwright。
- 線 3 各項之間的先後。
