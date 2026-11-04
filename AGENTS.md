# AGENTS.md

BuildClub 專案規則，供 Codex 與 Claude Code 共用。只適用本專案。

## 開始前與檔案位置

先讀 `PROJECT_CONTEXT.md`、`docs/STATUS.md`，以較新記錄及 git／GitHub 實際狀態為準。`docs/todo.md` 記錄使用者待辦，`docs/test-log.md` 保留測試紀錄。

- 目前產品是 Remake／影片畫布，程式在 `pivots/02-content/app/trend-finder/`，產品文件在 `pivots/02-content/docs/`。根目錄 Recite 文件是歷史。
- 跨產品文件放根目錄 `docs/`，研究放對應產品的 `research/`。優先更新既有檔案，根目錄只放專案共用入口或工具需要的設定。
- 保留有用內容。改重大產品決策前，指出與規格、decision log、`PROJECT_CONTEXT.md` 的衝突並先與使用者確認。外觀與設計變更仍需與 Veralyn 對齊。
- 研究引用來源並記錄日期，標示過期或未驗證資訊。

## Git 與協作

- 工作倉庫是 `veralynchong/BuildClub`，即 `origin`。從最新 `origin/main` 建語意分支，推送該分支並向同倉庫 `main` 開 PR。`minchiaHuang/BuildClub` fork 已不是工作倉庫。
- 不直接推 `main`、不 force-push，不覆蓋他人修改或接管其他 worktree、未追蹤研究。提交與推送依本次任務授權；writing worker 不自行推送或合併。
- 提交前顯示 `git status`、審 diff 並摘要，執行 `bash bin/verify.sh full`，綠燈才提交。
- 開 PR 後停下。任何 BuildClub PR 都必須等使用者明確對該 PR 說「merge」才可合併。「完成 PR」代表準備好待審。
- Lead 規劃、分派、審查 diff、整合並負責最終驗證。每位 writing worker 各有 Orca worktree、分支、檔案範圍與驗收命令；不得共用寫入 checkout 或重疊檔案。Reviewer 只讀，由 lead 處理整合與衝突。
- 小任務單一 agent；只拆值得平行處理的獨立工作，通常一位 writer 加一位 readonly reviewer。相依工作依序進行，不建立自訂 Flow queue 或安裝 orchestration plugin。
- 同時間只有一位 browser owner；每個共用測試環境至多一位 owner。其他 agent 不接管或關閉其瀏覽器、服務。
- 程式、註解、分支與 commit 用英文；內部文件與對話用繁體中文，時區用 Sydney。

## 離線驗證

- `bash bin/verify.sh` 預設 full，也接受 `fast`／`full`；目前兩模式都跑完整離線套件，不以 fast 跳過安全檢查。
- 入口清除繼承環境，以明確 allowlist 啟動，在匯入後端前設定 `BUILDCLUB_OFFLINE_VERIFY=1` 跳過 dotenv。正式 runtime 保留原本載入設定的行為。
- macOS `sandbox-exec` 封鎖驗證程序及子程序的網路、敏感路徑內容讀取、暫存目錄外寫入；缺少 OS 隔離就紅燈停止，不退回僅靠 mock。
- 每步最多 120 秒，以暫存檔接收輸出，成功、失敗、timeout 均清理該步驟的自有程序群組。啟動失敗與 timeout 回紅，結束後清除一次性暫存輸出與快取。
- 這是可信任專案測試的 gate。預存 hardlink 別名不保證全面阻擋；透過 `setsid`／double-fork 離開自有群組的後代程序不保證清理，不將它當作通用不受信任程式 sandbox。
- 驗證不讀 `.env`、`auth.json`、`api-keys.fish`，不開日常瀏覽器、不用日常資料庫。直接與 symlink 敏感路徑禁讀有測試，hardlink 限制仍適用。
- 使用既有 `.venv`、`node_modules` 與 Node，不自行安裝或升級依賴。經授權重用本機依賴 symlink 時回報路徑，不提交。
- macOS sandbox 拒絕 setuid `/bin/ps`。回收測試保留真實程序群組終止，身分判斷以 subprocess 邊界單元測試覆蓋；實際 `ps` 整合未驗證。

## 產品範圍

- 只做 1440 桌面。使用者未要求就不新增 mobile、390px 工作、手機截圖或檢查；舊計畫的 mobile 檢查標 waived。
- 面向澳洲英文市場。影片台詞、字幕、AI 配音只需英文，優先澳洲英語；zh-Hant UI 必須保留。
- Figma 指 Remake full-flow-map：https://www.figma.com/design/3qLG6XMnJ4kxKT6sWQFH0v ，節點 `96:2`。

## 費用與憑證

- 每次付費前說明帳號／key 名稱、用途、估價與硬上限，取得該次明確同意，完成後回報花費。一般「繼續」不代表同意花費。
- 不讀、印出、複製 `.env`、`auth.json`、`api-keys.fish` 或秘密環境值，不自行載入 key 檔案。
- 沿用 PR50 的 Apify 提醒：免費額度接近用完，每月 26 日 Sydney 11:00 重置，操作前仍須確認餘額。開發／除錯用 sample、cached data 或 `--demo-data`；live search 僅供核准後的真實測試或 demo。歷史估價為一次搜尋 2–3 runs、每 run 約 US$0.13，執行前重新估價。
- 額度重置後，重新查可用額度並向使用者確認原本的節流限制是否仍適用；不得把歷史餘額或小額免問記憶當成本次付費授權。
- fal.ai 為小額預付帳戶，每次 cap 要小，現有 server cap 為 image 0.12、video 0.20；完成後回報餘額。Storyboard 用 fal Seedream 4.5。
- Gemini 只允許免費層；使用者明確表示 billing 已開啟前，不使用或測試。

## 瀏覽器與服務

- 後端任務不開 browser。UI 測試集中給最少的人，使用專案當次指定且確認可呼叫的工具；Playwright server 有設定不等於工具可用。
- 結束前關閉自己開的 tabs/context，在 `finally` 中 `await ctx.close()`，停止自己啟動的 backend。不得關別人的瀏覽器。
- Mac mini 是 server。hostname 含 `mini` 時不在 mini 執行供使用者看的 `open`；提供 MacBook 連結或用既有 `open-on-macbook.sh`，無法連線時回報一次路徑後繼續。
