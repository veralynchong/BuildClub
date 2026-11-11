# STATUS

## 2026-11-12：Beta 上線準備（`feat/beta-launch`，PR #59 draft，base `feat/canvas-restore`）

- 一行狀態：Mac mini 上兩個 beta instance 已上線（daphne :8801、collage :8802，各自的 DB／media／預算），launchd 自動重啟，Cloudflare quick tunnel 對外，每天 03:00 備份；匯出修好，長搜尋碰到 tunnel 的 100 秒逾時改成等快取。計畫在 `docs/beta-launch-plan.md`，試用者文件草稿在 claude.ai Doc「Remake Beta — Tester Kit (draft)」。
- Commits：849c843 計畫、4087b4f `BETA_TOTAL_USD` 跨天總上限、8de1042/c9e28b8/460824c/253e0dc `bin/beta-instance.sh`（install/update/status/backup/add-user）、最新一筆 search 逾時修正（TikTok 預設、錯誤文字不再叫人跑 npm run api）。
- 最後驗證：2026-11-12，`bash bin/verify.sh full` GREEN（後端 1249 passed、3 skipped；前端 unit；beta instance script）；tsc、eslint、build 通過。live：兩個 tunnel 從外部回 200；kill 後端 launchd 幾秒內拉回；備份 `pragma integrity_check` ok；兩邊 API 匯出成功（daphne 17.5 秒、collage 3 秒，1080x1920，有音軌）。E2E（Playwright，經 tunnel）：登入、建立 client、搜尋、企劃、storyboard、上傳、剪輯 PASS；兩個 instance 資料互相看不到 PASS；登出、密碼錯誤 PASS；https 下 Secure cookie 正常。截圖在 session scratchpad 的 `beta-e2e/`。花費：daphne US$0.55、collage US$0.16。
- 踩到的坑：
  - launchd 啟動的程式讀 `~/Desktop` 底下的 venv 會被 macOS TCC 擋住，uvicorn 卡在啟動、log 是空的。預設 venv 改成 lunch worktree 的 `.venv`（之後可考慮做一個 `~/beta` 專用 venv）。
  - 沒有任何帳號時，backend 不需要登入就能進。`install` 和 `status` 現在會印 WARNING。兩個 instance 都已經開了 `team+<name>@remake.test`。
  - 匯出需要 `package-lock.json`（render-reel.mjs 用它算 bundle key），已經改成會複製。
- 已知缺口：
  - 搜尋逾時的修正只有 unit test，還沒用真的新搜尋（約 US$0.45）走過 tunnel。
  - 畫布上付費模型的提示寫「Configure its account before running.」，試用者沒辦法照做；畫布歸剪輯 agent，這次沒改。
  - Assistant「Preview plan」、「Write new ways to start」仍會花 Claude 的錢（每次約 US$0.01），有總上限擋著。
  - 兩個 instance 裡留著 E2E 的測試資料（Daphne Only Bakery、Collage Club Only），寄出前要清空 state 重開。
  - quick tunnel 的網址只要 cloudflared 重啟就會變；沒有測過 mini 真的重開機。
- 下一步：使用者給試用者 email、決定要不要買網域；週末把剪輯 agent 的修正併進來（`beta-instance.sh update`），清掉測試資料、開正式帳號，週一寄出。

## 2026-11-12：介面固定比例（option B，`feat/canvas-restore`）

- 一行狀態：視窗縮放時字級、按鈕、padding、側欄與面板寬度都維持固定 px，只有中間區（主欄、畫布視窗、剪輯器預覽與時間軸）吸收多出或不足的空間；視窗窄於約 1280 時頁面橫向捲動，不再重排。已 push，未合併。
- Commit：c4860e7（14 個 CSS 檔）。
- 原本會隨視窗變的：`.main`、Plan、規劃板的左右 padding（3vw）；h1/h2 與多個標題的 `clamp(…vw…)`（1100 寬時變小）；Research 表格（容器 1000px 門檻，1280 寬是 4 欄、1440 是 5 欄）；Home 卡片格（960px 門檻，6 欄 vs 12 欄）；Brief／Add client／Approvals 的 1000–1100px 斷點；剪輯器時間軸在內容超出寬度時多出捲軸，高度 240→255。畫布（工具列、header、History）本來就固定，沒改。
- 做法：`.shell` 加 `min-width: 1264px`（1280 減 16px 傳統捲軸）；vw 換成桌面 px 值；刪掉上述桌面斷點；Home/Research 容器門檻降到 900；Plan 底部操作列改用固定 264px 側欄寬；時間軸 `overflow-x: scroll` 永遠保留捲軸。
- 最後驗證：2026-11-12，`bash bin/verify.sh full` GREEN（後端 1242 passed、3 skipped；前端 unit PASS）；tsc、eslint、build 通過。:8797（沒重啟，dist 同步到暫存目錄）在 Home、Research、Plans、Video canvas（含 History）、剪輯器以 1280x720、1440x900、1920x1080、1100x800 比對每個元素的 font-size/padding/gap/欄數：0 差異；剪輯器頂列 40、transport 40、時間軸 255、軌道 28/28/80/30/40、左欄 248、inspector 384、片段條 78px 在四種尺寸都相同，預覽維持 9:16 隨高度縮放。截圖與 measurements.json 在 session scratchpad 的 `fixed-scale/`。
- 已知缺口：
  - 窄於 861px 時舊的手機版斷點（側欄抽屜等）仍會觸發；1100 寬時 fixed 定位的元素（Plan 底部操作列、toast）跟著視窗而不是 1264 寬的頁面。
  - Landing、Login、Portal、shared review 頁面不在 `.shell` 內，仍是原本的響應式。
  - 剪輯器在 1100x800 會同時有橫向頁面捲軸，時間軸捲軸固定顯示（macOS 隱藏式捲軸看不到差別）。
- 下一步：使用者在自己的瀏覽器拉視窗看過後決定是否合併。

## 2026-11-12：Canvas 接回剪輯器分支（`feat/canvas-restore`，疊在 `feat/editor-timeline`）

- 一行狀態：側欄「Video canvas」（展開側欄與收合圖示列）重新打開自由畫布 CanvasScreen（經 canvas chooser；只有一個核准企劃時直接開），規劃板仍可從 Plan 頁進入；Channel 仍不在選單。freeform canvas WIP 與 demo-day 11/07 版本都已併入；已 push，draft PR base `feat/editor-timeline`，未合併。
- Commits：d2bbc08（側欄指向 'canvas'）、e698bcd（cherry-pick 63f3dd5：canvas/後端/測試檔在本分支已完全相同（02c5f99、2c069a8 已帶入），所以是空 commit；ResultsScreen 與 editor.css 保留本分支；snapshot 裡的 bin/__pycache__ .pyc 沒帶）、f1b9eb5（merge `chore/demo-day-1107-snapshot`）。
- 衝突處理：Sidebar/App 兩邊都已改成 'canvas'，保留本分支註解；EditorPanel/Timeline/editor.css 保留新剪輯器，只移植導覽需要的 `guideExport`/`onGuideState` 和較大的匯出預覽，demo-day 的片段「進場動畫」和時間軸縮圖沒移植；STATUS.md 重排讓 11/12 段落在最上面。後端照 demo-day 合併（guided_demo、analyze max_retries=0、REMOTION_CACHE_DIR）。
- 最後驗證：2026-11-12，`bash bin/verify.sh full` GREEN（後端 1242 passed、3 skipped；前端 unit 802 pass）；tsc、eslint、build 通過。:8797 零花費後端（重啟並重新 seed 3 個 take＋音樂）1440x900：側欄 Video canvas → 自由畫布（工具列、Run all/Assistant/History/Review link、模型/比例/尺寸/數量控制、History 錢包面板）→ 新增 Editor & output 節點 → Open editor → 淺色剪輯器、Fill in shot order、Transcript。`?guided=tofu` 在 :8797 走到 Canvas 5/6 會出現「The screen could not open」，因為六鏡剪輯器要 guided 後端；改用 `bin/guided-demo.py --port 8996`（generationEnabled false）完整走完 1/7→7/7，進新剪輯器、本機匯出成片。沒有觸發任何付費生成。截圖在 session scratchpad 的 `canvas-restore/`。
- 已知缺口：
  - 一般 isolated backend 不提供 `/api/guided/sessions/*`，導覽的剪輯器步驟必須用 `bin/guided-demo.py` 開。
  - 導覽六鏡在新剪輯器的影片條沒有縮圖條（新時間軸的縮圖來自 take 分析，prepared 素材沒有；demo-day 的縮圖做法沒移植）。
  - docs/test-log.md 的 demo-day 段落合併後排在檔頭前面，沒整理。
- 下一步：使用者看過畫布與導覽後決定是否合併到 `feat/editor-timeline`。

## 2026-11-12：剪輯器淺色版與一批介面修正（`feat/editor-timeline`）

- 一行狀態：剪輯器預設改成淺色（App 切到深色時才用原本的深色）、側欄拿掉 Channel、修掉 Shots 列重疊和預覽左上角的「1.00」、字幕條多顯示字；已 push，未開 PR、未合併。
- Commits：459d20e（側欄與收合圖示列移除 Channel；`channel` 畫面與 ChannelScreen 保留，沒有其他地方連過去）、4560b0a（剪輯器）。
- 做法：
  - 範圍 class 由 `.cv-ed-dark` 改名 `.cv-ed-pro`。顏色全改成 `--ed-*` / `--tr-*` token，預設淺色（Remake 中性灰、藍 #1a33f2、Inter/Geist Mono）；`:root[data-theme="dark"]` 或系統深色時換回原深色值。預覽舞台用比面板深一階的淺灰 #e8e8ee，讓黑底 9:16 畫面跳出來。軌道條改成淡底＋深色邊＋深色字（影片紫、字幕琥珀棕、文字黃、配音藍、音樂綠），波形和 AI 標記（琥珀/紅斜線）、播放頭紅線在淺色上都清楚。
  - 「1.00」不是我們畫的：是使用者 Brave 裡的 Video Speed Controller 擴充功能，會在每個 `<video>` 左上角放速度徽章（縮圖只有 26px 寬，徽章蓋到「9.2s · Ready」）。縮圖 video 加 `loop`（VSC 會略過 loop+muted 的靜態影片），剪輯器內 `vsc-controller` 一律隱藏（transport 已有自己的速度選單）。
  - 字幕條：字幕/文字條左右留白 6→4px；鎖定的原聲字幕 tooltip 也帶全文；剪輯器開啟時時間軸自動 Fit 一次，短片用滿寬度。放大後全文顯示。
  - 右側分頁改依標籤寬度分配，「AI suggestions」不再被截成「AI sugg…」。
- 最後驗證：2026-11-12，`bash bin/verify.sh full` GREEN（後端 1224 passed、3 skipped；前端 unit PASS）；tsc、eslint、build 通過。:8797 零花費後端（沒重啟，只把新 dist 同步到它的暫存目錄）用 1440x900、1280x800 看過淺色、深色、Transcript、選取字幕條、放大後字幕全文；截圖在 session scratchpad 的 `fixes1/`。
- 已知缺口：
  - 使用者的瀏覽器也裝了 Dark Reader，可能把淺色剪輯器反轉；VSC 的快捷鍵（如 S、D）也可能和剪輯器的 S 分割衝突，這是擴充功能端的設定。
  - 預設縮放下 1 秒左右的字幕條仍會出現「…」（寬度只有 60–80px），全文在 tooltip。
  - 音樂和配音軌在這次種子資料裡是空的，淺色下的音樂波形只檢查了 CSS，沒看到實際畫面。
  - 舊的瀏覽器分頁要重新整理才會拿到新 index.html（:8797 的 index 會被快取）。
- 下一步：使用者看過淺色版後決定是否開 PR（base `feat/editor-real-footage`）。

## 2026-11-12：剪輯器 stage C，文字稿視圖（`feat/editor-timeline`）

- 一行狀態：左側多了「Transcript」分頁，點字跳播放頭、播放時高亮目前的字並自動捲動、選字按 Delete 就剪掉那段（可 ⌘Z）、停頓顯示成「(0.8s)」小膠囊也可刪、雙擊改字會同步改「從原聲產生」的字幕；原聲字幕改用真正的逐字時間。已 push 到 `feat/editor-timeline`，未開 PR、未合併。
- Commits：52890c8（後端：`timeline_captions` 每行字幕多帶 `words`（時間軸秒數＋take 字的 key `<take>:<ms>`）；`check_project` 驗證 `words` 和新的 `transcriptFixes`；2 個測試）、f68e15e（前端：`transcript.ts` 純邏輯＋12 個測試、`Transcript.tsx`、EditorPanel 分頁、字幕逐字時間）。
- 做法：
  - 字來自 take 分析結果（whisper 逐字），每個片段一組，依片段的 in/out 換算到時間軸；字的中點在修剪範圍外就不顯示（不做刪除線）。贅詞用黃色標出（和後端同一份清單）。字與字之間 ≥0.5 秒的停頓顯示成膠囊，片段頭尾也算。
  - 刪除：每個片段算出一段要剪的 take 範圍，走和 AI 清剪相同的 `suggest/keeps` + `replaceWithRanges`（被 4 格空檔合起來時改用 1 格再試）；整段都選到就移除片段；跨片段一起剪，算一步復原（有名稱的步驟，所以 AI 分頁的「復原上一個 AI 修改」也會出現）。刪字時往兩邊停頓多吃最多 0.15 秒，讓保留的空氣來自停頓而不是被刪的字。
  - 改字：存在專案的 `transcriptFixes`（key 對文字，時間不變）。字幕已產生時直接改對應那行；還沒產生時先存著，之後按「從原聲產生」或一鍵初剪時自動套上。字幕那行如果被手動改過，就只在找得到原字的地方替換。
  - 字幕時間：字幕行的文字仍等於它的字時，每個字用自己的時間顯示；手動改過的行或舊資料（沒有 `words`）退回按字寬分配。
- 最後驗證：2026-11-12，`bash bin/verify.sh full` GREEN（後端 1224 passed、3 skipped；前端 unit 687 pass）；tsc、eslint、build 通過。在 :8797 零花費後端（重啟並重新 seed 3 個 take 和音樂）用 1440x900 走過：空狀態、點字跳到 00:06.20、播放時高亮從 everyone→today→I→showing…、選「Um. (0.8s) First,」刪除後片段一分為二、長度 19.02→17.16、⌘Z 還原、刪 2.4 秒停頓、先改「tea.」→「chai.」再產生原聲字幕（套上了）、字幕產生後改「Hello」→「Hi」預覽字幕即時變成「Hi everyone,」。截圖在 session scratchpad 的 `stageC/`。
- 已知缺口：
  - 舊的原聲字幕（stage C 前產生的）沒有 `words`，改字不會同步、時間仍按字寬；按「Make them again」即可。
  - 剛開剪輯器、播放器還在初始化時點字，有一次沒跳過去（之後都正常），沒追到原因。
  - 文字稿刪除會出現在 AI 分頁的「復原上一個 AI 修改」裡。
  - 贅詞「like」的判斷和後端一樣只看逗號。
  - 中文逐字（whisper 一個詞多個字）只在單元測試層級處理，沒用真人中文素材測過。
- 下一步：使用者看過介面後決定是否開 PR（base `feat/editor-real-footage`）。

## 2026-11-12：剪輯器 stage B，時間軸上的 AI 標記、縮圖條與波形（`feat/editor-timeline`）

- 一行狀態：影片條上顯示 AI 清剪標記（可保留/刪除、可復原），初剪理由變成刻度尺上的圖釘，片段有縮圖條和紫色波形，音樂軌有綠色波形；已 push 到 `feat/editor-timeline`，未開 PR、未合併。
- Commits：09d1f91（後端：分析結果多存 audio peaks，每秒 50 格、最多 6000 格；takes 清單帶 `updatedAt`）、2fb023b（前端：標記、圖釘、縮圖條、波形、工具列開關與數量徽章，`marks.ts` 純邏輯 + 8 個測試）。
- 做法：每個 take 只抓一次（以 plan、take、分析時間為 key）整段 take 的清剪建議和分析結果，再依各片段的 in/out 換算位置；被片段邊緣切掉、只剩不到 10 格的部分視為已套用剪輯留下的空檔，不再顯示。單一標記「刪除」走和 AI 分頁相同的 keeps 流程，算一步復原；太短的贅詞在預設 4 格空檔下會被合併，就改用 1 格空檔再試。音樂波形在瀏覽器用 Web Audio 解碼（不經後端），以檔案本身最大值正規化。
- 最後驗證：2026-11-12，`bash bin/verify.sh full` GREEN（後端 1222 passed、3 skipped；前端 unit 675 pass）；tsc、eslint、build 通過。在 :8797 零花費後端（重啟後重新 seed，3 個 take 和一首合成音樂）用 1440x900 走過：標記顯示、popover 保留/刪除、刪除後 ⌘Z、開關標記、AI 分頁全部套用後標記消失、初剪圖釘與說明、修剪片段後縮圖條與波形跟著移動、retry 後 `updatedAt` 更新。截圖在 session scratchpad 的 `stageB/`。
- 已知缺口：
  - 圖釘位置是初剪當下的時間，之後再剪輯不會跟著移動；同一個鏡頭的理由多半疊在同一根圖釘上。
  - 「保留」只在這次開啟有效，不存檔。
  - 整段 take 抓建議，和 AI 分頁依片段範圍抓的結果在片段邊緣的短靜音上可能略有不同。
  - 波形只看片段音量和靜音，不看軌道靜音（軌道靜音本來就只影響預覽）。
- 下一步：使用者看過介面後決定是否開 PR（base `feat/editor-real-footage`），再做 stage C（文字稿視圖）。

## 2026-11-12：剪輯器改版 stage A，專業深色介面與多軌時間軸（`feat/editor-timeline`）

- 一行狀態：剪輯器改成類 Remotion Studio 的深色介面，多軌時間軸、播放列、快捷鍵、多層復原都做好了，已 push 到 `feat/editor-timeline`（疊在 `feat/editor-real-footage` / PR #56 上），尚未開 PR、未合併。計畫在 `docs/` 的時間軸研究與計畫（9c9e5c9）。
- Commits：f48144e（lanes/snap/undo 純邏輯 + 14 個測試）、b6b3aff（深色介面、時間軸、transport、快捷鍵）。
- 內容：頂列（返回、麵包屑、復原/重做、Export）；左側 Shots 分頁；中間 Player + 安全區；右側 inspector 圖示分頁跟著選取切換；transport（Fit、速度、循環、靜音、逐格、吸附、全螢幕、縮放）；時間軸有 mm:ss.ff 時間碼、刻度尺、可拖的紅色播放頭、軌道標頭眼睛/喇叭；五軌 Text / Captions / Video / Voiceover / Music（含避讓區段）；文字和原聲字幕可拖、可修剪；吸附（Shift+M）；快捷鍵 Space、S、Delete、←/→、Shift+←/→、Alt+←/→、Home/End、⌘Z / ⇧⌘Z。「Clip sound」移到 Clips 分頁的 Sound 群組。
- 最後驗證：2026-11-12，`bash bin/verify.sh full` GREEN（後端 1220 passed、3 skipped；前端 unit 667 pass）；tsc、eslint、build 都通過。在 :8797 零花費後端用 1440x900 瀏覽器走過選取、拖曳吸附、分割、刪除、復原/重做、播放、匯出選單。
- 已知缺口：
  - 軌道隱藏/靜音只影響預覽，不存檔、不影響匯出；Video 軌隱藏時聲音還在。
  - 由台詞或配音產生的字幕只能選取，不能拖。配音條只能移動，不能修剪。
  - 沒做 in/out 標記；Fit 只縮放時間軸，不影響預覽。
  - 左側 Transcript 分頁（stage C）、AI 標記和縮圖條/波形（stage B）都還沒做。
  - 500ms 內的連續修改合成一步復原。
  - 舊的未使用字串（editor.audio.title、moveLeft/Right、keys、total）還留在 strings 檔。
- 下一步：使用者看過介面後決定是否開 PR（base `feat/editor-real-footage`），再做 stage B。

## 2026-11-12：剪輯器 AI 自動剪輯 Phase 0–4（draft PR #56）

- 一行狀態：剪輯器的 AI 自動剪輯 Phase 0–4 都做完了，驗證全綠，已 push 到 `feat/editor-real-footage`，draft PR veralynchong/BuildClub#56 尚未合併。計畫在 `docs/ai-edit-plan.md`，研究報告在 `research/reports/AI 短影音自動剪輯調查.md`（Artifact https://claude.ai/artifact/G3B2ojehfKsu9o57rLD1aH）。
- 範圍：只改剪輯器和它需要的後端。Canvas、規劃板、Plan 頁版面、AI 生成都沒動（使用者 2026-11-11 指示）。
- Commits：
  - 83596a6：Phase 0，在剪輯器裡上傳素材、HEVC/HDR 轉檔、Fit/Fill
  - f76f2af：Phase 1，背景分析素材（whisper 逐字、silencedetect、scdet、loudnorm、縮圖）
  - 912a45a：Phase 2，AI 建議（清剪、腳本對位、take 排名、從原聲產生字幕）
  - ccd29bd：Phase 3，一鍵初剪（附剪輯理由）、音樂避讓、-14 LUFS、平台預設、安全區、EDL/OTIO
  - 2999915：Phase 4，hook 評估、字幕改寫、貼文文案、把客戶留言轉成任務；用 Claude 便宜模型，沒有 key 時退回規則版
- 最後驗證：2026-11-12，`bash bin/verify.sh full` GREEN（1220 passed、3 skipped，前端 unit 通過）；tsc、lint、build 都通過。每個 Phase 都在隔離的零花費後端 :8797 用 1440 寬瀏覽器走過一遍，截圖在 session scratchpad 的 phase0–4。
- 已知問題：
  - Canvas 自己存一份 takes 清單，所以從剪輯器上傳的素材，Canvas 要重新整理才看得到。
  - AI 復原只有一層，按下去也會退掉之後的手動修改。
  - 從原聲產生的字幕，時間是按字數比例分配的，不是每個字真正的發音時間。
  - 安全區的百分比是估計值。
  - EDL 只有剪輯點。
  - 客戶留言是掛在 plan 的參考影片上，不是掛在成片上。
  - 規則版的任務類型一律是 "other"。
  - 所有語音測試都用 macOS `say` 合成，還沒用真人素材測過。
  - Phase 4 從沒真的呼叫過 Claude：這台機器的 shell 沒有 ANTHROPIC_API_KEY，花費 US$0。
- 下一步：
  1. 和 Veralyn 一起看 PR #56 再決定要不要合併。
  2. 用真人拍的素材（最好有澳洲口音）測字幕和清剪。
  3. 有 key 時跑一次真的冒煙測試：`cd pivots/02-content/app/trend-finder && RUN_LIVE_LLM=1 backend/.venv/bin/python -m pytest backend/tests/test_editor_ai_live.py -s`（4 次 Haiku 呼叫，估計低於 US$0.01）。
  4. 上線前確認 Remotion 授權：團隊超過 3 人就要買 Automators，每月 US$100 起。

## 2026-11-07：Demo儲存額度修復，已交Claude接續驗證與開站

- 分支fix/demo-storage-quota，未commit/push；原先dirty與媒體保留。本輪修改app/src/lib/guided/runtime.ts、app/unit/guidedRuntime.test.mjs（app指pivots/02-content/app/trend-finder），及本STATUS。
- 自有Playwright隔離context連續reload第29次重現「prepared demo could not start」；localStorage約5203963字元，180000字元probe拋QuotaExceededError。所有自有頁籤已關閉，無讀取使用者Brave資料；MacBook Brave禁用AppleScript JS，未更動設定。
- scopedStorage遇到QuotaExceededError時複製當場namespace到記憶體並繼續，不刪一般帳號／舊場次；其他錯誤照常拋出。新增測試涵蓋local/session額度、讀寫／enumeration／clear／既有資料不變與SecurityError不被吞。
- 起點與修改後bash bin/verify.sh full均GREEN；最後1127passed2skipped35.37s、frontend PASS；runtime18/18；npm run lint與npm run build通過（既有chunk size警告）；git diff --check通過。dist已build，但尚未部署到audience-native/dist、尚未做修復後真實額度滿載UI驗收，因此未宣稱修好。
- 先前18980反向轉接已加入runtime外部keep-tunnel.py（audience-native-20261107目錄），terminal term_253d162d-3b65-4bd1-963b-adc8724cdc59；SSH退出後3秒重試，獨立ControlMaster=no/ControlPath=none。未做強制斷線重連測試。Claude另一session後續收到使用者「全部服務關掉」，已停服務；接手者需重新檢查，最新要求是交Claude開Demo。
- 下一步：Claude接手，確認服務／轉接現況；部署並hash核對已build的dist（保留舊chunks、index最後原子替換），用滿額度隔離瀏覽器驗證首頁、Save→Research→Canvas雙版本→完整Editor、reload重設及普通資料保留；從MacBook驗證後開使用者要的入口。使用者後端須保持供觀眾試用，無付費API／依賴安裝／main合併。

## 2026-11-07：已重新打開Demo與觀眾試用網站（服務維持）

- 使用者要求在MacBook打開Demo、一般試用網站及後端，供觀眾操作。mini8980後端與網站原已HTTP200，未重啟／清除資料；MacBook原18980轉接失效（curl連線拒絕），已恢復反向SSH轉接。
- 新Orca tunnel terminal：term_6e1fdbcf-c2ab-4d5e-97ea-5a25f23028d5，pid12781，ssh -N -R 127.0.0.1:18980:127.0.0.1:8980 macbook，ExitOnForwardFailure、ServerAliveInterval30、CountMax3。其餘服務未碰，使用者要求保留服務與此轉接。
- 親從MacBook經SSH執行curl：18980/api/health HTTP200；18980/?guided=tofu HTTP200。已用open-on-macbook helper成功開啟Demo與普通可登入試用入口18980/，兩次exit0。帳密不寫入repo。本輪未改產品程式／依賴／帳號資料，未commit/push；僅更新本STATUS記錄服務handle與驗證。

## 2026-11-07：Plan a shoot直接進Canvas，移除重複Next（本機未提交）

- 使用者要求4/7 Plan a shoot步驟不再顯示Next；已隱藏該步Next，Plan a shoot按鈕直接要求canvas/shoot/shots，不需第二次點擊。說明文案同步改為點Plan a shoot進入，Previous與其餘步驟Next保留。
- 修改app相對src/App.tsx、src/components/demo/GuidedTour.tsx、src/lib/guided/tour.ts、unit/guidedCanvasTour.test.mjs，另更新docs/STATUS.md與docs/test-log.md。分支fix/demo-direct-canvas，先前dirty完整保留；無新增／刪除檔案、backend／資料／依賴／付費變更，未commit/push/main。
- 驗證：guidedCanvasTour11/11PASS，確認route無Next且按鈕發出shoot動作。full1127passed2skipped35.81s／frontendPASS／verify GREEN；lint零warning、TypeScript/build與git diff --check通過。實際native1440 fresh/full21共14點PASS，直接按Plan進Canvas、雙圖／Editor，以及刷新回初始首頁／零生成／edit baseline／普通資料保留皆通過，errors=[]、ownedBrowserClosed=true。
- 已更新MacBook18980前端，逐檔hash校對，舊chunks保留、index最後原子替換；raw indexSHA7d8338d18bb2c2bb236f2aeb500922275e7bb3ca6e9331a0fc9c52b5ecefce20，無backend重啟。證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-direct-canvas-tn39yg_8/`。刷新原頁即可從頭示範。

## 2026-11-07：Demo刷新回起始首頁並重設（本機未提交）

- 使用者要求網站重新整理時回最初首頁、東西reset；本輪範圍為目前guided Demo，普通登入帳號資料保留。本段取代前面「reload保留Demo進度」的舊驗收。
- Runtime檢查PerformanceNavigationTiming.type；reload時建立全新guideSession及scoped bootstrap，回初始搜尋首頁／guide search，儲存旗標、Canvas輸出與選用／剪輯皆恢復預備初始值。full21選項保留。非reload載入既有URL仍依原token，單一document重複install仍只安裝一次。
- 不刪除普通帳號storage／DB，也不刪除舊Demo的獨立namespace或後端project；畫面使用新場次，因此舊Demo改編不會混入新示範。Restart guide仍可用。只有guided參數啟用此行為，普通網址刷新不會被改成Demo。
- 修改app相對src/lib/guided/runtime.ts、unit/guidedRuntime.test.mjs，另更新docs/STATUS.md與docs/test-log.md。新分支fix/demo-refresh-reset，原dirty完整保留，無新增／刪除產品檔案、無backend／依賴／付費變更，未commit/push/main。
- 驗證：runtime16/16PASS，涵蓋fresh/full namespace、首頁bootstrap、零generations、新token、舊資料及native資料保留、同document不重裝。full1127passed2skipped33.84s／frontendPASS／verify GREEN；lint零warning、TypeScript/build與git diff --check通過。
- 實際native1440 fresh/full21共12操作點PASS：先真Save、兩張圖片、選用、進Editor，另透過own session API保存文字改編；reload後回搜尋首頁、未儲存、Canvas僅六shot無輸出、新edit baseline六鏡無改編文字；第二次reload再換新token；舊own project文字保留、native sentinel storage保留、普通網址刷新不進Demo。親看首頁截圖，errors=[]、ownedBrowserClosed=true；使用者backend/轉接保持。
- 已更新MacBook18980前端，逐檔hash校對、舊chunks保留、index最後原子替換。raw indexSHA780e6e95e7198d702b7e7d47f8fb730e35a4d35ea35fe9c1ce58d4776d212399，無backend重啟。證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-refresh-reset-n7i0f0ng/`（results.json與兩preset首頁截圖）。

## 2026-11-07：儲存先選Project，完成直接Research（本機未提交）

- 最新使用者決定：右上Save或未儲存時Next先開原SaveToVideo視窗，詢問存入哪個Project；選好才保存，完成直接進Research。取消保留原頁未儲存狀態，不先顯示Saved。已儲存結果頁按Next則直接Research，不重複選擇。
- 移除導覽的Saved確認／Understand the idea步驟；新步序search→results→research→script→route→canvas→edit→result，仍7主階段。舊save/breakdown儲存進度遷移到Research，保留active及其他資料。分析仍能手動開啟，drawer或選擇視窗打開時不顯示導覽Next。
- pendingSave以guided旗標區分新流程，原native SaveToVideo onPick分支不變；只在選擇後按實際slotId更新既有指定參考列（Project或Unsorted），不存在才新增。保留其他列／plan／剪輯，無新增重複列；取消不改saved marker或slot。Research仍全收合，需點開所選Project查看。
- 修改app相對src/App.tsx、src/lib/guided/tour.ts、unit/guidedTour.test.mjs、unit/guidedCanvasTour.test.mjs，另更新docs/STATUS.md與docs/test-log.md。無新增／刪除檔案、無後端／DB／依賴／素材變更；原dirty保留，未commit/push/main。
- 驗證：相關22單元檢查PASS；full1127passed2skipped35.03s／frontendPASS／verify GREEN；lint零warning、TypeScript/build與git diff --check通過。獨立readonly Sol/high複核未見阻擋，親跑guidedTour12/12，並以App實際函式測試開啟／取消／Project／Unsorted，非committed ACCEPT。
- 實際native1440 fresh由藍色Save開窗、full21由Next開窗，共18點PASS。檢查取消仍unsaved、row數未變；fresh選Project1、full21選Project2，保存slot吻合並直接Research，無Saved確認或breakdown；reload／Previous不變，已保存Next不重開dialog，所有Project收合且所選Project包含參考；圖片參數／全Next雙版本／六鏡動畫保持。ownedBrowserClosed=true、errors=[]，親看chooser-visible.png確認實際選擇視窗。初始動畫尚未顯示的早期截圖不拿來當視覺驗證。
- 已更新MacBook18980前端，逐檔hash校對、舊chunks保留、index最後原子替換，raw indexSHAf8e5c63d8bad2415064e24e3563adf8089f8df9a1e100de79a629af42ae9ce17；使用者backend/帳號/轉接維持，無重啟。證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-save-chooser-rg1mbu43/`。刷新原頁即可；從頭示範使用Restart guide。

## 2026-11-07：改用縮圖右上角Save，移除下方兩顆按鈕（本機未提交）

- 使用者確認儲存入口應是影片縮圖右上角的原有藍色pill；已移除guided推薦卡片下方另加的Save／Saved to Project，以及Open plan · Approved，保留See why it worked。原生非guided Open plan功能不變。
- 新Demo在search/results預設未儲存，主推薦及同影片網格都顯示＋Save、不顯示✓Video1；點右上pill或Next才走同一個save步驟並存入既有Project，顯示✓Video1與原有Saved toast。不走toggle unsave，不新增重複列。保存後reload／Previous仍保留已儲存。
- 使用scoped guided-reference-saved.v1區分準備好的fixture資料與本次使用者儲存動作；未儲存時Research畫面不列出該參考，不刪除既有plan／剪輯／fixture原始資料。舊save及其後進度遷移為已儲存以保留既有使用；Restart guide會建立新session，從未儲存開始。正常native資料與儲存邏輯不改。
- 修改app相對src/App.tsx、src/components/ResultsScreen.tsx、src/lib/guided/tour.ts、unit/guidedTour.test.mjs，另更新docs/STATUS.md與docs/test-log.md。無新增／刪除檔案、無後端／素材／依賴更動；之前dirty完整保留，未commit/push/main。
- 驗證：新初始化狀態回歸11/11；full1127passed2skipped35.15s／frontendPASS／verify GREEN；lint零warning、TypeScript/build及git diff --check通過。實際native1440 fresh以藍色pill保存、full21以Next保存，共16操作點PASS，確認起點aria-pressed=false／無✓、下方無primary按鈕；保存後true／Video1、reload／Previous保留、row數不變、Research收合、兩版圖片與參數、全Next及六鏡動畫皆正常。ownedBrowserClosed=true、errors=[]。證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-save-pill-fd_cp5ut/`。
- 已更新MacBook18980前端，逐檔hash與index最後原子替換，保留舊chunks；raw indexSHAfd8c977e47724c27ae8411a571608339b85809c6c6725ddae992d27b041179cf。無backend重啟、DB未清理；原頁刷新移除兩顆多餘按鈕，若要演示未儲存起點可按Restart guide。

## 2026-11-07：補回圖片卡片參數列（本機未提交）

- 使用者指出原參數列不應隨「乾淨版」隱藏；已補回模型、比例9:16、解析度1K、數量。Prompt仍在獨立左側卡片顯示與highlight，不重複塞入可編輯Prompt表單；Next自動產生／選用／六鏡動畫不變，無另加Run或Use in Edit。圖片卡不提供影片秒數，既有影片節點的duration控制保持。Demo只列實際可用的既有預備model，未新增provider呼叫或費用。
- 修改src/components/canvas/FreeformNode.tsx（NodeSettings支援hidePrompt，乾淨示範仍顯示參數），另更新既有docs/STATUS.md與docs/test-log.md；無新增／刪除檔案、無依賴／後端變更。前一輪其餘dirty保留，未commit/push/main。
- 親跑full：1127passed2skipped37.43s／frontendPASS／verify GREEN；lint零warning、TypeScript/build與git diff --check通過。實際native1440瀏覽器8項PASS，檢查1K／9:16欄位可見且無重複Prompt表單、全Next兩版圖片、Save不增加列、Research收合、Previous/reload與完整六鏡入軌動畫；已親看截圖，導覽不遮圖片/Prompt，ownedBrowserClosed=true。
- 已更新18980前端、保留backend/DB與舊chunks，raw indexSHAe9927c6cebe222f0f2c52c4367797afa63a81b2b5af8c6d6a3f67580fb5ea3eb，使用者刷新原頁即可。證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-restored-controls-h2s53xe2/`。

## 2026-11-07：Save to Project、Research收合與乾淨Next圖片示範（本機未提交）

- 使用者新決定取代上一輪影片卡片操作：結果頁能Save進Project；進Research時所有Project預設收合、由使用者點開；Canvas回乾淨圖片版，Next依序顯示Prompt、圖片1、修改Prompt並highlight、圖片2、選用，再以原有動畫進完整六鏡Editor。不需另按Run／Use in Edit；正常匯出控制仍保留。
- 結果頁新增Save to Project／Saved to Project按鈕與獨立save導覽確認，仍屬主進度1/7。Next會確保參考列存入既有prepared project，保留原分析→Research流程。優先更新固定fixture row，其次同client/video既有row，完全無既有列才新增；沒有用toggle造成unsave，也沒有新增同影片列。既有withPlanRows可能產生不同ID的歷史derived row，本輪保留，不清理其他資料。Save與reload前後row數相同，Project歸屬保存。
- Research移除guided預設全展開的特例，與原生頁一樣預設false；使用者點擊才能展開。搜尋匹配與明確focus行為保留，導覽進Research不設定自動focus。正常native既有預設即收合，未改其功能。
- 拍攝導覽六步：shots→prompt-s1→image-s1→rewrite-s1→image-s1-v2→versions。guideFocus的demoAction先完成實際保存／免費預備生成／選用，再發佈focus完成；相同畫布focus也需demoAction相符。Next進route會選Plan a shoot，不需額外選路線。
- Prompt卡片以唯讀文字及highlight呈現，圖片卡片保留版本箭頭及該版本保存的Prompt；隱藏本示範第一鏡的model／duration／樣本按鈕／Run／Use in Edit／多選Delete工具列，並在步驟中隱藏Shot卡以免露在上緣。Previous回shots可重新顯示；不刪除任何節點或歷史素材。導覽改左下且實測不蓋Prompt／圖片。原生與AI路線原有操作保留。
- 預備圖片1是S01原片參考、圖片2是既有AI開場首圖，依各自範例Prompt固定映射，不靠按鈕次數替換；不呼叫付費生成，quote必須total0才繼續。前一輪可播放版本、media alias與編輯保存保留供舊session使用，本輪僅以圖片示範。選用真正保存到第一鏡，其餘五鏡及文字不變；Editor保留完整315幀／10.5秒六鏡分鏡影片。
- 自動步驟會重用符合node/kind/model/Prompt/URL的完成結果，Previous／reload不重複生成。獨立review找到P2：另一個Prompt的pending可能被當作成功；已改先等待pending、refresh後重找／生成，再核對全部身份與URL。readonly不執行action。以實際action函式＋prepared API重現pending V2→image-1回歸、重試、改Prompt不生成、選用來源、readonly guard，5/5PASS；reviewer親跑5/5確認P2解除。HEAD85c9243 dirty provisional review，非committed ACCEPT。
- 驗證：起點full1127passed2skipped34.17s／frontendPASS／GREEN；最後full1127passed2skipped37.69s／frontendPASS／GREEN。TypeScript/build與lint零warning、git diff --check通過。相關36項前端檢查通過，新增自動action回歸包含在最終full中。
- 自有1440 normal-motion Playwright fresh/full21共18操作點PASS；實際native fresh/full21亦18點PASS，包含只按Next搜尋／Save確認及reload無新增列、Research全收合點擊展開、乾淨Prompt、兩版圖片自動產生、rewrite先保留原圖、Previous/reload不重複、回shots正常、無多選工具列、導覽不遮Prompt/image、選用保存、完整入軌動畫、播放／真匯出／下載、zh-Hant。兩套共四MP4均315幀1080×1920、整支ffmpeg decode PASS；native兩檔SHA83cf6a7bc6cac25c76a09b1d24e169b28e7d1d553269ea5a5853778b6a5e0f32。
- 舊最後比較頁升級會一次回到乾淨Prompt步驟；新shootNextRevision保留新流程，edit/result/inactive不變。舊頁UI fixture PASS，六鏡project未清除。正常帳號表單登入、12欄Script與backend一致、reload重開、清cookie重登入四點PASS，所有自有browser／contexts已關閉，errors=[]。自有8994/8995測試服務關閉；使用者8980/8981服務與MacBook18980轉接依要求保留。
- 僅更新MacBook18980→mini8980前端140檔，hash逐一驗證、保留舊chunks、index最後原子替換。最終raw indexSHAd0836c671f8a9c8eadf6852b441d2e443793941f36fba091a3ac105bb593dc1d，native HTML去meta後吻合。無後端／DB／manifest更動，不須重啟backend；term_d4cd0f2a-a88b-44bb-9124-285c25e93a9b維持。8996/8998不變；原頁刷新即可。
- 分支fix/demo-next-step-flow；先前dirty與媒體全部保留，本輪未commit／push／merge main、無付費／依賴安裝／新文件。證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-next-3fk98j1m/` 與 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-next-native-z2c094s9/`（results、screenshots、export-verification、old-page-results、native-persistence-results）；deployment.json在owned QA目錄。
- 本輪修改檔案（app相對）：src/App.tsx；src/components/ResultsScreen.tsx；src/components/research/ResearchScreen.tsx；src/components/canvas/CanvasScreen.tsx、freeformContext.ts、FreeformNode.tsx；src/components/demo/GuidedTour.tsx；src/lib/guided/contracts.ts、canvasTour.ts、tour.ts、freshSix.ts、shootOpening.ts；src/styles/canvas.css；unit/guidedTour.test.mjs、guidedCanvasTour.test.mjs、sixShotCanvas.test.mjs、guidedCanvasFocus.test.mjs；另更新既有docs/STATUS.md與docs/test-log.md。本輪無新增／刪除產品檔案或素材。

## 2026-11-07：可播放影片與 Prompt 改寫示範（本機未提交）

- 使用者同意：卡片改為可播放影片；修改 Prompt 再 Run 取得不同版本，醒目標示變更文字，左右切換時顯示各版本自己的 Prompt。維持 Plan a shoot、一鏡示範、完整六鏡 Editor 與既有入軌動畫。
- 新增專用 prepared-opening-video 節點 n_six_video_s1；保留舊圖片節點、版本、使用者剪輯及帳號。兩組範例 Prompt 分別對應近景／較寬構圖影片，相同 Prompt 仍映同一素材，不再靠重按次數交替。樣本描述可用按鈕套用或手動輸入；其他描述會明確回覆此預備示範僅支援兩組範例，不假裝執行即時生成。Prompt／quote／canvasVersion檢查仍在，結果保存各自 inputs.prompt。
- 每個版本預覽有真正video controls並可播放，切換版本重置播放器。Prompt輸入框加醒目邊框；改動的構圖描述以底色highlight；預覽下方獨立顯示「此版本使用的Prompt」，編輯下一版草稿不會改寫舊版本紀錄。English／zh-Hant文案均有。無直向版本圖片堆疊。
- 素材來源：既有 fresh-six/ai-s1.mp4（1.4秒42幀、無音訊）。opening-a 為864×1536數位裁近後縮放1080×1920；opening-b保持原構圖，兩者皆可播放的動態影片，並非將圖片偽裝為動態。畫面及manifest明示同一既有AI片的預備構圖版本，無新AI生成、付費0。full-ai-six/ai-s1含壓碎豆腐第二動作，已排除未拿來冒充單一第一鏡。
- fresh/full manifest各追加motion-a/b optionalvariants及對應海報，保留所有既有source/hash與baseline signature；Use in Edit對應真實motion source，只替換第一鏡，其他五鏡與文字不變。兩preset輸出仍315幀／10.5秒六鏡影片；其餘五鏡沿用原分鏡參考。舊shoot步驟遷移至新video步驟；使用者舊頁若停Canvas5/5且無shootVideoRevision，會一次帶回video-s1，新的versions重整不跳回；edit/result/inactive維持。此遷移沒有清除資料。
- 驗證：起點 full1127passed2skipped34.68s／frontendPASS／GREEN；最後 full1127passed2skipped42.89s／frontendPASS／GREEN；TypeScript與build成功、lint零warning、git diff --check通過。獨立one_shot_review（Sol/high）親跑32項與最後migration10項皆全過，未發現阻擋；屬HEAD85c9243 dirty snapshot provisional review，非committed ACCEPT。
- 自有1440/normal-motion Playwright測試fresh/full21各7點共14PASS；真播放兩版、修改Prompt時保留舊版本文字、highlight、左右切換savedPrompt、保存選用、六鏡入軌動畫、重進動畫、reload、成片播放／真匯出／下載、zh-Hant皆通過。自有8994/8995測試服務與browser已關閉。實際native fresh/full21兩namespace亦14PASS，其中fresh親手輸入第二Prompt、full21按範例按鈕，雙向切換時Prompt相符。兩套共四個匯出皆ffprobe315幀1080×1920、ffmpeg整支decode PASS，四者SHA61191ef39cd488d6ee6f2aa4b76cd86dd9223c95744bd7cdaa697bfcec919fd9。
- 另親跑實際舊頁fixture：舊Canvas comparison→video-s1，範例Prompt正確，六鏡project保留，PASS；正常帳號表單登入／12欄Script與backend相等／reload重開／清cookie重登入四點PASS。所有自有contexts/browser已關閉、errors=[]。使用者8980/8981服務與原MacBook18980轉接保留。
- 僅更新MacBook18980→mini8980。前端140檔hash驗證，保留舊chunks，index最後原子替換；raw indexSHA9b373049ea231e6ada9554acbe74685ca91a12141549d6f661c0584f9a7402b6，served native HTML去meta後吻合。自有backend重啟以讀取追加manifest，term_d4cd0f2a-a88b-44bb-9124-285c25e93a9b，pid51919，health200；未清除persistent DB/帳號。8996/8998維持上一版，不宣稱更新了本輪功能。原頁刷新即可使用。
- 分支fix/demo-prompt-video-preview；保留先前dirty，未commit／push／merge main、無依賴安裝。證據：`/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-prompt-video-2nm75fw2/` 與 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-prompt-video-native-ddd5yzp6/`（results、screenshots、export-verification、old-page-results、native-persistence-results）。
- 本輪修改檔案（app相對）：src/lib/guided/freshSix.ts、canvasTour.ts、contracts.ts、tour.ts；src/components/canvas/FreeformNode.tsx；src/components/editor/EditorPanel.tsx；src/lib/strings/freeform.ts；src/styles/canvas.css；unit/freshSix.test.mjs、guidedCanvasTour.test.mjs、guidedTour.test.mjs、sixShotCanvas.test.mjs；public/demo-assets/fresh-six/manifest.json、public/demo-assets/full-ai-six/manifest.json；另更新docs/STATUS.md與docs/test-log.md。新增src/lib/guided/shootOpening.ts，以及public/demo-assets/fresh-six和full-ai-six各自opening-a.mp4、opening-a.png、opening-b.mp4、opening-b.png共8個素材檔。無刪除檔案，舊shoot-s1-v2.mp4不屬本輪新增或更動。

## 2026-11-07：一鏡雙版本示範，完整六鏡 Editor（本機未提交）

- 使用者確認流程：Plan a shoot → 示範開場一鏡 → Run 兩次比較兩個版本 → Use in Edit → 入軌動畫 → 完整六鏡影片。拍攝導覽由14步縮為5步；新導覽只顯示 Plan a shoot 選項，保留已存在 AI session／原生功能。
- 版本在同一節點預覽，移除下方舊版本圖片堆疊與隨版本數增加的排版高度，保留左右箭頭及版本指示。V1 使用原 S01 開場參考；V2 使用既有 AI 開場首圖 fresh-six/ai-s1-parent.png，另做1.4秒／42幀靜態分鏡 MP4。沒有新增 AI 生成、付費或語音。視覺QA淘汰動作不符的 S02 候選，沒有交付錯誤的壓碎豆腐畫面。
- V2 source alias shoot-s1-v2 真正替換第一鏡，保留其他五鏡與既有文字；選用前不改時間軸，左右預覽不等於 Use in Edit。Next 檢查兩個不同 URL 的完成版本與已保存選用來源。Editor 仍315幀／10.5秒六鏡分鏡影片，非實拍。
- 每次明確 Canvas→Editor 進入會重播原有3秒逐鏡入軌動畫；Editor reload 保留剪輯與選用，不重播動畫。尊重 reduced motion。第二版縮圖亦對應真正來源。
- 後端 manifest 新增 optional variants，保留 baseline signature；既有 session 初始化時只補入缺少的 immutable source，不重設project／DB。路徑、hash、重複ID、shot歸屬與既有variant變更仍檢查。親查 native fresh2／full1筆既有shoot session簽章均相容。
- 獨立唯讀 one_shot_review（gpt-6.1-sol/high）提出舊六鏡步驟會重啟已退出導覽的P2；已補遷移，保留active／route／edit/result，retired canvas step映image-s1-v2、過時skip移除。複核無新阻擋，reviewer親跑guidedTour9/9；此為HEAD85c9243之dirty snapshot暫定review，非committed ACCEPT。
- 驗證：起點 full1125passed2skipped／frontendPASS／GREEN；最終程式 full1127passed2skipped42.67s／frontendPASS／GREEN，TypeScript build成功，lint零warning、git diff --check通過。舊測試的六鏡路線預期與AST transition mock已更新。自有1440／normal-motion Playwright實測兩preset共14點PASS，真Run兩次、卡片高度不變、箭頭雙向切換、選用保存、逐鏡動畫、重進動畫、reload、播放、匯出、zh-Hant均檢查；兩個匯出各315幀／1080×1920且整支ffmpeg decode PASS，owned browser與8994/8995測試服務已關閉。
- 部署：僅更新觀眾入口MacBook18980→mini8980，前端132檔hash驗證、index最後原子替換，raw indexSHA a9ab661a838d44ff3bc44c309da8265d7e7b9031e072966cf7e5faeea2a525f4；persistent DB／帳號未清除。自有8980已換terminal term_63762646-3a2f-4c36-860e-f2fd072ed5bd；health200。8996/8998原服務與前端保留，不宣稱已更新本輪短流程。實際native fresh/full21兩namespace亦14點PASS，兩個真匯出各315幀／1080×1920且ffmpeg整支decode PASS；普通帳號表單登入／12欄Script值與後端相等／reload重開／清cookie重登入四點PASS，errors=[]、ownedBrowserClosed=true。已透過open-on-macbook成功開啟MacBook18980新導覽。正常帳號、native服務與轉接依使用者要求保留。
- 分支fix/demo-one-shot-versions，保留此前dirty20檔；本輪不commit／push／merge main。證據：owned QA目錄 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-one-shot-lul3iiv1/`；native QA `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-one-shot-native-7ntnwmr9/`。
- 本輪修改／新增檔案（app下相對路徑）：backend/guided_demo.py、backend/tests/test_guided_demo.py；src/App.tsx、src/components/canvas/CanvasScreen.tsx、src/components/canvas/FreeformNode.tsx、src/components/demo/GuidedTour.tsx、src/components/editor/EditorPanel.tsx、src/lib/guided/canvasTour.ts、src/lib/guided/contracts.ts、src/lib/guided/freshSix.ts、src/lib/guided/tour.ts；unit/freshSix.test.mjs、unit/guidedCanvasFocus.test.mjs、unit/guidedCanvasTour.test.mjs、unit/guidedTour.test.mjs、unit/sixShotCanvas.test.mjs；public/demo-assets/fresh-six/manifest.json、public/demo-assets/full-ai-six/manifest.json，新增兩處同名shoot-s1-v2.mp4；另更新既有docs/STATUS.md與docs/test-log.md。無檔案刪除、無依賴變更。

## 2026-11-07：修正一般網站導覽進 Editor 的 401（本機未提交）

- 使用者截圖 MacBook18980/?guided=tofu 在shoot Canvas14/14進Editor遭Sign in to continue。Root在mini8980原生host實際POST guided session bootstrap重現401；此前只分別驗native登入與獨立prepared導覽，漏了native host的guided入口組合。根因native沒有註冊provider-free guided editor，frontend轉送被native session middleware攔住，不是使用者帳密錯。
- guided_demo.create_app增加api_prefix，同步media/cut/public回傳路徑；attach_editors在明確指定的三個GUIDED_DEMO_*路徑啟用fresh/full兩個獨立DB/media，僅公開已啟用且帶尾斜線的兩個session prefix。native /api/ideas、workspaces等仍需登入，foreign/null Origin仍403、未知provider操作405。native /與/index.html提供full editor meta，runtime只在meta+cutfull21時用full namespace；原獨立8996/8998無meta，舊canonical與state不變。
- Native保留同一persistent DB／帳號，僅重啟自有8980以載入bridge，未清理或覆寫觀眾資料。新terminal `term_516ac6d7-7f14-4a6b-9ffe-2fb79c796a17`，原MacBook轉接不變；native state內新增guided-editor/fresh與full，與backend/data.db分離，使用既有Remotion browser無安裝。原使用者guidesession及前端進度不清除，刷新原頁可再進Editor。
- 起點full1124passed2skipped36.55s GREEN；新增native整合測試後1125passed2skipped35.90s GREEN；最後full1125passed2skipped59.86s／frontendPASS／GREEN（同時本機render，未稱回歸效能比較）。runtime focused15PASS，TypeScript/lint0warnings/isolatedbuild成功。native auth保護、相同sid雙preset隔離、media URL、staleCAS、foreign/null Origin、/與/index meta均有後端回歸。獨立readonly guided_native_bridge_review核對目前dirty snapshot無阻擋；未冒稱committed ACCEPT／reviewer跑過tests。
- 真正從同一mini8980（對應MacBook18980）未登入導覽走完fresh與full21 × shoot與ai，共100位置／導航檢查PASS，四次Editor進入／播放／真本機export／download／reload＋zh-Hant PASS，errors=[]、ownedBrowserClosed=true。四個MP4均親跑ffprobe315frames／1080×1920及ffmpeg整支decode PASS；full21AI SHA577db017…吻合前成品。不新增生成、paid0、語音不變。native正常帳號Script保存4點回歸再次PASS，未改其內容。
- 三套前端各130檔hash驗證、index atomic last、舊chunks保留，raw indexSHA d5ee02120dad59e6f3827fde70537fb37c2bead1fb388e86a5eab1e7004d0224。native HTML額外加入full-editor meta，HTTP驗證將該marker移除後與同build一致；MacBook18980health200。原8996/8998服務未重啟；8980/8981是使用者需要保留的互動與render服務，非test漏清理。
- 本輪新增修改清單：app相對backend/guided_demo.py、backend/server.py、backend/tests/test_guided_demo.py、src/lib/guided/runtime.ts、unit/guidedRuntime.test.mjs，另更新docs/STATUS.md與docs/test-log.md。保留此前15檔dirty，無產品檔案新增／刪除、未commit/push/merge。證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-native-guided-fix-umilulf9/`：results.json、100screenshots、四export、export-verification.json、deployment.json與build.log；user原頁只需刷新，不須重新登入導覽。

## 2026-11-07：觀眾網站登入與 Script 保存補查通過

- 使用者確認觀眾使用自己的 MacBook；維持 MacBook18980→mini8980，不新增公開／其他裝置入口。使用者亦明確允許繼續本機表單／JSON登入與保存驗證，帳密不放網址、不寫Git；先前hook阻擋保留，不繞過。本段取代下方 pending 的最新狀態。
- 親跑 `node /tmp/buildclub-audience-persistence-check.cjs` exit0／outcome PASS：新browser實際表單登入、六鏡say/onScreen全12欄與backend保存值逐欄相等、reload後重開Plan仍完全相等、清cookie再登入後仍完全相等。沒有修改或重置企劃內容；pageerrors=[]，ownedBrowserClosed=true，使用者native服務／轉接及原導覽保持。
- 證據原audience-polish目錄新增 `native-persistence-results.json`／`native-persistence-verified.png`；舊兩次harness失敗保留。此次沒有產品程式變更、付費、安裝、commit或push，只更新既有STATUS與test-log；先前full1124passed／2skipped／frontendPASS／GREEN對應的程式未變。

## 2026-11-07：觀眾登入網站、移除搜尋摘要、補齊 Script（本機未提交）

- 使用者要求一般網站也可讓觀眾登入試用，移除截圖圈起的摘要區，Demo Script 先填英文，一般網站接 AI writer。分支 `fix/demo-audience-polish`，保留前輪導覽換位 dirty；沒有 commit／push／merge／新付費。原 `fix/guided-step-placement` 無 upstream，開場 git pull 明確回無 tracking，未假稱拉到新版本；開場 full1122passed2skipped34.26s／GREEN。
- 刪除共用 ResultsScreen.answer 區塊，並移除 App 每次搜尋的 askAnswer 接線，避免保留無畫面的摘要請求。一般與guided同元件皆生效，搜尋結果／錯誤／數量保留。
- Fresh-six兩路（含full21）Script各六鏡say/onScreen均填既有英文copy；一次性 migration 只補未edited、全空白／舊Adapted-copy預設；使用者改字／清空後不復活。shots.line/text、project captions/voice/texts及影片素材不改，不自動加配音或重渲染舊片。
- 一般Plan的Write script現在呼叫既有backend /script，支援真Claude環境或免費demo fallback。expectedBasis在budget/provider之前拒絕尚未保存／過期分鏡；pending latch至真正fetch結束才解除，所有Rewrite入口禁重送；編輯script/shot、換plan或unmount令晚回應失效，手改覆寫仍需原確認。沒有開頁自動付費；本次觀眾環境REMAKE_DEMO=1／無keys／七類預算0，腳本回應source=demo，不宣稱真AI已跑。
- 已建立獨立持久一般服務：mini8980／render8981，MacBook `http://127.0.0.1:18980/`。資料與乾淨backend副本／dist／start.py位於 `~/Downloads/buildclub-demo-reference/audience-native-20261107/`，沒有複製原DB或.env；帳號demo@remake.local（密碼僅於使用者對話交付，不寫Git）。實際API登入200、登出狀態401、me200、HttpOnly cookie成立，後端重新啟動後同帳號仍有效。保留原8996/8998導覽；native backend terminal `term_3e1d796f-d4e5-41ec-a6ef-a999f05b6730`，轉接 `term_8e0b1dfb-a842-4928-a7c0-7bb19b737718`，皆為使用者保留不做test cleanup。
- 免費可試原生登入／保存／編輯與tofu快取搜尋；實測42筆快取、一般UI無answer區，另複用6份既有已完成pinned analysis（80來源中可找到者），沒有生成新分析。增加一份可編輯audience-tofu-practice六鏡企劃並保留既有資料，供觀眾練習。即時未快取搜尋／真模型付費尚未開啟。
- 最後full1124passed2skipped34.03s／frontendPASS／GREEN，focused script/fresh19PASS，lint0warnings／TypeScript／隔離build成功。獨立唯讀script_safety_review先找P1晚回應覆手改與P2重複Rewrite費用，修正後同reviewer複查無新增阻擋；屬dirty snapshot靜態audit，不是committed ACCEPT或真provider測試。
- 自有prepared UI雙路50點PASS，摘要不存在、Script六say/onScreen非空、原導覽換位與EN/zh正常；舊空白資料雙層storage＋migration另25點真UI PASS。自有browser/backend均關、survivors=[]、lease釋放。Native真登入／cached搜尋／延遲response保留手改與阻重送／確認重寫六行均實際PASS；reload測試停在Plans頁而非原Plan，應重開Plan再檢查；第一次確認按鈕locator猜錯名稱、第二次reload locator失敗均保留，未當產品資料遺失。後續本機JSON登入檢查被hook誤判為URL含憑證，已告知並等待使用者確認，不改寫命令繞過；最後重開Plan驗證因此pending。
- 三套前端8980/8996/8998各130檔hash相同、index atomic last、舊chunks保留，indexSHA `dee992f834bfe04fef3febe760c13d27a6bd5bccba52e4ef8f36ae10c230e810`。MacBook18980 health200且已open；尚未確認觀眾是否需自己的裝置網址，目前為MacBook本機轉接。
- 證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-audience-polish-wof9y765/`：qa-67fd0090雙路、qa-8e785cc6舊資料migration、native-ui-results.json（保留未完成reload分類）、native-ui-first-failure.json、dist-checked與deployment.json。舊錄影未重錄、未新增依賴。
- 本工作樹完整檔案清單（含上一輪未提交導覽換位）：docs/STATUS.md；docs/test-log.md；app相對backend/storyboard.py、backend/tests/test_storyboard.py、src/App.tsx、src/components/PlanScreen.tsx、src/components/ResultsScreen.tsx、src/components/demo/GuidedTour.tsx、src/components/demo/guided-tour.css、src/lib/guided/freshSix.ts、src/lib/script.ts、src/lib/storyboard.ts、unit/freshSix.test.mjs、unit/guidedCanvasTour.test.mjs、unit/script.test.mjs。無產品檔案刪除。

## 2026-11-07：導覽框依步驟避開主要操作（本機未提交）

- 使用者要求對照兩支完整錄影，讓 Next 導覽框在會擋住視線的步驟換邊。已檢視兩路逐段 contact sheets 與 Editor／Canvas 原尺寸畫面；舊錄影 Editor 遮住右工具、Canvas 手動移左下的操作正是本次修正範圍。分支 `fix/guided-step-placement`，base `85c9243`；main／其他工作樹不動。
- 搜尋／結果／Research、無 dock 的 Canvas 保留右上；分析／腳本／路線／Editor／成片預設左上；Canvas Inspector／History 子步預設左下，保留中央節點與右側操作。手動座標僅在當前主步／路線／子步有效，換步（含 Previous）回預設位置；busy、收合／展開保持同一步手動位置，切步清除未完成拖曳及 rAF，視窗與卡片尺寸仍受邊界限制。沒有改業務狀態、生成、資料或影片。
- 起點 full GREEN：1122passed／2skipped33.58s；聚焦既有 suite 加兩個行為回歸，先因無 placement RED，再10/10PASS；最終 full1122passed／2skipped34.32s、frontendPASS／GREEN，TypeScript／lint（0warnings）／隔離build exit0。無新付費、依賴或 commit／push。
- 自有1440×900隔離UI雙路50個位置檢查PASS，EN/zh-Hant、每個Canvas子步、analysis/script右側區域、Inspector／History、Editor文字按鈕trial click、匯出區non-overlap、keyboard手動移動／收合展開／Previous／reload通過；pageerrors=[]，自有browser/backend關閉、survivors=[]、lease釋放。generation以明示Skip走位，本次未重驗Run／匯出，不擴大成全流程再驗。
- MCP snapshot可呼叫但共用profile occupied，未碰他人Chrome；改用既有Playwright-core自有browser。早期harness失敗（route未選仍誤等Next、初始session存檔race、Skip本來會直接換步卻再點Next）保留原結果，核對source/DOM後只改harness，不弱化產品gating；曾有1個hook lint warning，已消除。
- 兩套本機8996／8998前端已原子更新index、保留舊chunks與index備份，各130檔hash一致；PID78200／78479不變，generationEnabled=false，indexSHA `a55e434dce7f4f382f614e776d078cc4ad191262a28403f65876bd26a23687a2`。刷新MacBook18996／18998可看新位置；舊錄影未重錄。未新增MacBook親測／真人外觀批准。
- 證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-guide-placement-6yt52zux`，最終UI `qa-737a4d31/results.json`、screenshots及cleanup；新source僅GuidedTour.tsx／guided-tour.css／unit/guidedCanvasTour.test.mjs，另更新既有STATUS／test-log。此新功能未自動延伸上輪的保存commit授權，待使用者需要時再commit／push。

## 2026-11-07：提交版獨立 review 已接受；保留 main

- Source `b37ddc1258c41f67a954e60b55b156f0bc85fe5c`；base `2be89f0f03695b0adbec4cfd463da9e07a992a0c`；範圍全部 79 檔展示增量。獨立 reviewer Orca task `task_730702972645`／dispatch `ctx_4eca8615fb5d`：ACCEPT，未確認新增 P0–P3；整合者親核 HEAD／clean status／主要舊問題原始碼後 ACCEPT 此精確 source。這不是全產品、即時模型或真人外觀批准。requested Sol/high，resolved model／effort unknown。
- Review 親跑唯讀 Git／path／SHA 檢查 exit0；27 個新增二進位素材有引用，manifest／TS metadata 一致，AI 六段合計 315frames，產品與上一場 UI snapshot drift=[]。Root 提交後 full：1122 passed／2 skipped（34.02s）、frontend PASS／GREEN；lint／app+node TypeScript／隔離 build PASS，130 個 build 檔與原 UI-validated dist-release 全數 byte 一致。Reviewer 沒有重跑測試或瀏覽器。
- Root 另核 manifest 引用 21 媒體：均 tracked、SHA 一致；8996／8998 status 為 prepared-local-export、generationEnabled=false，PID 78200／78479 未變，兩套 index SHA `f17b3561191f90269d9fe4cb490246424567dd83ae006b8991fa83329714ae3d`。這是本機 HTTP 檢查，不是 MacBook 互動驗收。
- 舊清單確定保留：#3 native 成片送審不顯示 cut waiting（P1，本次 prepared 不提供送審，非展示阻擋）；#9 Plan 缺 h1（P2）。#1／#5／#8／#10 原始碼已有針對性改善；#2／#4／#6／#7／#8 的版面與部分 native 行為仍需動態確認，不自動宣告 fixed。逐項矩陣見既有 demo-qa/issues.md 最新段。
- 四至六日判定：核心 prepared 雙路流程／真剪輯匯出已有工程與錄影證據；仍缺 Tommy／Veralyn 內容外觀批准、實際 MacBook smoke／離線備援及兩次真人彩排證據。兩條不同路線錄影不等同兩次正式彩排。語音不列阻擋；原計畫沒有週日關卡。未驗即時 provider、真人拍攝、並行拖曳／取消／resize 與 pending-navigation Exit race 保留。
- 收尾親跑 `bash bin/verify.sh full`：1122 passed／2 skipped（36.41s）、frontend PASS、verify GREEN；僅文件變更，產品 source 仍為上述 b37ddc1。
- 建議順序：先人員內容驗收與一次真機彩排；只修實際阻擋展示的問題；展示後優先補 native 送審狀態，再做真素材／生成品質／保存需求，不擴張發布／analytics／語音。此次僅補 review 文件，不改產品程式，review verdict 僅綁上述 source；後續文件 commit 不延伸為新程式審查。

## 2026-11-07：新展示分支保存與全面 review 檢查點

- 本次使用者授權保存最新展示版＋目前計畫研究文件，其他工作樹只列清單保留；不合併 main、不新增付費。最新分支 `chore/demo-review-checkpoint-1107` 延續 `feat/demo-integrated-latest @ 2be89f0`，其 origin/main 基準仍為 `2c069a8`；不是從舊 canvas-p1 程式覆蓋最新展示版。
- 研究文件備份分支 `docs/local-plans-research-1107 @ 4ed9e35` 已推送 origin：103 份既有文件／圖像及 STATUS，沒有整合舊程式；原研究一行尾端空白保持原樣。此備份分支不是應部署的 app。
- 本場親跑目標 full：backend 1122 passed／2 skipped（34.03s），frontend PASS，verify GREEN；lint exit0、TypeScript node exit0。TypeScript app／隔離 build 與提交後驗證另記 test-log。未變動現有服務、資料、轉接或依賴。
- Playwright snapshot 工具可呼叫，但回覆 browser already in use；未關閉／搶用他人 Chrome，本輪未新增 UI PASS。既有 11/7 雙路完整錄影為上一場證據；本場親用 ffprobe／SHA256 核對兩份錄影，1440×900 H264、175.033333／191.7 秒，hash 與交付紀錄相符。兩份錄影只有 video stream，無 audio；語音依使用者最新決定不列阻擋。
- 初步結論：prepared 素材＋真編輯／匯出的展示主線已有工程與操作證據；不能等同即時 provider／新真人拍攝全流程或人員內容批准。仍需 Tommy／Veralyn 內容外觀驗收、MacBook 實際展示 smoke／離線播放、逐項釐清舊 issues 的適用範圍。兩條不同路線錄影不能充當兩次正式彩排。原三天計畫涵蓋週四至週六，未發現週日目標。
- 不新增產品實作；下一步先完成提交版獨立 code review，再與使用者討論剩餘展示關卡。真發布／analytics／額外模型／語音不擴張本次範圍。
- 以下 dirty 工作樹全數保留，未 commit／push、未整合、未清理；它們不是本分支漏收的已驗交付：
  - `/Users/tommy/Desktop/BuildClub` (feat/live-backend)
  - `/Users/tommy/orca/workspaces/BuildClub/blenny` (main)
  - `/Users/tommy/orca/workspaces/BuildClub/canvas-audit-bugs` (minchiaHuang/canvas-audit-bugs)
  - `/Users/tommy/orca/workspaces/BuildClub/canvas-image-backend` (minchiaHuang/canvas-image-backend)
  - `/Users/tommy/orca/workspaces/BuildClub/canvas-image-frontend` (feat/canvas-image-controls)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-14aa477` (detached HEAD)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-45a1cfb` (detached HEAD)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-5c320ed` (detached HEAD)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-76b757f` (detached HEAD)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-flow-qa` (fix/demo-flow-qa-mainline)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-mainline-fixes` (fix/demo-picked-plans-tiktok-casing)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-readiness` (chore/final-ai-delivery)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-readiness-ui` (test/demo-readiness-ui)
  - `/Users/tommy/orca/workspaces/BuildClub/demo-team-handoff` (feat/demo-team-handoff)
  - `/Users/tommy/orca/workspaces/BuildClub/freeform-canvas` (feat/canvas-generation-controls)
  - `/Users/tommy/orca/workspaces/BuildClub/fresh-ai-pilot` (test/fresh-ai-pilot)
  - `/Users/tommy/orca/workspaces/BuildClub/fresh-batch-smoke` (test/fresh-batch-smoke)
  - `/Users/tommy/orca/workspaces/BuildClub/guided-demo-case` (feat/guided-demo-case)
  - `/Users/tommy/orca/workspaces/BuildClub/guided-demo-shell` (feat/guided-demo-shell)
  - `/Users/tommy/orca/workspaces/BuildClub/guided-tofu-demo` (feat/guided-tofu-demo)
  - `/Users/tommy/orca/workspaces/BuildClub/remake-donn-prep` (fix/neutral-copy-letterbox)
  - `/Users/tommy/orca/workspaces/BuildClub/six-shot-ai-flow` (feat/six-shot-real-export)
  - `/Users/tommy/orca/workspaces/BuildClub/six-shot-demo-canvas` (feat/six-shot-demo-canvas)
  - `/Users/tommy/orca/workspaces/BuildClub/video-canvas-entry` (feat/shot-focus-workspace)
  - `/Users/tommy/orca/workspaces/BuildClub/video-premium-ui` (detached HEAD)

## 2026-11-07：兩條完整Demo錄影已交付MacBook

- 使用者要求完整錄製Plan a shoot與Create an AI ad兩條流程並傳自己的MacBook；沒有要求傳外部隊友訊息，未代送任何訊息。使用最新已審查dist-release，分別自有8994/8995與8990/8991隔離server/state/browser錄製；首頁→搜尋→Research→Script→route→14Canvas子步（每鏡Run/preview、版本與Use in Edit）→Editor入軌動畫／播放／文字操作→真匯出／播放／下載。沿用prepared素材，零新付費生成。
- 成品MP4 H264／1440×900／30fps，已親跑ffprobe與ffmpeg -xerror整支解碼、抽首／中／尾畫面檢視。Plan-a-shoot.mp4：175.033333秒（2:55）、10460992bytes、SHA25661b1e34ffe9062019b30208d399bfa6df371f9880fecfdb00c7ecc8c1cd91384；Create-an-AI-ad.mp4：191.7秒（3:12）、14186126bytes、SHA2564c3ec10bbad1fcf9af704448c940640f40ffa579116078cc74f757c744eb9e73。兩次實際匯出各315frames／1080×1920，錄影browser errors=[]，own backend/browser已關、survivors=[]、兩lease已釋放。
- Mini原檔：`/Users/tommy/Downloads/BuildClub-Demo-Recordings-20261107`；MacBook副本：`/Users/tommyhuang/Downloads/from-mini/BuildClub-Demo-Recordings-20261107`。已透過SSH/SCP複製，遠端shasum逐檔與Mini SHA256完全一致；沒有覆寫既有資料夾／檔案，未在Mini開可視app。
- 首次shoot錄影在文字欄位被導覽卡覆蓋而失敗，原始失敗保留attempt-ea23a243；改操作時收合導覽後重錄乾淨版本。交付來源shoot attempt-eebd0155與ai attempt-257c5160均PASS、包含真匯出315frames；failed錄影未交付。證據與delivery.json在`/tmp/buildclub-share-recording-20261107/`及AI對應目錄。
- 8996PID78200／8998PID78479及兩MacBook轉接保留；新網站修正已審查部署。本錄影任務未改產品程式，僅更新既有STATUS／test-log與Downloads影音檔；無commit／push／merge／依賴安裝／新付費。

## 2026-11-07：搜尋單一Loading／12個Research專案／剪輯器內素材入軌（已審查並更新Demo）

- 使用者`.orca/drops/1/1.md`六張截圖：搜尋中只留loading、查隊友多專案、移除獨立Preparing畫面、參考Vyra直接在Editor內自動排片。先討論後使用者cool lets go確認：Evergreen12個專案保留豆腐；首次約3秒逐段入軌／同步預覽，回訪淡入保留編輯。
- 唯讀盤點：native sample已在整合來源，Evergreen12slots/14refs、MYST8slots/4refs；不是12個客戶。prepared維持guided-evergreen隔離，原豆腐slot1/topic/notes與快取保留，追加Evergreen2–12slots與14樣本refs，不混MYST。一個migration marker只補一次，後續編輯／刪除不復活；影片lookup沿用既有sample資料。prepared非主參考僅查看／整理，選片控制停用並有說明，避免原API只支援豆腐兩plan的dead end。
- 搜尋loading/resolving期間隱藏SearchScreen及ResultsScreen，guide跟同一忙碌狀態，sidebar／導覽保留。Editor移除獨立Preparing，實際Player／時間軸直接掛載；六個已有PNG縮圖按真實片長依序入軌，Player seek到各段起點，既有首幀overlay接續預覽避免快切黑屏。3秒只動UI、不update/fill/PUT；期間操作鎖定。scoped local marker記完成，每專案回訪／reload不重演，已有分割等修改保留；中途退出清timer、不寫完成marker；reduced-motion立即展開／不淡入。
- 開場full1122passed/2skipped33.94s GREEN；focused Research33PASS、TSapp／lint／隔離build PASS；最後source完整verify1122passed／2skipped44.57s、frontendPASS／GREEN。UI最後attempt-d6b3c2bb完整PASS：唯一loading、12slots/44呈現rows（含既有plan衍生列）、14native樣本refs、clip counts1→6／起點0,1.6,3.2,5.1,6.6,9.8／真片寬與PNG對應，intro PUT0且完整project/version不變；split為7clips後返回及刷新不重演／保存完全相同；真315frames1080×1920匯出播放／seek／下載／reload同SHA577db017…；reduced-motion與退出中途PASS、pageerrors=[]／ownedcleanup survivors=[]。
- 原始失敗保留：初版UI18ce2000功能PASS但截圖見快切黑屏，補真PNG首幀overlay；0b2e8f02抓到reduced-motion CSS specificity不足，已修；e56b8cbd退出測試漏箭頭、cd22ac8a用Cards class查Sheet button的兩個locator FAIL，依實際DOM修正，focused318dab44與最後全流程PASS。不抹除原FAIL；unit原29筆預期依批准引入樣本改43並保留notes／removal斷言，TS一次slot literal array型別過窄已補ResearchSlot[]。無新付費／依賴／commit／push／merge；8996PID78200、8998PID78479與轉接保持。
- 證據`/tmp/buildclub-editor-arrival-20261107/`（來源前快照prior-*、最終dist-release／verify-release.log／ui-release.log與錄影）。獨立review與靜態部署已完成，見下列記錄。

- 獨立唯讀 task_a577615ff366／ctx_b1702c00f8cc provisional ACCEPT、無新增P0–P3；source/base2be89f0、78檔snapshot SHA2565adbaf8de9b1a9d280038e16b83311969f06bee115a9f15a57565cca7e7e246e。Lead再次核對全部hash與HEAD drift=[]後明確ACCEPT此未提交快照；review親跑focused33PASS/diffcheck0，未另跑full/UI，舊fresh/shoot由後續雙路錄影實際覆蓋。requested Sol/high、receipt Sol/high，底層resolvedprovider metadata unknown。不是提交／合併授權。
- 兩套dist已各130實檔hash核對、舊chunk保留／index原子替換；indexSHAf17b3561191f90269d9fe4cb490246424567dd83ae006b8991fa83329714ae3d。8996PID78200與8998PID78479及轉接保持。使用者另要求錄製Plan a shoot與Create an AI ad完整操作並傳MacBook；目前使用同一已驗dist-release、自有8994/8995隔離state/browser錄製，真剪輯／匯出、零新付費生成；不接觸使用者原session。證據`/tmp/buildclub-share-recording-20261107/`，完成後檔案／轉送結果另補。

## 2026-11-07：預設 Light，移除 System 主題選項（本機已更新）

- 使用者要求預設Light／移除系統選項。ThemeChoice只保留light/dark，missing／invalid／舊system／storage blocked均Light，明確Dark保留。index首屏預設data-theme=light；main在prepared隔離完成後再套目前scoped設定，手動Dark刷新不遺失。Canvas只觀察明確主題，不再跟OS切換；設定頁兩欄Light／Dark並同步中英文說明。
- 開場full1122passed／2skipped33.55s GREEN；theme測試先RED再6PASS、TS／lint／隔離build PASS；修改後full1122passed／2skipped34.55s、frontendPASS／GREEN。UI1440在深色OS模擬下驗Light預設、兩選項、Dark與Light刷新保存、OS切換不覆寫、舊system轉Light、Canvas Light，全PASS／pageerrors=[]／owned cleanup survivors=[]。
- 兩套dist各130實檔hash核對、index原子更新、舊chunk保留；backend8996PID78200／8998PID78479與轉接保持不變。上線後MCP深色OS親驗html=light、options=[Light,Dark]、新說明文字與截圖；自有browser關閉、lease釋放。無commit／push／merge／付費／安裝；證據`/tmp/buildclub-light-default-20261106/`。

- 部署後收尾親跑 `bash bin/verify.sh` exit0：1122 passed, 2 skipped in 34.43s；PASS  frontend unit tests；verify: GREEN；`git diff --check` exit0。

## 2026-11-06：新八張截圖的 Demo 呈現修正（已驗收並更新）

- 使用者`Pasted Graphic 11 copy 2.png`：搜尋快取也要loading、補成效與預算數字、先移除報錯發布區、進Editor有準備剪輯動畫；首頁兩CTA應為自由操作＋逐步導覽，上一批保留影片tour的理解已由本次更正。使用者明確批准補數字且不另加示範標籤，限定prepared畫面；原provider費用ledger／actualUsd不變。
- 搜尋prepared最短1800ms搭既有resolve動畫，實測整體約4.3s；正常live搜尋不加延遲。Editor有1600ms整理六段素材動畫，pending ready不讓guide先跳過，prefers-reduced-motion停動畫。真剪輯／匯出仍實作，不以動畫替代工作。
- 單一presentation helper補主參考views248600／followers18400／median32600／shares2840／saves6120／7天，倍率／日均照原公式；Research只覆蓋舊0/0預設，不改使用者編輯數字。History顯示剩餘image21.800／video37.600／voice8.800，每筆image0.04／video0.20／voice0.08；只呈現，真回放receipt仍0。不改原檔、快取或實付紀錄。
- prepared Plan隱藏PublishPanel；其他原生工作區保留。首頁exact兩個可操作按鈕：Try the demo進自由操作並停guide、Start the guided demo建立新UUID導覽並保留cut=full21／舊session資料；不是影片tour。
- 開場完整1122passed／2skipped36.68s GREEN。TS app/node、lint、隔離build PASS，最後空白修正重新build與已驗build130檔byte一致。Focused presentation2＋searchStatus PASS。UI attempt-ca834ec1全PASS：搜尋loading、跨畫面數字、兩入口、Publish隱藏、History預算且receipt0、剪輯動畫、真315frames匯出play／seek／download／refresh，同SHA577db017…；pageerrors=[]／owned cleanup survivors=[]。
- 保留原FAIL：首UI attempt-6d192516於動畫已結束才等待而timeout，第二次提前掛觀察等待並PASS；首次full RED因抽出runLiveSearch的舊unit scope未提供新增guidedRuntime，補正常live null後focused通過，完整重跑已GREEN1122passed／2skipped37.05s、frontendPASS。一次tsc路徑誤用root exit127、首次TS漏import getGuidedRuntime已修；沒有安裝或削弱檢查。證據`/tmp/buildclub-demo-experience-20261106/`。

- 首次獨立審查 task_5caa15e58d22／ctx_77321124a196 provisional REJECT：P2，Editor回Canvas再重入可能沿用上一輪ready。Lead新增changeEditing，在切換畫面同批setState先作廢ready／exportOpen，再切editing；所有現有入口／返回／跳節點路徑共用，edit→result不重置。新增實際transition抽取測試，保留focus fitView回歸。
- 修正後UI attempt-165d91e0全PASS：一般與reduced-motion各重入一次，準備動畫中Next禁用且狀態仍canvas，完成才edit；減少動畫模式animationName=none，兩次都真的播放且時間軸playhead前進。原本搜尋／數字／兩入口／發布／預算及真315frames匯出重新跑PASS，errors=[]／survivors=[]。原審查stop hook在lead更新後曾捕捉guidedCanvasFocus缺新函式scope的RED，已補入真changeEditing實作與setGuideEditor，不空stub；focused13PASS。原REJECT保留；後續full與新快照複查結果見下。

- 重入修正後親跑完整 `bash bin/verify.sh` exit0：1122passed／2skipped（49.32s）、frontend PASS、verify GREEN。

- 原reviewer新派工task_5167ca30cbe5／ctx_86220b102feb provisional ACCEPT，無新增P0–P3；source/base2be89f0、新69檔快照SHA256 `2d37d9b9439171d29da5542e0dc8a6f18e74eb295f260187ac345fed41140f70` 前後drift=[]。Lead再次核對全部hash與HEAD後ACCEPT此未提交版本；舊68檔REJECT不更改。模型requested Sol/high，terminal顯示GPT-6.1-Sol high Fast；底層provider metadata unknown。
- 新版靜態前端已更新兩套dist，各130個實體檔SHA核對、舊chunks保留／index最後原子替換。8996PID78200與8998PID78479保持不變。上線後MCP1440：搜尋loading3.846秒／舊版含refresh檢查3.942秒，18.4k→249k呈現正常，兩個homepage按鈕實際分別自由操作／新UUID導覽且full21保留；Exit刷新不重開，pageerrors=[]。自有browser已關／lease釋放，MacBook18996開新頁成功。無commit／push／merge／付費／依賴安裝；詳細檔案清單在test-log最新批次。

- 部署後收尾親跑 `bash bin/verify.sh` exit0：1122passed／2skipped（33.90s）、frontend PASS、verify GREEN；`git diff --check` exit0，受審產品檔案hash無變動。

## 2026-11-06：新截圖四項修正已驗收並更新兩套 Demo（未提交）

- 範圍：`Pasted Graphic 7.png` 四項：Instagram播放、Exit guide、首頁兩個CTA、compact Re logo。保留先前五項與完整21鏡切六段；不commit／push／merge、不新增付費、不關8996／8998與MacBook轉接。
- Instagram：使用公開官方embed回應取得同貼文／同作者影片，8支已快取原檔並記錄來源／SHA／尺寸；滑過原生靜音播放、移開pause並remove src/load釋放媒體資源，抽屜同片可播放。另3支官方回應copyright_blocked=true且無video_url，顯示無法預覽及原片入口，無繞過限制或替代影片。
- Exit只保存active=false並關導覽，保留prepared runtime及工作；刷新／搜尋／開抽屜不再自動喚回。生成／匯出busy仍可退出。首頁移除Watch a guided demo；compact logo22→18px，expanded不變。
- 開場full GREEN1122／2skip（35.98s）；最後source full GREEN1122／2skip（37.03s），frontend PASS；TS app/node、lint、隔離build PASS，focused11 PASS。真UI 8支連續hover、抽屜、退出刷新、生成完成、Canvas保存、首頁2CTA及logo18px通過；退出途中真匯出亦PASS：1080×1920、315frames，播放／seek／刷新同檔SHA確認；已經獨立審查並部署，見下列證據。
- 失敗證據完整保留於`/tmp/buildclub-four-ui-fixes-20261106/`：初版第7支載入卡住，換序後同支先播正常，改釋放資源後8支通過；確切瀏覽器資源限制未證實。獨立唯讀ASGI Range八支均206／正確bytes，不能稱已測TCP。測試中模擬帳密URL被hook阻擋整批寫入，使用者明確批准移除該案例後才繼續；沒有建立該URL或繞過hook。

- 獨立Orca task_915abdca957b／ctx_c824986cfc68 provisional ACCEPT，無新增P0–P3；source/base2be89f0、snapshot60檔SHA256 `7209e1bb0ba74cf49123eedbe387fcd05d25bf7594ef792071250ac0725faf0a` 前後無drift。Lead核對同HEAD及全部hash後ACCEPT此未提交快照；僅後續STATUS／test-log增補審查／部署記錄。requested Sol/high、receipt model Sol/effort high；底層resolved provider metadata unknown。不是提交版審查／merge授權。
- 兩套前端靜態檔已更新，各137檔SHA核對，舊chunk保留／index最後原子替換；8996PID78200與8998PID78479保持不變，轉接未關。實際上線後1440 MCP播放IG時間0.204992／0.213542且muted=true，移開src釋放、Exit刷新不重開，pageerrors=[]；首頁兩CTA截圖親看。自有browser已關／lease釋放，MacBook18996開新Demo成功。證據deployment.json／published-smoke.json；未commit／push／merge／付費／安裝。

- 部署後收尾親跑 `bash bin/verify.sh`：1122passed／2skipped（33.76s）、frontend PASS、verify GREEN；git diff --check無錯，受審產品檔hash仍無drift。

## 2026-11-06：完整21鏡AI原片分成六段已驗收（本機未提交）

- 使用者已確認：將原完整AI成片依自然鏡頭分成六段接回Shot1–6，內容／順序／字幕／聲音保留；不再用舊六鏡動靜混合選段代表整支原片。此新授權取代下方舊「21鏡與六鏡不同交付、不互換」限制，但舊成品／資料仍保留。
- 原片 `~/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai/deliverables/final21/ever-green-fresh-ai-ad.mp4` SHA256 `be20427fd3dc0eaadc3379dadd3e98136eeb25b60bb68c9d0f931294972edc14`；實際21鏡、315frames／30fps／10.5秒、1080×1920，AAC為靜音。原source.json是舊六鏡候選metadata，精確原片以delivery-manifest／source-manifest及實檔核對，不以舊source.json判定。
- 無損六段邊界 `[0,48,97,154,199,293,315]`，分組原s1–2／s3–7／s8–11／s12–14／s15–19／s20–21。六段解碼frame hash逐一與原片315幀完全相同；含原字幕，不新增／重複字幕。新增offline `bin/prepare-full-ai-six.py` 可用原片重建新素材，不呼叫provider，既有目錄拒絕覆寫。
- 新`cut=full21`／`full-ai-six-v1:` namespace、AI六段全video／不偽造I2V首圖關係；原shoot及舊fresh-six模式保留。原8998後端spec啟動後不可熱換，故新服務／state／cache／dist與新MacBook18996網址獨立，不能關8998／18998。新版mini8996／render8997／MacBook18996已啟動；網址 `http://127.0.0.1:18996/?guided=tofu&cut=full21`。persistent state／dist在 `~/Downloads/buildclub-demo-reference/full-ai-six-from-master-20261106/`；backendPID78200、terminal `term_6d4e7e78-ff79-479c-956d-e1cdd90a7d82`，tunnel `term_2a65a25f-ea7e-4490-b030-30fa97c80492`，留給使用者，不可一般cleanup關掉。
- 核心6 tests、TS app/node、lint、隔離build PASS；完整 `bash bin/verify.sh` 1122passed／2skipped in33.73s、frontendPASS／GREEN。新增test先RED（3 video≠6）再GREEN；編輯工具的自動verify也捕捉同一預期RED，保留紀錄。
- 真UI已播放完六段並真匯出完整原版：315frames、10.5秒、無額外text layers、音軌全零；native重新編碼輸出SSIM0.99557，不能稱作byte／pixel無損匯出。切片自身逐幀無損且原master另完整保留。初次harness讀PCM超出Node預設buffer而ENOBUFS，已增測試buffer，原FAIL保留；獨立比對同原匯出PASS。
- 獨立Orca審查task_1ed988b2778f／ctx_1a1424842714：provisional ACCEPT、無本輪新增P0–P3；HEAD/base2be89f0，snapshot SHA256 `0c2f2e3512d7453c74c4c2cea0e2167c32f9725f8e1a49afe97a515c42f2d126`前後41檔hash無drift，lead再次核對後ACCEPT此未提交快照。requested Sol/high，projection model gpt-6.1-sol，resolved effort／底層provider metadata unknown。不是提交版或merge授權。
- 新版服務上線後MCP1440親驗6來源、全315frames、texts=[]、Editor播放進度前進；MacBook18996 status full21／generationEnabled=false／PID78200、舊18998 PID78479兩者均核對，舊服務／素材／state未改。原master另保留，可直接在新版 `/demo-assets/full-ai-six/original-master.mp4` 播放，這份檔案與原版byte一致。
- 證據 `/tmp/buildclub-full-ai-six-20261106/`；UI第二次執行178步PASS（5真匯出、雙路重啟／語言／清理）；主guided流程pageerror0，背景observer有1筆Chrome ViewTransition DOM update timeout保留於test-log，未擴大改全站動畫。收尾親跑full：1122passed／2skipped in38.78s、frontendPASS／verifyGREEN；MacBook18996原master經HTTP串流SHA亦吻合be20427…，open-on-macbook已成功開新Demo。保持`fix/demo-playback-polish`本輪與前輪dirty；無commit／push／merge／付費／安裝。

## 2026-11-06：五項截圖修正已驗證並更新 Demo（本機未提交）

- 分支 `fix/demo-playback-polish`，從乾淨、已同步的 `2be89f0f03695b0adbec4cfd463da9e07a992a0c` 建立；開場 full GREEN。依本次指示不 commit／push／merge，不碰其他工作樹或付費生成。
- Find ideas：Ever Green 原參考使用對應本機原片靜音 hover，移開暫停；使用者另明確批准快取 TikTok 載入免費官方嵌入，實測影片時間前進／靜音／移開暫停，失敗仍有來源入口。其餘 Instagram 快取只有封面與來源網址，不假造對應影片。
- Research：核實同案例有29筆快取參考；一次補入 scoped Research、保留既有編輯／後續刪除，預設展開。不是混入一般 Evergreen／MYST sample。頁面可能另含既有計畫衍生列，所以側欄30不等於30筆快取。
- 導覽卡拖曳改為快取尺寸、rAF與transform；Canvas節點拖曳只保留暫態位置，放開後才保存。1440實測30個移動事件期間draft寫入0、放開1，位置刷新保留。
- 生成節點加清楚的排隊／執行文字、spinner與不定進度條；僅prepared回放縮短polling，不捏造provider百分比。成片播放器110→240px，加入真成片新分頁連結；實際播放與seek通過。
- 最後 full（Demo前端更新後親跑）：1122 passed／2 skipped（33.83s）、frontend PASS、verify GREEN；focused38 PASS，TS app/node、lint、隔離build exit0。最後註解變更後重新build的檔案與UI驗收build逐byte相同。
- 1440雙路真UI回歸173步PASS：四次10.3秒1080×1920／30fps真MP4下載／解碼、刪片補回、文字／trim、stale後重匯出、原URL於真後端19812→28582重啟後播放ended、中英文。pageerror=[]，owned cleanup survivors=[]；新頁播放／seek與hover另有針對性證據。
- 原RED保留：舊prepared禁止外網播放器的測試，在使用者明確批准TikTok嵌入後更新；初次UI harness隔離HOME找不到既有ffmpeg，指定既有快取後通過，未安裝依賴。初期UI探測的錯誤標題／Storage proxy攔截方式也保留於針對性報告。
- 獨立Orca唯讀審查 task_32ec94fcfcb2／ctx_69ec6acc41d6：provisional ACCEPT、無P0–P3 finding，14檔hash與diff SHA256 `08382c25bd9107d1c2b3ab17a432f5dde198fda701498009a82d54528e8f3328` 前後一致；lead再次核對後ACCEPT此未提交快照。requested gpt-6.1-sol/high，worker runtime preview顯示GPT-6.1-Sol high Fast；底層provider metadata unknown。不是提交版／merge批准。多節點拖曳與取消/resize並發沒有新增真UI覆蓋，已做安裝版XYFlow事件及程式審查。
- 證據 `/tmp/buildclub-playback-polish-20261106/`；完整回歸 `attempt-a4b628a3/results.json`。8998前端已更新，後端PID78479保持不變／18998轉接未動；舊靜態資產保留。上線後新scoped session1440實測主參考hover time0.207636、muted=true，Research內容與展開正常、pageerror=[]。真人外觀驗收、Instagram非主參考影片檔、真provider生成不在已驗結果內。

## 2026-11-06：最新 Demo 整合分支（依使用者要求 commit／push，不合併 main）

- 目標分支 `feat/demo-integrated-latest`；從本輪 fetch 的 `origin/main @ 2c069a84569cd9ed2a70c4d284626057e5118e36` 建立。來源工作樹、既有服務、DB、影片與未追蹤研究目錄完整保留，不合併 main、不建立 PR。
- 已整合已驗收六鏡雙路線／Full Canvas／guided prepared 素材及真本機剪輯匯出；`six-shot-ai-flow` 的 460 檔凍結來源逐檔 SHA 核對後複製。21 鏡成片是另一份完成的 runtime 交付，不拿來替換六鏡：`~/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai/deliverables/final21/ever-green-fresh-ai-ad.mp4`；六鏡驗收與成片在 `~/Downloads/buildclub-demo-reference/six-shot-local-demo-20261106/`。歷史 UI 證據綁定各自原來源，未宣稱整合後重跑全部 UI。
- 收進 `a1383bf` 分析單次請求修正、`976ba7f` 隔離批次 server／16 tests、`553a2ae` binding／13 tests；保留 21 鏡完成流程的六份本機驗收 harness source／37 guard tests。這些歷史 runner 仍依賴原本機 batch／FixedEngine／Playwright 與狀態路徑，不能當可攜的一鍵生成工具；server 的 APP 改為本分支相對路徑。沒有執行生成 runner 或新增付費。
- 另外整合 `7a920fd` 的 median schema migration 競態修正與兩個測試；保留 main 更強的離線驗證 gate，沒有用該舊分支 shell gate 覆蓋。`bin/verify.sh` 無參數明確預設 full，修正 macOS Bash 3.2 空 positional array／nounset 問題，完整檢查沒有減少。
- 補上已完成、前端已使用的 PlanScript／BoardPos／Footage 後端模型與三個儲存測試，避免 script、boardLayout、拍攝素材 metadata 被丟棄。沒有採用已否決的 ShotWorkspace 草稿，沒有放入 pilot 付費生成腳本、runtime state、依賴、dist 或大型 QA 錄影。
- 最新親跑 `bash bin/verify.sh` GREEN：1122 passed、2 skipped（35.09s），frontend PASS；batch server 17／binding 13／finish guard 37 tests PASS（fake transport，離線，零實費）。驗收工具測試首次因自身清空 TMPDIR 而被既有 sandbox 擋住，改在 wrapper 指定自有暫存目錄後通過，未放寬網路／憑證限制。
- TypeScript app／node、隔離 build、lint exit0；新 build 的101檔與已驗收服務對應輸出逐 byte 相同，原服務額外21個舊 chunk 未帶入。建置包裝器初次清理子程序權限錯誤及 /tmp 對 /private/tmp 路徑差異均保留，不改產品；以實體路徑建置後通過。獨立 review 找到 smoke 會載入外部舊 server，已改為精確載入同目錄模組並補遮蔽回歸。程式整合與驗收已完成；code commit `23272ae8dd0314160dc8290b022b7fb1070d6b7d` 經獨立 integration_review 的 Spec／Quality ACCEPT，lead 核對無 drift 後接受。提交後 full 再驗 GREEN：1122 passed／2 skipped（37.14s）、frontend PASS。交付僅 push 本 feature 分支；遠端同步以 `git status -sb` 與 `git ls-remote origin refs/heads/feat/demo-integrated-latest` 核對，main 保持原 SHA。來源與過往失敗紀錄仍留在下方；本段最新授權優先於下方舊「不可 commit／push」狀態。外觀仍待使用者／Veralyn 審閱，真人批准未代行。

## 2026-11-06：六鏡雙路線／隔離本機真匯出已驗收（本機未提交）

- 整合工作樹 `six-shot-ai-flow`／`feat/six-shot-real-export`，原 guided-tofu-demo 展示與其他 dirty 保留。新預覽為獨立 loopback8998／render8999，generationEnabled=false；無 commit／push／安裝／新增付費。MacBook SSH目前無法連線，未改舊18991預覽。
- Plan a shoot：六鏡拍攝提示與來源衍生分鏡 animatic，沒有假實拍。Create an AI ad：沿用本輪真AI素材，S1／S5精確首圖I2V、S4 T2V，其餘靜態呈現；原21鏡成片與來源/失敗/10本費用ledger保持hash不變。
- 原生Editor真的保存、裁切、加英文文字、匯出與下載。預設兩路各315frames／10.5秒、1080x1920／30fps，檔案在 `/Users/tommy/Downloads/buildclub-demo-reference/six-shot-local-demo-20261106/`；AI含三組英文文字，兩路靜音。沒有真人批准或假送審。
- 完整1440雙路UI：每路14Canvas子步、History、刪首鏡→Use in Edit補回、英文文字與6frame trim、四次真MP4匯出、修改後stale→再匯出、Reset新UUID保留舊資料、EN/zh-Hant、真後端重啟40392→54209後兩路原URL文字/影片ended與SHA一致，全有錄影證據。QA backend/browser全部關閉，8996/8997空、lease釋放；user preview8998另行保留。
- 原UI runner最後outcome FAIL保留：網路彙總把26筆已block字型requestfailed誤算成功。Lead已讀腳本／原traffic／版本與重啟資料並親跑獨立audit：PASS，external success0、真provider/search URL0；12筆404均為root無guided的原生auth/health bootstrap fallback，guided editor404/pageerror0。這是明確限定的harness分類修正，不改寫原FAIL。
- 最後完整 `bash bin/verify.sh full` GREEN：1114passed／2skipped in40.52s，frontendPASS；TypeScript、isolatedbuild及lint exit0。Backend Spec/Quality與frontend修正review ACCEPT。曾發現的11項suite污染和Chromium streaming PUT／HTTP1 ALPN問題已修並由真UI保存驗證。
- 早期Remotion預設Webpack快取曾寫共享node_modules的生成快取；已在本輪專屬cache模式關閉該層，保留自有bundle cache，不刪既有共享快取、不改套件。手機依desktop1440範圍waived。
- 驗收與失敗證據 `/tmp/buildclub-six-real-export-20261106/`，最終UI `ui-evidence/attempt-c18b25db/acceptance-audit.json`；產品修改逐檔清單以交付根 implementation-manifest.json 為準。下一步是使用者檢視與外觀回饋；未獲授權不commit/push，不自動合併或清worktrees。

## 2026-11-06：六鏡雙路線與本機真匯出進行中（未交付）

- 實作整合樹 `six-shot-ai-flow`／`feat/six-shot-real-export`，HEAD 2c069a8 加已驗收 guided 426 檔基準及本輪增量。原 guided-tofu-demo 展示服務／dirty 保留，未 commit／push／新增付費。
- 原兩位 Orca 寫作 worker 回報未完成，沒有交付產品程式；lead 已接管唯一寫作權。實際後端終端顯示 Luna，與要求 Terra 不符，已披露，不將 launch receipt 當 resolved model 證據。另兩位原生唯讀 agent 盤點與 review 已返回具體缺口。
- 開工基準 `bash bin/verify.sh full` GREEN：1109 passed／2 skipped、frontend PASS。新工作樹以本地 symlink 使用既有依賴，不安裝、不寫共享依賴。
- 已準備 ai／shoot 各六支可追溯素材，315 幀／10.5 秒：AI 三鏡短動態加明示靜態停留、三鏡抽幀靜態；shoot 原片衍生參考靜態 animatic。S1／S19 原 ledger 首圖 parent ID／SHA／真檔 bytes 核對 PASS；S12 為 T2V，沒有偽造 poster→video。
- 已實作 standalone guided backend／精確 runtime bridge、原生匯入與剪輯保存、版本409、隔離session/route、來源hash gate、route reset，以及既有renderer的隔離cache／existing browser小幅支援。新後端5 focused tests PASS；runtime13＋fresh素材2 tests PASS；frontend全部712 PASS、TypeScript／隔離build PASS（仍有既有chunk warning）。獨立review先FAIL的reset/hash/metadata/signature缺口已修，待重審。
- 最新整合完整驗證 GREEN：1114 passed／2 skipped in34.28s，frontend PASS；lint exit0、TS／隔離build exit0。第一次full曾11failed／1102passed，定位並修正jobs_factory預設捕捉及guided污染原生media global；相容修正獨立review ACCEPT，不抹除RED。原生真render smoke已PASS10.3秒、新英文文字、重啟PID變更而project／影片SHA一致，首幀實看文字正確。
- 六鏡tour已分shoot拍攝提示／ai圖到影片，加入導覽專用Use in Edit；仍在整合，未做真UI或真Remotion匯出。沒有替換8991／18991已發布展示。
- 下一步：補齊UI脚本/素材文案一致、重審後端與前端、lint/full、啟動自有8996/8997真匯出smoke，再單一tester走1440雙路完整操作／錄影與重啟。不得把現有focused GREEN當goal完成。
- 本輪證據與進度：`/tmp/buildclub-six-real-export-20261106/`，baseline-manifest／lead-asset-review／i2v-parent-binding／integration-media-manifest；原錯誤source候選及失敗派工保留。

## 2026-11-05：交付隊友的統一分支（本輪最新）

- 分支 `feat/demo-team-handoff`，目標 remote 為 `origin`（veralynchong/BuildClub）；使用者已明確授權 commit／push，main 合併由隊友執行。此處紀錄準備交付的本機快照，push 結果以 Git remote 核對為準。
- 來源：Canvas `b651e6d` 加凍結的26檔增量，產品diff SHA256 `221c64465c9679c881416456fd98fe54a8a778b3175b1d26fb537321f94a7dd1`；demo `e442b3a` 加原有P1修正、32項零支出回歸、MP4工程證據及三天計畫。原工作區完整保留，不改其服務、DB、預覽或轉接。
- Canvas 已保存於 `02c5f99`；demo 的 App.tsx／模型等六檔以三方套用乾淨整合。保留 Canvas 新版 `bin/verify.sh`／`verify_offline.py`，不以 demo 舊版 mktemp shell 覆蓋。兩邊 STATUS／test-log 歷史均保留；下方舊「未提交／無push授權」僅描述各原工作區當時狀態。
- 親跑整合驗證：`bash bin/verify.sh full` GREEN，1109 passed、2 skipped（33.23s），frontend PASS；`bash bin/verify-zero-spend.sh` 32 passed（0.50s）。build／lint 在無網路、無憑證、只可寫自有暫存前端的 macOS sandbox 中 exit0；保留既有 large-chunk warning。首次build因暫存副本 `.vite-temp` 指向共享快取而被拒絕，改成自有暫存快取後通過，未放寬sandbox或寫共享依賴。
- 起點 `origin/main @ e442b3a` 在相同離線gate下有一項既有 render orphan recovery 失敗（968 passed、2 skipped）；Canvas前置commit已修改該流程，整合版通過。demo歷史的七項預算0整套測試RED仍保留，不冒稱已逐項解決其92個失敗；完整套件本次以無網路／無憑證sandbox及測試fake wallet執行，另以32項回歸驗證零預算拒絕。
- 已完成的Canvas mock／免費UI證據維持原來源hash範圍，不追溯宣稱本整合分支重跑全部UI。正式同案例素材、真provider品質／等待／帳單、真人Clean up與整合版真前端全流程仍未驗。現有9.024秒MP4為產品導覽素材工程片，不能當正式demo成品。
- 付費API批准仍為US$0；沒有真provider呼叫、安裝套件、直接推main或merge。資料、憑證、共用依賴、dist、pycache及既有未追蹤研究目錄不納入。本次完整變更／新增／刪除清單見 test-log 的「交付分支檔案清單」。
- 下一步：隊友檢查此分支後自行合併／整合到最新main；之後在合併版本核對依賴並重跑full與zero-spend，再以有權素材補正式案例影片。不得把本次工程片／mock成果當真AI生成驗收。

2026-11-05 MacBook 預覽轉接修復：原自有終端 SSH 已 exit255、MacBook8875無listener，mini網站正常；改為獨立背景SSH master（自有control socket記progress，未關其他轉接），先驗master running、MacBook `/api/health` live=true及首頁HTTP200，再重開網址。後端／DB／素材未重啟或修改，保留新轉接給使用者。

## 2026-11-05：Canvas 列表白底主題修正

使用者依截圖要求新增區塊／卡片預覽配合白色背景。僅改 `src/styles/canvas.css` 的 Canvas picker 顏色：新增form、input、label、placeholder、primary button、preview/dots沿用現有surface／fg／muted／line／accent tokens；淺色白底、深色自動對應，未改排版／功能。

- 親跑 `bash bin/verify.sh full` GREEN：1076 passed、2 skipped（33.72s）、frontend PASS；隔離build／lint exit0（既有chunk warning）。產品diff更新為 `221c64465c9679c881416456fd98fe54a8a778b3175b1d26fb537321f94a7dd1`，舊UI證據仍綁各自原來源，不追溯改寫。
- 實際CanvasPick DOM1440瀏覽器Light／Dark PASS：Light form/input/card preview為rgb(255,255,255)，Dark跟隨主題，input/button文字與底色不同，pageerrors=[]；owned browser關閉，使用者瀏覽器未碰。初次登入定位大小寫及未等色彩transition的harness失敗先取CSS規則／token新證據後調測試，沒有為測試改產品邏輯。
- 僅把重建dist更新到自有8875暫存preview的dist及本工作區ignored dist；沒有重啟後端、沒有改DB／素材。更新後用真served CSS重驗Light／Dark（無style注入）PASS。使用者重新整理即可看到，MacBook轉接保留。
- 證據 `/tmp/buildclub-picker-theme-2026-11-05/`：check-served.cjs、served-results.json、served-picker-light-1440.png／dark、frontend-build.log／lint.log；full原始log `/tmp/buildclub-picker-theme-full.log`。本次只改產品CSS與既有STATUS／test-log，本機progress更新；未commit／push／merge，US$0。


2026-11-05 使用者先跳過 Magnific 原生連續錄影（登入／錄影閘門未完成，未開始操作）；免費 Canvas 驗收已完成。依要求在 MacBook 打開 http://127.0.0.1:8875/，因原轉接無 listener，新建自有 SSH reverse tunnel 後 MacBook health live=true／demo=true，open-on-macbook exit0。保留預覽與新轉接終端；句柄記本機 progress，不碰其他服務。

## 2026-11-05：免費 Canvas 剩餘驗收全部通過；Magnific 操作／分段擷取完成

本段為最新結論，補足下方原先的未測事項；沒有新增產品變更或 commit／push／merge。來源仍 product diff `067e9b879bb439d2cb891c13664b58a7fb448f8d197b3518933f235ba80a2aac`／unit `6fd5ba6ce3e0031160a0c601be36838ff25846e98b886eda4bc54fdfa5915593`。原完整驗證 1076 passed／2 skipped、frontend PASS、build／lint exit0 仍適用，後續只有 tmp 驗收與既有文件更新。

- Canvas 原五組剩餘項已全 PASS（下段詳列），unknown UI 也已補驗 PASS：root 批准自有 tmp mock adapter 僅 marker prompt 的 poll raise 現成 ResultLost，仍經真 quote／confirm→worker→DB unknown→UI loss alert；舊 selected/output 保留，reload／reopen 及 PID 82492→84023 真重啟後 unknown 保留，3 rows／3 submit 不重送，虛擬 .01 reservation 不退／不重扣，其他成功歷史可選。未改 repo、未偽造 HTTP、未接真 provider。
- root 親跑 `python3 /tmp/buildclub-canvas-unknown-ui-2026-11-05/verify-artifacts.py` exit0：50 新 artifact hashes、原964／130檔凍結 hash、產品/unit/dist不變、unknown/restart/rows/wallet行為、cleanup survivors={}／4ports空及leases釋放、完整 VP8 1440×900 36.40s影片全 PASS。報告／影片位於 `/tmp/buildclub-canvas-unknown-ui-2026-11-05/`，原五段影片仍在 gap-completion 目錄。8875 健康檢查 live=true／demo=true，保留給使用者。
- Magnific 完成非生成操作比較：模型搜尋／Provider/Features 篩選、張數、比例／解析度及換模型正規化、合成PNG參考圖與typed連線、Image→Video／互斥提示、Video控制、History／save／reload／remove／Undo。兩位不同任務 worker 分別交付，沒有重啟已done worker；paidCalls=0，連 tooltip 顯示0credits的Run也未按。
- Magnific 前段補錄 A–E 五段 **step-captured GIF**（41／35／11／13／47 frames，worker用ffprobe與sha256驗證），加上原50frame後段GIF，所有段低於50frame上限，未被滾動截斷。每段≤25frame目標未達，原因與真實frame數已保留，不影響各段覆蓋。**不是連續螢幕錄影**：工具只有gif_creator，連續MP4／WebM標BLOCKED，沒有安裝或擴增桌面／ScreenRecording權限。MacBook報告與片段索引在 `/tmp/buildclub-magnific-recording-completion-2026-11-05/report.md`；原操作報告／41screenshots／52s後段GIF在 `/tmp/buildclub-magnific-flow-comparison-2026-11-05/`。root讀確切worker transcript核對格式、清理與限制，私有截圖未傳到mini。
- 比較後優先缺口：1 模型搜尋及Provider/Features篩選（現有BuildClub ModelPicker只有kind清單／tier）；2 模型特有quality與隨參考圖變化的品質控制（現有NodeData／GenModel未建quality欄位）；3 Magnific Video end-image／audio／reference-video等輸入需另行設計／provider能力接線，不能只照抄選項。比例／解析度／張數正規化、typed refs、手選歷史與批次保存已具備，不再列為全缺。BuildClub總報價／重新確認有真mock證據；Magnific僅觀察到x1/x10皆Run0credits，無法推論付費重報價是否存在。這些是比較建議，不是新增改版授權。
- 清理：Magnific owned testnodes移除、Image Generator回Auto/x1/1:1/1K／空prompt，ownedtab/group已關；合成asset可能仍留Assets，未刪他人素材。原使用者瀏覽器／其他服務未碰。
- 最終剩餘：Magnific連續影片受工具能力阻擋；真 provider 生成／等待／品質／實際帳單、Magnific付費生成及真發布不在本次US$0授權。逐次列模型、帳戶用途、估價與硬上限，取得當次明確yes才可做。不能把mock驗收冒稱真服務驗收。所有現有免費Canvas UI待驗項已補完。


## 2026-11-05：剩餘五組 UI 補驗全通過；Magnific 已操作，補錄前段中

本段補足下方原先未測 tail／邊界，產品來源仍 `067e9b879bb439d2cb891c13664b58a7fb448f8d197b3518933f235ba80a2aac`、unit `6fd5ba6ce3e0031160a0c601be36838ff25846e98b886eda4bc54fdfa5915593`，沒有修改產品、commit／push／merge。

- 新獨立 agent 補完五項，最終皆 exit0：Legacy Kit rename/item/reference/frame/stale 與 media/edit PUT hold 時不得離開、release 後才導航；新 batch 仍 active 時 reload 恢復三 child／保留舊 selected／不重送；image→video 真連線後換圖使 downstream stale 而不生成；純 copied catalogue price 改動不影響原 output／stale，但 quote 期間改價須重確認；非法 saved graph 顯示合法 fallback、raw quote422/0rows，合法 model 選擇 normalize 保存並完成 mock。
- 每組有完整未加速 1440×900 VP8 錄影（30.84／27.32／26.48／11.56／12.72 秒），索引 `/tmp/buildclub-canvas-gap-completion-2026-11-05/report.md`。root 親跑 `python3 /tmp/buildclub-canvas-gap-completion-2026-11-05/verify-artifacts.py` exit0：130 hashes、五組PASS、9cleanup survivors={}、四測試埠空／leases釋放、產品與unit hash不變、五段影片格式通過；8875保留。原130／964檔證據不覆寫。
- 原 mock 無 unknown route；root 已批准最小隔離 tmp FakeAdapter/ResultLost fixture，走真正後端 worker／持久化／UI polling，不偽造 HTTP 成功或 unknown。新有界 agent 補驗中，不改產品、不呼叫真 provider；與已done worker分開。
- Magnific：新 Claude worker 在自建 group/tab 實際驗模型搜尋／篩選、張數1–10、能力正規化、合成PNG參考／typed ports、Video首尾輸入互斥提示、History、reload保存、remove／Undo；paidCalls=0、未按Run。41張截圖與50-frame約52秒逐動作GIF位於MacBook `/tmp/buildclub-magnific-flow-comparison-2026-11-05/`，GIF只有後段，不能說完整連續錄影。設定及自建節點已恢復、owned tab關閉；合成asset可能仍在Assets，未碰私有素材。
- 正補錄 Magnific 缺少的前段，以分段擷取避免50frame滾動截斷；若工具只支援逐動作GIF，會明列連續影片能力阻礙，不安裝／擴權。比較需以當前BuildClub已有能力為準：比例／解析度／張數正規化、typed refs、歷史手選、總quote/requote已實作，不照抄舊版「全部缺少」建議。真生成／等待／品質／扣點仍未測，付費批准額US$0。


## 2026-11-05：Canvas 控制項與 UI 修正已驗證；部分舊恢復項未測（未提交）

使用者要求手動驗證後，已由最終來源重新隔離 build（exit0）並啟動 mini http://127.0.0.1:8875/，Orca 預覽已登入合成測試帳戶、開啟 `Canvas controls verification` 的 Image generator；實際可見模型／比例／解析度／張數／參考圖且 Saved。所有付費預算 0，保留此自有預覽供使用者操作；啟動器停止會清除其暫存 DB／素材，不當正式資料保存。啟動終端與 browserPage 記於本機 progress；未碰其他服務。

本段為目前狀態，取代下方「待討論修改」的下一步。使用者已授權兩項 bug、模型能力／比例／解析度／張數、卡片參考圖、多張結果與歷史切換；最新指示完成既有任務並更新本地紀錄，不擴大範圍、不修改 demo-flow-qa。分支 `feat/canvas-generation-controls`，HEAD `b651e6d1312db6ec3d86235b01360953fa2d0cf7`；未 stage／commit／push，沒有 merge 授權。

- 任務→交付：bug worker 的深色 Editor／搜尋失敗提示、backend worker 的選項驗證／整批報價與原子預留、frontend worker 第三版的能力設定／參考圖／批次與歷史均已交付。三份 patch 獨立覆核 provisional ACCEPT 後套入；已完成 worker 未重啟。
- Review→整合：原 24 檔功能版本跨層 spec／quality provisional ACCEPT，無 blocking findings。原 tracked binary diff SHA256 `731da3b792679102b3661bd801f4be78eaba8fce88d51011d89c70720afc2045`，原新增 unit SHA256 `403f17b525df3558ec54e5f69712c55a0693c691e2606631831a07305753182e`。已修空批次恢復、listbox destructive key 冒泡、舊失敗批次覆蓋新單張追蹤；focused 19/19。
- UI 新發現並修正：模型 option click 受祖先 label 隱式 activation 影響，選完模型後 menu 重開。root 僅改 ModelPicker 的 option click `preventDefault`，既有實際 component handler 測試先 RED、後 19/19 GREEN；仍 active UI agent 唯讀認可這一行及測試合理，瀏覽器新版確認進行中。新產品 diff SHA256 `e7477f5226227f5b5b19344c74accb89da64f90384a54ae407a40d11180a84bd`，新 unit SHA256 `6fd5ba6ce3e0031160a0c601be36838ff25846e98b886eda4bc54fdfa5915593`。原跨層 review 不追溯涵蓋這項追加。
- 最終追加修正：實際抓到 100% zoom 卡片外層 `visibility:hidden`、節點及結果仍在。CanvasScreen 重建受控 ReactFlow nodes 時未保留 measured，且忽略 dimensions events；依已安裝套件 adoptUserNodes 的明確重設機制，改為 Board 本地正 finite 尺寸 cache，僅尺寸變化更新並帶回 FreeNode，不寫入 canonical doc。Board resource key 重掛會清 cache，沒有 force visible 或鎖死高度。原 upload abort→同 node retry→參考連線已通，三節點全 visible；新量測四項含 batch／設定／選圖保存、Editor 返回、跨 workspace 新節點及重開皆 PASS，保存 JSON 沒有 measured／width／height。原疑點已有針對性修正及實際重驗；不以一次錄影未重現當結案。
- 最終來源：product-only tracked diff SHA256 `067e9b879bb439d2cb891c13664b58a7fb448f8d197b3518933f235ba80a2aac`，unit SHA256 `6fd5ba6ce3e0031160a0c601be36838ff25846e98b886eda4bc54fdfa5915593`。同一仍 active UI agent 對 picker 一行與量測追加差異獨立唯讀 review provisional ACCEPT，並以新 tmp build 驗證；已 done worker 未重啟。原大 patch review 與新版增量證據分列。
- 最新 root 親跑：`bash bin/verify.sh full` GREEN，1076 passed、2 skipped（36.13s）、frontend PASS。相同最終來源的 deny-network 暫存副本 `npm run build`／`npm run lint` 均 exit 0（既有 large chunk warning）；沒有安裝依賴。輸出 `final-measured-full.log`／`final-measured-build.log`／`final-measured-lint.log`。
- 原整合版本 UI 已通過：controls-v3 5 項（五張 SVG 真尺寸、鍵盤、設定／選圖 reload）；navigation 21/21（429 alert／保留舊結果、EN／繁中、主題）；contrast 四種狀態各 16 元素最低比 4.9226／6.3111／4.9226／6.3111；mixed 2 項（一失敗兩成功、手選保存）；refs-final 5 項（取消、既有圖、移除保留來源、真上傳連線、fixture Kit／繁中）；chronology-final 3 項（新單張及 POST 後 tracking 未存就 reload）；legacy-entry 3 項。synthetic quote 三項實際通過（價格變更重確認、第一次 rows0、超額429 rows0），不把後半失敗的整組宣稱全綠。
- 主流程 renderer-diagnostic 13/13 PASS：mock provider 實際圖片／影片／音訊檔、PNG→MP4 upload replacement、剪輯／字幕、真本地 Remotion H264/AAC 1080×1920 3.52s、匿名播放／核准／退回，以及 approved／rejected 兩次真正後端重啟保留 byte-identical media。不是 live provider 或真人素材驗收。原 main-v2 曾因 `No available ports found` 失敗；相同 policy 加被動 listen 記錄後通過，使用 8892／8893，根因仍未確證。獨立探測 3000 被拒不能推論 renderer 實際用它；未擴權或關其他服務。
- 最終新增 UI 證據：picker 點選後關閉、small-cap 正規化、no-ref 停用入口／保留既有 refs、鍵盤 PASS；history 兩項 PASS，含 card previous／next 與 History 選中相同、active 三 children 完成不搶手選；search 三項 PASS，含下一 request pending 清 error、cached 真 200 後沒有 stale error。upload 真 network abort→alert→同 Upload node retry／done／edge PASS；超額 graph 實際 422 拒絕且沒有新增 generation。原預期 400／multipart 415 等 harness 失敗保留，不改產品配合測試。
- 錄影：最終 `ui/measurement-walkthrough-final/page@1d954e0fed90e09d9be5193ee0cbc13f.webm` 為 VP8 1440×900、11.72s 短連續操作，含 mock batch、reload、refs、Editor 與 visibility／workspace 檢查；不是全站／完整送審錄影。前兩版短錄影保留。產品 MP4 另在 `ui/renderer-diagnostic/workspace.mp4`，有 ffprobe、frame、音量與重啟證據。
- 尚未完成／未測：recovery 前三組及後半兩次 mock TTS、匯入、舊 voice ownership、實際 audio→Editor 連線／重開子斷言通過；但 Kit Settings 被 header 遮擋，Kit rename／stale 與最後 critical media/edit leave-gates 未到，合組 exit1 保留，不能聲稱整組通過。該環境 finally 已關閉；直接接手步驟：用原 saved fixture 只跑 tail，先正常 pan Kit 到 viewport 中央、等縮放動畫穩定並 hit-test，再驗 Kit rename／stale 與 critical leave-gates，不 force click、不重跑已過 voice。
- 其餘未測：unknown provider outcome UI 沒有合法可控 mock 路徑，只能引用 backend unit，不能偽造結果；raw invalid saved settings 的完整 UI、部分未完成 child 的 POST/reload 窗口以最終 ui/report 矩陣為準。真 provider 品質／延遲／帳單、Magnific 完整生成錄影、真發布／analytics、真人素材、麥克風均未測。付費批准額 US$0、付費呼叫 0；真本地 MP4 不代表真 provider 或真人素材。
- 證據保存：`/tmp/buildclub-canvas-controls-2026-11-05/` 的 `progress.json`、三份 worker patch／report、contract、各 verification log、`ui/report.md`／report.json、group 原命令／截圖／清理紀錄；來源清單被 hook 攔下未重試。一次 tmp build 的 hook adapter 因 cwd 尚不存在失敗，後改先在既有 cwd 建自有 tmp 再 build，沒有繞過權限或秘密規則。所有已結束 runner 的 cleanup survivors={}；最終清理與來源／artifact manifest 由 UI 報告提供。
- 最終證據核對：UI agent 已完成報告與清理，root 親跑 `python3 /tmp/buildclub-canvas-controls-2026-11-05/verify-ui-report.py` exit 0：964 檔 hash、raw failures 保留、所有 survivors={}、產品 MP4 H264/AAC 1080×1920 3.52s、UI WebM VP8 1440×900 11.72s 全 PASS。測試專用 8872／8892／8893／8894 無 listener、lease held=false。26 檔完整修改／新增清單在 `docs/test-log.md` 與本機 progress；無檔案刪除、無 commit／push／merge。
- 未測／界線：真 provider 品質／延遲／帳單、Magnific 完整生成錄影、真發布／analytics、真人素材及麥克風；當次付費批准額 US$0、付費呼叫 0。只 offline／mock；保留其他服務、使用者瀏覽器及共用依賴。未提交、未推送、未合併；不能把仍未測 tail 標成完成。

## 2026-11-05：Claude 已補 Magnific 帳戶選單實測

使用者要求派Claude後，Orca在MacBook啟動Sonnet worker（dispatch `ctx_7d8a209a3a7a`，task `task_554b52e8e1ad`）。首次因session無tab group未開始，root說明既有測試授權涵蓋自建可回收group後，worker以Claude in Chrome建立自己的group／tab並成功開啟指定Untitled space。root已讀worker_done與確切transcript，確認開啟的Magnific URL、自建tab關閉、group自動移除與設定恢復；不宣稱瀏覽器已確認為Brave（Chrome UA不能區分）。本段補足下段原本Magnific操作NOT RUN的部分範圍，不追溯改寫原始阻礙。

- OBSERVED：模型選單約50個選項，含搜尋框／Featured與All Models分組及New/Beta標記；搜尋輸入後是否正確過濾未確證，未見價格或不可用原因。Auto張數1–10、即時自動保存；Auto比例10種、Size為1K／2K／4K；Nano Banana 2.1另有21:9／8:1／4:1／1:4／1:8等比例；GPT 2.5另顯示子變體、品質與Transparent控制。以上為worker帳戶畫面觀察，不代表provider真輸出或所有模型能力已驗。
- 卡片內+開參考圖選擇modal，含History／Uploads／Stock／Style／Character等來源；只開啟、未選取／上傳任何素材。已看toolbar、連線下拉的下游node選單、更多／Inspector／History入口；沒有拖線建立node或檢查History全部分頁。
- 起訖均為1個空白Image Generator #1，已恢復Auto／x1／1:1／1K；原使用者tab保留，自建tab關閉，沒有按Run／生成、沒有付費API，paid_calls=0。viewport1132×1042、DPR2、app zoom83%，不與不同zoom的BuildClub截圖作像素大小判定。
- NOT RUN／未見：真生成品質／延遲／排隊／失敗狀態、卡片價格或credits、模型不可用原因、拖線建node、History的Assets／Nodes分頁。不能因此聲稱Magnific沒有價格功能。
- 報告在MacBook `/tmp/buildclub-claude-magnific-2026-11-05/`（report.md／report.json／40張screenshots）；參考圖modal截圖含使用者私人素材，留在該機、不外傳。Mini的既有比較報告屬先前文件／程式盤點，應連同本段實測補充閱讀。
- 整合建議（待使用者決定，尚未修產品）：先修已確認的Editor深色可讀性與搜尋失敗無提示；再補模型能力感知的比例／解析度選擇（需node保存、API驗證、報價、預算與歷史契約同步）；之後做卡片參考圖入口與模型資訊呈現、多張結果及總報價。未自動把其他模型全部加入或重做全站。

## 2026-11-05：全站 UI 稽核與 Magnific 比較（待討論修改）

使用者核准順序：恢復隔離環境／瀏覽器連線→BuildClub全站UI與Magnific操作平行比較→共同決定修改清單→修改後重測及逐次批准真生成。使用者進一步澄清 Canvas 前端由本人設計，可直接討論 Canvas 外觀與流程；全站其他頁面仍遵循 Veralyn 的設計。本輪兩個唯讀agent取證，沒有修產品或呼叫付費provider。

- 驗證基準 `f91d9c92eabedd89a01669148d6ea1cfd7d10d5d`，PR #54 OPEN，base `feat/freeform-canvas`；PR #53／54均不合併。agent開場full GREEN：1039 passed、2 skipped（35.13s）、frontend PASS；當前frontend build exit0（既有chunk warning）。
- 真瀏覽器1440：main 13組、recovery 5組、legacy-entry 3組PASS；含空白Canvas、拖移／zoom／reload、typed inputs、mock圖片影片配音、上傳／剪輯／真1080x1920 AAC MP4、簽出review播放與approve/sendback、核准及退回後各真正重啟backend、資料與素材hash保留、CAS409恢復與跨workspace隔離。主suite舊深色字色斷言首次RED，僅在/tmp測試副本加明確dark前置後PASS，原始失敗及單行diff保留，不冒稱原腳本直接通過。
- 全站導航補測覆蓋Landing/Login、client新增／保存、Home/Overview、Find/cached search/filter、Research新增／reload、Compare、Plans/Plan、Canvas、Channel、Brief保存、Settings Light/Dark/System／reload、繁中與匿名保護。最終navigation-v4為20項PASS、1項確證FAIL、pageerrors=[]。無token環境的cached搜尋503與dummy token／zero-budget環境分開取證；沒有真搜尋費用。曾有fullPage截圖觸發viewTransition拒絕；viewport-only及正常resize未重現，使用者影響仍未確證。
- 確證問題1：深色Editor文字與選中按鈕對比不足。標籤／Clip文字對比約1.11:1，Bottom／White選中按鈕約1.10:1，Light正常；`src/styles/canvas.css` 的 `.fc-editor` 使用不存在的 `--text` 而退回#222、固定light色彩模式，需修復並重驗深淺色。
- 確證問題2：在已有結果頁搜尋未快取關鍵字，API429後沒有可見alert/error，仍留舊tofu結果；錯誤被存入App的searchError但ResultsScreen未呈現。需保留舊結果並明確顯示此次失敗，不能讓使用者誤認新搜尋成功。
- Magnific實際操作NOT RUN：Brave browser bridge不可達；paired MacBook desktop-control未授權，沒有繞過或擴權。ChatGPT裡開啟Magnific App不代表本Orca對話已取得工具／分頁連線。已查版本沒有可原地補grant的Settings toggle，不要指引使用者盲目重啟Orca或找不存在的開關。
- Magnific初版10項比較依使用者截圖、官方文件與本地程式分列，不能冒稱帳戶選單實測：模型／參考圖／連線／歷史已有但入口不同；張數、比例、解析度是真缺口（OpenRouter固定n1／1K／9:16）。先討論模型能力提示、比例／解析度與報價契約，再決定批次結果／進階設定／卡片布局。Fit49%截圖不能直接跟Magnific參考圖比較字體／節點像素尺寸。
- 證據：`/tmp/buildclub-ui-audit-2026-11-05/`、`/tmp/magnific-comparison-2026-11-05/`。root複核editor截圖與final-process-audit：10次runner記錄survivors皆{}、listeners=[]；沒有改既有服務／瀏覽器或共用依賴。發布預設fake，部分analytics為placeholder；真發布／provider品質費用／Magnific動態操作均未驗，花費US$0。
- 下一步：接通使用者指定的Brave插件（先確認插件名稱／連線畫面），補Magnific動態選單證據；與使用者確認先修兩項bug及Canvas功能優先序，再另行實作與重測。真生成仍須模型／帳戶用途／估價／硬上限及當次明確yes。

## 2026-11-05：OpenRouter 圖片接線（離線通過，尚未付費測試）

使用者已自行在主 repository 的本機設定加入 OpenRouter Key 與圖片／影片／配音每日上限；本 session 未讀取該檔案或 Key，不宣稱已確認執行中的設定。分支 `feat/openrouter-image-provider` 接續 `feat/freeform-canvas`，不合併 PR #53。

- 新增 `Nano Banana 2 · OpenRouter`，使用獨立 `OPENROUTER_API_KEY` 與 Image API；一次一張、1K、9:16，支援參考圖，不自動 fallback／重送。前端沿用既有 model menu，沒有設計變更或新增依賴。
- 與其他圖片共用每日圖片預算。每張保守預留 US$0.10，provider 按 token 計費；有回傳 `usage.cost` 時保存實際費用，每日 wallet 保留預估扣額。這不是 provider 帳單的絕對硬上限。逾時／5xx／不明結果不退額、不重送；明確 4xx 拒絕可退額；不可用圖片不退額。
- 驗證：2026-11-05 親跑 `bash bin/verify.sh full` GREEN：1039 passed、2 skipped（31.61s），frontend unit PASS；新增16個假HTTP／API回歸案例，涵蓋格式、參考圖、Key隔離、預算拒絕、素材保存／費用、錯誤與結果只取一次。公開模型 metadata GET 確認支援1K／9:16／參考圖，無驗證 header、無生成請求。
- 同日先前 `06d26c4` 修正 `bin/real-fal-backend.sh` 尊重設定的三項生成預算（exported env 優先），拒絕無效金額；12項合成預算測試、full GREEN（1023 passed、2 skipped）。該腳本仍只傳 fal credentials，不代表 OpenRouter 已啟動。
- 未驗／下一步：目前沒有真服務在8875執行，原交接的暫存目錄已不存在，不能沿用舊預覽仍存活的說法。需準備安全的 OpenRouter 測試啟動環境、確認生效預算與專用Key限額，再逐次列模型／帳戶用途／估價／硬上限並取得明確yes，才可送出第一張真圖片。真provider呼叫0、花費US$0；品質／延遲／真實扣款及重啟恢復仍未驗。未碰其他服務、瀏覽器或共用依賴。

## 2026-11-05：Canvas 收尾、職責界線與下一階段

本輪重做與離線驗收已完成，交付 PR #53（不合併）。本次收尾將已驗證的 Canvas 全站主題同步增量納入同一功能分支；沒有另做全站設計。使用者已指示下一階段以後端為主、前端以隊友 Veralyn 的設計為準。

### 後續協作界線（使用者明確要求）

- 本人的主要範圍：後端架構、API／provider 接線、資料保存、生成任務狀態、錯誤處理、素材／剪輯／送審主路徑與可觀察驗收。
- 前端以 Veralyn 的設計與既有元件為準。僅修改完成後端串接必需的資料綁定、狀態／錯誤呈現與可重現 bug；先沿用既有排版、字型、配色和設計系統。
- 超出已核准 Canvas 重做的外觀／導覽／操作流程變更，先列出影響與理由並討論，不自行延伸重設計、不主動回退隊友內容。不改 AGENTS.md／CLAUDE.md。

### 昨晚至本次交付

- 空白自由 Canvas、Prompt／上傳／圖片／影片／配音／editor 節點、既有助手介面；素材→Canvas→剪輯→真 MP4 輸出→送審；全站未接線功能盤點。
- 已修入口 plan guard、非同步保存後導航、CAS 草稿恢復、舊 plan 直開 editor、legacy 助手 shot 契約、voice ownership／匯入、卡片重疊、typed port padding、畫布版面與暗色標題、channel 狀態競態／test worker 清理。
- 已交付本機 Plan／Tasks／Status、完整124檔變更及53來源 hash 的既有 QA checkpoint、固定程式及視覺獨立審查。21項／組1440桌面 UI 全通過，含真 Remotion MP4、核准與退回後各一次真正重啟並保留資料／媒體。
- 今天追加主題同步：Canvas 跟隨全站「設定→外觀」淺／深／系統，移除獨立切換／偏好。選系統時即時跟隨 OS，明確主題優先於 OS；保留畫布內容。既有 QA checkpoint 是追加前的固定來源，不宣稱它涵蓋新主題增量。

### 前端範圍覆核

唯讀審查 base e442b3a→1f8da77：src 共36檔、+1548／−1494行，主要集中 CanvasScreen 重做。CanvasPick 改成獨立畫布入口，FreeformNode／CSS 為新畫布視覺；這不是僅改後端，但符合本輪核准範圍。App、SharedReviewPage、EditorPanel、ExportBar、ShotClips、MusicTool、VoiceTool 等另有入口／保存／剪輯／審核接線修改。沒有改 Landing、Home、Overview、Sidebar、ClientHome、全站 theme CSS、logo／品牌資產。仍需 Veralyn 確認 Canvas／CanvasPick 外觀，以及 workspace VoiceTool 改由 Canvas 節點接入、隱藏舊錄音／上傳／TTS 控制的流程決定；不把這一項說成純型別調整。

### 驗證與未驗事項

2026-11-05 本次收尾親跑 `bash bin/verify.sh full` GREEN：1023 passed、2 skipped（31.55s）、frontend PASS；主題增量 build／lint exit 0（只有既有 large chunk warning）。1440瀏覽器實測全站深淺色、OS即時變更／優先順序、reload重開、繁中設定、內容保留、無獨立切換／無pageerror，全部PASS；證據 `/tmp/buildclub-app-theme-qa`，cleanup survivors={}。真 provider 圖片／影片／配音品質、等待、實際費用與真發布仍未驗，US$0；mock 不是真實服務驗收。全站盤點另有 Research本機儲存、board fallback／objectURL、發布adapter及dashboard placeholder等後續，不代表全站全部修完。

### 清理與保留

使用者授權清理後，47個Git工作區移除16個已合併origin/main、乾淨、無執行工作／cwd引用、無其他工作區依賴且沒有DB／素材的舊工作區；無force、無遠端分支刪除，15個具名本機分支仍保留。移除：bg-search, board-3col, breakdown-fields, content-types, demo-fe6496, filter-panel, fix-local-covers, fix-yt-channel-url, landing-real-videos, landing-shots, logo-to-landing, phase3-plan, reanalyse-fix, research-p3, shot-framing, verify-numbers。剩31個。`integrate-1102` 的共用 node_modules、`w2-grade-subs-backend` 的共用 venv 必須保留；compare-videos／demo-35b436b／integrate-main／verify-fe6496 含本機資料，保留。其他dirty／活躍／研究工作區未碰。清理明細與收據 `/tmp/buildclub-wrap-cleanup-results.json`。

使用者進一步指定清理側欄 Canvas worker 後，追加移除9個已完成且乾淨的worker工作區，保留全部9個原分支與提交（它們經cherry-pick整合，不冒稱原branch已合併main）；共清25個、47→22個。移除：freeform-legacy-entry-e2e、freeform-restart-verification、freeform-canvas-backend、freeform-canvas-frontend、freeform-channel-test-fix、freeform-entry-fix、freeform-legacy-integration-fix、freeform-recovery-e2e、freeform-test-lifecycle。刪除前核對agent皆done／無dirty／無DB素材／無其他工作區依賴引用，刪後核對branch HEAD不變、目錄及Git註冊消失；無force、無branch刪除。收據 `/tmp/buildclub-worker-cleanup-results.json`。整合工作區freeform-canvas及預覽保留，未讀通知已清除；其他專案不動。

mini 隔離預覽 http://127.0.0.1:8875 持續供使用者看，前端已更新；MacBook loopback8875經 SSH reverse tunnel接 mini8875，已從MacBook健康檢查通過。保留預覽DB／素材；沒有關閉使用者瀏覽器或他人8871服務。

### 下一個 session 建議（本輪不執行）

1. 先核對 PR／交接與乾淨狀態；確認要測的 provider 憑證是否由既有服務安全提供，不讀／印key、不source秘密設定、不安裝依賴。
2. 優先逐項真實後端測試：先一張圖片，再一段影片，再配音，每次先列模型／帳戶用途／估價／硬上限並等明確yes；記錄成功輸出、等待、錯誤／重試、實際費用與可取得餘額。不在本輪花費。
3. 用真素材走同一條Canvas→剪輯→輸出→送審與reload保存；真實provider接線確認後，再操作Magnific比較同一流程的UX與等待體驗，先整理差距供隊友討論，不直接重做前端。

## 2026-11-05：空白自由畫布重做進行中

使用者已核准：深色Magnific式空白畫布直接取代舊Canvas、六類節點能力與既有助手、全站接線盤點並優先素材→剪輯→輸出→送審；無人值守Multi Agent、commit/push/開PR，不合併，不做外部API測試、不花費、不安裝依賴。計畫／逐項任務／執行狀態位於 `pivots/02-content/docs/plans/2026-11-05-freeform-canvas-{plan,tasks,status}.md`。

本機／mock改版階段已完成，PR #53：https://github.com/veralynchong/BuildClub/pull/53（OPEN，未合併），base main/head feat/freeform-canvas。固定2776a19程式及視覺獨立審查皆ACCEPT，root接受；最後full GREEN：1023passed2skipped、frontendPASS，build/lint0。主13＋恢復5＋legacy入口3項／組真UI全PASS，含真MP4／可聽配音、CAS/Kit/歷史/導航保存、NoShots恢復，以及核准／退回後各真正重啟backend並保留state/public JSON/media SHA256。QA含124筆變更清單、53來源hash、截圖與全部zero-survivor audit；詳見pivots/02-content/docs/plans/2026-11-05-freeform-canvas-status.md。最後PR/Status文件補述不改產品；真provider/真發布/品質/等待/計費完全未測、花費US$0，下一步須逐次報價/cap及yes。工作區已盤點，未刪除任何工作區、分支或既有資料。以下歷史PR不代表本輪。

## 2026-11-05：原生 takes → edit → 真 MP4 驗收（本輪最新）

- 接手核對：`fix/demo-flow-qa-mainline @ e442b3a`，15項既有dirty與專用交接一致，完整保留。本輪未改產品、Canvas、其他工作區、設定或共享handoff；未commit／push／merge，沒有重開workers。
- 親跑 `bash bin/verify-zero-spend.sh`：`32 passed in 0.40s`，exit0。全程env -i、七項paid budgets0、無付費憑證；原生鏈及新程序重開provider/network spy均0，wallet空。
- **完成（工程驗收）**：in-process真API、自己的臨時DB／media，repo產品導覽片上傳4個takes至3個shots；第2鏡切換alternate、原take取消選取；真ffprobe sources、edit version1保存／讀回；`POST /edit/export` 202→done，走原生worker及真Remotion，下載bytes與final.mp4一致，沒有fake probe／renderer／成品。`native-takes-proof.mp4`為H264 1080×1920、30fps、AAC、9.024s，全片decode exit0。先通過兩次TestClient lifespan，再用全新Python程序讀同一DB／media，edit／takes／成品hash均一致；不是HTTP服務重啟／真前端驗收。
- 瀏覽器實際完整播放：1440×900、ended=true、error=null、muted=false，抽查中段截圖；不是逐句聽驗。原生Reel用cover將橫片置中裁成直式，導覽文字遭裁切；字幕為英文自寫技術標籤，**不是同案例正式成品、真人Clean up或新Canvas驗收**。舊9秒工程片保留不覆寫。
- **驗證RED**：本輪完整verify在env -i＋七項budget0下，backend `92 failed, 910 passed, 2 skipped in 25.62s`；compile、load、frontend unit PASS。聚焦 `test_frame_poll_failed_refunds` 重現為預期fake provider 502、實際零預算先回429（`1 failed in 0.17s`）；其餘91項未逐一分類，不全歸同因。不提高預算、不拿歷史GREEN冒充本輪；產品沒有新增修改。
- 證據：`pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-{check.py,evidence.json,proof.mp4,playback-midpoint.png,playback-ended.png}`。臨時持久資料保留 `/tmp/buildclub-native-chain-ooc5gsg_`，可用check.py的`--reopen`重驗；完整命令在test-log。首次Chromium路徑前檢少一層已修正，未下載；首次about:blank播放失敗，改same-origin靜態頁後通過，歷史不隱去。
- **未測／依賴**：同案例有權真人或既有真AI素材及真拆解／參考畫面路徑已異步詢問，尚未收到；Canvas固定交付仍待其擁有人提供。真前端＋後端保存／重啟、正式畫音字幕品質、真人Clean up仍未驗。既有backend副本操作仍未批准，未重試或繞過；paid US$0，任何新生成禁止。
- 下一步：取得素材及Canvas固定交付後，才做同案例真前端接入與正式成品。完整verify零預算相容性需另行決定如何以fake測試涵蓋，不能調高paid budgets求綠燈。

## 2026-11-05：週六 demo QA 起跑與 P1 修正
- 恢復執行：使用者已確認核心為找熱門影片 → shot list／storyboard → Canvas 改編 → AI 或真人素材 → 剪輯 → 真 MP4；本機三天計畫已合入權威範圍並保留原增量。至少一素材路完整跑通，另一條展示接入；送審／全站支線不阻擋，手動發布貼連結，成效可明示示範數據，不做產品內發布或真平台授權。
- 當前驗證：暫停期間 worker 的 RED 原始後端錯誤未保留、未能重現；恢復後 test-slot＋獨立完整日誌兩次 verify 四項 PASS／GREEN（第二次包含 bin/verify.sh 改為每輪 mktemp 日誌，避免跨工作區共用輸出）。不是用歷史 GREEN 替代現況。詳見 test-log。
- 本工作區 `test/demo-flow-qa @ e442b3a` 與 fetch 後的 `origin/main` 相同；沒有 upstream，`git pull` 明確失敗，未將它視為同步成功。工作區沒有 `AGENTS.md`，本 session 遵循使用者提供的指示與交接。
- 最近驗證：2026-11-05 `bash bin/verify.sh` GREEN（四項 PASS）、`git diff --check` PASS。首次 RED 為 setup skip 後缺依賴；只建立本機 ignored 連結：`node_modules` → `canvas-p1` 的既有完整依賴，`backend/.venv` → `w2-grade-subs-backend` 的既有 venv。未安裝或修改共享套件，未改產品。
- 原 UI worker 已實際恢復並交付核心靜態矩陣，之後以動態 QA 未完成回報 failed／exited；不是 UI PASS。沒有 active worker 任務，不為通知重啟 finished workers。非主線全站與送審延後。
- 未驗／依賴：真人英文素材使用權與路徑待 Tommy 提供；第一支影片、Clean up、完整送審與持久重啟尚未通過本輪驗收。新版 Canvas 仍由另一 agent 負責，不用本版測試冒充其驗收。
- 整合驗證：2026-11-05 在以下未提交修正樹親跑 test-slot 完整 verify 四項 PASS／GREEN，build、lint、diff check 均 exit 0；獨立 reviewer 聚焦 20/20。UI、真人與持久重啟仍未驗。
- 程式進度：已在本機 `fix/demo-flow-qa-mainline` 套用經獨立覆核接受的 P1 #1／#5 七檔差異，仍是未提交工作樹（base e442b3a）；per-plan optional savedInLive、既有計畫恢復及 TikTok 大小寫。不是 UI 通過，整合驗證另見 test-log。
- 下一步：整合者接回免費核心查核；隔離副本操作仍被 hook 擋下，未批准、不繞過。取得有權素材與 Canvas 固定交付後驗主線。付費批准 US$0，不做產品內發布，沒有 commit／push／merge 授權。

## 2026-11-05：整合者接回 UI 與既有素材真 MP4（最新）

- 重跑零支出驗證：`bash bin/verify-zero-spend.sh`，2026-11-05親跑輸出 `32 passed in 0.35s`，exit0；腳本先拒絕已存在的本機設定，再以env -i與七項預算0啟動測試。新增腳本／測試與日誌隔離修正未另行獨立review，舊P1七檔review接受範圍不擴大冒用。
- 本機證據目錄：`pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/`，9檔（MP4、7張截圖、evidence.json）。真匯出使用已追蹤 `public/media/remake-tour.mp4` 的0–3、8–11、16–19秒；先 letterbox 保留橫式全畫面，經現有 Remotion Reel 匯出，加英文技術標籤／字幕。不是新 AI 生成、真人素材或正式 tofu 案例。
- 親驗：ffprobe H264 1080×1920 30/1、AAC 48kHz stereo、9.024s（時間線9s，含AAC padding）；全片 ffmpeg decode exit0；mean -20dB／max -3dB；Playwright 播放至 ended=true、error=null、muted=false，並抽查畫面。未完成主觀人聲逐句聽驗，字幕是自寫技術標籤、非轉錄。
- 原 failed UI 任務已由整合者接回一部分：真瀏覽器1440下實際選 Research sample→Plans 出現→真 reload 仍在，per-plan savedInLive 與 library 保存正確；shot list 編輯亦經 fake API 保存。這是實際前端＋瀏覽器內 fake API，不是真後端／新 Canvas／跨程序持久驗收。原 dispatch 的 failed 歷史不改寫為通過。
- UI 安全方案沒有建立被擋的後端副本：只啟 env -i 的 Python 唯讀靜態檔案服務，127.0.0.1:8891，實測 POST 501；所有 /api 回應由瀏覽器 route fake，外部字型等請求 abort，無付費後端、憑證或 provider 呼叫。預期的 mock429／字型阻擋 console 訊息已註明，不宣稱console全綠。
- Research 展開後 scrollWidth1473／viewport1440，舊 issue #2 已實機重現，未修。自己的頁已關、靜態服務正常停止、profile lease釋放，Remotion正常退出，8891／8892無listener。其他人的瀏覽器／服務與freeform-canvas未修改。

## 2026-11-05：原任務交付核對與零支出政策（最新）

| 原任務 | Patch／review／整合證據 | 狀態與缺口 |
|---|---|---|
| 接線盤點 task_eb358747b731 | 唯讀矩陣已存 demo-qa/issues.md；獨立 task_6a6c14d68b61 核對成因 | 靜態完成；不是 UI PASS |
| P1 #1／#5 task_5dc84402da84、task_b49dd821aaa5 | /tmp/buildclub-demo-p1-review-ctx1156.patch 七檔；首次 review task_57050706d8f2 拒絕兩個反例，補修後 task_82b57e760129 接受、聚焦20/20；已套用本工作區並親跑 verify／build／lint | 程式整合完成，未提交；UI 保存／reload 未驗。保留 worker 舊 RED 為歷史，不重開 worker 重跑 |
| 原 UI dispatch ctx_5412d8a8ceb6 | 已讀 exact transcript 與 msg_bf0b6c0e10e7、msg_b7286ea927f8；恢復後實際讀路由、算指標、核對 Canvas，再交付矩陣 | failed／exited：靜態交付完成；副本 hook 阻擋，UI／MP4／重啟未跑，未啟服務/context，不能列 PASS |
| 暫停 RED 診斷 | 恢復後受控重跑 GREEN；bin/verify.sh 改每輪 mktemp log，四項檢查未刪減；獨立日誌在 test-log | 原後端錯誤未留存、未重現，不能聲稱已知根因；日誌混用缺陷已修，該 shell 改動未另派獨立 reviewer |
| Canvas 前後端／bug workers | 使用者回報 done；本次僅讀 freeform-canvas Git／STATUS，HEAD b651e6d 仍有產品 dirty 增量 | 不重派、不修改、不操作服務；本 session 尚未拿到固定交付樹或驗其新版 UI，舊 STATUS 證據不可冒充現 dirty 通過 |
| 找熱門影片核心查核 | 自有 pinned tofu 保存記錄；in-process GET /api/search hit 12筆 cached=true，miss 空結果，外部搜尋／spend spy 不允許呼叫 | API 完成；11/2歷史指標，非即時平台核對；無同案例真 breakdown cache |
| 付費入口零支出回歸 | 新 backend/tests/test_zero_spend.py；env -i、七項預算0，程序內 TestClient、32 passed，逐案 provider/network spy=0、無 wallet 扣額 | 本 QA 分支 fake 驗證完成；此新測試未另獨立覆核，不代表新版 Canvas batch／外部服務或 provider 帳單限制已驗 |
| 核心最終成品 | 已新增既有 repo 素材→真 Remotion MP4 技術匯出（9.024s）及完整瀏覽器播放證據；不是同案例真人／AI 成品 | 正式案例未完成；素材／固定版本／真後端 UI 環境為依賴，送審與 analytics 不阻擋 |

付費批准額為 **US$0（含 credits／預付餘額）**。本 session 不發任何付費搜尋、分析、助手、圖片、影片、配音呼叫；未知結果不重送，不載入付費憑證、不改 key／預算／共享設定。新政策已合入本機三天計畫。自己的測試只用清空環境、七項零預算、fake／spy、臨時資料，不開外部可寫 HTTP listener。單獨 literal existence check 確認本工作區設定檔不存在，未讀內容；混合檢查命令被 hook 擋下的歷史保留。

預算稽核：程式預設每日 image US$0.50／video US$1.00／voice US$0.30／Claude US$1.00／Apify US$2.00／Jev US$0.50／ScrapeCreators 20 credits 是原始碼預設，**不是執行中服務實際值或本次批准額**。一般生成前按估價預扣、同 row CAS claim、unknown 不退款不重送；新版 workspace confirm 有鎖／交易，但未證實所有 POST 有一次性 idempotency。OpenRouter n=1、fallback=false、單次 submit，不明結果保留扣額；usage.cost 若無回傳會用估價填 actualUsd，wallet 仍估價，token／解析度估價不是帳單硬上限。Anthropic 拆解使用預設 SDK retry=2，不能聲稱所有 LLM 都不重試；實際重複收費未驗。provider key 限額、本次 demo provider 硬總額、外部既有任務與帳單狀態均未知，沒有發帶 key 查詢；不能以停本機宣稱取消外部扣款。

以下為既有歷史進度，與 Git 或上方最新核對矛盾時以上方為準。

Read first: `docs/todo.md` (open keys and tasks) and `docs/test-log.md` (every test run; skip a test that already passed at an unchanged commit). Demo branch: `chore/demo-integrate-main-1104`, PR #49 (draft, do not merge yet).

Current (2026-11-04 AEDT): canvas product polish A-D is done and stacked as PRs #46 (B), #47 (C), #48 (D, on `feat/canvas-polish-d-agent`); none is merged. A whole-branch review and one fix wave followed: a price dialog now locks the side panels and Confirm re-quotes, asking again if anything changed. Final checks with mock models only: unit 466/466, backend pytest 969 passed, `polish-a-shell` 18/18, `polish-b-nodes` 76/76, `polish-c-timeline` 50/50, `polish-d-agent` 54/54 (each on a fresh isolated backend at 1440x900), `bash bin/verify.sh` GREEN, build OK, eslint 0 errors, tsc exit 0 (2026-11-04). Open: real model wait times are unverified (the agent route ran its sample plan, no Claude call; no real image or video model ran); line and node fine-tuning waits for the user test; polish-a and polish-b must not share one backend (B fails 4 checks after A, from leftover state), so run each on a fresh backend. Decision log entry of 3 Nov updated from "nothing built yet".

Current (2026-11-03 AEDT): node canvas P1 (#28), P2 (#29), P3a (#30), P3b (#31) and P4 finish (#32, base feat/canvas-p3b-editor-media) are built and verified with mock models only; none is merged. Before that (2026-11-02 AEDT): fork main is at 6fe1772 with PRs #19-#25 merged (storyboard, publish, grade and subtitles UI, Settings, Chinese UI); `bash bin/verify.sh` GREEN at #25 head 7166ca5; client demo for Mercif is up (details in the private handoff).

Earlier: remake phase 1 (PR #4) and 2a stage board (PR #5) are merged into fork main (2026-10-31). Phase 2b (shot checklist and real-footage takes) is merged (PR #6, 4277192, 2026-10-31). Phase 2c (edit to a publishable MP4, then Annie's approval) is split into 2c-1 and 2c-2. 2c-1 ("Make the video") is merged (PR #7, 359791c, 2026-11-01). 2c-2 (Annie approves the finished video on the no-login review link) is merged (PR #8, 27496cb, 2026-11-01) after an e2e re-run at 1440 and 390 (35/35 each). Phase 2 (2a-2c) is done. `bash bin/verify.sh` GREEN on the merged tree (2026-11-01).

## 2026-11-03 (AEDT): node canvas P1 + P2 (real AI models)
- P1 (canvas skeleton, mock models only) is PR #28 to veralynchong/BuildClub (branch `feat/node-canvas-p1`, head 7db7614). It is open and not merged; it waits for the user to say merge.
- P2 (real models, plan `pivots/02-content/docs/plans/2026-11-03-canvas-p2-plan.md`) is on branch `feat/canvas-p2-models`, with a PR stacked on `feat/node-canvas-p1`. Not merged.
  - Providers: mock, fal (Seedream 4.5, Hailuo 2.3 Fast, Kling 2.6 Pro, Veo 3.1 Fast), Gemini (Nano Banana 2 / Pro). Daily wallets `DAILY_GEN_IMAGE_USD` 0.50 and `DAILY_GEN_VIDEO_USD` 1.00. Refunds happen only when nothing was sent or the provider reported failure; a lost result is `unknown` with no refund.
  - Run-the-whole-shot (storyboard image, then video from it) has a quote-and-confirm step. Takes are now keyed by shot id. The storyboard "Make frame" uses `FRAME_IMAGE_MODEL`, and the gpt-image-1 path is removed.
- Last verification (2026-11-03): `bash bin/verify.sh` GREEN at dad12ba. Mock-only browser E2E at 1440 on port 8871 passed 5/5 scenarios: real models disabled without keys, the chain US$0.00, `#fail`, a click straight after connecting, and the button disabled while running.
- Not verified: no real model has been called (no keys in .env, and the user chose no spend on 2026-11-03). fal/Gemini request fields, 9:16 support on Hailuo/Kling, Seedream portrait size, fal data-URI inputs and the Kling price are checked against docs only.
- P3 (Remotion editor, branch `feat/canvas-p3-editor`): Task 0 timing experiment passed on 2026-11-03 with Remotion 4.0.537. A 30 s 1080x1920 server render took 22 s hot (threshold 120 s), with AAC audio and correct Noto Sans TC Chinese text, so the plan uses server render (`@remotion/renderer` + `@remotion/bundler`). Font file `public/fonts/NotoSansTC-VF.ttf` (11.9 MB, OFL) is in the repo.
- P3a editor (branch `feat/canvas-p3-editor`, acceptance 2026-11-03): built the Remotion editor drawer on the canvas. It has a timeline (fill in shot order, trim, split, delete, reorder, mute and volume), drag-from-canvas, "new version, apply?" and "footage deleted" alerts, export through a server-side Remotion render, a bundle pre-warm at server start, and send for approval on the review link. Mock-only browser E2E at 1440 on port 8871 passed on 2026-11-03 (all steps in `.superpowers/sdd/2026-11-03-canvas-p3-plan/task-7-report.md`); `node render/smoke.mjs` OK and `bash bin/verify.sh` GREEN. Export times: Task 0 render 30 s clip, about 22 s hot; this run, 10-second reel, cold (bundle cache cleared) 10.4 s and hot 10.8 s. The E2E found one bug: the export panel did not show "out of date" after applying a newer version; fixed in c6b2e34.
- P3a known gaps: a real HEVC .mov take was not tested, and preview performance with 20+ clips was not tested. Speech takes are not auto-captioned and filler/pause trim is deferred to P4.
- P3b editor media (branch `feat/canvas-p3b-editor-media`, acceptance 2026-11-03): the editor drawer gained text overlays (position, brand colour, start and end), captions (shot lines by default, voiceover words once a voiceover is present, one editable caption per shot), music with a licence tick and volume, voiceover (record, upload, AI voice with a price confirm), and a per-client brand kit (logo, colour, shown-logo switch) that survives the old client form. All of it renders through the same Remotion export with Noto Sans TC. Mock-only browser E2E at 1440 on port 8871 passed on 2026-11-03 (every step in `.superpowers/sdd/2026-11-03-canvas-p3-plan/task-12-report.md`): ffprobe 1080x1920, 30/1, aac, 13.000 s against a 13 s timeline, text, caption and logo checked on extracted frames. `node render/smoke.mjs`, `node render/smoke-p3b.mjs` OK and `bash bin/verify.sh` GREEN. The E2E found one bug: after a brand change the export panel still offered send (the server refused it); fixed in 31b2ad7.
- P3b known gaps: ElevenLabs was never called for real (checked against its docs only); voiceover recording was tested with a fake device only (Chrome's fake audio device never answered on this Mac mini, so a WebAudio oscillator stream stood in, through the app's real MediaRecorder path); whisper was tested only with English speech (it heard "Thank you" in the mock tone); no real HEVC .mov take was tested.
- P3 PRs (2026-11-03, open, not merged): #30 P3a (base `feat/canvas-p2-models`), #31 P3b (base `feat/canvas-p3-editor`). Merge order #28 → #29 → #30 → #31. Both final whole-branch reviews' fixes are in (9784d18, a9a27d7); `bash bin/verify.sh` GREEN at 6a79b38.
- P3b needs from the user: an `ELEVENLABS_VOICE_ID` env var for a Mandarin voice, plus the ElevenLabs key (`DAILY_GEN_VOICE_USD` budget), before any paid voice is used.
- P4 finish (branch `feat/canvas-p4-finish`, stacked on #31, plan `pivots/02-content/docs/plans/2026-11-03-canvas-p4-plan.md`, acceptance 2026-11-03): the old "Make the video" pipeline is gone (front and back; grading, subtitle burn and cue editing deleted); the editor is the only way to make `final.mp4`, and old `auto` cuts still play, go stale, get approved and publish. Real takes have a "Clean up" action (cuts English fillers and pauses over 0.4 s into a new, chosen take; the editor offers it as a new version). Backend sentences on the canvas, editor and plan video area show in Chinese through `serverText`, pinned by a pytest and a JSX copy scan. Three P3 leftovers fixed (voice delete under the edit lock, TextTool timing drafts, brand colour on change). New `backend/demo_assets.py`: `quote` is offline and free; `run` needs `--yes`, a `--cap`, a matching server quote and enough daily wallet, and was only run against fakes.
- P4 whisper change: whisper.cpp 1.9.5 silently turns DTW off when flash attention is on, so word times drifted after pauses and fillers were not cut. Whisper now runs with `-dtw large.v3.turbo -nfa` (falls back without them on an older build), and word starts are moved past the pause they swallowed, for both clean-up and voiceover captions (27f0f70, 36c4951).
- P4 verification (2026-11-03): mock-only browser E2E at 1440 on 8871 passed steps 1-10 (`.superpowers/sdd/2026-11-03-canvas-p4-plan/task-8-report.md`); the one failure (fillers left in) was fixed afterwards and re-checked on the real file: 5.584 s to 2.760 s, whisper hears "Hello this is a test of the video tool". Export 1080x1920, 30/1, aac, 11.776 s against 11.77 s. `bash bin/verify.sh` GREEN at 0c22bb5; both render smokes OK.
- P4 not verified: real human speech for clean-up (only macOS `say` voices; Chinese fillers are not detected by design), real iPhone HEVC .mov, any real model, and the paid demo-asset run (plan Task 9: needs the user to pick plan, models and cap, then approve the spend).
- A1-A8 mock verification (2026-11-03, retro section 5): A1 stack rehearsal merged #28 -> #32 onto origin/main d68b94e on a throwaway branch with no conflicts, verify GREEN and both render smokes OK at every step. A2 (24 and 48 clips: 60 fps playback, ~30 ms seek), A3 (synthetic hvc1 .mov through clean-up and export), A5 (11 chain-guard checks) and A8 (cold export of a 30 s clip 21.7-22.7 s, warm 17-18 s) pass. A6 (whisper hallucinating "Thank you." on silence or noise) and A7 (Mandarin voiceover timed as one word) failed and are fixed in f191a60, ed46dfd, 35415f1. A4 confirmed the known limit: clean-up turns HDR10 into 8-bit with no tone mapping. Scripts are in `pivots/02-content/app/trend-finder/e2e/` (194a6dd); report `.superpowers/sdd/2026-11-03-canvas-p4-plan/a2-a8-report.md`. `bash bin/verify.sh` GREEN at 194a6dd.
- Open from A1-A8: whisper writes Simplified Chinese even for a zh_TW voice (product decision); the clean-up success note shows in the red error bubble; HDR tone mapping; `isolated-backend.sh` cannot pass `REMOTION_PORT`; `e2e/lib.cjs` defaults to a local playwright-core path (override with `PW_CORE`).
- Follow-ups fixed (2026-11-03): clean-up result shows as a neutral note (7f52568); HDR (PQ/HLG) takes are tone-mapped to bt709 during clean-up with an ffmpeg that has zscale, from `FFMPEG_HDR_BIN` or the Homebrew `ffmpeg-full` keg, otherwise unchanged with one log line (8344464; a deploy machine needs such an ffmpeg; HLG only unit-tested); `isolated-backend.sh` passes `REMOTION_PORT` (62f97ee). Simplified-Chinese captions: user chose to leave as is for now. `bash bin/verify.sh` GREEN at 62f97ee.
- AI UX test (2026-11-03): `pivots/02-content/app/trend-finder/e2e/FLOWS.md` (5e83abd) defines F1-F4 and personas Daphne and Annie. Layer 3 ran goal-only and layer 4 ran persona walkthroughs. Both used mock models only, at 1440, on 8871/8872. All four flows were reached, as were 3/3 Annie runs and 3/3 Daphne runs (after the Annie correction below). Report: Artifact https://claude.ai/artifact/5e2daMUXKegc3gdB3T9jJ4. Raw notes and screenshots are local in `.superpowers/sdd/2026-11-03-canvas-p4-plan/ux-test/`.
  - Top items:
    - B1: no UI creates the review link, so "Send for approval" returns 409.
    - B2 withdrawn: Annie is the agency owner/approver (default `managerName`, src/state.ts), not the client. The first persona brief framed her wrongly; FLOWS.md and the report (v2) are corrected. Left over: the UI never says who Annie is.
    - A1-A3: on the client review page the buttons are below the fold and there is no "who got it" message.
    - D1-D4: the canvas is hard to find as the way into the editor; the editor drawer is cramped; captions and logo are off by default; export gives little feedback.
  - Fix batch 1 (B1 review-link UI on the Plans board, A1-A3 review page, B4 "★ Picked" copy, B5 canvas error note stays until dismissed) is on `fix/canvas-ux-batch1`, base `feat/canvas-p4-finish`. verify GREEN and a browser re-test at 1440 passed every item (2026-11-03). PR #33, not merged.
  - Fix batch 2 (B3 video send-back shown on the Plans card and client home, D3 captions on for new edits and logo shown after upload, D4 export expectation line and scroll to result, D6 one-click logo upload, B2 approver hint) is on `fix/canvas-ux-batch2`, base `fix/canvas-ux-batch1`. verify GREEN and a browser re-test at 1440 passed every item (2026-11-03). Backend change: `/api/production` adds `cutSentBack`. PR #34, not merged.
  - Fix batch 3 (user picked the designs): D1 "Make the video" button on the plan page and the approved card, plus a 5-step bar (Clips, Captions, Logo, Export, Send) in the editor; D2 full-screen editor with "Back to canvas" (keeps the canvas viewport) and Export and send in a top-bar popover, replacing the side drawer; B6 nodes added from a shot's "+" go to a free row and are fitted into view; B7 logo size (small/medium/large) and corner, defaults equal the old look. On `fix/canvas-ux-batch3`, base `fix/canvas-ux-batch2`. verify GREEN, browser re-test at 1440 passed (2026-11-03). Every item in the UX report's suggested order is now done.
  - Fix batch 4 (B8) on `fix/canvas-ux-batch4`, base `fix/canvas-ux-batch3`, PR #36, not merged (2026-11-03): a sent-back video cannot be sent again until re-exported (backend 409 `SENT_BACK` + UI line); cache-only `/api/search` and `/api/search/types` misses return empty 200 instead of 404; a plan made from a Research row starts with its client video's due date (user's choice), else today + 14. verify GREEN at 0572a70; no browser re-test yet. `npm run lint` errors only in untracked `render/experiment/`.
  - Real-person test script for D1/D2 (2026-11-03, not run yet): https://claude.ai/artifact/47VyReWUgStxBAkUPddq2x. User chose: no merge of #28-#36 for now.
- Veo 3.1 replaced by Gemini Omni Flash 1.1 (PR #39, branch `fix/replace-veo-with-omni-flash`, 2026-11-03). Not merged.
- P2.5 consistency kit (branch `feat/canvas-p2-5-kit`, base `fix/replace-veo-with-omni-flash`, spec `pivots/02-content/docs/specs/2026-11-03-consistency-kit-design.md`, plan `.../plans/2026-11-03-canvas-p2-5-kit-plan.md`, 2026-11-03):
  - Built: per-client kit (character, product, place, style; note plus 0-4 images) and a kit node on the canvas that auto-wires to every storyboard. Each shot has picks. Generations send N references plus an English prefix, trimmed to the model's `maxRefs`. Kit images are shrunk to 1536 px on the long edge before sending. Changes mark nodes stale and nothing re-runs automatically. Video nodes do not take the kit.
  - Verification (2026-11-03): `bash bin/verify.sh` GREEN at c2d057c; backend pytest 955 passed; `node --test unit/` 388/388. Mock browser E2E at 1440 passed 8/8 (`.superpowers/sdd/2026-11-03-canvas-p2-5-kit-plan/task-7-report.md`). The final whole-branch review's 9 fixes are in (99143c0, c2d057c).
  - Layout fixes checked in a browser at 1440 with mock models (2026-11-03, `fix-visual-check.md`), all PASS: storyboard nodes no longer overlap (about 63 px gap), kit edges are dashed when unselected and solid when selected, and "Yes, delete" in the kit drawer uses the primary style.
  - Not verified: the paid real test (Seedream 4.5 12 images plus Omni Flash 2 × 4 s, about US$1.28, cap US$1.50, `FAL_KEY`) is not run: the user chose on 2026-11-03 not to do a paid test, so no real provider has received multiple references yet.
- Next steps:
  1. The user adds `FAL_KEY` and `GEMINI_API_KEY` to .env, then a paid smoke test (about US$0.45, cap US$1).
  2. Decide on the consistency research proposals (Artifact https://claude.ai/artifact/GcK6aCdw7L3XUn5fsAbMUu): replace Veo 3.1 with Gemini Omni Flash 1.1 (the fal Veo reference endpoint retires 2026-11-17), add Nano Banana 2.1, and P2.5 "consistency kit" node.
  3. Merge PR #28, then the P2 PR (user's call).
  4. Parked from review: refund counted on the refund day, not the spend day (M1); stale docs (spec §3, README, .env.example, decision-log gpt-image-1).

## 2026-11-02 (AEDT): phase 3 from Mercif feedback
PRs merged into veralynchong/BuildClub main (#18-#26):
- #18 phase 3 plan doc (docs/phase3 feedback plan).
- #19 results filter panel (recency, length, content type, sort; 1M+ views default chip).
- #20 hook and emotion fields in the video breakdown.
- #21 research reports: Instagram algorithm 2026 and competitor USPs.
- #22 content types: type tag on cards and a Content type filter group with counts.
- #23 Compare videos page.
- #24 shot framing (framing, angle, movement) and script to shot list.
- #25 verifiable numbers: "Where these numbers come from" (source, fetched time, link, score formula) and a free yt-dlp re-check.
- #26 real re-analyse (force re-run, behind auth and the daily Claude budget; a failed re-run keeps the saved breakdown) and the Open plan aria fix.

Last verification (2026-11-02): `bash bin/verify.sh` GREEN (compile, backend load, backend tests, frontend unit tests) on the #26 head 3d83da0, which already contained origin/main, so its tree equals merged main 4343366; `npx tsc -b`, `npm run lint`, `npm run build` all exit 0.

E2E on merged main 4343366 (isolated backend, port 8960, `--demo-data`, no paid calls, no Apify), 1440 and 390, no horizontal scroll at either width:
- Find, search tofu recipe: filter panel opens, "Views: 1M+" chip, Content type group with counts (Recipe / cooking 8, Review / taste test 2, Tutorial / tips 2, Other 3), type tag and "followers · views" line on cards: pass / pass.
- "Where these numbers come from": source, fetched time, original post link, score formula (Re-check not clicked): pass / pass.
- Breakdown panel shows an enabled Re-analyse button for a saved breakdown (not run; budget is 0 in isolated mode): pass / pass.
- Compare videos page renders with link box and shortlist picker (no run started): pass / pass.
- Plan page shows "From script" and Framing / Angle / Movement selects; Plans board "Open plan" is enabled: pass / pass.
- Language set to Traditional Chinese: Find, filter panel (內容類型), Compare page show no raw i18n keys: pass / pass.

Not verified: zh-Hant visuals beyond the key check above; real AI output for street-interview or Chinese scripts; ShotChecklist framing tags after approval; live Apify searches; YouTube and X re-check; Compare from the shortlist picker.

Open items:
- 1c research table waits for teammates (layout decision).
- 2d Mercif one-week trial.
- 3c notifications deferred.
- Product suggestions from the research: share rate before comment rate, originality check, Trial Reels.
- Consider raising RESULTS_PER_SEARCH (about 100) once Apify is upgraded (cost check first).

## Teammate UI integration (2026-11-02 AEDT, branch feat/integrate-teammate-ui-1102)
- Merged origin/main (b3f8737: design system, client Home, Find ideas, drag Plans board, copy) and fix/instagram-followers (PR #11). Look and copy from the teammate; login, persistence, review link, stages, takes and cuts kept on our backend.
- Score rule changed (user decision 2026-11-02): views ÷ followers on every platform; usual views only when followers are unknown or 0 (Reddit). Usual-views multiple stays as secondary info in the breakdown and the evidence chip.
- Only a signed-in manager approves in the app (plan page, Home, board drag); team members send to the manager, who answers on the review link.
- New dependency from the teammate's lockfile: @dnd-kit/core 6.3.1 (Plans board drag).
- `bash bin/verify.sh` GREEN (unit 88). E2E on 8811 (`--demo-data --user`), real sign-in as team member: client, tofu search (TikTok + Instagram pins), ranking order, shortlist, shots, send, signed-out review link, approve, board and Home: 19/19 at 1440 and 19/19 at 390.

## 2026-11-02 (AEDT): Settings, Chinese UI, client demo
- Merged into fork main today:
  - #19 storyboard UI, #20 publish UI, #21 grade + subtitles UI, #22 landing product tour video.
  - #23 Settings screen: gear at the sidebar bottom; Appearance (System / Light / Dark) moved there; signed-in name and agency come from /api/auth/me; approver name "Annie" kept.
  - #24 Language setting, English / 繁體中文: hand-written dictionary `src/lib/i18n.ts` plus `src/lib/strings/*`, no new dependencies. Landing, login and the client review link stay English. The 390px sidebar shadow is fixed.
  - #25 i18n follow-ups: zh label 「開啟」 on the Home client table; the default "why it fits" note is always saved in English so the review link has no Chinese; existing Chinese notes are not migrated.
- Last verification (2026-11-02): at PR #25 head 7166ca5, `bash bin/verify.sh` GREEN (pytest 547 passed, 1 skipped; unit 166); `tsc -b`, `npm run lint`, `npm run build` exit 0. Each PR was verified independently at its head sha before merge.
- Client demo for Mercif (Daphne): port 8850 behind a Cloudflare quick tunnel, serving fork main (6fe1772 or later), `--demo-data`, two seeded clients. Demo URL and accounts are in the private handoff.
- Known problems / not verified:
  - Storyboard generation, take upload, video cut and subtitle burn-in were checked only in idle states in zh-Hant.
  - Backend-generated text (shot descriptions, AI breakdowns, server errors) stays English.
  - Home "after publishing" cards read like dev notes ("decide before building"); the copy belongs to Veralyn.
  - The approver name still defaults to "Annie".
- Next steps:
  1. Align the UI redesign with Veralyn (a separate discussion session is comparing Editing and Storyboard against real products; nothing implemented).
  2. Send the demo to Daphne.
  3. Worktree cleanup.

## Last verification (2026-11-01)
- feat/remake-rough-cut @ 678b5a5: `bash bin/verify.sh` GREEN (backend 410 passed, 1 skipped; unit 78); `npm run build` and `npm run lint` exit 0. Final Opus review: With fixes, all fixed and re-reviewed clean.
- `bash bin/verify.sh`: GREEN after every merge and at the final commit 47b27d8; `npm run build` and `npm run lint` exit 0.
- End-to-end test (login, client search, shortlist, plan, batch send, signed-out review link, send-back, resend, approve, double-approve guard, client memory, turn off link) passed at 1440 and 390 widths, against a fresh backend with `--demo-data`.

## Review fixes (2026-10-31)
- `bash bin/verify.sh` GREEN at the fix commits. `npm run build` and `npm run lint` were clean after each merge. The end-to-end test passed 12/12 at both 1440 and 390, in demo mode.
- Checked in a real browser:
  - Real mode with an empty account shows "No clients yet" with no page errors, and sample clients are not saved.
  - A plan edit made while the session was expired is kept through a page refresh and saved after signing in again.
  - "Preview as Annie" is read-only: the decide buttons are hidden and the server status does not change.
- Not checked in a browser:
  - The Google sign-in error messages (unit tests only).
  - The "via review link" label on comments.
  - Comment seeking in a real TikTok player.

## Phase 2a stage board (2026-10-31, branch feat/remake-stage-board)
- Plan: `docs/phase2-2a-plan.md`. Approved plans move Ready to film → Filming → Editing → Posted (board row "In production", stage select on cards and the plan page, "N posted this month").
- The backend keeps a stage only on approved plans; the review link never shows it.
- Also fixed (phase 1): `approvedAt`, `managerNote`, `shotComments` were dropped on every save; a new review-link decision now clears an old "approve with changes" note.
- `bash bin/verify.sh` GREEN (backend 296, unit 57); `npm run build`, `npm run lint` exit 0.
- End-to-end on a demo backend (8811) passed at 1440 and 390: stage survives reload, review link has no stage, Edit clears the stage and keeps approvedAt, no horizontal overflow on the board or plan page at 390.

## Phase 2b shot checklist and takes (2026-10-31, branch feat/remake-shot-takes)
- Plan: `docs/phase2-2b-plan.md`. An approved plan's page has a "Shot checklist": upload .mp4/.mov takes per shot (200 MB cap, `ftyp` check, 10 per shot), watch them, choose one, delete. Rows in the SQLite `takes` table, files in `backend/media/<ideaId>/` (git-ignored). Edit reopens the plan and leaves the takes read-only. The review link never shows takes.
- `bash bin/verify.sh` GREEN (backend 320, unit 65); `npm run build`, `npm run lint` exit 0.
- Opus whole-branch review: 0 Critical, 3 Important (plus 2 re-graded from Minor), all fixed: reopen during an upload, `..` idea id leaving the media folder (both with tests that failed first), stale list after a long upload, one busy flag for all shots, checklist not reset between plans.
- End-to-end on a demo backend (8812) at 1440 and 390 passed 9/9 (upload, choose, reload, delete, fake .mp4 rejected, no overflow at 390, read-only after Edit, no takes on the review link); after the fixes, concurrent uploads and delete-during-upload passed.
- Deferred minors: blocking writes inside the async upload handler; an orphan file if the INSERT fails; a non-integer shot gets FastAPI's `{"detail"}` shape; the progress copy "have a take" counts chosen takes; no retry after the takes list fails to load; an upload error stays visible after Edit.

## Phase 2c-1 make the video (2026-11-01 AEDT, branch feat/remake-rough-cut)
- Plan: `docs/phase2-2c1-plan.md`. An approved plan with a chosen take on every shot gets "Make the video": speed 1x / 1.1x / 1.25x, optional own music (licence tick required), progress steps, preview, Download. Output in `backend/media/<ideaId>/cut/final.mp4`; the old output stays until a new one succeeds.
- End-to-end on a demo backend (8813) with real ffmpeg and real whisper.cpp (large-v3-turbo-q5_0), synthetic takes (testsrc plus 440 Hz tone with 1.5 s silence, a landscape take, a macOS `say` take with two "um").
- 1440 wide, checks 1-8: pass 1 (disabled, "0 of 2" then "1 of 2"), 2 (steps Checking the takes, Listening for words, Rendering), 3, 5, 7, 8. FAIL 4 (stale notice only after a reload), FAIL 6 (new output not shown until reload).
- 390 wide, checks 1-9: pass 1, 2, 3 (file checked once, see below), 5, 7, 8, 9 (scrollWidth 390 on the plan page); FAIL 4 and 6 for the same two reasons. Check 10 (missing-tool errors) is pytest-only by design.
- Check 3 detail: played in the page, downloaded via the Download link (`remake-<id>.mp4`), ffprobe: h264 High, yuv420p, 1080x1920, 30/1 fps, aac LC 48 kHz stereo 192 kbps, loudness -13.0 / -13.1 LUFS (LRA 2.4-2.6 LU for the tone; target -13).
- Cut time (queued to done, tiny 6-10 s inputs): 6.6 s, 3.7 s, 4.7 s, 5.5 s. Long footage is still unmeasured. Backend suite (2026-11-01): 410 passed, 1 skipped in 21.6 s.
- Real whisper: the `say` take was transcribed as "Hello UM this is a test of the UM video cutting tool"; both "um" were cut (3.11 s take plus a 4 s tone take became 2.37 s at 1.25x and 2.90 s at 1x). The pure-tone takes returned no words: with no words at all the whole video is kept (R6; whisper hallucinations on B-roll noise can leave a silent take unprotected) (9.13 s at 1.1x). `-l auto` worked on this English clip.
- Not verified: a real iPhone HDR clip (10-bit HLG/HEVC; no tone mapping, so it may look washed out), a real human-speech clip end to end, real human speech (breath, cough, background noise), long or large takes, disk use, non-English, Instagram/TikTok upload limits, missing ffmpeg/whisper (pytest only), the review page overflow at 390, restart recovery in a browser.
- Known issues found (items 1-3 fixed; E2E recheck passed at 1440 and 390 widths, 2026-11-01):
  1. After choosing another take, the "The takes changed after this was made" notice only appears after a reload (CutPanel does not refetch when the takes change). The backend `stale` flag is correct. FIXED in a2813b7.
  2. After a re-cut finishes, the preview `<video>` keeps playing the old file until a reload (same src URL, browser keeps the old file; seen at 1440 and 390: shown 9.13 s / 2.90 s while the new file was 2.37 s / 2.67 s). The size/length text beside Download updates. FIXED in 9001b4d.
  3. A take with no speech next to takes with speech is cut away completely (gaps over 0.4 s are removed), e.g. a silent B-roll shot disappears. FIXED in 8c7dc49 (R6: a take with no transcribed words is kept whole).
  4. The Edit button asks "Continue?" in a modal; not a bug, but automation must click Continue.

## Phase 2c-2 cut approval (2026-11-01 AEDT, branch feat/remake-cut-approval)
- Final whole-branch review (Opus): one Important fixed in 6211817 — a reopened or stale cut is now hidden from the approver, and CutPanel says "Hidden from <manager> while the plan is reopened."; plus three minors (shot-count staleness on send, cut-specific "no longer waiting" notice, re-cut hint while waiting). At 6211817: `bash bin/verify.sh` GREEN (backend 440 passed, 1 skipped), `npm run build` and `npm run lint` exit 0. The first e2e ran before this fix; it was re-run after the fix (see the 2026-11-01 re-run bullet below).
- Plan: `docs/phase2-2c2-plan.md`. After "Make the video", the team sends the finished video to the manager from the plan page ("Send to <manager> for approval"). The approver sees it on the no-login review link under "Videos to approve" (played in the page, no download link) and approves it or sends it back with a required reason. The CutPanel shows waiting / approved / sent back with the reason. Making the video again clears the approval and the approver's card; a video replaced while the approver is watching returns "This video was replaced while you were watching. Here is the new one." Reopening the plan with Edit hides the card.
- End-to-end on a demo backend (8814) with real ffmpeg and whisper.cpp, synthetic takes (testsrc 720x1280 plus 440 Hz tone, 4 s each, 2 shots), headless Chrome (playwright-core) with a separate no-cookie context for the approver (the Playwright MCP browser was held by another session). The plan and ideas were seeded through `PUT /api/ideas` (the video was shortlisted once in the UI so it is in the library); takes were uploaded through the API; making the video, sending, the review page and every decision went through the UI.
- 1440 wide, 16 of 16 pass. 390 wide, 16 of 16 pass. Checks: (1) send with no review link -> "This client's review link is turned off. Make a new one on the Shortlist first."; (2) after Get review link, send -> "Waiting for Annie's approval · sent 1 Nov", still there after a reload; (3) the review page shows "2 to review" (plan + video), one `<video>` that plays (currentTime 1.15 s of 7.33 s), no download link and no "Download" text, signed-out `GET /api/ideas/<id>/cut/file` -> 401, approver file route 200 with no Content-Disposition even with `?download=1`; (4) Send back button disabled with an empty box, enabled after typing, card disappears, CutPanel shows "Annie sent this back · 1 Nov" plus the quoted reason; (5) resend, Approve -> "Annie approved this video · 1 Nov" after a reload, with "Making it again clears Annie's approval."; (6) making the video again -> approval gone, approver page has no video card; (7) approver page open on the old video while the team re-cuts and resends, Approve -> replaced text, `<video>` src changes from `?v=...029` to `?v=...926`; (8) Edit then Continue -> `cuts` is empty on `GET /api/review/<token>`, no video card; (9) scrollWidth 1440 at 1440 and 390 at 390 on the review page (with a 200-char unbreakable URL in the plan's "Note to approver" and both card types shown) and on the plan page.
- Not verified: restarting the server and keeping the data (`isolated-backend.sh` uses a fresh temp dir on every start, so only a reload was checked; pytest covers recover); the TikTok iframe on the review page was not the cause of the 390 overflow but its own 403/429 console noise was not checked; "can't download" is the interface only (anyone who can see the `<video>` can still save the file); a real iPhone clip, long or large takes and real speech (see 2c-1); two browser tabs deciding at the same moment (pytest `test_second_decision_404_not_waiting` only); the review link has no expiry (phase 1 design).
- Cut time was not measured separately in this run.
- E2E re-run after 6211817 (HEAD 32ffa4e, 2026-11-01 AEDT): demo backend on 8816 (stopped), real ffmpeg and whisper.cpp, 4 s synthetic takes (testsrc 720x1280 plus tone; 3 takes for 2 shots), headless Chrome via playwright-core with a separate no-cookie context for the approver; seeding through the API (shortlist once in the UI, plan sent and approved through the review API, takes uploaded through the API), everything else through the UI. 1440 wide: 35 of 35 checks pass. 390 wide: 35 of 35 pass. The 16 regression checks (groups 1-9) all pass at both widths, including scrollWidth equal to the viewport on the review page (plan and video cards, 200-char URL note) and the plan page. B1: with a video waiting, Edit then Continue shows exactly "Hidden from Annie while the plan is reopened." and `GET /api/review/<token>` cuts is [], with no video card. B2: re-approving without touching takes brings the waiting card back ("Waiting for Annie's approval · sent 1 Nov"). B3: after the chosen take changed and the plan was approved again, the approver's cuts is [], the team sees "The takes or music changed after this was made. Make it again." with no Send button, and POST /cut/review returns 409 "The takes or music changed after this was made. Make it again before sending it.". B4: while waiting the panel shows "Making it again takes it off Annie's list until you send it again.". B5: an approver page open on a cut that stopped waiting shows "This video is no longer waiting for you. Here is what is still waiting." and not "That plan was already reviewed.".
- Re-run caveats / not verified: B3 as worded (change the chosen take while the plan is reopened) cannot happen, the server refuses with 409 "Only an approved plan can take footage."; the take was changed after re-approving, and the cut was hidden and stale from then on. The review link was made with `POST /api/share` rather than the Shortlist button, and Annie's plan decisions in the re-run went through the review API (the review-page buttons were used for the video decisions). Still not verified from the first run: server restart keeping data, two tabs deciding at once, real clips.

## Next-day environment (port 8805, real mode, no demo data)
- Account: tommycat997@gmail.com, password given in chat.
- Start (from the worktree root, detached): `nohup bash bin/isolated-backend.sh 8805 > /tmp/env-8805.log 2>&1 &`
- Stop: `kill $(lsof -nP -tiTCP:8805 -sTCP:LISTEN)`
- It runs from a throwaway temp dir (printed in the start log, `temp dir:`), with a fresh `backend/data.db` and the pinned searches copied from `backend/pinned`. The temp dir is deleted when the script stops, so the database and the account are lost on stop; start again and re-run `add-user`.
- Budgets are all 0, so no paid call can run (analyse channel, shot list and refresh trends will be rejected).
- Health check: `curl -s http://127.0.0.1:8805/api/health`

## Known issues
- Staff can only turn off a review link while a plan is waiting for approval; after the last approval there is no way to close it.
- Closed-link and already-reviewed messages are in English ("This link has been closed", "That plan was already reviewed"), not Chinese as the plan quotes.
- Console noise in tests: 403/429 from TikTok embeds and one unexplained 404; not investigated.
- No separate horizontal-overflow check at 390 width.
- FIXED in 2c-2 (dd04914): the approver's review page (`/review/<token>`) overflowed at 390 (scrollWidth 1200, measured 2026-10-31). Cause: grid tracks sized to the content (a long unbreakable string such as a URL in a note widened them); fixed with `minmax(0,1fr)` tracks, `min-width:0` and `overflow-wrap:anywhere` under `.shared-review`. Rechecked 2026-11-01 with a 200-char URL in a note, plan and video cards both shown: scrollWidth 390 at 390, 1440 at 1440.
- The team's plan page overflows with a long unbreakable "Note to approver" (a 200-char URL gave scrollWidth 2447 at 1440, seen once on 2026-11-01 while the plan waited); not investigated, not part of 2c-2, so the 2c-2 e2e used a short note on the plan page.

## Next steps
1. User testing on the 8805 environment.
2. Phase 2 inventory done (2026-10-31): see `docs/phase2-scope.md`. User approved scope 2a-2c (stage board, shot checklist + real-footage upload, ffmpeg rough cut), real footage only. 2a stage board done on `feat/remake-stage-board` (PR to the fork, base `feat/remake-e2e`), waiting for review. Next: 2b plan after 2a merges. Still open: rough cut vs finished cut, Annie approving the cut, video storage location.

## 本工作區本輪修改／新增檔案（未提交）

- `bin/verify.sh`
- `docs/STATUS.md`
- `docs/test-log.md`
- `pivots/02-content/app/trend-finder/backend/models.py`
- `pivots/02-content/app/trend-finder/backend/tests/test_store.py`
- `pivots/02-content/app/trend-finder/src/App.tsx`
- `pivots/02-content/app/trend-finder/src/lib/hooks.ts`
- `pivots/02-content/app/trend-finder/src/types.ts`
- `pivots/02-content/app/trend-finder/unit/hooks.test.mjs`
- `pivots/02-content/docs/demo-qa/issues.md`
- `bin/verify-zero-spend.sh`
- `pivots/02-content/app/trend-finder/backend/tests/test_zero_spend.py`
- `pivots/02-content/app/trend-finder/unit/pickedPlans.test.mjs`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/evidence.json`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/existing-footage-proof.mp4`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/frame-4s.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/plans-reload-ui.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/plans-visible-ui.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/research-picked-ui.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/shot-list-edit-ui.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/video-playback-ended.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/video-playback-midpoint.png`
- `pivots/02-content/docs/plans/2026-11-05-saturday-demo-plan.md`

另有ignored本機依賴連結（node_modules、backend/.venv）、build產生的dist與其中qa-existing-footage-proof.mp4連結；只指向既有依賴／本輪證據，不安裝或改共享套件。
