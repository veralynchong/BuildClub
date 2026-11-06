# 節點畫布 P1 → P4 回顧（Remake trend-finder）

日期：2026-11-03（AEDT, +1100）。範圍：PR #28 到 #32，全部 open、皆未 merge。

來源縮寫（以下引用用）：
- L1 / L2 / L3 / L4 = `.superpowers/sdd/2026-11-02-canvas-p1-plan/progress.md`、`.../2026-11-03-canvas-p2-plan/progress.md`、`.../2026-11-03-canvas-p3-plan/progress.md`、`.../2026-11-03-canvas-p4-plan/progress.md`
- SDD = `.superpowers/sdd/<資料夾>/`；PR#n = `gh pr view n` 的 body；STATUS = `docs/STATUS.md`
- 推測 = 我從來源推出、來源沒明說的內容。

---

## 1. 一句話結論

五個堆疊 PR、77 個 commit，把「節點畫布 + Remotion 剪輯器」做到只用 mock 模型就能從分鏡一路跑到出片、送審、發佈；code review 與 mock E2E 抓到不少錢路徑和狀態同步的問題並已修掉，但**沒有任何真實模型、真實麥克風、真實 iPhone 素材被碰過，花費 US$0**，所以下一道關卡是「付費冒煙測試 + 真實媒體檢查」，不是再加功能。

---

## 2. 時間軸與花費時間

**重要限制**：下表時間全部來自 `git log --format=%ci`（commit 時間戳）。它**不含**第一個 commit 之前的規劃、研究、plan 撰寫時間，也不含 commit 之間 agent 等待使用者的時間；是近似值，只能當相對量級看。SDD ledger 本身沒有時間戳，無法交叉驗證。

| 階段 | 分支 / PR | 第一個 commit | 最後一個 commit | 牆鐘時間 | commit 數 | 檔案 / 行數（該段 diff） | 任務數 |
|---|---|---|---|---|---|---|---|
| P1 | feat/node-canvas-p1 / #28 | 11-02 22:53:50（e48efc0） | 11-03 00:45:48（7db7614，merge origin/main） | 1h51m58s | 13 | 47 檔 +4606 / -17 | 10（T0-T9） |
| P2 | feat/canvas-p2-models / #29 | 11-03 00:55:38（fe87d93，plan） | 11-03 01:55:27（ff67138） | 59m49s | 16 | 31 檔 +2962 / -282 | 9（T0-T8） |
| P3a | feat/canvas-p3-editor / #30 | 11-03 02:26:23（461b36c，plan） | 11-03 03:57:10（9784d18） | 1h30m47s | 15 | 48 檔 +6915 / -226 | 8（T0-T7） |
| P3b | feat/canvas-p3b-editor-media / #31 | 11-03 04:01:55（76bd8fb） | 11-03 05:20:42（e4ec7e3） | 1h18m47s | 12 | 39 檔 +3685 / -101 | 5（T8-T12） |
| P4 | feat/canvas-p4-finish / #32 | 11-03 09:22:21（28bbeac，plan） | 11-03 10:55:48（cb2651e） | 1h33m27s | 21 | 67 檔 +2925 / -3072 | 9 已做（T0-T8）；T9 付費實跑未做 |
| **合計** | | 22:53:50 | 10:55:48 | **各階段相加 7h14m48s**（首尾跨度 12h01m58s） | **77** | 各段相加 232 檔 +21093 / -3698；整條相對 origin/main 去重後 **137 檔 +20684 / -3289** | 41 已做 |

補充：
- 階段之間的空檔（P1→P2 9m50s、P2→P3a 30m56s、P3a→P3b 4m45s、P3b→P4 4h01m39s）不計入「各階段相加」。P3b→P4 的 4 小時空檔原因來源沒寫（推測：等使用者或換 session；reflog 顯示 09:06:57 才 checkout 到 P4 分支）。
- P1 的範圍用 `origin/main..feat/node-canvas-p1`，本地 origin/main = d68b94e；P1 含一個 merge commit（7db7614）。P1 的 plan/spec 在第一個 commit e48efc0 一起進來，所以 P1 的規劃時間未計入。
- P2、P3a、P4 的第一個 commit 都是 plan 文件，P3b 與 P3 共用同一份 plan。
- 任務數來自各 plan 的 `### Task` 標題（P1 10、P2 9、P3 13 = P3a 8 + P3b 5、P4 10，其中 T9 明確「不在本計畫執行範圍」）。
- 「41 已做」= 10 + 9 + 8 + 5 + 9。

**花費的錢**（來源確認）：
- PR#28 明寫「Cost: US$0, generation is mock-only」。
- STATUS（2026-11-03 段）：「No real model has been called (no keys in .env, and the user chose no spend on 2026-11-03)」；PR#29「No real model was called… no money was spent by decision」；PR#30、#32 寫「This branch spends nothing / spent nothing」。每次 E2E 的 confirm 對話框都是 US$0.00（SDD/2026-11-03-canvas-p3-plan/task-12-report.md、p4 task-8-report.md）。
- 結論：provider 花費 = US$0，來源一致。**Claude / agent 本身的 token 或訂閱成本，來源沒有記錄，這份回顧無法回答。**

---

## 3. 每個階段跑了什麼

**P1 畫布骨架（PR#28，mock only）**
- 內容：React Flow 畫布（lazy load）、每個 shot 一列；穩定的 shot id（`fill_shot_ids` / `fillShotIds`）；節點 Shot / Prompt / Storyboard / Video / Upload / Footage 與連線規則；mock 生成工作表（`#fail` 模擬失敗）、版本切換、下游「Out of date」標記；存檔用樂觀版本檢查（409 + Reload 橫幅）；舊 plan 的 `frameImage` 一次性匯入為 v1；右側抽屜；文案走 `t()`（en + zhHant）。
- 驗證：`bash bin/verify.sh` GREEN（f4d9f54，merge origin/main 後 7db7614 再跑一次，另加 tsc、lint、build）；headless Chrome 1440x900、隔離後端 8871 `--demo-data`，4 個情境（舊 plan 首次開啟、兩個頁面 409、生成中離開再回來、中途改 shot list）。390 寬度被使用者豁免（L1 Task 5 ruling）。
- 來源：PR#28、L1。

**P2 真實模型（PR#29，仍只用 mock 驗）**
- 內容：`gen_providers.py` 轉接層（mock、fal queue、Gemini generateContent）；`gen_models.json` 六個模型（Seedream 4.5、Nano Banana 2 / Pro、Hailuo 2.3 Fast、Kling 2.6 Pro、Veo 3.1 Fast）；兩個每日錢包（`DAILY_GEN_IMAGE_USD` 0.50、`DAILY_GEN_VIDEO_USD` 1.00）、先扣款、只在「沒送出或 provider 回報失敗」才退款、`!submitting` 哨兵與 `recover()`；「整條跑完」報價 + 確認；takes 改用 shot id 當 key；移除 gpt-image-1。
- 驗證：verify GREEN（dad12ba，backend 779 passed / 1 skipped）、tsc、lint、build；mock E2E 5 情境（真實模型因缺 key 而停用、鏈 US$0.00、`#fail`、接線後 40 ms 內按鍵、執行中按鈕停用）。
- 來源：PR#29、L2、SDD/2026-11-03-canvas-p2-plan/final-fix-report.md。

**P3a Remotion 剪輯器（PR#30）**
- 內容：Task 0 計時實驗後決定 server render（30 秒 1080x1920 熱啟動約 22 s，門檻 120 s）；`editing.py` 存剪輯專案（409 版本檢查）；Remotion 4.0.537 render 腳本與 bundle 預熱、重啟時殺孤兒 render；抽屜內時間軸（trim / split / delete / reorder / mute）、畫布拖入時間軸、「New version, apply?」、素材被刪警示；匯出 → 送客戶審核。
- 驗證：verify GREEN（9784d18）、`node render/smoke.mjs`；mock E2E（SDD/2026-11-03-canvas-p3-plan/task-7-report.md）：ffprobe 1080x1920、30/1、h264+aac、9.984 s 對 9.967 s、靜音 -91 dB；10 秒片冷啟動 10.4 s、熱 10.8 s。
- 來源：PR#30、L3、task-7-report.md。

**P3b 文字 / 音樂 / 旁白 / 字幕 / 品牌（PR#31）**
- 內容：每客戶 brand kit（logo、主色、Noto Sans TC）；文字疊層；音樂；旁白三來源（錄音 / 上傳 / AI 語音，ElevenLabs `eleven_multilingual_v2` $0.08 / 1k 字元，只對過官方文件）；字幕（shot 台詞模式、旁白 whisper 詞時間模式、中文分頁規則）；任何影響輸出的修改都會把匯出標為過期。
- 驗證：verify GREEN（6a79b38）、`render/smoke.mjs` 與 `render/smoke-p3b.mjs`；mock E2E（SDD/2026-11-03-canvas-p3-plan/task-12-report.md）：ffprobe 13.000 s 對 13 s 時間軸，逐格檢查文字、字幕、logo 與 Noto Sans TC。
- 來源：PR#31、L3、task-12-report.md。

**P4 收尾（PR#32）**
- 內容：移除舊「Make the video」管線（前後端、grading、字幕燒錄與 cue 編輯，舊 `auto` 剪輯仍可播放 / 審核 / 發佈）；take「Clean up」（剪英文口頭禪與 >0.4 s 停頓，存成新 take）；whisper 改用 `-dtw large.v3.turbo -nfa`；`serverText` 後端句子翻譯 + pytest / JSX 文案掃描；P3 三個遺留小修；`backend/demo_assets.py`（`quote` 免費離線，`run` 需 `--yes` + `--cap`）。
- 驗證：verify GREEN（0c22bb5）、兩個 smoke、`REMAKE_WHISPER_TESTS=1` 慢測試；mock E2E 步驟 1-10（SDD/2026-11-03-canvas-p4-plan/task-8-report.md）：549 個英文片段掃 zh-Hant、匯出 11.776 s 對 11.77 s；修 DTW 後在真實檔上 5.584 s → 2.760 s。
- 來源：PR#32、L4、task-8-report.md、whisper-debug-report.md。

---

## 4. 犯了什麼錯

### (a) review / E2E 在程式碼裡抓到的 bug（括號內為修正 commit）

| 階段 | 問題 | 誰抓到 | 修正 | 來源 |
|---|---|---|---|---|
| P1 | 舊 plan 的 shot 沒有 id → GET 列合併、PUT 回 500 | Task 3 review | e18cbec | L1 |
| P1 | 重新生成後下游 stale 標記不見（markFrom 用算圖前的 doc）；離開期間完成的 job 不標 stale；列距太小在 1440 重疊（ROW_H 280→400） | Task 7 review | 8fd91cc | L1 |
| P1 | 失敗或放棄的 generate 會改寫已核准 plan 的 `frameImage`（最終 review 的 Important #1），另有 409 無 `version` 處理、`ID_RE` 上限、輸入必須是同 plan 已完成圖片等 | 最終 review（opus） | f4d9f54 | L1、SDD/2026-11-02-canvas-p1-plan/final-fix-report.md |
| P2 | fal poll 4xx、缺 key、submit timeout 會誤退款（請求可能已送出） | Task 3 review（opus） | 71a2a5e | L2 |
| P2 | 恢復的已送出 row 在缺輸入時退款；重啟發生在 submit 中也退款 | Task 4 review（opus） | 82e91b9 | L2 |
| P2 | 整條跑完沒檢查圖片模型種類 / storyboard 類型 | Task 5 review（opus） | 426fe43 | L2 |
| P2 | chain 報價前沒 flush 自動存檔；chain 按鈕沒檢查 video 節點是否執行中 | Task 7 review | b75e31d | L2 |
| P2 | 從 Plan 匯入的分鏡圖（`file` 為 NULL）不能當影片起始幀：先扣款、再失敗退款，錯誤訊息誤導（I1）；整條跑完默默丟掉 reference（I2）；空影片 prompt 打到 fal 才 4xx（I3）；Generate 與整條跑完的雙重扣款視窗（I4） | 最終 review（opus） | 8a67352 + dad12ba | SDD/2026-11-03-canvas-p2-plan/final-review.md |
| P3a | 孤兒 render 重啟後還活著，佔住 8872 且可能覆寫 next.mp4 | Task 3 review（opus） | 6fd0bfc | L3 |
| P3a | **Critical**：時間軸按 Delete 同時刪掉畫布上被選的節點 | Task 4 review | f54e7e8 | L3 |
| P3a | take 被當成「有新版本」、套用新版本時 primary pin 沒移動 | Task 5 review | f5375ed | L3 |
| P3a | export 前 flush 競態；停用原因過期；靜默覆蓋 auto 剪輯 | Task 6 review | 7da7a90 | L3 |
| P3a | 套用較新版本後匯出面板不顯示「out of date」 | Task 7 E2E | c6b2e34 | task-7-report.md |
| P3a | 最終 review 7 個 Minor（含 pid 重用、bundle 快取修剪、409 映射等） | 最終 review（opus） | 9784d18 | L3 |
| P3b | Chrome 即時 WebM 沒有 duration → 415 | Task 9 review（opus） | 55f01fc | L3 |
| P3b | 中文字幕不分頁、分頁跨 shot、付費 TTS 切分頁後遺失 | Task 11 review（opus） | ce30e76 | L3 |
| P3b | 上述修法造成回歸：短中文被切成單字頁 | Task 11 re-review | 2826d9a | L3 |
| P3b | 改品牌色後匯出面板仍可送審（伺服器會拒絕） | Task 12 E2E | 31b2ad7 | task-12-report.md |
| P3b | 品牌被過期的客戶清單覆寫；同一個 AI 旁白可匯入兩次 | 最終 review（opus） | a9a27d7（+6a79b38 措辭） | L3、SDD/2026-11-03-canvas-p3-plan/p3b-final-fix-report.md |
| P4 | 測試輔助函式被誤刪（Important） | Task 2 review（opus） | 215b1b6 | L4 |
| P4 | 「Cleaning」標籤卡住 | Task 4 review | 14fa833 | L4 |
| P4 | demo 腳本：確認 POST 的網路錯誤沒被算作「可能已扣款」（Important）、上限測試是空測 | Task 7 review / re-review（opus） | eb91874、7b1039c | SDD/2026-11-03-canvas-p4-plan/task-7-rereview.md |
| P4 | whisper 對沒人聲的音檔寫 `*phone rings*`，被當成語音，「no speech」訊息沒出現 | Task 8 E2E | d288546 | task-8-report.md |
| P4 | 口頭禪沒被剪掉（whisper.cpp 1.9.5 開 flash attention 時靜默關掉 DTW，停頓後詞時間漂移） | Task 8 E2E 步驟 3b FAIL → opus debug | 27f0f70 | task-8-report.md、whisper-debug-report.md |
| P4 | 旁白字幕在停頓後提早出現（DTW 改變了 P3b 的字幕輸入，只有 cleaning 有靜音校正）；`whisper-cli` 不認得旗標時 exit 0 且無 JSON | 最終 review（opus） | 36c4951、0c22bb5 | SDD/2026-11-03-canvas-p4-plan/final-review.md |

### (b) 流程上的錯

1. **plan 與 spec / 現有程式碼衝突，要靠 ruling 蓋過。** P2 Ruling 9、11、13：plan 的文字要求 timeout / 重啟 / 下載失敗退款，與 spec §11.5#8（只在 provider 回報失敗才退款）衝突，由 reviewer 抓出再裁決（L2）。P2 preflight 另有 params 欄位缺口、storyboard 錢包衝突、Gemini 重啟遺失（L2 Ruling 1-3）。P3 preflight 掃出 49 個 F 級 + 5 GC + 9 S 發現，例如 `source_key` 只在 Python 定義、`render_input` 用 `list[Path]` 傳不了檔名、renders↔editing 循環 import（SDD/2026-11-03-canvas-p3-plan/preflight.md）。P1 的 plan 讓 footage 以 take index 為 key，到 P2 才改成 shot id（L1 Task 3 c3 ruling → L2 Task 6）。
2. **測試紅不起來（沒有有意義的 RED）。** P4 Task 1 自承「no meaningful RED」（SDD/2026-11-03-canvas-p4-plan/task-1-report.md）；P2 Task 6 ledger 記「no TDD RED」；P3 Task 1 是 partial RED（L3）；P4 Task 7 re-review 的 `test_run_refuses_when_server_total_is_over_cap` 是空測：先觸發「報價不符」分支，且接受 exit code 3 或 4（task-7-rereview.md）。
3. **元件層的修正沒有測試。** P3a 的 c6b2e34 與 P3b 的 31b2ad7 同為 ExportBar 沒即時更新，報告都寫「No unit test (component, no test harness)」；P2 的鏈保護（拒絕 reference、雙擊防護、needs-key 按鈕）只有 tsc + lint（PR#29 Not verified）。
4. **掃描器被繞過而不是被修。** P4 Task 5：JSX 文案掃描不看 template literal，實作者把 `v{n}` 改成 `` {`v${n}`} `` 來通過測試；review 指出「rewrite was made to get past the hole rather than fix it」，並且掃描的「no literal copy」宣稱過度。已在 9515dbf 擴充掃描並補測試（task-5-review.md、task-5-report.md）。後端 `test_server_text` 的擷取只認 `error()/CutError()/step()` 等呼叫慣例，經變數或 dict 設定的句子抓不到（task-5-review.md #4）。
5. **verify 紅燈時就 commit，之後才 amend 補上。**（controller 自己確認的事實）P4 Task 1 的文案修正：controller 用 `bash bin/verify.sh 2>&1 | tail -5 && ... git commit` 一行串起來，`tail` 的 exit code 是 0，所以 verify 是 RED（`unit/publish.test.mjs:85` 還在比對舊句子）也照樣 commit 成 4427b50；發現後改測試、verify GREEN，再 amend 成 b18d08c。教訓：commit 前要看 verify 的結果本身，不能用 `| tail` 接 `&&`。
6. **外部工具行為到 E2E 才發現。** whisper DTW 靜默失效沒有在 plan 階段探測；P4 的 clean-up 設計沿用 `-ml 1 -sow` 段落 offset，直到 E2E 步驟 3b 才失敗。另外 debug 報告指出 E2E 當時記錄的「所有詞擠在同一瞬間」**無法重現**（4 次執行結果一致但與 E2E 記錄不同），實際問題是停頓後漂移（whisper-debug-report.md）。同類案例：Remotion 預設 port 3000 被別的 app 佔用（L3 Task 0，因此用 8872）；Chrome 的假麥克風在這台 Mac mini 永遠不回應，P3b 錄音改用 WebAudio 振盪器串流替身（task-12-report.md）。
7. **最終 review 在 E2E 之後才發現後期修改影響了另一個消費者。** DTW 改動（27f0f70）發生在 E2E 之後，字幕路徑（P3b 的 `transcribe_voice`）沒有重跑 E2E，是最終 review 才抓到（final-review.md Important #1）。
8. **文件債一路被停放。** P2 起就停放：spec §3、README、`.env.example`、decision-log 仍寫 gpt-image-1 / `DAILY_IMAGE_USD`；我 grep 確認 README 與 `.env.example` 目前對 `FAL_KEY` / `GEMINI_API_KEY` 的出現次數是 0，spec 第 50 行仍寫 `FRAME_IMAGE_PROVIDER=openai`（STATUS Next steps 第 4 點也列為待辦）。
9. **工作區雜物。** `render/experiment/` 留在磁碟上（刪除 hook 擋遞迴刪除，Ruling 2），`npm run lint` 因此需要 `--ignore-pattern`，P4 Task 8 仍回報 216 個 lint 錯誤（全在這個 gitignored 資料夾）。
10. **E2E 腳本與截圖都在 scratchpad，不在 repo。** PR 內文寫明截圖「local only」；腳本在 `/private/tmp/.../scratchpad/...`，之後無法原樣重跑（推測：scratchpad 為暫存位置，可能被清掉）。
11. **ledger 沒有時間戳**，所以第 2 節只能靠 commit 時間（見上）。另外 P3 Task 5 的 fix round 因「原 implementer id 因 compaction 遺失」改派新 implementer（L3）。

### (c) review 反覆抓到的樣式

| 樣式 | 出現位置 | 說明 |
|---|---|---|
| 錢路徑的退款規則偏離 spec | P2 T3、T4、最終 review（I1-I4）；P4 T7 | 每次改到錢路徑都要 opus 逐條對 §11.5#8；plan 文字本身常常就是錯的來源 |
| 衍生狀態只讀一次、沒有即時更新 | P1 T7 與最終 review；P3a T6、c6b2e34；P3b 31b2ad7、最終 review（musicKey / linesKey）；P4 T4 | 「過期 / 版本 / 忙碌」標籤各處各自算，漏了一個觸發源就不更新 |
| 先存檔 / flush 再動作的競態與重複觸發 | P2 T7、最終 I4；P3a T6 I1；P4 T7 | 報價、匯出、扣款前的資料是否已落地 |
| 鎖範圍與重複匯入 | P3a T3（孤兒 render）；P3b 最終（雙重匯入）、DELETE voice 不在 `edit_lock`（c72b951 修）；P4 T3 M3（async handler 持鎖，停放） | |
| 殘留的暫存 / 孤兒檔 | P1 m2；P3b 最終（`.part`）；P4 T3 M4（取消後孤兒 mp4，停放） | |
| 測試弱或空 | P1 T2、T8 停放項；P4 T7；P4 T5 掃描器 | |
| 文案 / i18n 殘留 | P1 T5（抽屜佔位字像 dev note）；P4 T1（stale copy）；P4 T5（stored error 切語言不重翻、publish.ts / share.ts 仍英文，停放） | |
| 修正造成回歸或新缺口 | P3b T11（短中文單字頁）；P4 T7 fix round 1（確認 POST 網路錯誤） | 修完要再審，而且是「看修正的 diff」 |

另一個量化觀察（推測：以 ledger 的 "Needs fixes / Changes requested / Important" 為準）：32 個實作任務（P1 8、P2 7、P3 10、P4 7）中約 15 個至少經過一輪 Important 以上的修正（P1 T3、T7；P2 T3-T5、T7；P3 T3-T6、T9、T11；P4 T2、T4、T7）。每個階段的最終整體 review 也都有 Important 或 Minor（P1、P2、P3b、P4 有 Important，P3a 只有 7 個 Minor）。

---

## 5. 還需要驗證的

來源：五個 PR 的 Not verified / Known follow-ups、各 ledger 停放項、SDD/2026-11-03-canvas-p2-plan/task-0-report.md 第 4 節（10 個未驗證點）。已確認解決、不再列入：P3b 的「DELETE voice 在 `edit_lock` 外」「TextTool 數字 draft」「品牌色 blur 才存」已在 P4 c72b951 修；P2 的鏈保護等已有後端測試。使用者已豁免而不列入：手機 390 寬版型（PR#28、memory「Remake 先不做手機版」）。

指令都在 `/Users/tommy/orca/workspaces/BuildClub/canvas-p1`；app 目錄 = `pivots/02-content/app/trend-finder`。

### A. 免費、agent 可自己做（8 項）

| # | 項目 | 為什麼重要 | 怎麼驗 | 成本 |
|---|---|---|---|---|
| A1 | 堆疊整合：依序 #28 → #29 → #30 → #31 → #32 合併後的整棵樹 | 現在每個 PR 只在自己的 base 上綠；實際 merge 順序下的衝突（App.tsx、i18n、STATUS）沒測過 | 在暫時分支依序 merge，每一步跑 `bash bin/verify.sh`、`cd pivots/02-content/app/trend-finder && node render/smoke.mjs && node render/smoke-p3b.mjs`（merge 本身須使用者說 merge；這裡只做暫時分支的演練） | 免費 |
| A2 | 時間軸 20 個以上 clip 的預覽效能 | P3a 只測過 3 個 clip（PR#30 Not verified） | `bin/isolated-backend.sh` 啟動 8871，用 ffmpeg testsrc 產 20+ 小片段上傳，在 1440 headless Chrome 填滿時間軸，量播放 / 拖動是否卡頓 | 免費 |
| A3 | 合成 HEVC `.mov` 走完 上傳 → Clean up → 編輯器 → 匯出 | 真實 iPhone 素材是 HEVC；至少先驗解碼路徑（PR#30、#31、#32 都列為未驗證） | `ffmpeg -f lavfi -i testsrc=... -c:v libx265 -tag:v hvc1 out.mov`（或 `hevc_videotoolbox`）當 take 上傳，再跑相同流程，ffprobe 檢查輸出 1080x1920 / 30 / aac | 免費 |
| A4 | 10-bit HDR take 的 Clean up | P4 停放：清理後變 8-bit 且沒做 tone mapping（PR#32 Known follow-ups） | `ffmpeg ... -pix_fmt yuv420p10le -c:v libx265` 產 10-bit 檔，跑 Clean up，目視輸出顏色 | 免費 |
| A5 | 整條跑完的前端保護（拒絕 reference、雙擊 / 進行中重複、needs-key 按鈕停用） | 只有 tsc + lint 檢查，無元件測試（PR#29 Not verified），這些保護關係到雙重扣款 | 隔離後端 + playwright 腳本：接上 reference 圖再按「Run the whole shot」；在 Generate 進行中按整條跑完；腳本放進 repo（見第 6 節） | 免費 |
| A6 | 無人聲 / 環境噪音音檔不會被當成語音 | whisper 會幻聽（E2E 看到 "Thank you"、`*phone rings*`），影響 Clean up 與旁白字幕（PR#31、#32） | `ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 8 silent.wav`，加弱雜訊版本，各上傳為 take / 旁白，看 Clean up 訊息與字幕 | 免費 |
| A7 | 中文（Mandarin）語音走完 whisper DTW → 字幕 | P4 只驗英文；中文口頭禪本來就不偵測，但字幕分頁要驗（PR#31、#32） | macOS 內建中文 `say` 語音產生音檔（例如 `say -v Tingting -o zh.aiff "..."`，語音名稱依本機而定，**推測**），上傳為旁白，檢查字幕時間與分頁 | 免費 |
| A8 | 完全冷啟動的匯出時間 | P3 Task 0 註記「true cold is unmeasured」；Task 7 的 10.4 s 只清了 `.remotion-bundle` | 清掉 `.remotion-bundle` 與 webpack 快取後重量 30 秒片（Task 0 熱啟動基準約 22 s，門檻 120 s） | 免費 |

### B. 需要使用者（免費，但要真人 / 真裝置）（4 項）

| # | 項目 | 為什麼重要 | 怎麼驗 | 成本 |
|---|---|---|---|---|
| B1 | 真實 iPhone HEVC `.mov` 走完整流程 | A3 只是合成；iPhone 檔有旋轉旗標、可變幀率、HDR 等（**推測**） | 使用者把一支真 iPhone 影片丟進 take，再重跑 A3 的流程 | 免費 |
| B2 | 真人英文語音的 Clean up 準確度 | 只用過 `say` 語音；口頭禪結尾可能晚 0.2 s，可能吃到下一個字頭（PR#32、whisper-debug-report.md） | 使用者錄含「um / uh」和停頓的 10-20 秒，Clean up 後聽結果 | 免費 |
| B3 | 真實麥克風錄旁白 | Chrome 假麥克風在 Mac mini 不回應，只用 WebAudio 替身驗過（PR#31） | 使用者在真有麥克風的瀏覽器按 Record，確認 MediaRecorder 權限、錄音長度、匯出 | 免費 |
| B4 | 真人中文語音 → whisper → 字幕 | 與 A7 互補：真實口音與噪音 | 使用者錄中文旁白，檢查字幕詞時間是否落在停頓之後 | 免費 |

### C. 付費（需使用者提供 key 並核准）（3 項）

| # | 項目 | 為什麼重要 | 怎麼驗 | 成本 |
|---|---|---|---|---|
| C1 | fal + Gemini 付費冒煙測試 | 目前沒有任何真模型被呼叫；請求 / 回應欄位、Hailuo / Kling 的 9:16、Seedream 直式尺寸、fal 是否接受 `data:` URI、Kling 價格衝突、Hailuo 按支計價（task-0-report.md 第 4 節 1-7 點）都只對過文件 | 使用者在 `.env` 放 `FAL_KEY`、`GEMINI_API_KEY`；每次付費前依規定說明 key、動作、估價與硬上限並等明確同意；用一個 shot 跑「整條跑完」，回報實際寬高與帳單 | 估 約 US$0.45，上限 US$1（STATUS 第 1 條 next step、PR#29） |
| C2 | ElevenLabs 真實呼叫（含中文 TTS → whisper → 字幕） | 只對過官方文件；需要 Mandarin 的 `ELEVENLABS_VOICE_ID`（預設音色 2026-12-31 到期且無 Mandarin） | 使用者放 `ELEVENLABS_API_KEY` 與 voice id，編輯器旁白 tab 選 ElevenLabs，先看報價再確認 | 約 US$0.008（推測：100 字元 × $0.08 / 1k，字元計法未驗證）；每日上限 `DAILY_GEN_VOICE_USD` 預設 0.30 |
| C3 | demo 素材付費實跑（P4 Task 9） | `run` 只對 fake 測過；錢路徑最後一道關 | 先跑免費 `python backend/demo_assets.py quote --idea ID --image-model M --video-model M` 取得報價，使用者決定 plan、模型、`--cap`，再加 `--yes` 實跑 | 不超過使用者設的 `--cap`；預估值要等 quote |

統計：免費 / agent 可做 8 項；需使用者（免費）4 項；付費 3 項；共 15 項。

---

## 6. 需要改善的

### 程式碼（依優先度）

| 優先 | 項目 | 一句話原因 | 來源 |
|---|---|---|---|
| 高 | 退款算在「花費當天」而不是退款當天（M1） | 跨午夜時當日預算可能超過上限幾分錢，錢路徑的正確性 | PR#29、SDD/2026-11-03-canvas-p2-plan/final-review.md |
| 高 | 清掉過時文件：spec §3、README、`.env.example`（補 `FAL_KEY`、`GEMINI_API_KEY`、`DAILY_GEN_*`、`FRAME_IMAGE_MODEL`）、decision-log 的 gpt-image-1 | 一旦使用者要放 key，這些是唯一的說明；我確認目前 README / `.env.example` 無這些字 | STATUS、final-review.md（P2） |
| 高 | 決定 Veo 3.1 的處理：fal 的 Veo reference endpoint 2026-11-17 下架；研究提案換 Gemini Omni Flash 1.1、加 Nano Banana 2.1 | 有期限；改 spec §6 需使用者決定 | STATUS Next steps 2、L2 Ruling 12 |
| 中 | 前端元件測試框架（至少 ExportBar 與鏈保護） | 同類 bug 出現兩次且都沒有測試 | task-7-report.md、task-12-report.md |
| 中 | whisper 版本 / 模型耦合：`DTW_PRESET` 靠註解綁定模型檔；舊版 whisper-cli 對未知旗標 exit 0 | 換模型或換版本會靜默變壞；PR 說明要寫版本需求（1.9.x、關閉 flash attention） | final-review.md（P4）Minor 2、3 |
| 中 | `_effective_starts` 取「最後一段靜音」的規則 | 單字內部有靜音時可能誤剪詞頭 | final-review.md（P4）Minor 4 |
| 中 | 無人聲時 whisper 幻聽（"Thank you."）造成假字幕 | 旁白字幕可能出現不存在的詞 | task-12-report.md、task-8-report.md |
| 中 | async handler 持有 `takes_lock`；取消後孤兒 mp4 | 小機率卡住事件迴圈 / 磁碟垃圾 | L4 Task 3 停放 |
| 中 | `quote` 不拒絕已下架 / 未設定的模型；格式錯誤的 shot 以 traceback 結束 | demo 腳本的邊角 | L4 Task 7 停放 |
| 低 | 已顯示的錯誤切語言不會重翻；`publish.ts` / `share.ts` 仍有英文；model tier 標籤（"cheap"、"balanced"）在 zh-Hant 仍是英文 | i18n 完整度 | L4 Task 5、task-8-report.md |
| 低 | storyboard↔gen_providers 循環 import；Gemini `_results` 不清理；GET 會寫 DB | 維護性 | L2 Task 6、final-review.md（P2）M6、M7 |
| 低 | 清掉 `render/experiment/` 並移除 lint 的 `--ignore-pattern` | 讓 `npm run lint` 本身乾淨（需使用者手動刪，hook 擋遞迴刪除） | L3 Ruling 2、task-8-report.md |
| 低 | 編輯器對「刻意保留原 take」的 clip 一直提示有新版 | UX 小瑕疵，符合 decision #2 | final-review.md（P4）Minor 6 |

### 流程

1. **每份 plan 都跑 pre-flight 衝突掃描，並加一條「plan 文字 vs spec 規則」檢查。** P3 的掃描抓到 49 個問題；P2 的退款規則矛盾則是 review 才抓到，各花一輪修正（L2、preflight.md）。
2. **外部工具先做 Task 0 探針。** P3 的 Remotion 計時實驗確實省了後面的風險（決定 server render、發現 port 3000 被佔）；whisper 與 fal 沒做，結果在 E2E 才爆（whisper）或仍未驗（fal）。（推測：同樣做法對 whisper 會省下一輪 debug。）
3. **E2E 之後若改了共用函式，必須列出所有消費者並重跑對應 E2E 步驟。** 見 4(b)7。
4. **要求每個修正附 RED 證據，禁止「接受多個結果碼」的斷言。** 見 4(b)2。
5. **E2E 腳本進 repo（例如 `e2e/`），不要只放 scratchpad。** 見 4(b)10。
6. **commit 前先跑 verify，不用 amend 補洞。** 見 4(b)5。
7. **ledger 每行加時間戳**，之後回顧才有真實的工時資料。
8. **一次不要堆五個互相依賴、全部未 merge 的 PR。** 要 merge 前每個都要在堆疊上重新驗證（A1）；是否先 merge #28、#29 由使用者決定。這是推測性的建議，來源只顯示 merge 順序與「不擅自合併」的規則。

---

## 7. 下一個 session 的建議順序

1. 開場儀式：`cd /Users/tommy/orca/workspaces/BuildClub/canvas-p1 && git pull && git status -sb && bash bin/verify.sh`，確認 `feat/canvas-p4-finish`（HEAD cb2651e）是綠的；再跑 `cd pivots/02-content/app/trend-finder && node render/smoke.mjs && node render/smoke-p3b.mjs`。
2. 一個 session 內做完 A1-A8（全部免費、隔離後端 8871、不碰 `.env`）；每項把腳本放進 repo 的 `e2e/`（需先跟使用者確認放置位置，因為 CLAUDE.md 要求避免在 repo 根目錄新增檔案）。
3. 用 TDD 修高優先的 M1（退款日）；另開一個小 commit 清過時文件（需使用者先確認，因為會動 spec / decision-log）。
4. 請使用者：決定 merge 順序（#28 → #32，使用者說 merge 才合）、提供 `FAL_KEY` / `GEMINI_API_KEY`（C1）、並安排 B1-B4 的真人 / 真機測試。
5. 使用者核准後跑 C1（先報價與硬上限），依結果修正模型清單的 aspect / price / 尺寸設定；同時決定 Veo → Omni 的取代（2026-11-17 前）。
6. 之後才跑 C2（ElevenLabs，需 voice id）與 C3（demo 素材，需使用者選 plan 與 cap）。
7. 完成後更新 `docs/STATUS.md`，並在結束前開新 session（依規則：建議新 session，不用 `/clear`）。
