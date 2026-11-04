# BuildClub 目前產品脈絡

更新於 2026-11-05，Sydney。先讀本節，再讀 `docs/STATUS.md`。下方 Recite 快照保留為歷史，不代表目前方向。

## Remake／影片畫布

Remake 協助澳洲行銷 agency 將短影音靈感變成可送審影片。流程是 Find ideas → Plans／shot list → 影片畫布 → 剪輯器 → 匯出／送審／發布。每個 shot 可用實拍，或先生成分鏡圖再生成影片；付費前報價並確認。Annie 是 agency 的審核者。

應用程式在 `pivots/02-content/app/trend-finder/`，使用 React、TypeScript、Vite、React Flow、FastAPI 與 SQLite，剪輯／匯出使用 Remotion 及本機媒體工具。規格與計畫在 `pivots/02-content/docs/`；`docs/phase2-scope.md` 是早期實拍階段，後續畫布規格已擴充 AI 素材。

產品只做 1440 桌面，面向澳洲英文市場。影片台詞、字幕與配音用英文，zh-Hant UI 仍需正常。設計變更與 Veralyn 對齊，重大決策先確認；具體規則及 Figma 入口見 `AGENTS.md`。

## 倉庫與工作方式

工作倉庫是 `veralynchong/BuildClub`，即 `origin`；舊 `minchiaHuang/BuildClub` fork 已非 PR 目的地。2026-11-05 核對 `origin/main` 為 `e442b3a`，PR49 已合併。PR51 `fix/offline-verification-context` 向 `main` 開啟，P0 已在 `b0d65b0` 提交推送，P1 文件已通過獨立唯讀 review，隨同 PR51 待使用者審閱。PR50 `docs/agents-md-for-codex` 仍 OPEN，這次沿用其規則，未合併或關閉它。舊 PR 記錄不能代表目前整合狀態。

從最新 `origin/main` 建語意分支，向同倉庫 `main` 開 PR。Lead 規劃、分派、審 diff、整合；writer 各有 worktree、分支、檔案範圍，reviewer 只讀。小任務單人，通常一位 writer 加一位 reviewer；一位 browser owner、每個共享測試環境一位 owner。不建 Flow queue 或安裝 plugin。使用者須明確對該 PR 說 merge 才能合併。

## 驗證與費用

提交前執行 `bash bin/verify.sh full`；預設及 `fast` 目前也跑完整離線套件。入口清除繼承環境，以離線 toggle 跳過 dotenv，再用 macOS `sandbox-exec` 封鎖網路、敏感路徑內容與暫存目錄外寫入。每步最多 120 秒，清理自有程序群組；缺少 OS 隔離或既有依賴就失敗，不安裝或取消隔離。正式 runtime 設定載入不變。

這是可信任專案測試的 gate，不保證全面阻擋預存 hardlink 別名，或清理透過 `setsid`／double-fork 離開自有群組的後代程序。實際 setuid `ps` 整合未覆蓋。離線綠燈不代表真實模型、付費 API、browser E2E 或成片品質已驗證。

每次付費操作另行說明帳號／key 名稱、估價與硬上限並取得該次核准，不讀取憑證。完整 spending、桌面、語言與 browser cleanup 規則見 `AGENTS.md`。待辦以 `docs/todo.md` 為準，包括 demo QA、使用者實測及經核准的 demo 素材；不假定舊 8805 暫存環境或 worktree 仍存活。

---

# 歷史產品脈絡：Recite

_Snapshot synced from the Miro boards on 4 Oct 2026. Product status reflects the board as of 2 Oct 2026._

## Product
**Recite** is an AI mystery shopper for AI search visibility (GEO / AEO).

It asks ChatGPT the questions a real buyer would ask, then reports:
1. Does this business show up in the answers?
2. Which competitors show up instead?
3. What should it change to get recommended?

## Problem
Businesses do not understand why AI tools recommend competitors instead of them. Existing tools show a visibility score, but not why or what to fix.

## Target Customer (ICP)
Sydney digital marketing agencies with 1–50 staff. Agencies buy Recite and run it for their clients (e.g. e-commerce, law firms, finance).

Not current focus: brands, in-house marketing teams, startups.

## How It Works (current)
1. Enter a website; Recite drafts a config and finds competitors from the AI answers
2. Generate 3 personas × 12 questions (mixed intents and wording); a human reviews them
3. Ask ChatGPT web (via Bright Data) every question, several runs each
4. Count mention rate with an error range (Wilson interval)
5. Gap analysis: cited websites, directories, question coverage
6. 3–5 recommendations, each tied to a specific answer or citation

## Key Constraints
- **Engine:** ChatGPT web only for real results. Claude API is for development tests.
- **Personas = Option A:** personas are only a way to write questions. The report shows who wins per persona but does not claim personas differ (tests did not support it).
- **Intent matters most:** what the buyer asks decides the list far more than how they phrase it or who they are.

## Current Stage
UTS Startups × Build Club 8-week AI Build Sprint. Currently W1 "Scope & Wedge" (6 Oct). W2 (12 Oct) target: working MVP a real person can use.

The working tool (CLI) and a local web page work end to end. Real runs so far: Yoghurt Digital (agency) and Eventus Financial (Sydney finance).

## Product Principles
- Keep MVP narrow
- Explain why, not just what
- Make outputs actionable and traceable to evidence
- Honest measurement: exclude non-answers, show error ranges, don't overclaim
- Focus on agencies first
- Validate before overbuilding

## Important Links
Miro (main Build Club board): https://miro.com/app/board/uXjVEffF6VU=/
Miro (Recite team overview): https://miro.com/app/board/uXjVEf96tu4=/
Figma:
GitHub:
Survey:

## Current Questions
See `docs/mvp-scope.md` → Open Questions. Biggest unknowns:
- Will agencies pay? (no first-hand demand evidence yet)
- How to define and group "use cases" in the report
- Who reads the report: the agency or its clients?
