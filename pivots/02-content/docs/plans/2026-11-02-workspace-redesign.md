# Remake 工作區改版（Plan 頁分步驟、剪輯工作區、分鏡網格）執行計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 把一支影片的 Plan 頁從「一頁長表單」改成「分步驟工作區」：Script / Storyboard / Shoot / Edit / Post 分頁，Edit 變成「先看影片再調」的輕量剪輯工作區，Storyboard 變成畫格網格；之後再補看得見的自動剪輯和逐鏡核可。

**Architecture：**
- 前端 React 19 + Vite（`src/`），後端 FastAPI + SQLite（`backend/`），沒有 router，Plan 頁是 `App.tsx` 的 `view === 'plan'` 渲染 `PlanScreen`。
- 第 1、2 階段只改前端（加一個 shot 欄位例外），API 全部沿用。第 3 階段才動後端。
- 邏輯一律寫成 `src/lib/*.ts` 的純函式並用 `node --test` 測；元件只做組裝，靠瀏覽器檢查驗收（專案沒有元件測試）。

**Tech Stack：** React 19、TypeScript、Vite、FastAPI、pydantic、SQLite、pytest、`node --test`、headless playwright-core（瀏覽器檢查）。

**Spec：**
- 對齊頁（給 Veralyn）：https://claude.ai/artifact/RB2jEZ8toEEbHJM3gV3kpd ，差異編號 E1–E7、S1–S7 出自這頁。
- 研究：https://claude.ai/artifact/SRFsg6dpTxYJ3QdiNguta7 （模式 P1–P8）
- Figma 改版提案頁 node 25:2：https://www.figma.com/design/3qLG6XMnJ4kxKT6sWQFH0v （#3、#4、#6 被本計畫涵蓋）
- 已定案（使用者 2026-11-02）：長期方向；輕量剪輯（Descript / CapCut 等級，**不做多軌時間軸**）；結構由我們提、外觀由 Veralyn 決定。

## Global Constraints

- 路徑相對於 `pivots/02-content/app/trend-finder`，除非寫明 repo 根目錄。
- **Repo 與基底：`origin` = veralynchong/BuildClub 的 `main`**（2026-11-02 起改在隊友 repo 工作；`61b8aee` 已含 W8 中文介面 #24/#25）。`fork`（minchiaHuang）只剩歷史，不再 push。
- 新增或修改的 UI 文案一律走 W8 的翻譯表，英文和繁體中文都要加。Task 0 先確認 helper 名稱和檔案，寫進本節。
- 不新增 npm / pip 依賴。npm/pip 安裝會被 hook 擋，worker 用 symlink：`node_modules` → `integrate-1102/.../trend-finder/node_modules`，`backend/.venv` → `w2-grade-subs-backend/.../backend/.venv`。
- 不碰 port 8811、8805、8787、8801、5195、8798、5174、5175、8100、3100、8840、8841、8850、8852、8853，也不碰 demo（8850）和它的 tunnel。測試 port：線 A 8797、線 B 8799、線 C 8861、線 D 8862（先確認 `bin/isolated-backend.sh` 接受這些 port，不接受就回報 Manager，不要改腳本）。
- 不讀 `.env`、不 source `~/.config/fish/api-keys.fish`。**不按任何會花錢的鍵**：Write / Rewrite the script、Regenerate this shot、Make frame、Make all frames（真的呼叫）、live 搜尋、分析頻道。剪輯（ffmpeg + 本機 whisper）是免費的，可以跑。
- 樣式只用 `src/styles/tokens.css` 和 `theme-remake.css` 的 token。新檔 `src/styles/<feature>.css`，在 `src/index.css` 加一行 `@import`（放在 `theme-remake.css` 之後的那群）。class 用 kebab-case 加功能前綴：`pt-*`（plan tabs）、`ws-*`（edit workspace）、沿用 `sb-*`、`gr-*`、`cut-*`。
- 外觀屬於 Veralyn：版面結構照本計畫，顏色、字型、元件樣式用既有 token 做到「乾淨可用」就停，不自己發明新視覺。
- 每個 task 結束前：repo 根目錄 `bash bin/verify.sh` 印出 `verify: GREEN`；動到前端的 task 再跑 `npm run build` 和 `npm run lint`，都不能有錯。
- 瀏覽器檢查：`npm run build` 後 `bash bin/isolated-backend.sh <port> --demo-data --user test@example.com:pw-for-e2e`，用 headless playwright-core（`channel: 'chrome'`），1440×900 和 390×844 各截一張，截圖放 worker 的 scratchpad，PR 描述附路徑。不用 Playwright MCP（共用分頁會被搶）。
- 建測試資料的免費路徑：Find ideas 用 sample 搜尋 → Save → Open plan → 在 Shots 手動填台詞 → Send for approval → 以 Manager 身分 Approve → 每鏡上傳一支用 `ffmpeg -f lavfi -i testsrc=size=720x1280:rate=30 -f lavfi -i sine -t 4` 產生、含聲音的測試片 → Make the video。
- 分支 `<type>/<desc>`，off `origin/main`，push 到 `origin`，PR 開到 `veralynchong/BuildClub` 的 `main`。不 force-push、不 push main、不 push `fork`。**PR 做好就停：只有使用者對那個 PR 明確說「merge」才合併**（「把 PR 做好」不等於合併）。
- commit 格式 `<type>(trend-finder): <英文描述>`，結尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。
- **Task 0 查證結果（2026-11-02）：**
  - 翻譯 helper：`t(key, vars)` 和 `tp(base, n)`，在 `src/lib/i18n.ts`。字串依區域放 `src/lib/strings/{shell,home,find,plan,cut}.ts`，每個檔案有 `en` 和 `zhHant`（`zhHant` 的型別是 `Record<keyof typeof en, string>`，漏一個 key 會編譯失敗）。plan 頁的 key 一律 `plan.` 開頭。不要在 module 最上層呼叫 `t()`（語言切換後不會更新）；需要隨語言變的常數用 getter。
  - `bin/isolated-backend.sh` 只擋 8787 和 5195；8797、8799、8861、8862 都可用。腳本預設 venv 在 `/Users/tommy/Desktop/BuildClub/...`，worker 要設 `TF_VENV=<worktree>/pivots/02-content/app/trend-finder/backend/.venv`。
  - Veralyn 未回覆，使用者核准預設：分頁放在頁首、預覽用淺色頁面上的深色播放框、狀態點用既有 `--early` / `--rising` / `--hot` token。
  - 瀏覽器檢查腳本放 scratchpad、不進 repo（headless playwright-core，`channel: 'chrome'`，playwright-core 從 `/Users/tommy/Desktop/brand-studio/web/node_modules` 載入）：`node plan-tabs-check.mjs <port> <outDir>`。

## Review Focus

1. **切分頁時狀態不能丟**：剪輯正在跑（2 秒輪詢）、台詞剛打完還沒存、字幕編到一半，切到別的分頁再切回來，進度、輸入都還在。做法：所有分頁都渲染，非作用中的用 `hidden`，不卸載。測試在 Task 1（瀏覽器檢查一條）。
2. **還沒核可的 plan**：Edit、Post 分頁要顯示「核可後才能剪輯」並告訴使用者下一步，不能是空白分頁。測試在 Task 1（`tabLocked` 單元測試）。
3. **還沒有 take 或還沒剪過**：Edit 的預覽區顯示第一個已選 take；一個都沒有時顯示「先為每一鏡選一個 take（0 / 4）」並提供「去 Shoot」按鈕。測試在 Task A1（`previewSource` 單元測試）。
4. **手機 390 寬**：分頁列可橫向捲動、預覽不超過螢幕高 55%、sticky bar 不蓋到任何按鈕。測試在 Task 1、A2、B3 的瀏覽器檢查。
5. **「生成全部畫格」中途失敗或撞到每日費用上限**：停在失敗那一鏡，已完成的保留，重按只補沒有畫格的鏡頭，不重複收費。測試在 Task B4（`framesToMake` 單元測試）。

---

## 執行順序（multi-agent）

```
Phase 0  Manager：等 W8 合併 + Veralyn 回覆（或使用者決定用預設）→ Task 0
Phase 1  worker P1：Task 1（分頁骨架 + sticky bar 修正）── 合併 ──┐
Phase 2  ┌ 線 A worker：A1 → A2 → A3 → A4（Edit 工作區）          │ 兩條線平行，
         └ 線 B worker：B1 → B2 → B3 → B4（Storyboard 網格）      │ 都從 Task 1 合併後的 main 開
         合併順序：B 先（動 PlanScreen 比較多）→ A rebase 後合併
Phase 3  ┌ 線 C worker：C1 → C2（看得見的自動剪輯 + 字幕改時間）
         └ 線 D worker：D1 → D2 → D3（逐鏡核可 + 成片時間碼留言）
Phase 4  另寫一份計畫：字幕樣式卡、品牌預設、四張候選畫格、版本疊在同一連結
```

- **Manager**（一個 session，不寫程式）：開 worktree、派 worker、看 PR diff 和截圖、PR 做好就停，等使用者說「merge」才合併、每階段結束更新 `docs/STATUS.md`。
- **Worker**：模型 Sonnet；一條線一個 worktree、一個分支、一個 PR；每個 task 一個 commit。
- **Reviewer**：每個 PR 合併前派一個新的 subagent 看 diff 對照本計畫該 task（看 Review Focus 那幾條有沒有做到）。
- 每階段合併後，Manager 用 Task 1 的瀏覽器檢查腳本跑一次全流程截圖，交給使用者和 Veralyn 看，再進下一階段。

---

## Phase 0

### Task 0：前置條件與確認（Manager）

- [x] **Step 1：** `git fetch origin && git log --oneline -3 origin/main`，確認至少到 `61b8aee`（含 W8）。本計畫的檔案行號是在 W8 前（`2c5ac11`）查的，派工前在 `origin/main` 上重新核對 Task 1、A2、B1 引用的行號。
- [x] **Step 2：** 在 `origin/main` 找出翻譯 helper（`git grep -n "繁體中文" origin/main -- pivots/02-content/app/trend-finder/src | head`），把 helper 名稱、檔案、加字串的方式補進 Global Constraints。
- [x] **Step 3：** 確認 Veralyn 對對齊頁五個問題的回覆。沒回覆時問使用者是否用預設：分頁放在頁首、預覽用淺色頁面上的深色播放框、狀態點用既有 `--early`/`--rising`/`--hot` token。答案寫進 Global Constraints。
- [x] **Step 4：** 確認 `bin/isolated-backend.sh` 接受 8797、8799、8861、8862。
- [x] **Step 5：** 寫 `scripts/plan-tabs-check.mjs`（放 worker 可用的 scratchpad，不進 repo）：登入 → 建立測試資料（見 Global Constraints）→ 每個分頁 1440 / 390 截圖。後面每個 task 的瀏覽器檢查都用它。

---

## Phase 1

### Task 1：Plan 頁分步驟分頁 + sticky bar 不蓋內容（E7、根本原因）

**Files:**
- Create: `src/lib/planTabs.ts`、`src/components/plan/PlanTabs.tsx`、`src/styles/plan-tabs.css`、`unit/plan-tabs.test.mjs`
- Modify: `src/components/PlanScreen.tsx`（區塊分到各分頁，約 148–445 行）、`src/styles/drawer-plan.css`（`.plan-bar` 168–174、`.plan-main`）、`src/index.css`

**Interfaces:**
- Consumes：`stepOf(idea, shots, signals)` 和 `type Step`（`src/lib/steps.ts:44`）、`IdeaStatus`（`src/types.ts`）
- Produces：
  - `type PlanTab = 'script' | 'storyboard' | 'shoot' | 'edit' | 'post'`
  - `PLAN_TABS: readonly PlanTab[]`（就是上面的順序）
  - `defaultTab(step: Step): PlanTab`
  - `tabLocked(tab: PlanTab, status: IdeaStatus): 'needs-approval' | null`
  - `<PlanTabs tab current={step} onTab locked={(t)=>...} />`
  - `PlanScreen` 內的 `const [tab, setTab]`，sessionStorage key `remake.plan-tab.<ideaId>`
  - CSS 變數 `--plan-bar-h`

- [x] **Step 1：寫失敗的測試** `unit/plan-tabs.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PLAN_TABS, defaultTab, tabLocked } from '../src/lib/planTabs.ts'

test('tabs in production order', () => {
  assert.deepEqual(PLAN_TABS, ['script', 'storyboard', 'shoot', 'edit', 'post'])
})
test('default tab follows the step', () => {
  assert.equal(defaultTab('idea'), 'script')
  assert.equal(defaultTab('script'), 'script')
  assert.equal(defaultTab('storyboard'), 'storyboard')
  assert.equal(defaultTab('filming'), 'shoot')
  assert.equal(defaultTab('editing'), 'edit')
  assert.equal(defaultTab('posted'), 'post')
})
test('edit and post wait for approval', () => {
  for (const s of ['saved', 'waiting', 'rejected']) {
    assert.equal(tabLocked('edit', s), 'needs-approval')
    assert.equal(tabLocked('post', s), 'needs-approval')
    assert.equal(tabLocked('storyboard', s), null)
  }
  assert.equal(tabLocked('edit', 'approved'), null)
})
```

- [x] **Step 2：** `node --test pivots/02-content/app/trend-finder/unit/plan-tabs.test.mjs`（repo 根目錄）→ FAIL，找不到模組。
- [x] **Step 3：** 實作 `src/lib/planTabs.ts`。
- [x] **Step 4：** 同一指令 → PASS。
- [x] **Step 5：** `PlanTabs.tsx`：`role="tablist"`，每顆 `role="tab"`、`aria-selected`、`aria-controls`，左右鍵切換。目前步驟那顆加 `data-current`，鎖住的加 `aria-disabled` 但仍可點（點了會看到說明）。分頁標籤文字走翻譯表。
- [x] **Step 6：** `PlanScreen.tsx` 依下表把現有區塊放進五個 `<div role="tabpanel" hidden={tab !== x}>`。**全部都渲染，只用 `hidden` 切換**（Review Focus 1）。`tab` 初始值：sessionStorage 有就用，否則 `defaultTab(stepOf(idea, shots))`。

  | 分頁 | 放進去的區塊 |
  |---|---|
  | Script | `aside.plan-ref`（參考影片 + TimedComments）、What each line does、Why it fits、退回的回饋 |
  | Storyboard | Shots 清單（Task B1 會拿掉）、`StoryboardSection` |
  | Shoot | `ShotChecklist`、Changes to make before filming、For the editor |
  | Edit | `CutPanel` |
  | Post | `PublishPanel` |

  鎖住的分頁裡放一塊說明：「核可後才能剪輯」加一顆按鈕，按了切到 Storyboard，那裡的 sticky bar 有 Send for approval。
- [x] **Step 7：** 修 sticky bar：`.plan-bar` 設 `--plan-bar-h`（桌機 72px、`max-width:860px` 時依實際高度），`.plan-main` 加 `padding-bottom: calc(var(--plan-bar-h) + var(--space-4))`。
- [x] **Step 8：** `bash bin/verify.sh` → `verify: GREEN`；`npm run build`、`npm run lint` 無錯。
- [x] **Step 9：瀏覽器檢查**：五個分頁 1440 / 390 各一張；在 Edit 按 Make the video 後切到 Script 再切回來，進度條還在、沒有重新開始；sticky bar 下方最後一顆按鈕看得到、點得到。
- [x] **Step 10：** Commit `feat(trend-finder): split plan page into step tabs`。開 PR（Phase 1 只有這個 PR）。

---

## Phase 2 線 A：Edit 工作區（E1、E2、E4 前半、E6、E7）

分支 `feat/edit-workspace`。

### Task A1：預覽來源 + 調色的即時近似

**Files:**
- Modify: `src/lib/grading.ts`、`src/lib/cut.ts`、`unit/cut.test.mjs`
- Create: `unit/grading.test.mjs`（若已存在就加在裡面）

**Interfaces:**
- Consumes：`CutState`（`lib/cut.ts:13`）、`Take`（`lib/takes.ts`）、grade preset id（`backend/grading.py` 的 `none|warm|cool|vivid|muted|bw`）
- Produces：
  - `gradeFilter(preset: string): string`，回傳 CSS `filter` 字串；未知 id 回 `'none'`
  - `type PreviewSource = { kind: 'cut'; url: string } | { kind: 'take'; url: string; shot: number } | { kind: 'empty'; chosen: number; total: number }`
  - `previewSource(cut: CutState | null, takes: Take[], shotCount: number): PreviewSource`

- [ ] **Step 1：寫失敗的測試**

```js
// unit/grading.test.mjs
test('every server preset has a css approximation', () => {
  for (const id of ['none', 'warm', 'cool', 'vivid', 'muted', 'bw']) assert.equal(typeof gradeFilter(id), 'string')
  assert.equal(gradeFilter('none'), 'none')
  assert.match(gradeFilter('bw'), /grayscale\(1\)/)
  assert.equal(gradeFilter('nope'), 'none')
})
// unit/cut.test.mjs
test('preview prefers the finished cut', () => {
  const cut = { status: 'done', output: { url: '/c.mp4', size: 1, durationSec: 1 } }
  assert.deepEqual(previewSource(cut, [], 3), { kind: 'cut', url: '/c.mp4' })
})
test('preview falls back to the first chosen take', () => {
  const takes = [{ shot: 1, chosen: true, url: '/t1.mp4' }, { shot: 0, chosen: false, url: '/t0.mp4' }]
  assert.deepEqual(previewSource(null, takes, 3), { kind: 'take', url: '/t1.mp4', shot: 1 })
})
test('preview says how many shots still need a take', () => {
  assert.deepEqual(previewSource(null, [], 4), { kind: 'empty', chosen: 0, total: 4 })
})
```

- [ ] **Step 2：** `node --test pivots/02-content/app/trend-finder/unit/` → 新測試 FAIL。
- [ ] **Step 3：** 實作。`gradeFilter` 的數值用 `backend/grading.py` 每個 ffmpeg chain 對照調（例：warm ≈ `sepia(.25) saturate(1.1) hue-rotate(-8deg)`），在函式上方註解「近似，最終以伺服器渲染為準」。
- [ ] **Step 4：** 同一指令 → PASS；`bash bin/verify.sh` → GREEN。
- [ ] **Step 5：** Commit `feat(trend-finder): preview source and css grade approximation`。

### Task A2：兩欄工作區版面 + 控制項分頁

**Files:**
- Create: `src/components/cut/EditWorkspace.tsx`、`src/components/cut/ControlTabs.tsx`、`src/styles/edit-workspace.css`
- Modify: `src/components/CutPanel.tsx`、`src/components/cut/CutVideo.tsx`、`src/index.css`

**Interfaces:**
- Consumes：A1 的 `previewSource`、`gradeFilter`；`listTakes`（`lib/takes.ts`）
- Produces：
  - `CutVideo` 新增 props `src`、`filter?: string`、`videoRef?: React.Ref<HTMLVideoElement>`、`onTime?: (t: number) => void`
  - `type ControlTab = 'look' | 'subtitles' | 'music' | 'speed'`

- [ ] **Step 1：** `CutVideo` 加上述 props，`filter` 套在 `<video style={{ filter }}>`。只有 `kind === 'take'` 或使用者選的 look 和上次渲染不同時才套 `filter`；已渲染且 look 相同時不套，避免重複上色。
- [ ] **Step 2：** `EditWorkspace` 版面 `.ws-grid`：
  - 左欄是 `position: sticky` 的 9:16 預覽：`CutVideo` 加 `SafeZoneLayer` 和 `SubtitleOverlay`，`empty` 時顯示「先為每一鏡選一個 take（x / N）」和「去 Shoot」按鈕。
  - 右欄是 `ControlTabs`，四個分頁：Look 放 `GradePicker`；Subtitles 放 `SubtitleControls` 加 safe zones；Music 放現有音樂區；Speed 改成膠囊，不用 `<select>`。
  - 主鍵「Make the video」或「Make it again」放在右欄底部。
  - 預覽下方放 Download、Send to Annie、`AutoCutNote`。
  - 寬度 `≤ 860px` 時改單欄：預覽在上（最高 `55vh`），控制項在下。
- [ ] **Step 3：** 刪掉 `GradePicker` 的兩張靜態對照圖（`grade-preview` PNG），預覽改成直接看影片。後端的 `grade-preview` 端點保留不刪。
- [ ] **Step 4：** `bash bin/verify.sh` GREEN；`npm run build`、`npm run lint` 無錯。
- [ ] **Step 5：瀏覽器檢查**（1440 / 390）：
  - 沒剪過時，預覽播第一個 take，切 Warm 後畫面立刻變色。
  - 剪好後，預覽播成片。
  - 改字幕大小後，預覽上的字立刻變。
- [ ] **Step 6：** Commit `feat(trend-finder): edit workspace with pinned preview and control tabs`。

### Task A3：字幕清單放在影片旁，跟著播放

**Files:**
- Create: `src/components/cut/CaptionList.tsx`
- Modify: `src/lib/cut.ts`（或 cue 相關的 lib）、`unit/cut.test.mjs`、`EditWorkspace.tsx`；`CueEditor.tsx` 被取代後刪除

**Interfaces:**
- Consumes：`useCues`、`putCues`、A2 的 `videoRef` 和 `onTime`
- Produces：`cueIndexAt(cues: {start:number;end:number}[], t: number): number`，沒有命中時回 -1

- [ ] **Step 1：寫失敗的測試**

```js
test('cueIndexAt finds the cue under the playhead', () => {
  const cues = [{ start: 0, end: 2.4 }, { start: 2.4, end: 5.5 }]
  assert.equal(cueIndexAt(cues, 0), 0)
  assert.equal(cueIndexAt(cues, 2.4), 1)
  assert.equal(cueIndexAt(cues, 6), -1)
})
```

- [ ] **Step 2：** 跑 → FAIL。**Step 3：** 實作。**Step 4：** 跑 → PASS。
- [ ] **Step 5：** `CaptionList`：
  - 一句一列，每列是時間碼按鈕加文字輸入框。
  - 點時間碼會把 `videoRef.current.currentTime` 設成 `start + 0.01`。
  - 正在播的那列加 `aria-current="true"`，並自動捲進可見範圍（`prefers-reduced-motion` 時不做平滑捲動）。
  - 「Save subtitles」和「Download .srt」照舊。
  - 「換 take 或速度後，字幕會重新產生」的提醒放在清單頂端，不放在底部。
- [ ] **Step 6：** 桌機時 `CaptionList` 放在預覽右邊，控制項分頁收成第三欄或移到下方，由 Veralyn 決定，先放下方。手機時 `CaptionList` 放在 Subtitles 分頁裡。
- [ ] **Step 7：** verify GREEN、build、lint；瀏覽器檢查：點第三句 → 影片跳到該秒，該列高亮。
- [ ] **Step 8：** Commit `feat(trend-finder): caption list synced with playback`。

### Task A4：鏡頭條（每鏡用哪個 take、剪掉多少）

**Files:**
- Create: `src/components/cut/ShotStrip.tsx`
- Modify: `src/lib/cut.ts`、`unit/cut.test.mjs`、`EditWorkspace.tsx`

**Interfaces:**
- Consumes：`listTakes`、`CutState.autoCut`（`{originalSec, trims:[{shot, kind, start, end}]}`，`shot` 從 0 起算）
- Produces：`trimsByShot(autoCut, shotCount): { pauses: number; fillers: number; seconds: number }[]`

- [ ] **Step 1：寫失敗的測試**

```js
test('trimsByShot groups trims per shot', () => {
  const ac = { originalSec: 14.2, trims: [
    { shot: 0, kind: 'pause', start: 1, end: 2 },
    { shot: 0, kind: 'filler', start: 3, end: 3.4 },
    { shot: 2, kind: 'pause', start: 0, end: 1.2 } ] }
  const r = trimsByShot(ac, 3)
  assert.deepEqual(r[1], { pauses: 0, fillers: 0, seconds: 0 })
  assert.equal(r[0].pauses, 1); assert.equal(r[0].fillers, 1)
  assert.ok(Math.abs(r[0].seconds - 1.4) < 1e-9)
  assert.ok(Math.abs(r[2].seconds - 1.2) < 1e-9)
})
```

- [ ] **Step 2–4：** FAIL → 實作 → PASS。
- [ ] **Step 5：** `ShotStrip` 放在工作區底部，橫向一排，每鏡一格：編號、purpose、已選 take 檔名，以及「剪掉 1.4 秒」。點一格會切到 Shoot 分頁並捲到該鏡。
- [ ] **Step 6：** verify、build、lint；瀏覽器檢查 1440 / 390。
- [ ] **Step 7：** Commit `feat(trend-finder): shot strip with chosen takes and trims`。開線 A 的 PR。

---

## Phase 2 線 B：Storyboard 網格（S1–S5，Figma #3）

分支 `feat/storyboard-grid`。

### Task B1：一份鏡頭清單（拿掉舊的 Shots 清單）

**Files:**
- Modify: `src/components/PlanScreen.tsx`（拿掉 `ol.shot-edit` 那段，約 244–356 行）、`src/lib/storyboard.ts`、`unit/storyboard.test.mjs`、`src/components/storyboard/StoryboardSection.tsx`

**Interfaces:**
- Consumes：`Shot`（`src/types.ts:47`），以及 `PlanScreen` 現在 inline 的新增、刪除、復原、重設邏輯
- Produces（純函式，從 `PlanScreen` 搬到 `lib/storyboard.ts`）：
  - `addShot(shots: Shot[]): Shot[]`：新鏡頭的 `time` 接在上一鏡之後
  - `removeShot(shots: Shot[], i: number): { shots: Shot[]; removed: { shot: Shot; at: number } }`
  - `undoRemove(shots: Shot[], removed: { shot: Shot; at: number }): Shot[]`
  - `updateShot(shots: Shot[], i: number, patch: Partial<Shot>): Shot[]`

- [ ] **Step 1：寫失敗的測試**：四個函式各一個，assertion 包含「`removeShot` 再 `undoRemove` 等於原陣列」和「`addShot` 不改原陣列」。
- [ ] **Step 2–4：** FAIL → 搬移並實作 → PASS。
- [ ] **Step 5：** 拿掉 `PlanScreen` 的 Shots 區塊。「+ Add a shot」「Reset to suggested shots」「Undo remove」移到 `StoryboardSection` 頂部工具列；每鏡的時間、描述、畫面文字在 B3 的側邊面板編輯。B3 完成前先放在卡片裡，保持功能不缺。
- [ ] **Step 6：** verify、build、lint；瀏覽器檢查：新增一鏡、刪一鏡、復原，Shoot 分頁的 checklist 同步變動。
- [ ] **Step 7：** Commit `refactor(trend-finder): one shot list in the storyboard`。

### Task B2：景別欄位

**Files:**
- Modify: `src/types.ts`（`Shot`）、`backend/models.py:78`（`Shot`）、`backend/tests/test_storyboard.py`（或 shot 存取的現有測試檔）、`src/lib/storyboard.ts`、`unit/storyboard.test.mjs`

**Interfaces:**
- Produces：
  - `type ShotSize = 'ECU' | 'CU' | 'MS' | 'WS'`；`Shot.size?: ShotSize`
  - 後端 `size: Optional[Literal['ECU','CU','MS','WS']] = None`
  - `SHOT_SIZES: readonly ShotSize[]`，顯示用的標籤走翻譯表：大特寫 / 特寫 / 中景 / 全景

- [ ] **Step 1：寫失敗的 pytest**：存一個帶 `size: 'CU'` 的 shot 再讀回來，值相同；`size: 'XX'` 回 422。
- [ ] **Step 2：** `backend/.venv/bin/python -m pytest -q -p no:cacheprovider backend/tests/test_storyboard.py` → FAIL。
- [ ] **Step 3：** 改 `models.py`、`types.ts`、`SHOT_SIZES`。
- [ ] **Step 4：** 同一指令 → PASS；`bash bin/verify.sh` → GREEN。
- [ ] **Step 5：** Commit `feat(trend-finder): shot size on storyboard shots`。

### Task B3：網格 + 側邊面板 + 表格補欄位

**Files:**
- Create: `src/components/storyboard/ShotPanel.tsx`
- Modify: `StoryboardSection.tsx`（`View` 改成 `'grid' | 'table'`；舊 localStorage 值 `'cards'` 視為 `'grid'`）、`ShotItem.tsx`、`src/styles/storyboard.css`

**Interfaces:**
- Consumes：B1 的 `updateShot`，B2 的 `SHOT_SIZES`
- Produces：`<ShotPanel shot index editable onPatch onRegenerate onFrame onClose />`

- [ ] **Step 1：** 網格 `.sb-grid`：`repeat(auto-fill, minmax(180px, 1fr))`，手機兩欄。每格只放這些：
  - 畫格，沒有畫格時是小的佔位框，寬高比 9:16，最高 200px，框內只有編號。
  - 一列標籤：編號、purpose、景別、秒數。
  - 描述一行，台詞一行，都截斷，加 `title` 顯示全文。
  - 每格**不放按鈕**。
- [ ] **Step 2：** 點一格開 `ShotPanel`。桌機在右側，手機是底部 sheet。面板內有：
  - 時間、描述、景別下拉、台詞 textarea、Other ways to say it。
  - Regenerate this shot、Make / Redo frame，以及現有的「Keep mine / Replace it」確認。
  - `Esc` 關閉，關閉後焦點回到原本那格。
- [ ] **Step 3：** 表格加欄位：編號、畫格縮圖、景別、秒數、purpose、台詞。手機時表格放在自己的 `overflow-x: auto` 容器裡。
- [ ] **Step 4：** 唯讀狀態（已送審或已核可）：網格照常顯示，面板內所有輸入框 disabled，並顯示「Take the plan back to change them」。
- [ ] **Step 5：** verify、build、lint；瀏覽器檢查 1440 / 390：網格、面板開關、唯讀狀態、表格各一張。
- [ ] **Step 6：** Commit `feat(trend-finder): storyboard grid with shot side panel`。

### Task B4：「生成全部畫格」

**Files:**
- Modify: `src/lib/storyboard.ts`、`unit/storyboard.test.mjs`、`StoryboardSection.tsx`

**Interfaces:**
- Produces：
  - `framesToMake(shots: Shot[]): number[]`：沒有 `frameImage` 的鏡頭 index
  - `makeAllFrames(ideaId: string, shots: Shot[], onEach: (i: number, frameImage: string) => void, signal: AbortSignal): Promise<{ done: number[]; failedAt: number | null; error?: string }>`：依序呼叫現有 `makeFrame`，每鏡之間等 `SAVE_SETTLE_MS`，遇錯就停

- [ ] **Step 1：寫失敗的測試**：`framesToMake` 只回沒有畫格的；`makeAllFrames` 用假的 `makeFrame`（把 fetch 換掉，作法照 `storyboard.test.mjs` 現有的 mock 方式），第二鏡丟錯時回 `{ done:[0], failedAt:1 }`，而且第三鏡沒被呼叫。
- [ ] **Step 2–4：** FAIL → 實作 → PASS。
- [ ] **Step 5：** 工具列放「Make all frames（N 鏡）」。按下去先在頁面內確認（不用 `confirm()`），寫明會生成 N 張圖、會花錢；進行中可以取消；失敗時顯示「第 k 鏡失敗：原因」和「重試剩下的」。**瀏覽器檢查時只看到確認畫面為止，不真的按確定。**
- [ ] **Step 6：** verify、build、lint。Commit `feat(trend-finder): make all frames`。開線 B 的 PR。

---

## Phase 3（後端，Phase 2 合併後開始；開工前 Manager 先問使用者要不要做）

### 線 C：看得見的自動剪輯（E3）+ 字幕改時間（E4 後半）

分支 `feat/visible-autocut`。

**Task C1：後端存逐字稿並允許還原**
- Files：`backend/cutting.py`、`backend/renders.py`、`backend/tests/test_cutting.py`、`backend/tests/test_renders.py`
- Produces：
  - 渲染時把每鏡的字詞存成 `words.json`：`{shots:[{shot, words:[{start,end,text}]}]}`，時間是該 take 內的秒數。
  - `GET /api/ideas/{id}/cut/transcript` 回 `{shots:[{shot, words:[{start,end,text,removed: null|'pause'|'filler'}], restored:[{start,end}]}]}`。
  - `PUT /api/ideas/{id}/cut/restored` body `{shot, spans:[{start,end}]}`，存下來，下次渲染時當成 `keep_intervals(..., protected)` 傳入。這個參數現在已存在。
- 測試：用 `backend/tests/fixtures/whisper_words.json` 斷言：
  - 被剪的 filler 標成 `removed:'filler'`。
  - 還原那段後重算的 `keep_intervals` 包含該段。
  - 沒渲染過時，`transcript` 回 404。

**Task C2：前端逐字稿面板**
- Files：`src/components/cut/TranscriptPanel.tsx`、`src/lib/cut.ts`、`unit/cut.test.mjs`
- Produces：`spansToRestore(words, clicked): {start,end}[]`，點一個被剪的字，就還原整段連續被剪的字。
- UI 放在 Edit 工作區，和 CaptionList 用切換鍵二選一，標籤是「逐字稿 / 字幕」。
  - 被剪的字用刪除線，點一下還原，並出現「Make it again to apply」。
  - 頂部一句話：「刪了 2 段停頓、1 個口頭禪，14.2 秒 → 11.6 秒」。
- 字幕改時間：`putCues` 接受 `start`、`end`，後端驗證每句 `start < end`、不重疊、不超出成片長度，違反時回 422。前端在 CaptionList 用 ±0.1s 按鈕調整。這部分加在這條線，同一個 PR。

### 線 D：逐鏡核可 + 成片時間碼留言（S6、Figma #6、P1、P4）

分支 `feat/per-shot-review`。

**Task D1：資料與 API**
- `SavedIdea.shotReviews?: Record<number, { state: 'approved' | 'changes'; note?: string; by?: string; at: string }>`，前後端都加。
- `POST /api/review/{token}/ideas/{id}/shots/{i}` body `{state, note?, by}`。
- 規則：所有鏡頭都 `approved` 時，等同整份 plan 核可，走現有 decide approve，寫入 `history`。任一鏡是 `changes` 時，plan 回到 rejected，`rejectReason` 列出各鏡的 note。
- 舊的 `shotComments` 唯讀相容：顯示時合併進 note，不再寫入。
- pytest 涵蓋：全部核可會觸發 approve；一鏡要修改會退回；重複送同一狀態不產生兩筆 history；token 已關閉回 404。

**Task D2：審核頁逐鏡按鈕**
- `SharedReviewPage.tsx` 和 `ReviewScreen.tsx` 每鏡加「核可 / 要修改＋一句話」。頂部進度「已核可 2 / 4」。送出前請填名字，記在 `by`。

**Task D3：狀態點與成片留言**
- Storyboard 網格每格右上角加狀態點：已核可、待審、要修改，顏色依 Phase 0 的決定。
- Edit 預覽下方加時間碼留言：沿用 `comments.py`，新增 `target: 'cut'`，留言帶秒數，點了跳到該秒。審核連結的成片頁也能留言。

---

## Phase 4（不在本計畫，另寫）

字幕樣式卡（用這支片的第一句預覽）、每個客戶的品牌預設、AI 分鏡的景別／運鏡／色盤／打光膠囊加四張候選圖（會花生成費用）、版本疊在同一連結（v1 → v2 對照）。

## 完成時

- [ ] 每階段合併後，Manager 更新 `docs/STATUS.md`：完成什麼、驗證結果和日期、下一步。
- [ ] Phase 2 合併後，重錄首頁導覽影片（Figma #9），另開工作，不在本計畫內。
- [ ] `git worktree list`，列出已合併且乾淨的 worktree，問使用者要刪哪些，不加 `--force`。
