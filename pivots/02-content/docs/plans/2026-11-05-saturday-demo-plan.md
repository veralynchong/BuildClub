## 固定原片兩路 Demo：已完成（2026-11-06）

本階段已結束：Ever Green豆腐原片DVp3xOdFaHL的真Research分析／21shots／Canvas主線生成、攝影提案、原生Editor成片、主管角色QA與完整連續回放均完成，停在最新成片待真人審核。全部mini；本機dirty依指示保留，未commit/push/merge。

- 交付根：`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106/deliverables/`。`ever-green-ai-recreation.mp4`原生H2641080×1920／30fps／315frames（video10.5s、AAC容器10.517s），無配樂；21主圖及storyboard-main.jpg；photographer-concepts.jpg及高角度／低macro各圖+5.875s真影片。
- `complete-prepared-demo.mp4`：111.68s單一page連續、1440×900H264、完整decode PASS；原片→Research→21shot/script→Canvas主圖/兩alt→Editor→即時免費Export→送最新version waiting→登出public完整播放，不Approve。分析與AI素材為先前真生成的prepared/cached回放，不宣稱本次重錄又付費生成。Canvas目標header/media全入鏡及9點未遮擋，root實際view兩截圖ACCEPT。第一版85.4s功能PASS保留，另註可讀性限制。
- 最新待審version：1793898844797185424。主管登入Plan／ShotBoard看圖與獨立script已用Demo QA角色Approve with changes測過；public成片QA批准舊version1793895431131841818。最新version保留waiting，root另以無cookie GET review list及media range206核對。這不是真人主管簽核；public頁目前不顯示圖片／獨立script，須登入審圖。
- 已實際重啟專用後端驗證ideas/clients/library值、ledgerbyte及交付主MP4hash保留；新browser流程可讀同21clips/script/graph；重啟與重錄無新增付費。最後backend正常停止，8982/8983/8984空、owned browser0、test-slot heldfalse，state/media保留。`start-demo.sh`已實際啟動health200測過，可在mini重開8982，維持原ledger上限。
- 費用：1Claude＋26image＋23video＝50unique paid requests（49fal HTTP200）；3張拒絕圖費用保留且沒送video。分析token10861/3707估價0.117584，合UIquote估算US$5.573584；帳本reserve US$6.14／授權10，不是供應商帳單實支；fal餘額read403未知，3.86只是本批reservation空間。financial-final-verification.json與cost-summary.json。
- 最後root code驗證：`bash bin/verify.sh full` → `1115 passed, 2 skipped in 34.86s`、`PASS  frontend unit tests`、`verify: GREEN`。其後無產品code更動。成片／兩alt／連續回放全decodePASS，實際native/public播放ended；原21clipproject/source-script/ledger未變。mobile依1440桌面scope waived。
- 已知範圍：script為免費初始化後手工填入Claude來源onScreen文字，Say全空（原片無VO），不宣稱AI自動script回填；Shot.line不動。包裝小字／構圖／字體非完全相同；原6秒素材尾段可能漂移，主片只用root驗過的source精確選段（S12前14/30s、S20前15/30s等）。不是Pixel-perfect remake。

成功／費用／檔案與限制見batch的acceptance.json、delivery-manifest.json及完整artifact-inventory.json。merged且clean工作樹只列4個候選於worktree-cleanup-candidates.json，0移除、需另批。額外測試登入資料檔因安全hook判定URL含帳密而省略，沒有改寫指令繞過。

## 21鏡頭主線素材完成檢查點（2026-11-06）

真前端生成21張主圖／21段影片，另保留1張被拒絕S12圖，沒有unknown或paid重送。Ledger核對1analysis／22image／21video，保留額US$5.58（不是供應商帳單實支）；analysis token估價US$0.117584。全片素材decode、reload後21shot/node/selected/in:start連線、Editor21sources均PASS。root獨立看全部21片首幀及最後使用幀，按source精確315frames/30fps的選段ACCEPT；S12/S20/S19較後段有漂移，原始長片不做整段忠實品質保證。S20主品牌可辨，細小包裝字與構圖有差異，明確不是像素或文字完全相同重製。

證據：batch-20261106/main-batch-verification.json、selected-trim-qc/verification.json；21主圖與storyboard-main.jpg已整理到該batch/deliverables/。影片與數段操作錄影完整decode通過；先前FAIL與中斷片段保留，不冒稱已有一次整套成功Demo錄影。

目前唯一UI worker處理script→原生Editor→主MP4。已核對PlanScript現有卡片可編輯：免費Write the script只作建立卡片，之後清空所有Say，onScreen逐shot填Claude原片文字，保留無VO與獨立Shot.line契約，不宣稱產品已自動AI回填。主線Export／2攝影提案／審片／完整成功回放／最終持久驗證尚未完成。


2026-11-06 Goal更新：原「免費準備」目標已在提供報價／批准邊界後結案；已成功建立新的active Goal，執行使用者授權US$10內完整兩路Demo。較早Goal介面blocked的紀錄不再是目前狀態。
## 固定原片 Demo 批次執行檢查點（2026-11-06）

使用者已明確授權後端安全載入既有 Anthropic／fal 兩個 Key，按 US$10 批次預算無人值守執行；較早「US$0／未選影片／待逐次確認」紀錄僅為歷史狀態。固定案例 DVp3xOdFaHL、沿用 Ever Green 豆腐產品，主線 Research → Plan → Canvas，兩路素材為 AI 重現與攝影替代角度。全部在 mini，無安裝、提交、推送或外部通知。

- 已完成：真前端 Research 選原片 → Claude 一次請求 → 21 shots → Plan／規劃畫布；QA manager 測試角色批准後，生成 Canvas 自動建立21組 Shot／Storyboard。未冒充真人主管同意。
- Anthropic 回傳10861 input／3707 output tokens，依本批定價估計 US$0.117584；安全帳本保留 US$0.50 reservation、不回收。總額10／分析0.50／image3／video6.50；Seedream edit單張0.04，Hailuo Fast 6秒每次保留0.20。fal balance讀取403，餘額未知，沒有充值。
- 專用8982服務使用實際整合app、自己的持久DB/media及正常設定載入；批次guard只允許凍結原片分析與指定fal endpoint，拒絕其他付費入口／重複payload，未知提交全批停止。這是本機預約上限，不是供應商帳戶全域bill cap。
- 原始證據：`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106/`。phase1真分析與Canvas成功，錄影saveAs失敗使runner標FAIL；recording兩個原始WebM仍存在，ffprobe皆1440×900、約91秒，尚待完整解碼。後續inspect證據另存，不改寫原FAIL。
- 最近整合驗證：`bash bin/verify.sh full`：backend compiles／loads without dotenv PASS；1115 passed, 2 skipped；frontend unit tests PASS；verify GREEN。之後未改產品程式。唯一新產品patch為Claude禁SDK retries／fallback，已獨立覆核並整合。
- 進行中：第一張真參考image與第一段真video的前端操作及品質檢查；尚未聲稱整批素材、成片、剪輯、最終主管review或完整成功錄影完成。下一步先檢查生成回傳／帳本，再擴大批次，不重送原片分析。

# 週六 Demo 三天計畫

## 2026-11-06 驗收結點：已授權工程範圍通過

本輪已完成下方更新的階段0（基線）、1（資料契約查核）、2（指定UI/持久HTTP矩陣）、3（兩項最小產品修正與獨立覆核）、4（同tree整合驗證）。這是現有shot契約的工程驗收，不代表完整Demo三天計畫、script同步產品決策或正式影片已完成。

- full1112/2、frontend PASS、13UI/HTTP、zero32、Vite build、TypeScript app/node、ESLint全綠；最後工具獨立ACCEPT且root親跑正常回歸，source/artifact綁定見docs/test-log.md與 /tmp/buildclub-readiness-root-final-manifest.json。
- 真HTTP PID72060→73387、DB/media hash一致、3個任務未重送，清理自有資源後release。異常清理新五probe及原四probe由B同hash實跑，A獨立接受；不包含owner遭不可捕捉SIGKILL或斷電的清理保證。
- 下一步第一個產品決策：完整script即時同步鏡頭台詞，或保留獨立草稿？使用者未回覆前不實作同步，不新增onScreen自動匯出。其餘未驗與正式影片延後範圍見最新STATUS。
- 本輪9檔本機修改/新增，未commit/push/PR/merge；不因技術驗收綠就自行發佈。階段止於工程驗收，完整Demo plan仍待後續。


## 2026-11-05 更新：先驗整合與保存，正式影片等隊友選題

本節依 Tommy 最新指示取代下方已過時的日期關卡與 agent 安排；歷史計畫保留。先執行不依賴影片主題的工作，不要求現在交付正式案例 MP4。付費批准仍為 US$0；不 commit、push、開 PR 或 merge。

### 固定基準與總成功定義

- 驗收基準為 `origin/main @ 2c069a84569cd9ed2a70c4d284626057e5118e36`，已包含交付 `8ee2459` 與隊友新版前端。遠端之後更新時另記差異，不在測試中途換版。
- 整合工作區 `demo-readiness`、分支 `test/demo-readiness`；不修改原 Canvas、demo 或隊友工作區。
- 目標：研究 → 計畫／腳本 → Canvas → Editor 的資料對應與入口可用，重開與真正 HTTP 後端重啟後資料保留，零支出防線成立。
- 本輪通過必須有同一基準的 deterministic gate、1440×900 UI 與持久 HTTP 重啟證據。靜態程式查核、mock 成功、Python 單獨重開，均不能代替完整驗收。
- 正式主題、真人 Clean up、字幕／聲音品質、真模型生成及費用、正式影片、實機彩排／錄屏留到後續；手機檢查 waived。繁中 UI 要保留。

### 階段 0：固定環境與基線（整合者）

1. 核對 git、AGENTS、STATUS、test-log 與既有 FLOWS。既有 FLOWS 描述舊 Canvas，只作歷史參考，不盲跑其中啟動命令。
2. 只連結現有 `.venv`／`node_modules`，不安裝依賴；禁止讀取憑證、載入 `.env`、呼叫外部 provider。
3. 執行 `bash bin/verify.sh full`；環境缺依賴與產品失敗分開記錄。

成功：固定 hash、乾淨產品基準、完整 gate GREEN。已親跑：首次缺 `.venv` RED，接用既有依賴後 1109 passed／2 skipped、frontend PASS、verify GREEN；未改產品。

### 階段 1：資料與生成契約查核（worker A，唯讀）

範圍：`src/App.tsx`、`src/lib/hooks.ts`、`src/lib/research.ts`、`src/lib/script.ts`、`src/lib/canvasPick.ts`、Research／Plan／Canvas／Editor 元件；`backend/models.py`、`canvas.py`、`generations.py`、`gen_providers.py` 與其 callers/tests。

逐步追蹤輸入／輸出：research row 與來源 ID → plan/shot ID、台詞／時長 → Canvas doc/nodes/edges → Editor project/media。另查 quote/confirm → generation job → provider adapter → output/history 的保存與失敗邊界。

成功：每一跳列出真實 API、保存位置、欄位對應與檔案行號；清楚區分參考原片 frame、新生成圖、placeholder、腳本字幕與語音轉錄。缺少自動接線須列為缺口，不用 sample 冒充。

測試：唯讀查現有 unit/backend assertions 與最新前端 diff；回報可重現的 P0/P1、建議聚焦回歸與 UI 測試資料。不能把靜態可達稱為 UI 通過。交付給整合者，不改 repo、不開瀏覽器。

### 階段 2：持久本機測試環境與整合驗收（worker B，獨立工作區，唯一 UI 持有人）

先核對現有 `bin/freeform-e2e.py`、`e2e/freeform-restart.cjs`、`freeform.cjs` 與 `freeform-legacy-entry.cjs`。舊 runner 複製 backend，且先前同類操作曾被 hook 阻擋，不執行或改寫重試該路線。

選用原地程式＋本次自有 DB/media 的受限 HTTP 路線。先證實 server 的資料路徑可隔離；若不行，只提出最小支援變更與回歸，不碰別人的 DB／服務。新增測試工具的允許檔案為 `bin/demo-readiness.py`、`e2e/demo-readiness.cjs` 與必要的聚焦 regression；先讀實際介面再決定內容，禁止為通過而偽造 HTTP 結果。

環境要求：清空繼承憑證、所有付費預算 0、外網拒絕、只允許自有 localhost 埠與暫存寫入。先查 listener 並取得 test-slot lease；埠被占用就停，不殺其他程序。Playwright MCP 實際呼叫確認可用；使用既有 Playwright/Chrome，不能下載。finally 關閉自有 contexts/tabs、停止自有服務、釋放 lease。

驗收案例：

| 案例 | 操作 | 成功條件 |
| --- | --- | --- |
| 研究帶入 | 快取／合成且標示的研究 row → picked → 計畫／腳本 → Canvas | 客戶、來源、plan/shot ID 與內容一致；重新整理仍在；不宣稱即時搜尋 |
| Canvas 保存 | 修改 prompt、節點連線、選擇既有／mock 結果，離開再回來 | doc、selected output、viewport 正確；沒有額外生成任務 |
| Editor 保存 | 素材送入 Editor，調整順序、時間與文字後重開 | 引用素材、clip 順序、trim、字幕設定相同；字幕來源標明 |
| 真 HTTP 重啟 | 記錄 PID、DB 資料與素材 hash，正常停止自有 backend，再用相同資料目錄啟動 | PID 更換；重新登入後 graph/edit/media 不變且可播放；不重建 DB，不重新提交生成 |
| 失敗呈現 | 可控 mock failure、cache miss、零預算拒絕 | 清楚顯示當次錯誤、保留舊結果；provider spy 提交數為 0（拒絕案例） |
| 桌面與語言 | 1440×900 主線、EN／zh-Hant、淺／深色 Editor | 無遮住必要操作的溢出、文字可讀，主線可完成 |

可先用合成媒體驗工程保存與播放，不製作正式主題影片。允許 fixture 透過 API 建立，但每份報告明列 API seed 與真正 UI 操作的範圍。不能因此宣稱 UI 完整建立了所有資料。

### 階段 3：最小修正與獨立覆核（依賴前兩階段）

整合者按 P0（資料／權限／支出）與 P1（核心主線阻斷）排序，單一修正擁有人、獨立 Orca 工作區，先重現／聚焦 RED，再做最小修正與 GREEN。現有未獲授權的設計、模型搜尋／quality 等新功能不納入。介面／檔案重疊時順序執行。

先讓原唯讀 worker A 覆核完整修正 diff、原始需求及證據；整合者明確接受或退回。沒有 commit/merge 授權時以 patch 供本機整合，禁止擅自 commit 或 merge。若修改超出既定檔案，先列出原因與擁有人。

### 階段 4：整合結案（整合者）

在唯一最終 tree 執行：`bash bin/verify.sh full`、`bash bin/verify-zero-spend.sh`、`git diff --check`；前端 build/lint 只在無憑證、禁止外網、自有可寫暫存快取環境執行，不寫共用 node_modules。新 HTTP/UI 工具通過後記錄其確切命令，不預先杜撰 CLI。

成功：核心 P0/P1 清零、所有必要案例 PASS、獨立覆核被整合者接受；每份證據綁 base hash＋最終 diff hash，列出命令、實際輸出、截圖／JSON／媒體 hash、清理結果。無法執行列 BLOCKED，未跑列 NOT RUN，不計通過。更新既有 STATUS/test-log/本計畫；不以測試數量取代操作驗收。

### 多 agent 排程與所有權

同時最多兩位 worker＋一位整合者。A 唯讀可與 B 獨立環境測試平行；只有 B 能開瀏覽器。整合者唯一擁有 plan、STATUS、test-log、整合與最終驗證。worker 不再委派、不 commit/push/merge、不聯絡外部服務；回報使用繁中，包含 base/branch、修改檔案、命令與完整關鍵輸出、證據位置、PASS/FAIL/NOT RUN、阻礙及清理。

Orca 使用 `orchestration worker-start`／mailbox；派完獨立任務後結束本回合等事件喚醒，不輪詢。每項失敗兩次即蒐集新證據；安全 hook 阻擋即停止該路線並回報，不換命令繞過。

### 選題之後的後續階段（本輪不執行）

1. 隊友確認主題、英文腳本與有權素材；Tommy 決定需要的真模型，逐次批准費用與 cap。
2. 真生成最小樣本，驗品質／等待／保存／帳單，再製作同一案例完整影片。
3. 逐句核字幕、看完 MP4、固定展示版本，實機兩次彩排並驗離線備援。

### 執行紀錄

- 2026-11-06：toolbar兩檔patch8121e314…獨立覆核ACCEPT，root接受；actual-handler9/9，full1112/2 GREEN。B可套schema＋toolbar兩份已覆核patch，接續R1/R2及最終UI矩陣。script同步契約已async詢問，待答覆，不擅自擴onScreen匯出。

- 2026-11-05：root已接受保存兩檔覆核（diff c6c676ee…），full1112/2與zero32 GREEN。B舊基準7限定PASS＋2產品FAIL；工具R1異常清理與R2反向斷言blocking，ctx_8c0f72d7b000續修兩工具並驗已覆核patch。legacy toolbar／script字幕接線仍open。

- 2026-11-05：A 唯讀查核完成，確認保存 schema 缺口；B 初次 UI 發現 legacy toolbar video 無 shotId→Editor FAIL，正在續驗既有 shotId 路徑。root 依使用者指示只修 models.py/test_store.py，API regression 已先 RED；覆核 ctx_35f1b56b007f、full/zero-spend 待結果。未解決問題不能列總驗收 PASS。

- 2026-11-05：階段 0 GREEN；階段 1、2 已派送，run `run_1dfae916faa8`：A `ctx_93ea8db23c4a`（唯讀）、B `ctx_5c1c5ba841dc`（demo-readiness-ui 獨立工作區）。未呼叫付費 API、未安裝依賴、未 commit/push/merge。

日期：2026-11-05 週四至 2026-11-07 週六，Sydney 時區。
使用者已確認核心範圍並授權恢復執行；以下最新範圍優先於較廣的舊清單。付費、提交、推送及曾被 hook 擋下的隔離副本操作未獲授權。

## 2026-11-06：本輪Reel與分析請求修正交付

Tommy已固定原片產品及Reel `https://www.instagram.com/reel/DVp3xOdFaHL/`，主線必須Research→Plan→Canvas，全部mini執行，兩路為AI重現與攝影角度提案。人工21段是比對準備，不替代自動拆解；不改走獨立workspace。

- 免費前端完整前綴與付費分析停點已有錄影：mini `/Users/tommy/Downloads/buildclub-demo-reference/frontend-evidence-20261106/run06/`、`run08/`；run08預期429拒絕，空shots保留。完整雙路Demo未完成。
- 原片及人工21段／21畫格prompt在同目錄`prepaid-preparation-20261106/`；原analyzer實際送圖準備在`analysis-input-20261106/`（20個detector段、最多12圖）。
- 本次分析兩檔取消SDK retry及所請求的fallback，patch 9b6ad1c728d31308160a77931f364faad065160ba3b20eeff206960f71de6c30，獨立review/root接受。root整合full1115/2與frontend GREEN。無付費、憑證或provider帳戶操作。
- 第一個需批准的動作是原片Claude分析，而非圖片生成。當前本機US$0.08只是記帳；16000 output tokens不是美元硬cap；前端仍無分析quote/confirm。尚不可宣稱已備妥可強制執行的US$0.50上限。
- 單次請求修正不保證provider／代理內部行為；兩路正式圖片／影片、送審及成品需後續逐次批准。下一步先確立分析付款前確認與費用界線，不按現有自動Plan入口發真請求。

## 目標與完成標準

以同一個客戶、一個固定內容案例，完整展示：

找熱門影片 → 分析 shot list／storyboard → Canvas 改編 → AI 生成或真人拍攝素材 → 剪輯 → 真 MP4。

- 週四取得第一支可播放、可下載的完整影片，提早暴露整合問題。
- 週五取得正式成品，在實際展示電腦完整彩排兩次，固定版本並準備備援。
- 週六確認展示環境與播放，不依賴尚未驗證的服務臨場成功。
- 主流程無阻斷問題；展示的功能有實測證據，mock 與 placeholder 明確標示。
- 尚未確定展示對象與可用時長。先準備約 5 分鐘主線及可跳過的延伸步驟，待 Tommy 確認後調整講稿。

## 付費 API 零支出政策

使用者再次要求嚴格避免花費。本次 demo 準備的付費 API 批准額為 US$0，先前「繼續」不授權任何付費呼叫。此處是政策，並非宣稱執行環境已驗證零支出。

- 不呼叫付費圖片、影片、配音、搜尋或外部 LLM API；不使用會扣 credits／預付餘額的服務。這不包含既有 Codex 訂閱本身的用量。
- 測試只在自己的隔離環境使用 mock／離線 adapter、自有素材或已存在輸出。啟動環境不載入付費憑證，且生成與搜尋等所有付費預算設為0；不得假設單一圖片或影片開關涵蓋所有付費入口。
- 不讀印秘密、不 source key 設定、不修改其他 agent 的服務或工作區；不能安全證實隔離就不啟動該服務。
- 檢查所有付費入口均拒絕且 provider 呼叫數為0，使用 fake／spy 驗證，不能為了測防線發一個真請求。只看報價為0不是證據。
- 不自動重送未知結果，不允許付費 fallback／批次／助手流程繞過相同限制。已發送的外部任務可能仍計費，核對時須列出是否有既有任務，不能聲稱停止本機服務就能取消外部收費。
- 若之後要付費，先另行列帳戶、模型、次數／秒數、估價與可強制執行的硬上限，取得當次明確批准才可解鎖。provider端沒有硬限制時，明確回報，不能用程式估價代替帳單硬上限。


## 最新確認的範圍與優先順序

本節是使用者 2026-11-05 討論後的確認，優先於下面原先較廣的全站／送審清單。

1. 必須完成「找熱門影片」：顯示來源及可核對的熱門依據；免費開發可先用快取，現場是否即時搜尋需另驗，不能把快取宣稱為即時結果。
2. 必須完成「拆解與改編」：shot list 是每鏡內容、拍法、台詞及時長，storyboard 是視覺參考；對應到 Canvas，可調整並保存，參考畫面與新生成畫面可辨識。
3. 必須完成「製作影片」：逐 shot 選擇 AI 圖片／影片生成，或把 storyboard 給攝影師拍攝，再匯入素材剪輯。至少一條路完整跑通，另一條展示素材如何接入；不以同時做深兩條路阻擋交付。
4. 必須真正匯出並看完整支 MP4，確認畫面、字幕與聲音。假成品或 mock 生成不能替代真輸出；未驗真 provider 如實標示。
5. 次要項目：手動發布到 Instagram／TikTok，貼回連結追蹤自己影片成效；時間不足可用明確標示的示範數據。此次不優先投入真實平台授權／數據接線，也不做產品內直接發布。
6. 送審、全站支線與 analytics 都不阻擋本次核心 demo。僅優先修會阻斷找片、拆解、Canvas 接入、素材、剪輯及匯出的問題。

驗收先以同一案例走完核心主線；週五才補品質及兩次彩排，週六展示固定版本。Canvas 不由 demo-flow-qa 重做；整合時先取得其 agent 的已交付版本。


## 執行邊界與目前證據

- 桌面 1440 寬；不做手機版檢查。影片、字幕與配音以英文為主，保留 zh-Hant UI。
- Canvas agent 繼續既有任務，不重啟重複的 Canvas 寫作工作。其他頁面沿用 Veralyn 設計；涉及外觀或導覽決策先對齊。
- `freeform-canvas/docs/STATUS.md` 的 11 月 5 日紀錄包含 mock 主流程、真 Remotion MP4、保存及重啟驗證，也列出真 provider 品質／等待／計費未驗證、發布與部分 analytics placeholder。
- `docs/todo.md` 記錄 11 月 4 日舊版本 fal smoke 已完成；這不代表新 Canvas 的真 provider 主線已通過。舊套件測試也不能替代新整合 commit 的驗收。
- 起跑時重讀目標工作區的 `AGENTS.md`、`docs/STATUS.md`、`docs/todo.md`、`docs/test-log.md` 及 `pivots/02-content/docs/demo-qa/issues.md`，核對 Git 實況與既有問題是否仍可重現。
- 不讀取或輸出秘密、不安裝依賴。Gemini 在使用者明確說 billing 已啟用前不使用或測試。
- 每次付費呼叫先報帳戶／模型／用途／估價／硬上限，等當次明確批准後才執行，完成後回報實際支出與可取得餘額。此計畫不構成付費批准。
- 未批准付費時，先用自有真人素材、快取研究及既有輸出驗證主線，真生成項目保持「未測」。
- 不自動 commit、push 或 merge；另依使用者授權及 repo 規則處理。現有未追蹤研究資料不動。

## 多 agent 分工與順序

由一位整合 agent 負責固定目標版本、分配檔案、接收證據、整合及最終驗收。建議同時最多三位執行 agent，UI 測試全程只有一位。

| 角色 | 範圍與交付 | 寫入與隔離限制 |
| --- | --- | --- |
| A：現有 Canvas agent | 收尾既有 Canvas 範圍，交付 commit、已驗與未驗項目、啟動方式及阻礙 | 保持原工作區；其他 agent 不改它正在編輯的檔案 |
| B：全站接線稽核 | 唯讀盤點主要頁面、控制項、API、保存位置；列出真實可用／mock／未接線／未測 | 不改產品、不開瀏覽器、不呼叫付費服務；可在 A 收尾時平行進行 |
| C：流程與影片 QA | 在整合版本跑 1440 UI、真人素材剪輯、匯出、送審及重啟，交付重現步驟、截圖和媒體證據 | 唯一瀏覽器持有人；A 交付且整合版本固定後才開始端到端驗收 |
| D：獨立覆核 | 唯讀覆核修正 diff、驗收證據及宣稱，找出遺漏 | B 完成後再啟動，或由 B 換成覆核角色；不與 QA 爭用瀏覽器 |

整合 agent 不做無界限平行修改。B／C 發現問題後，由整合 agent 指派單一修正擁有人。若需要新的寫作 worker，使用 Orca 建獨立工作區及任務分支，指定互不重疊檔案；共享介面先定案，再分派下游任務。

每個 worker 的任務必須包含：目標 commit、檔案範圍、不可碰項目、驗收條件、驗證命令，以及回報格式「branch／commit、修改檔案、命令與輸出、證據位置、未測／阻礙」。worker 不自行 push、merge、發外部訊息或擴大範圍。

QA 使用專用連接埠、DB 與素材目錄，不能重設別人的環境。先實際呼叫 Playwright 工具確認可用；瀏覽器被占用就回報，不關閉別人的 Chrome。只有測試持有人關閉自己開啟的 context／tab、停止自己啟動的測試服務。保留正式 demo 服務與資料。

## 週四 11 月 5 日：完成與驗真

### 階段 1：固定案例、盤點主線

整合 agent 與 Tommy 選定客戶、案例、英文腳本、預期片長及展示步驟。準備真人英文說話素材、無語音 B-roll、logo，以及具使用權的配樂。需要 AI 圖片／影片／配音時逐項列出，不預設全部都要。

A 繼續 Canvas；B 平行盤點以下入口：登入、客戶、Home／Overview、Find、Research、Compare、Plans／Plan、Canvas、Editor、review、Settings、Channel／Brief、Publish／Analytics。先列可重現缺口，不順手重做全站。

每個功能記錄：

| 頁面／控制項 | 使用者操作 | 預期結果 | API／資料來源 | 真實可用／mock／未接線／未測 | 重開保存 | 問題與證據 | Demo 是否展示 |
| --- | --- | --- | --- | --- | --- | --- | --- |

完成條件：主流程每一步都有入口、輸入、輸出及責任人；未接線功能不混入正式示範。

### 階段 2：整合並檢查前端全流程

A 交付後，整合 agent 核對差異與依賴，選定一個整合 commit，跑完整驗證；C 在該 commit 的隔離環境跑 UI。

| 測試 | 操作與預期結果 |
| --- | --- |
| 研究與計畫 | 快取搜尋／既有研究 → 選定內容 → 建立計畫；客戶、標題、腳本、shot 對應正確，reload 後仍在 |
| Canvas 接線 | 從實際前端入口進入；素材與節點可保存、重新開啟並送入 Editor；無假成功狀態 |
| 失敗呈現 | 未快取搜尋或可控 API 失敗時顯示本次錯誤，不把舊結果當新結果；不為此發真搜尋 |
| 全站外觀與語言 | 1440 下無阻斷操作的遮擋；淺／深色 Editor 文字可讀；切 zh-Hant 後主線可操作，再切回展示語言 |
| 匿名審核 | 獨立無登入 context 開 review，只能看到允許的內容，不依賴操作者登入狀態 |

### 階段 3：真人素材驗收自動剪片，產出第一支影片

先確認「自動剪片」在目標 commit 實際提供的入口與能力。舊版 Make the video、目前 Editor、自動填入時間線及 Clean up 不能混稱為同一功能。

| 能力 | How to test | 通過條件 |
| --- | --- | --- |
| 排列與選片 | 用至少三個 shot，混合真人說話及無語音 B-roll，選定 takes 後進 Editor | 順序及選片正確；缺素材有提示；手動挑片部分如實說明 |
| 去停頓／贅詞 | 真人說英文，含 um／uh、超過 0.4 秒停頓及正常短停頓；先記原始片段時間點，再執行 Clean up | 對照前後播放，主要意思與句子完整，沒有誤剪字首字尾；B-roll 不被整段刪除 |
| 字幕 | 對照實際語音逐句播放，抽查開頭、中段、片尾及剪接點 | 沒有缺句、明顯錯字或持續錯位；確認是語音轉錄還是腳本字幕，不混淆 |
| 配音與配樂 | 使用英語音軌，播放人聲、音樂交疊及剪接位置 | 全片可聽清人聲、無異常爆音或截斷；音樂授權已確認 |
| 畫面與品牌 | 播放直式及橫式來源、logo、文字；有實際手機 HEVC／HDR 素材時加測 | 無黑畫面、錯誤裁切或明顯灰白失色；未取得該類素材就標未測 |
| MP4 匯出 | UI 匯出並下載，獨立播放器觀看全片，以 ffprobe 查看編碼、尺寸、fps、時長與音軌 | 成品符合選定設定；若採既有直式規格，核對 1080×1920、30 fps、AAC；時長與時間線吻合 |
| 送審與狀態（延後，不阻擋核心 demo） | 送審 → 匿名播放 → 退回並填理由 → 修改重匯出 → 再送審 → 核准 | 雙方狀態同步、理由保存；舊成品不冒充新成品；核准對應正確影片版本 |
| 保存與重啟 | 記錄素材 hash 與計畫／時間線，reload、離開重開，再正常重啟專用 backend | 同一持久 DB／素材目錄保留內容與可播放檔案；重啟不是重建空環境 |

真 provider 另逐項驗證一張圖片、一段影片或一段配音：經 UI 確認報價、完成生成、保存輸出、重開可用，記錄等待時間及支出。不自動重送不明結果；未批准的項目不執行。

週四關卡：第一支完整 MP4 已下載並看完，主線跑通；缺陷依下列分類。若真生成未獲批准，以真人素材完成第一支，保留真生成未驗標記。

- P0：資料遺失、存取權限錯誤、重複付費／無法控制支出，立即停止受影響流程。
- P1：主線無法完成、成品明顯錯誤、展示必需功能僅為 mock，週五優先處理；未修復就縮小展示範圍。
- P2：不阻斷主線的外觀或次要功能，記錄後延後；不擴張成整站重設計。

## 週五 11 月 6 日：正式成品、固定與彩排

### 階段 4：修阻斷問題與完成正式影片

1. 整合 agent 依 P0／P1 排序，指定單一擁有人修正；有行為 bug 時先重現並建立聚焦回歸，再做最小修正。
2. C 重測受影響流程；D 唯讀覆核修正與證據。修正後的完整驗證須對應同一 commit。
3. 完成正式影片，Tommy 實際看完並確認內容、聲音、字幕與品牌。保留原素材、生成結果、時間線及成品備份。
4. 固定展示 commit、啟動方式、持久資料目錄及唯一展示網址。確認實際展示電腦能連到網址、登入並播放；不只測開發機 localhost。
5. 若 Figma 流程圖需要同步，由指定負責人在功能穩定後處理，僅同步本次已驗流程，不阻擋成品與彩排。

### 階段 5：兩次完整彩排與備援

- 第一次從乾淨登入開始，照講稿操作主線；記錄每步耗時、等待及失敗。必要的真生成不反覆重跑，可使用已生成結果。
- 修正阻斷問題後，第二次在實際展示電腦重跑。兩次都完成才列為通過；途中改程式則重新核對受影響步驟。
- 預設五分鐘配置：案例與需求 30 秒、研究／計畫 60 秒、Canvas 60 秒、剪輯與成品 90 秒、素材路徑與備援 60 秒。依展示時長調整。
- 準備本機正式 MP4、完整流程錄屏及關鍵截圖；實際斷網播放 MP4 和錄屏，確認含聲音。錄屏避免顯示憑證、私人素材或不必要的個資。
- 準備可重複展示的獨立案例副本，避免正式案例已核准後按鈕消失，或前一輪測試改動正式資料。
- 真發布／analytics 若仍未接線，不以現場操作宣稱已完成；核心主線止於真 MP4；手動發布貼回連結是次要延伸，不以產品內直接發布作展示。

週五關卡：正式成品確認、P0 清零、核心展示路徑 P1 清零、兩次彩排完成、錄屏與離線成品可播放；成效分析與送審不列核心關卡。未達標時縮短現場主線並明確標記限制，不把尚未測通的生成當作展示依賴。

## 週六 11 月 7 日：展示確認

### 階段 6：開場前 smoke 與展示

1. 核對固定 commit、展示網址、登入、持久資料與素材；開啟正確案例，不重設 DB。
2. 在展示電腦播放成品，確認音量、投影／分享畫面及影片流暢度；檢查 review 連結可從獨立瀏覽環境開啟。
3. 確認主線入口和備援錄屏可開，不做付費 smoke，不臨場更換模型或升級套件。
4. 服務或網路失敗時切到本機 MP4／錄屏，說明使用預先完成的案例；生成等待超過彩排可接受時間時直接展示已生成結果。
5. 展示期間的新問題記錄為後續項目；只處理阻斷展示且已知安全的小修，改後仍需重測。

完成條件：觀眾看見完整流程及最終成品，已實作與未接線部分說明一致。

## 驗證命令與交付證據

以下由整合 agent 在實際目標工作區執行。不可用本計畫所在的 `canvas-p1` 分支測試，替代 Canvas 整合驗收。

```bash
git status -sb
git rev-parse HEAD
bash bin/verify.sh
git diff --check
```

若該版本的 `bin/verify.sh` 有 fast／full 模式，關卡驗收使用 `bash bin/verify.sh full`。目前已確認 freeform-canvas 的紀錄有此模式；執行前先核對腳本。

前端檢查在 `pivots/02-content/app/trend-finder/` 執行現有命令，不新增套件：

```bash
npm run build
npm run lint
```

影片檢查，把最後一個參數替換成實際下載成品路徑：

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate,channels -show_entries format=duration -of json /absolute/path/to/final.mp4
```

freeform-canvas 已有 `e2e/freeform.cjs`、`freeform-recovery.cjs`、`freeform-restart.cjs`、`freeform-legacy-entry.cjs` 等腳本。QA 先讀目標版本的啟動參數及環境需求，再用自己的隔離 fixture 執行；不可猜連接埠、不可對正式資料跑破壞性測試。現有腳本結果需搭配上面的真人素材及全站手動清單。

證據統一記錄在既有 `docs/test-log.md` 與 `pivots/02-content/docs/demo-qa/`；產品進度更新目標分支的 `docs/STATUS.md`。每筆包含日期、commit、環境／網址、素材類型、步驟、預期／實際、PASS／FAIL／未測、證據位置與清理結果。未授權新增報告時使用既有紀錄檔。

## 下一次可以直接開始的步驟

1. 在 Canvas 工作區核對 Git 與最新 STATUS，取得現有 Canvas agent 的交付範圍，避免重複修改。
2. Tommy 選定固定案例及素材，確認觀眾、展示時長與是否需要現場真生成；不阻擋免費盤點先行。
3. 用 Orca 指派 B 做唯讀全站接線稽核，A 繼續收尾；此時不啟動第二位 UI agent。
4. A 交付後固定整合版本，跑完整驗證，再讓 C 執行階段 2／3；週四先完成第一支影片。

## 本工作區交付核對（2026-11-05）

- 原 UI ctx_5412d8a8ceb6 已續作並完成同案例靜態矩陣；動態 QA 因副本操作未批准而 failed／exited，不是 UI PASS。沒有重複 agent，未重開已完成 worker。
- P1 #1／#5 七檔 patch 經兩輪獨立覆核後接受，已套用本機 fix/demo-flow-qa-mainline，親跑整合 verify／build／lint 通過；未提交。worker 暫停時舊 RED 不推翻後續整合證據，也不當作目前驗證。
- 最新免費證據：快取搜尋 API 真 hit／miss 已驗；無憑證零預算 fake 入口測試32項通過、provider/network spy=0。證據與完整任務→patch→review→整合→UI 狀態在 docs/STATUS.md 最新表。
- 仍未完成：同案例真拆解、原片 frame→可見 storyboard 契約、新 Canvas 固定交付及本輪 UI、可用素材、完整真 MP4 和持久重啟。Canvas workers 已 done，不重做其工作；只待固定交付與接入。送審／產品內發布／真平台 analytics 不阻擋。
- 核心下一步：整合者接回不需素材的免費查核；有權真人或既有真素材到位後產出 MP4。付費批准維持 US$0，曾被阻擋的副本操作未解鎖，任何 mock 成品不得冒充真生成／核心成品。

### 整合者接回後新增證據

2026-11-05：已完成零支出入口32項fake/spy回歸；實際前端+mock API下Research→Plans→reload與shot list保存通過；用repo既有產品導覽素材經真Remotion匯出9.024秒MP4並完整播放，技術驗證通過。檔案在demo-qa/2026-11-05-zero-spend/，各項限制見evidence.json與STATUS。這不是正式案例或新版Canvas驗收，原UI failed不改寫，真後端副本仍blocked。

接手下一步：1. 提供同案例有權素材／既有真拆解與原片參考畫面路徑（目前只有tofu搜尋保存記錄）。2. 取得Canvas已交付的固定來源樹／patch清單，不改其工作區。3. 在已證明無憑證、mock、全部預算0的自有環境完成真後端+UI持久接入；受hook擋的操作須另解決，不能以本輪mock UI代替。4. 以素材完成正式同案例MP4、畫面及聲音品質驗收。付費仍US$0、送審/平台analytics不阻擋。

### 非Canvas接手：原生後端工程鏈完成（2026-11-05）

已依專用交接下一步3執行：無憑證、env -i、七項預算0與provider/network spies，用in-process TestClient及臨時DB/media，完成repo導覽影片4 takes／3 shots原生上傳→choose alternate→edit保存→原生export API與worker→真Remotion MP4。ffprobe 1080×1920／30fps／H264／AAC／9.024s、全片decode與實際瀏覽器完整播放均PASS。全新Python程序重開同DB/media後edit、takes及final MP4 hash一致，provider/network spy0、wallet空。程式、成品、截圖及JSON在`demo-qa/2026-11-05-zero-spend/native-takes-*`。

此為工程鏈驗收；原生cover裁切橫片、字幕是自寫技術標籤，不是正式案例／真人Clean up／新Canvas／真前端UI驗收。完整verify在嚴格零預算環境RED（backend92 failed、910 passed、2 skipped；另三步PASS），已聚焦確認一項fake provider測試被429先擋、預期502；不推論其他91項同因，不提高預算。零支出32項回歸仍PASS（0.40s）。

剩餘順序：1. 取得異步詢問中的同案例有權素材與既有拆解／原片參考路徑。2. 由Canvas擁有人交固定版本，保持其工作區及服務不動。3. 在允許的自有環境驗真前端接入／持久重啟，舊副本hook未批准前不重試。4. 完成同案例正式影片、逐句畫音字幕品質驗收及彩排。全套verify的零預算相容性需另決定測試策略。未commit／push／merge，沒有新worker。

## 全新21鏡AI廣告：本輪取代舊frame改製方案（2026-11-06）

使用者批准fal US$3、OpenRouter US$10各自批次上限，無commit/push/安裝。新batch在`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai`，與舊batch-20261106獨立，原片只分析；攝影師既有成果沿用。全新圖用Nano Banana2，12鏡Hailuo6秒＋9鏡Veo Lite4秒無音訊，剪輯21鏡315frames/30fps。Hailuo768p來源可經Editor1080p輸出，但不可宣稱來源原生1080p。

本次免費準備已做：21組text-only新場景prompt（sage-green碗、travertine、apricot廚房）、節奏、來源限制、官方catalog快照；正常啟動Key布林檢查；offline ledger契約7測試；自有8972 13UI/32零支出/真restart及8976錄影能力PASS。失敗證據保留，全部owned資源清理。原有產品code與dirty未改。

具體阻礙：正常後端入口沒有OPENROUTER_API_KEY。本輪0付費請求、US$0，未開始生成或聲稱新廣告完成。原有OpenRouter images adapter亦不具可證成本硬限；後續adapter需完整payload約束，不能僅靠UI報價或ready布林。offline guard尚未接HTTP且不具新圖來源的實際provider-response綁定，不能稱live-safe。

後續順序：
1. 透過既有正常後端安全設定提供OpenRouter Key；免費account檢查與官方price refresh，勿在聊天傳Key、勿改配置/抄Key。既有fal可沿舊normal startup安全載入。
2. 在新batch實作唯一受限adapter：Nano Banana2 chat路徑max_tokens3072提案需input最壞成本界線、無fallback/tools；固定Veo1080p/4s/audiofalse、Hailuo6s；reservation先落盤、完整payload hash、unknown停批、不自動重送。將provider回應bytes/requestID綁不可覆寫新圖，影片保存input hash並送同bytes；先offline回歸與唯讀覆核，保留每次quote/account/cap。
3. 先s1/s14/s20三張新關鍵圖QA，通過才擴21張。image inputs全部空，不用原片或舊Seedream圖；每段video首圖只用新batch驗證過輸出。品質失敗最多批准範圍補做，兩次失敗取新證據。
4. 12Hailuo＋9Veo完成動作QA，經真Canvas/Editor匯出10.5秒直式成片。來源manifest逐張圖、video input及provider ID/hash/成本；原音樂不用。
5. 新片無cookie播放、reload保存、最新版本waiting；完整成功前端連續錄影明示prepared/live，QA不冒稱真人批准。8982/8983/8984屬原session舊展示，僅用其他自有port/context。

本輪只更新既有STATUS/test-log/此plan與新增batch artifacts；沒有產品adapter變更，也沒有新成片交付。
