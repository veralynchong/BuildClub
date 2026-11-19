# Beta 完整流程測試 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打開 Beta 的 AI 圖片生成，並證明「熱門影片 → Shot list → AI 分鏡圖 → 每格上傳 → AI 剪輯匯出」在 Beta 站走得通。

**Architecture:** 只改部署設定（`bin/beta-instance.sh`、`bin/beta/instance.env.template`）讓圖片生成可用；其餘是測試：本機隔離後端（mock，US$0）跑 E2E 和 AI 試用者探索，修 bug，部署，最後在 Daphne 站真實驗收，再跑 B。

**Tech Stack:** bash、FastAPI 後端、React/Vite 前端、Playwright MCP、launchd。

**Spec:** `docs/superpowers/specs/2026-11-15-beta-full-flow-test-design.md`

## Global Constraints

- 只開圖片：`DAILY_GEN_IMAGE_USD=2`、`DAILY_GEN_VIDEO_USD=0`、`DAILY_GEN_VOICE_USD=0`；`FRAME_IMAGE_MODEL=seedream-4.5`；`BETA_TOTAL_USD` daphne 12、collage 8 不變。
- `beta-instance.sh` 多複製 `FAL_KEY` 一個名字；其他 key（OpenRouter、Gemini、ElevenLabs）仍不複製。
- 不讀、不印任何 key 或 `.env` 內容；只用 `grep -c` 類的名字存在檢查。
- 付費單次 US$1 以下，記到 `docs/test-log.md`；B 預估超過 US$1 先問使用者。
- 影片內容英文；桌面 1440x900；Playwright MCP，做完 `browser_close`。
- 不合併 PR；在 `feat/beta-launch` commit、push。
- 試用者資料 `~/beta/*/state` 只在 Task 6 清，且先 backup。

## Review Focus

1. 影片／配音的上限在 `.env` 裡仍是 0（重部署後也要是）——Task 1 測試釘住。
2. `FAL_KEY` 在來源檔不存在時，`write_env` 不能失敗，也不能寫出空的 `FAL_KEY=`——Task 1 測試釘住。
3. 預算到頂時分鏡格「重生」要顯示預算用完的訊息，不能卡在轉圈——Task 2 E2E 第 5 步。
4. 上傳的檔案是直式／橫式、長短不一時，剪輯仍能匯出——Task 2 用一橫一直兩種素材。
5. 重新整理頁面後，已生的分鏡圖和已上傳的 take 還在——Task 2 E2E 第 7 步。

---

### Task 1: 開圖片生成（設定）

**Files:**
- Modify: `bin/beta-instance.sh:66`（`grep -E` 的名字清單加 `FAL_KEY`；註解同步）
- Modify: `bin/beta/instance.env.template`（`DAILY_GEN_IMAGE_USD=2`、新增 `FRAME_IMAGE_MODEL=seedream-4.5`）
- Test: `bin/test_beta_instance.sh`

**Interfaces:**
- Produces: 重新 `install`／`update` 後，`~/beta/<name>/app/.env` 有 `FAL_KEY`（來源有時）、`DAILY_GEN_IMAGE_USD=2`、`FRAME_IMAGE_MODEL=seedream-4.5`，影片／配音 0。

- [ ] **Step 1: 在 `test_beta_instance.sh` 加測試**：假來源 env 加一行 `FAL_KEY=test-fal`、`GEMINI_API_KEY=x`。檢查：`.env` 含 `FAL_KEY=test-fal`；不含 `GEMINI_API_KEY`；含 `DAILY_GEN_IMAGE_USD=2`、`DAILY_GEN_VIDEO_USD=0`、`DAILY_GEN_VOICE_USD=0`、`FRAME_IMAGE_MODEL=seedream-4.5`。再用一份沒有 `FAL_KEY` 的來源跑一次：install 成功、`.env` 沒有 `FAL_KEY=` 行。
- [ ] **Step 2: 跑 `bash bin/test_beta_instance.sh`**，預期新加的檢查 FAIL。
- [ ] **Step 3: 改 `beta-instance.sh` 和 template。**
- [ ] **Step 4: 跑 `bash bin/test_beta_instance.sh`**，預期 `beta-instance tests: PASS`。
- [ ] **Step 5: Commit** `feat(beta): enable storyboard image generation with Seedream 4.5`

注意：`update` 不會重寫 `.env`（`copy_app` 排除 `.env`）。部署到兩站要在 Task 5 用 `write_env` 的同一套邏輯；看 `do_update`／`configure` 決定是加 `update --env` 還是手動跑一次 install 路徑——選最小的改法並在 commit 說明。

### Task 2: 本機 E2E（mock，US$0）

**Files:**
- Modify: `docs/test-log.md`（記結果）

- [ ] **Step 1: 準備素材**：用 ffmpeg 在 scratchpad 產生 4 段測試片（2 段 1080x1920、2 段 1920x1080，各 3–6 秒，含正弦波音軌、畫面上有段落編號）。
- [ ] **Step 2: 起本機站**：`MOCK_GEN_DELAY_S=1 bash bin/isolated-backend.sh 8797 --demo-data --user test@example.com:pw-for-e2e --state ~/.local/state/buildclub-test-8797`，前端用 build 好的 dist 或 vite dev（照 `docs/STATUS.md` 既有做法）。
- [ ] **Step 3: 子 agent（Playwright）跑五步**：
  1. 搜尋（cache 有的關鍵字，如 tofu recipe）→ 選一支
  2. 分析／建企劃 → Shot list 出現 N 格
  3. Storyboard：改 2 格的角度／焦段和 prompt；每格「重生」（mock）；換版本箭頭
  4. 每格上傳一段素材（至少 4 格；其餘格留空，看剪輯怎麼處理）
  5. Next: edit video → AI 剪輯 → 匯出 → 下載，ffprobe 檢查 1080x1920、有音軌
  6. 把每日圖片上限調到 0 重起，按重生：要看到預算用完訊息
  7. 重新整理：分鏡圖、take 還在
- [ ] **Step 4: 記錄**：每步 PASS/FAIL + 截圖路徑 + console 錯誤，寫進 `docs/test-log.md`，bug 列成清單（擋流程／外觀）。
- [ ] **Step 5: Commit** `docs(test-log): record local full-flow E2E`

### Task 3: AI 試用者探索（US$0）

- [ ] **Step 1: 子 agent 扮演「澳洲小咖啡店老闆、第一次用、不懂剪輯」**，只給目標：「用一支熱門影片當參考，做一支自己店的 30 秒短片」，同一個本機站、新帳號。不給步驟。
- [ ] **Step 2: 回報**：每個卡住、看不懂、找不到下一步的地方（畫面、原文字、為什麼卡），以及最後有沒有做出影片。
- [ ] **Step 3: 合併 Task 2 的 bug 清單**，標「擋流程／困惑／外觀」，記到 `docs/test-log.md`，commit。

### Task 4: 修正

- [ ] 每個「擋流程」的 bug：先寫重現它的測試（unit 或 pytest）、看它紅、修、看它綠，一個 bug 一個 commit。
- [ ] 「困惑」類：改文字或提示最小改法；外觀類只記錄。
- [ ] `bash bin/verify.sh full` GREEN；tsc、eslint、`npx vite build` 通過；push。

### Task 5: 部署 + Daphne 真實驗收（A 的最後一步，約 US$0.2）

- [ ] 兩站 `beta-instance.sh backup` → `update`，並套用 Task 1 的 `.env` 變更；確認兩站 `.env` 的 `DAILY_GEN_*` 數值（只 grep 非 key 的行）與 `FAL_KEY` 存在（`grep -c '^FAL_KEY='`）。
- [ ] 健康檢查 8801／8802 本機與 tunnel 200。
- [ ] Daphne：用臨時帳號走五步，真的 Seedream 生 3–5 張；記下預算數字前後差；上傳、剪輯、匯出；帳號隔離（collage 帳號看不到）、登出。刪臨時帳號。
- [ ] 花費寫進 `docs/test-log.md`，更新 `docs/STATUS.md`，commit、push。

### Task 6: B — Beta 站完整走一遍，然後收尾

- [ ] 估算這輪花費（搜尋約 US$0.46、分析約 US$0.1、整份分鏡約 US$0.56）；超過 US$1 先問使用者。
- [ ] 同意後在 Daphne 站完整走五步（新搜尋、整份分鏡生圖、每格上傳、剪輯、匯出），記錄花費與結果。
- [ ] 收尾：問使用者要兩位試用者 email；兩站 backup 後清掉 E2E 測試 client，開正式帳號；更新 Tester Kit 網址、STATUS、交接檔；commit、push。
