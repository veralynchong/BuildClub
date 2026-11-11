## 2026-11-06：全新 AI 21 鏡成片最後交付完成（接手實跑）

使用者明確批准由監督 session 接手；只完成既有生成成果的免費匯入、剪輯、文字匯出、錄影及重啟驗證。實際 app 在 `chore/final-ai-delivery`，HEAD 與 origin/main 均 2c069a8，所有其他 dirty 保留，未 commit／push／安裝／新增付費。

- 成片：`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai/deliverables/final21/ever-green-fresh-ai-ad.mp4`，SHA256 `be20427fd3dc0eaadc3379dadd3e98136eeb25b60bb68c9d0f931294972edc14`。H264 1080×1920、30fps、315幀／10.5秒；AAC 容器10.517秒、解碼PCM全零，沒有原曲／配音。三組英文畫面文字已實看開頭、中段、CTA。
- 實際UI完成：上傳已生成21鏡組片→Canvas→原生Editor20次Split形成21片段→三組文字→Export／Download→員工完整播放→送審waiting→同頁登出／清cookie→匿名完整播放ended。最新version `1793949486916819995`，非真人批准。
- 真重啟：自有PID41763正常停止後PID43419用同state啟動，bootId不同；時間線、文字、媒體SHA、最新waiting與匿名播放均保留。成功連續原錄影與重啟錄影在 `evidence/final21-takeover-20261106-1812/attempt5/`；友善檔名錄影在 final21/full-demo-walkthrough.mp4。自有browser/context/backend全部關閉，8978／8979／8980釋放，test-slot held=false；其他Demo服務未碰。
- 來源／費用：52筆原provider receipts及所有ledger SHA不變（28圖＋24影片；選用9H＋12V）。fal預留3.52美元、實際帳單未知；OpenRouter供應商回報2.40美元；接手新增付費0。`delivery-manifest.json`與`source-manifest.json`保留完整來源及所有失敗。
- runner實跑修正只在batch交付工具：未使用的FastAPI status參數被誤判必填query（422）；上傳契約實際200而非201；隔離Canvas正常保存被工具封鎖造成leave guard不通；匿名頁尚未出現video就計數。已按真實API／截圖／網路證據修正，保留attempt1–4全部FAIL，attempt5兩階段PASS。只放行此隔離idea的原生Canvas PUT；generation、人類approve、其他idea／外部請求仍禁止。沒有改產品程式或Shot.line。
- 親跑驗證：app `bash bin/verify.sh full`：1115 passed、2 skipped in45.30s（交付後重跑），frontend PASS，verify GREEN；交付工具47 Node＋6 Python測試PASS；`python3 -B .../deliverables/final21/verify-delivery.py` 四項PASS，驗成片規格／完整decode／靜音、兩段成功錄影、真重啟、來源與費用帳本不變及cleanup。
- 品質限制保留：S11只是攪拌中、macro看不到接收麵糊、白盤／綠碗與手部連續性有差異、包裝細字不可靠。raw全片獨立QA為LIMITED、無新增阻斷，不能宣稱無瑕或真人已批准。
- 六鏡Demo是另一個已驗收分支；本次21鏡完整片尚未自動替換六鏡Editor或假裝六鏡重新匯出。下一步由Demo owner依新影片manifest明示接入；本輪最後交付已完成。

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

## 固定原片 Demo 批次執行檢查點（2026-11-06）

使用者已明確授權後端安全載入既有 Anthropic／fal 兩個 Key，按 US$10 批次預算無人值守執行；較早「US$0／未選影片／待逐次確認」紀錄僅為歷史狀態。固定案例 DVp3xOdFaHL、沿用 Ever Green 豆腐產品，主線 Research → Plan → Canvas，兩路素材為 AI 重現與攝影替代角度。全部在 mini，無安裝、提交、推送或外部通知。

- 已完成：真前端 Research 選原片 → Claude 一次請求 → 21 shots → Plan／規劃畫布；QA manager 測試角色批准後，生成 Canvas 自動建立21組 Shot／Storyboard。未冒充真人主管同意。
- Anthropic 回傳10861 input／3707 output tokens，依本批定價估計 US$0.117584；安全帳本保留 US$0.50 reservation、不回收。總額10／分析0.50／image3／video6.50；Seedream edit單張0.04，Hailuo Fast 6秒每次保留0.20。fal balance讀取403，餘額未知，沒有充值。
- 專用8982服務使用實際整合app、自己的持久DB/media及正常設定載入；批次guard只允許凍結原片分析與指定fal endpoint，拒絕其他付費入口／重複payload，未知提交全批停止。這是本機預約上限，不是供應商帳戶全域bill cap。
- 原始證據：`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106/`。phase1真分析與Canvas成功，錄影saveAs失敗使runner標FAIL；recording兩個原始WebM仍存在，ffprobe皆1440×900、約91秒，尚待完整解碼。後續inspect證據另存，不改寫原FAIL。
- 最近整合驗證：`bash bin/verify.sh full`：backend compiles／loads without dotenv PASS；1115 passed, 2 skipped；frontend unit tests PASS；verify GREEN。之後未改產品程式。唯一新產品patch為Claude禁SDK retries／fallback，已獨立覆核並整合。
- 進行中：第一張真參考image與第一段真video的前端操作及品質檢查；尚未聲稱整批素材、成片、剪輯、最終主管review或完整成功錄影完成。下一步先檢查生成回傳／帳本，再擴大批次，不重送原片分析。

# Test log

One row per test run, newest first. Never delete rows.
Before running a test, check here: if the same test already passed at a commit and `git log <sha>..HEAD`
shows no change to the code it covers, do not run it again.

- Mock = mock models, US$0. Paid = real provider, cost noted.
- Ports: isolated backends on 8871/8872 only.
- Issues found during demo QA live in `pivots/02-content/docs/demo-qa/issues.md`; open setup tasks in `docs/todo.md`.

| Date (AEDT) | Branch @ sha | What ran | Result | Cost | Evidence |
|---|---|---|---|---|---|
| 2026-11-06 | test/demo-readiness @ 2c069a8 + reviewed dirty patches | Root `bash bin/verify.sh full` after analysis single-request patch | GREEN: 1115 passed, 2 skipped (33.62s); frontend PASS; diff check exit0 | US$0 | patch 9b6ad1c728d31308160a77931f364faad065160ba3b20eeff206960f71de6c30; /tmp/buildclub-analysis-single-request-report.md; root accepted independent review; source hashes verified |
| 2026-11-05 | feat/demo-team-handoff, Canvas02c5f99 + integrated demo snapshot | Full offline sandbox verify; zero-spend runner; isolated frontend npm build/lint | GREEN: backend1109 passed/2 skipped (33.23s), frontend PASS; zero-spend32 passed (0.50s); build/lint0. No network/credentials/shared writes. Initial temporary Vite cache denied; owned local cache fixed harness only. Origin/main baseline render-orphan test failed, integrated Canvas passes. No new full UI/provider/campaign acceptance | US$0 | Integration terminal output; /private/tmp/buildclub-team-frontend-8_oywgrz/*-final.log; existing Canvas/demo evidence retained |
| 2026-11-05 | Productdiff221c6446; Canvas picker theme fix | Root full/build/lint; actual1440Light/Dark served CSS; no backend restart | 1076 passed,2skipped33.72s;frontendPASS;build/lint0;white form/input/card Light;Dark themed;pageerrors=[];ownedbrowserclosed | US$0 | /tmp/buildclub-picker-theme-full.log; /tmp/buildclub-picker-theme-2026-11-05/check-served.cjs, served-results.json, served-picker-*.png |
| 2026-11-05 | Final product067e9b87 unchanged | Unknown UI actual ResultLost worker transition/reload/restart/no retry/history; root artifact verify | PASS exit0;50newhashes+old964/130unchanged;3rows/3submit;.01virtualreservation retained;cleanupempty;VP8 1440x90036.40s | US$0/mock | /tmp/buildclub-canvas-unknown-ui-2026-11-05/report.md; verify-artifacts.py |
| 2026-11-05 | Magnific authenticated owned workflow, no Run | Front operation stage capture completion plus prior back-half | OBSERVED/non-generating workflow complete;5 stepGIFs41/35/11/13/47frames+prior50;continuousvideo BLOCKED(toolonlygif_creator);realgeneration NOTRUN | US$0 | MacBook:/tmp/buildclub-magnific-recording-completion-2026-11-05/report.md; sha256.txt; root exactworker transcript |
| 2026-11-05 | Final product067e9b87 unchanged | Remaining Legacy tail, active reload, downstream stale, price-only drift, malformed graph; root artifact verifier | Five groups PASS / each exit0;130hashes;9cleanup empty;ports empty/leases released;five full1440x900VP8 clips | US$0/mock | /tmp/buildclub-canvas-gap-completion-2026-11-05/report.md; verify-artifacts.py |
| 2026-11-05 | Final product067e9b87 | Root reran frozen UI artifact verification and diff check | exit0; 964 hashes PASS; raw failures retained; all cleanup survivors={}; MP4/WebM formats PASS; git diff --check exit0. UI tail NOT RUN stays explicit | US$0 | python3 /tmp/buildclub-canvas-controls-2026-11-05/verify-ui-report.py; ui/report.md; ui/final-cleanup.json |
| 2026-11-05 | feat/canvas-generation-controls @b651e6d + final product diff 067e9b87 / unit6fd5ba6c | Root full after picker click and ReactFlow measurement fixes; isolated build/lint | 1076 passed, 2 skipped in36.13s; frontend PASS; verify GREEN; build/lint exit0 | US$0/mock | /tmp/buildclub-canvas-controls-2026-11-05/final-measured-{full,build,lint}.log |
| 2026-11-05 | Final product diff067e9b87 | Original upload abort/same-node retry/reference path; measurement save/Editor-return/workspace isolation; excess API | Upload retry/ref PASS and nodes visible; measurement4 PASS, errors=[]; excess genuine422 no added generations | US$0/mock | ui/upload-excess-measurement-fix; ui/measurement-walkthrough-final; ui/excess-api-422; final ui/report.md |
| 2026-11-05 | Picker fix product e7477f52 and later measurement-only fix | Mouse picker close, smallcap/no-ref/ref preservation, active-child manual choice and history, search error clear | Picker targeted checks PASS; history2 PASS; search3 PASS; independent active UI agent provisional ACCEPT for both final fixes | US$0/mock | ui/picker-gaps; ui/history-gaps; ui/search-gaps; final ui/report.md |
| 2026-11-05 | Original integrated source731da3b7 | Main local MP4/approval/sendback/two real restarts; contrast; refs; batch chronology | main13/13; contrast16 elements per4 themes >=4.5; refs5; chronology3; mixed2; legacy-entry3 PASS; first export transient failure retained | US$0/mock | ui/renderer-diagnostic/workspace.mp4, ffprobe.json, restart evidence; ui/report.md |
| 2026-11-05 | Final product diff067e9b87 | Continuous UI screen recording through mock batch/reload/refs/Editor, visibility/workspace checks | VP8 1440x900 11.72s; partial walkthrough, not full end-to-end recording or exported MP4 | US$0/mock | ui/measurement-walkthrough-final/page@1d954e0fed90e09d9be5193ee0cbc13f.webm |
| 2026-11-05 | Same integrated product source | Navigation, saved brief/research, cached search, uncached429 alert, themes and en/zh | 21/21 PASS; pageerrors=[]; external fonts/embeds blocked intentionally; no live search | US$0/mock | /tmp/buildclub-canvas-controls-2026-11-05/ui/navigation/navigation-results.json |
| 2026-11-05 | Same integrated product source; controls-v3 | Actual mock ratio/size/count SVGs, ModelPicker keyboard, saved settings/selected reload | 5 checks PASS; 5 SVGs; pageerrors=[]; cleanup survivors={}. Earlier selected mismatch was missing reconcile wait, original comparison retained | US$0/mock | /tmp/buildclub-canvas-controls-2026-11-05/ui/controls-v3; selection-states.jsonl |
| 2026-11-05 | feat/canvas-generation-controls @b651e6d + reviewed dirty product diff 731da3b7 / new test 403f17b5 | Integrated offline full after bug/backend/frontend v3 patches | 1076 passed, 2 skipped in37.15s; frontend PASS; verify GREEN | US$0/mock | /tmp/buildclub-canvas-controls-2026-11-05/integrated-full.log; STATUS source hashes |
| 2026-11-05 | Same integrated product source | Build and lint in isolated deny-network temp copy, existing dependencies | build exit0; lint exit0; existing large chunk warning | US$0 | Same local directory/integrated-build.log, integrated-lint.log |
| 2026-11-05 | Same integrated product source | UI controls first attempt, actual browser runtime callable | NOT ACCEPTED: old served build showed native model select, Ratio timed out; runner finally cleanup; isolated rebuild/retest in progress | US$0/mock | Original UI agent; progress.json; final UI report pending |
| 2026-11-05 | feat/freeform-canvas @2776a19 | Final offline closing verification before PR53 | 1023 passed, 2 skipped in33.08s; frontend PASS | US$0 | Same product tree as f0; final code/visual ACCEPT |
| 2026-11-05 | feat/freeform-canvas @f0f97c9 | Full offline gate, build/lint after accepted legacy card placement | 1023 passed, 2 skipped; frontend PASS; build/lint0 | US$0 | Freeform Status |
| 2026-11-05 | @6e65cb1 + restart driver assertions | Main UI plus true server restart in approved/rejected states | 13 PASS; state/public JSON/media SHA256 unchanged; survivors={} | US$0/mock | QA main-ui-results/restart-*.json |
| 2026-11-05 | @f0f97c9 | Legacy entry/real assistant/NoShots plus card bounds | 3 PASS; overlaps=false; survivors={} | US$0/mock | QA legacy-entry-results/legacy-cards-geometry |

| 2026-11-05 | feat/freeform-canvas @4e92a14 | full offline gate; frontend build/lint | 1023 passed, 2 skipped; frontend PASS; build/lint exit0 | US$0 | Freeform Status; local-only sandbox |
| 2026-11-05 | 4e92a14 + scoped port-padding fix | Main 1440 UI, real local MP4, approval/send-back, persistence, geometry, zh-Hant | 11 PASS; cleanup survivors={} | US$0/mock | pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-* |
| 2026-11-05 | same tested product tree | Recovery/assistant/CAS/legacy kit/voice/navigation isolation | 5 groups PASS; errors=[], routeErrors=[], survivors={} | US$0/mock | same QA directory/recovery-* |
| 2026-11-05 | same tested product tree | Legacy Make the video, real local assistant, held shot PUT/NoShots recovery | 3 PASS; real responses, no fulfilled API data; survivors={} | US$0/mock | same QA directory/legacy-entry-* |

| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + unchanged local product fixes | Native in-process API: upload4 takes/3 shots → choose alternate → real sources probe → edit save/read v1 → POST edit/export202 → native worker/real Remotion → download → ffprobe/full decode; two TestClient lifespans then fresh Python process reopen same DB/media | PASS H264 1080x1920 30fps/AAC 9.024s; source/upload hashes and final download match; fresh-process edit/takes/output hash match; provider/network spy0, seven budgets0, wallet empty. No fake probe/export. Product tour only; center crop cuts landscape text, authored English captions; not human/new Canvas/campaign acceptance | US$0 | demo-qa/2026-11-05-zero-spend/native-takes-{check.py,evidence.json,proof.mp4}; temporary DB/media /tmp/buildclub-native-chain-ooc5gsg_ |
| 2026-11-05 | same local tree | Actual Playwright tabs list callable; owned context1440, readonly static8891, native MP4 full playback with remote requests aborted | PASS ended=true/currentTime9.024/error=null/muted=false; midpoint inspected. Initial about:blank media NotSupportedError, then same-origin playback passed. No subjective speech listening. Own tab closed; server cleanup checked separately | US$0 | native-takes-playback-{midpoint,ended}.png; native-takes-evidence.json |
| 2026-11-05 | same local tree | bash bin/verify-zero-spend.sh; full bin/verify.sh in env -i with seven budget env vars0 | Zero-spend 32 passed in0.40s. Full verify RED: backend92 failed/910 passed/2 skipped in25.62s; compile/load/frontend unit PASS. Focused test_frame_poll_failed_refunds expected502, got429 zero-wallet guard, 1 failed in0.17s. Remaining91 not individually diagnosed; no budget raised, historical GREEN not reused | US$0 | Test output in session; verification summary in native-takes-evidence.json; full verify resource local:buildclub:verify released |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + local fixes | bash bin/verify-zero-spend.sh; bash syntax check and git diff --check | 32 passed in 0.35s, exit0. Script fails closed on local config presence, starts env -i + seven budgets0; no HTTP service or provider/network call | US$0 | bin/verify-zero-spend.sh; backend/tests/test_zero_spend.py; checks are local-branch fake coverage, not new Canvas/provider invoice acceptance |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + local fixes | Integrator UI takeover: actual frontend at1440, read-only static host + browser-route fake API; external requests blocked | PASS sample Picked→Plans→actual reload→plan shot edit. Confirmed Research width1473 at1440 (#2). Not real-backend persistence, new Canvas, analysis or campaign acceptance. Static POST501; owned page/server closed and lease released | US$0 | demo-qa/2026-11-05-zero-spend/{research-picked-ui,plans-visible-ui,plans-reload-ui,shot-list-edit-ui}.png; evidence.json |
| 2026-11-05 | same local tree | Existing tracked product-tour footage, three clips, actual Remotion export in env -i; ffprobe + full decode + browser full playback | PASS H264 1080x1920 30fps/AAC 9.024s; ended=true/error=null; mean -20dB/max -3dB. Authored English technical captions; not human transcription, real AI generation or target-case final | US$0 | demo-qa/2026-11-05-zero-spend/existing-footage-proof.mp4, source hash and assertions in evidence.json; job/cache in /tmp/buildclub-existing-footage-3p0g5f0q |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + local fixes | Zero-spend paid entry tests: env -i, seven budgets=0, in-process API, fake availability, provider/network spies | 32 passed in 0.34s; each case asserts provider/network calls=0 and no wallet charge. First run: 23 passed/1 failed because test video node did not exist; corrected fixture, not a budget leak. No HTTP listener, real credential or provider request | US$0 | backend/tests/test_zero_spend.py; no new Canvas batch/UI/provider-billing acceptance |
| 2026-11-05 | same local tree | Cached-only API hit/miss using tracked tofu pinned record; external search/spend/background calls forbidden | PASS: 200, cached=true, 12 records; miss empty/cached=false, no paid call. Historical fetchedAt, not live platform verification | US$0 | /tmp/buildclub-demo-flow-qa-cached-search-evidence.json |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + local fixes | Resume audit: test-slot full verify with independent outer log, then full verify after changing shared step log to mktemp | Both GREEN, four steps PASS each. Historical paused-worker backend RED not reproduced; its original backend error is unavailable. Shared /tmp/verify_step.log could mix parallel reports; fixed only log isolation, unchanged checks | US$0 | /tmp/buildclub-demo-flow-qa-resume-verify.qRvzPD; /tmp/buildclub-demo-flow-qa-isolated-verify.EQjZlJ; bin/verify.sh diff |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + uncommitted seven-file fix | Integrator applied reviewed P1 #1/#5 diff; test-slot full verify, build, lint, diff check | GREEN, four verify steps PASS; build/lint exit 0. Independent reviewer task_82b57e760129 accepted and ran focused 20/20. Updated one stale test comment. No UI, human footage, real reload/restart or new Canvas acceptance | US$0 | demo-qa/issues.md integration section; source diff and new unit/pickedPlans.test.mjs; local working tree, no commit/push/merge |
| 2026-11-05 | test/demo-flow-qa @ e442b3a | Session baseline `bash bin/verify.sh`; re-run after linking existing dependencies, no install | Initial RED: missing backend venv, TypeScript and @remotion/captions. Re-run GREEN: all four steps PASS. Local ignored node_modules link uses canvas-p1; backend/.venv uses w2-grade-subs-backend. No product changes, no browser flow or human-footage acceptance yet | US$0 | This worktree; `git diff --check` PASS; Playwright browser_tabs callable, about:blank only |
| 2026-11-04 | chore/demo-integrate-main-1104 @ cf5db59 | Merged the teammate's 7th branch `feature/recent-searches-ui` (Find ideas recent-searches table): `tsc -b` + build, eslint, `bash bin/verify.sh` | GREEN. Not browser-tested (no E2E covers Find ideas recent searches) | Mock | PR #49 |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 20aad0d (+ e2e/lib.cjs wait fix) | After restoring the Canvas entries on the teammate's plan page / Plans cards: E2E polish A-D on 8872, each on a fresh backend; `bash bin/verify.sh` | B 76/76, C 50/50, D 54/54, A 17/18 (only the known h1, issue #9; ran with `h1, h2`), verify GREEN. First run B-D failed: after the teammate's login change the app's first library save landed after `seed()` and wiped it; fixed in `e2e/lib.cjs` login (wait for network idle) | Mock | scratchpad `e2e-20aad0d/` (not kept) |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 78c1331 | After merging the teammate's 6 branches (entry-screens-ui, find-ideas-first-visit, landing-demo-search, plan-page-polish, planning-board-navy, plans-card-trim): `bash bin/verify.sh`, `tsc -b`, eslint, build | GREEN, 0 errors. Browser E2E not re-run. Note: plan-page-polish and plans-card-trim removed the Plan page / Plans card entries into the Canvas and the production + publish panel (CutPanel); only the sidebar Canvas item remains | Mock | PR #49 |
| 2026-11-04 | chore/demo-integrate-main-1104 @ bf55f84 | **Paid** fal smoke via the app's `FalAdapter` (no server): Seedream 4.5 text-to-image → Hailuo 2.3 Fast 6 s image-to-video from that frame | PASS. Image 2304x4096 (9:16) in 20 s; video h264 768x1364 24 fps 5.875 s in 103 s; looks good (tofu in pan, spatula flips). Real waits are longer than `typicalSeconds` (15 s / 90 s) | ~US$0.23 (fal) | script + outputs in session scratchpad `fal-smoke/` (not kept) |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 61462c7 | AI walk of the full flow at 1440 (Find ideas → Research → Plans → Canvas → ✦ → Run all → timeline → editor → export → send → review link), demo data | whole chain works; 0 P0, 5 P1, 4 P2 | Mock | `pivots/02-content/docs/demo-qa/issues.md`, screenshots in `demo-qa/2026-11-04-ai-pass/` |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 61462c7 | E2E polish A-D, each on a fresh backend | B 76/76, C 50/50, D 54/54; A aborted at nav (plan page has no h1 after teammate redesign → test issue, not a merge bug); A with `h1, h2` selector 17/18, the 1 fail is the same heading change | Mock | scratchpad `e2e-1104/` (not kept); issue #9 |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 61462c7 | `bash bin/verify.sh`, `tsc --noEmit`, `npm run build` after merging origin/main (#42, #44) | GREEN | US$0 | PR #49 |
| 2026-11-04 | feat/canvas-polish-d-agent @ f9044e2/5e4f117 | unit, backend pytest, E2E `polish-a-shell`, `polish-b-nodes`, `polish-c-timeline`, `polish-d-agent` (each on a fresh backend, 1440) | unit 466/466, pytest 969 passed, A 18/18, B 76/76, C 50/50, D 54/54, verify GREEN | Mock | `docs/STATUS.md` 2026-11-04 |
| 2026-11-03 | feat/canvas-p2-5-kit @ c2d057c | verify, pytest, unit, kit E2E 8/8, layout check at 1440 | GREEN, pytest 955, unit 388/388, E2E 8/8 | Mock | `.superpowers/sdd/2026-11-03-canvas-p2-5-kit-plan/task-7-report.md` |
| 2026-11-03 | fix/canvas-ux-batch1-3 | browser re-test of each UX fix item at 1440 | all PASS | Mock | `docs/STATUS.md` |
| 2026-11-03 | fix/canvas-ux-batch4 @ 0572a70 | verify | GREEN (no browser re-test) | Mock | `docs/STATUS.md` |
| 2026-11-03 | 5e83abd | AI UX test: goal-only (layer 3) + personas Daphne/Annie (layer 4), flows F1-F4 | all 4 flows reached; Annie 3/3, Daphne 3/3; findings fixed in UX batches 1-4 | Mock | Artifact https://claude.ai/artifact/5e2daMUXKegc3gdB3T9jJ4; `.superpowers/sdd/2026-11-03-canvas-p4-plan/ux-test/` |
| 2026-11-03 | 194a6dd → 62f97ee | A1-A8: stack rehearsal #28→#32 on main, 24/48-clip perf, HEVC .mov, HDR, chain guards, whisper speech, zh export, cold export | A1-A5, A8 pass; A6/A7 failed then fixed (f191a60, ed46dfd, 35415f1); A4 HDR fixed later (8344464) | Mock | `e2e/a*.cjs`; `.superpowers/sdd/2026-11-03-canvas-p4-plan/a2-a8-report.md` |
| 2026-11-03 | feat/canvas-p4-finish @ 0c22bb5 | P4 E2E steps 1-10, clean-up on a real file, export ffprobe | pass after filler fix; 1080x1920 30fps aac | Mock | `.superpowers/sdd/2026-11-03-canvas-p4-plan/task-8-report.md` |
| 2026-11-03 | feat/canvas-p3b-editor-media | P3b E2E, render smokes, ffprobe frames | pass; one bug fixed (31b2ad7) | Mock | `.superpowers/sdd/2026-11-03-canvas-p3-plan/task-12-report.md` |
| 2026-11-03 | feat/canvas-p3-editor | P3a E2E, Remotion export timing (cold 10.4 s / hot 10.8 s) | pass; one bug fixed (c6b2e34) | Mock | `.superpowers/sdd/2026-11-03-canvas-p3-plan/task-7-report.md` |
| 2026-11-03 | feat/canvas-p2-models @ dad12ba | verify, browser E2E 5 scenarios | GREEN, 5/5 | Mock | `docs/STATUS.md` |
| 2026-11-02 | main 4343366 | verify, tsc, lint, build, E2E at 1440 and 390 (filters, numbers source, Compare, framing, zh-Hant) | all pass | Mock | `docs/STATUS.md` 2026-11-02 |

## 2026-11-05 native-chain reproduction

Native-chain reproduction (run at repository root; no dependency installation or credential loading):

```bash
python3 /Users/tommy/.agents/skills/test-slot/scripts/test_slot.py --resource local:127.0.0.1:8892:buildclub-remotion with-command --wait 0 --timeout 300 -- env -i PATH=/opt/homebrew/bin:/usr/bin:/bin REMOTION_PORT=8892 DAILY_APIFY_USD=0 DAILY_CLAUDE_USD=0 DAILY_GEN_IMAGE_USD=0 DAILY_GEN_VIDEO_USD=0 DAILY_GEN_VOICE_USD=0 DAILY_JEV_USD=0 DAILY_SCRAPECREATORS_CREDITS=0 pivots/02-content/app/trend-finder/backend/.venv/bin/python -B pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-check.py
```

This command repeats the technical export and retains a new temporary DB/media folder. For a fresh-process read-only reopen of this run, use the same cleared environment and script with `--reopen /tmp/buildclub-native-chain-ooc5gsg_`. The actual original native-run stdout was:

```text
PASS native upload: 4 takes / 3 shots, byte hashes match repository source
PASS choose alternate: correct shot selected, original deselected
PASS real sources probe, versioned edit save/read, native export HTTP 202 -> done
PASS same DB/media across two TestClient lifespans, downloadable MP4 bytes match
PASS ffprobe H264 1080x1920 30fps / AAC / 9.024000s; full decode exit 0
PASS provider/network spy calls=0; seven budgets=0; wallet empty
```

Fresh-process reopen stdout:

```text
PASS fresh-process TestClient reopen: same DB/media, edit/takes/final MP4 hash match; provider/network spy=0, wallet empty
```

Cleanup confirmed: owned playback tab closed, static server stopped, 8891/8892 have no listeners, browser/static/render slots all held=false. Nested static-server wrapper initially caught Ctrl-C before forwarding it; inspected owned PIDs then sent SIGINT to owned static Python server only. No other Chrome or service touched.

## 2026-11-05 Canvas 本輪修改清單（未提交）

- `docs/STATUS.md`
- `docs/test-log.md`
- `pivots/02-content/app/trend-finder/backend/gen_models.json`
- `pivots/02-content/app/trend-finder/backend/gen_providers.py`
- `pivots/02-content/app/trend-finder/backend/generations.py`
- `pivots/02-content/app/trend-finder/backend/tests/test_gen_providers.py`
- `pivots/02-content/app/trend-finder/backend/tests/test_generations.py`
- `pivots/02-content/app/trend-finder/backend/tests/test_workspaces.py`
- `pivots/02-content/app/trend-finder/backend/workspaces.py`
- `pivots/02-content/app/trend-finder/src/App.tsx`
- `pivots/02-content/app/trend-finder/src/components/ResultsScreen.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/CanvasScreen.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/FreeformNode.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/ModelPicker.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/freeformContext.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/api.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/graph.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/legacy.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/session.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/types.ts`
- `pivots/02-content/app/trend-finder/src/lib/strings/freeform.ts`
- `pivots/02-content/app/trend-finder/src/lib/strings/server.ts`
- `pivots/02-content/app/trend-finder/src/styles/canvas.css`
- `pivots/02-content/app/trend-finder/src/styles/editor.css`
- `pivots/02-content/app/trend-finder/unit/searchStatus.test.mjs`
- 新增：`pivots/02-content/app/trend-finder/unit/canvasControls.test.mjs`

共 26 檔，無刪除；不含只存於 /tmp 的驗收產物。沒有 commit／push／merge。

## Never run yet (do not assume these work)

- Real models inside the app UI (Run all / ✦ on a real backend); fal Kling and Omni Flash; Gemini Nano Banana (no key yet). Only fal Seedream + Hailuo were called directly (2026-11-04)
- Real Claude for the "✦ 幫我建好" agent
- ElevenLabs voice
- Real human-speech clean-up, real iPhone HEVC/HDR footage
- Live Apify search (budget saved for demos)

## 2026-11-05 交付分支檔案清單

相對 `origin/main @ e442b3a`，含已提交Canvas前置成果；A=新增、M=修改、D=刪除。原工作區的秘密／資料／依賴／測試快取和未整理研究不包含在此清單。

```text
A	bin/freeform-e2e.py
M	bin/real-fal-backend.sh
A	bin/verify-zero-spend.sh
M	bin/verify.sh
A	bin/verify_offline.py
M	docs/STATUS.md
M	docs/test-log.md
M	pivots/02-content/app/trend-finder/backend/agent.py
M	pivots/02-content/app/trend-finder/backend/canvas.py
M	pivots/02-content/app/trend-finder/backend/channels.py
M	pivots/02-content/app/trend-finder/backend/cut_review.py
M	pivots/02-content/app/trend-finder/backend/editing.py
M	pivots/02-content/app/trend-finder/backend/gen_models.json
M	pivots/02-content/app/trend-finder/backend/gen_providers.py
M	pivots/02-content/app/trend-finder/backend/generations.py
M	pivots/02-content/app/trend-finder/backend/models.py
M	pivots/02-content/app/trend-finder/backend/renders.py
M	pivots/02-content/app/trend-finder/backend/server.py
M	pivots/02-content/app/trend-finder/backend/tests/test_channel.py
M	pivots/02-content/app/trend-finder/backend/tests/test_editing.py
M	pivots/02-content/app/trend-finder/backend/tests/test_gen_providers.py
M	pivots/02-content/app/trend-finder/backend/tests/test_generations.py
A	pivots/02-content/app/trend-finder/backend/tests/test_offline_verify.py
M	pivots/02-content/app/trend-finder/backend/tests/test_renders.py
M	pivots/02-content/app/trend-finder/backend/tests/test_server_text.py
M	pivots/02-content/app/trend-finder/backend/tests/test_store.py
A	pivots/02-content/app/trend-finder/backend/tests/test_workspaces.py
A	pivots/02-content/app/trend-finder/backend/tests/test_zero_spend.py
A	pivots/02-content/app/trend-finder/backend/workspaces.py
M	pivots/02-content/app/trend-finder/e2e/FLOWS.md
A	pivots/02-content/app/trend-finder/e2e/freeform-backend.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-isolation.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-legacy-entry.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-lifecycle.py
A	pivots/02-content/app/trend-finder/e2e/freeform-recovery.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-restart.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-timeout.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform.cjs
M	pivots/02-content/app/trend-finder/render/render-reel.mjs
M	pivots/02-content/app/trend-finder/src/App.tsx
M	pivots/02-content/app/trend-finder/src/components/CanvasPick.tsx
M	pivots/02-content/app/trend-finder/src/components/ResultsScreen.tsx
M	pivots/02-content/app/trend-finder/src/components/SharedReviewPage.tsx
M	pivots/02-content/app/trend-finder/src/components/canvas/CanvasScreen.tsx
A	pivots/02-content/app/trend-finder/src/components/canvas/FreeformNode.tsx
M	pivots/02-content/app/trend-finder/src/components/canvas/ModelPicker.tsx
A	pivots/02-content/app/trend-finder/src/components/canvas/freeformContext.ts
M	pivots/02-content/app/trend-finder/src/components/canvas/nodes/Ports.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/EditorPanel.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/ExportBar.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/ShotClips.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/tools/MusicTool.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/tools/VoiceTool.tsx
M	pivots/02-content/app/trend-finder/src/lib/canvas/agent.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/api.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/freeform.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/graph.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/legacy.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/mediaReplacement.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/operations.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/placement.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/ports.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/resource.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/session.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/shell.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/types.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/voices.ts
M	pivots/02-content/app/trend-finder/src/lib/cut.ts
M	pivots/02-content/app/trend-finder/src/lib/editor/api.ts
M	pivots/02-content/app/trend-finder/src/lib/editor/useEditProject.ts
M	pivots/02-content/app/trend-finder/src/lib/editor/useSources.ts
M	pivots/02-content/app/trend-finder/src/lib/editor/useTimelineActions.ts
M	pivots/02-content/app/trend-finder/src/lib/hooks.ts
M	pivots/02-content/app/trend-finder/src/lib/share.ts
M	pivots/02-content/app/trend-finder/src/lib/strings/canvas.ts
A	pivots/02-content/app/trend-finder/src/lib/strings/freeform.ts
M	pivots/02-content/app/trend-finder/src/lib/strings/server.ts
M	pivots/02-content/app/trend-finder/src/styles/canvas.css
M	pivots/02-content/app/trend-finder/src/styles/editor.css
M	pivots/02-content/app/trend-finder/src/types.ts
M	pivots/02-content/app/trend-finder/unit/agent.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasControls.test.mjs
M	pivots/02-content/app/trend-finder/unit/canvasEdges.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasEntry.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasFinalLifecycle.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasLegacyIntegration.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasLegacyMedia.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasPlacement.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasRecovery.test.mjs
A	pivots/02-content/app/trend-finder/unit/freeform.test.mjs
M	pivots/02-content/app/trend-finder/unit/hooks.test.mjs
A	pivots/02-content/app/trend-finder/unit/legacyVoicePair.test.mjs
A	pivots/02-content/app/trend-finder/unit/pickedPlans.test.mjs
M	pivots/02-content/app/trend-finder/unit/searchStatus.test.mjs
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/backend-audio.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/backend-ffprobe.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/backend-output-frame.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/backend-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/changed-files.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-01-direct-editor-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-02-assistant-applied-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-02-assistant-reloaded-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-03-auto-recovered-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-03-held-put-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-legacy-cards-geometry.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-01-empty-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-02-connected-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-03-review-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-04-editor-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-05-zh-Hant-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-06-inspector-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-canvas-geometry.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-connected-header-geometry.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-ffprobe.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-output-frame.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-port-styles.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-restart-approved.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-restart-audit.jsonl
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-restart-rejected.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-timeline-geometry.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-voice-volume.txt
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-assistant-preview-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-drag-targets.jsonl
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-filtered-create-menu-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-recovery-final-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-recovery-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/restart-deadline-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/restart-invalid-marker-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/tested-product-sources.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/ui-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/ui-failure-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/ui-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/evidence.json
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/existing-footage-proof.mp4
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/frame-4s.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-check.py
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-evidence.json
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-playback-ended.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-playback-midpoint.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-proof.mp4
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/plans-reload-ui.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/plans-visible-ui.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/research-picked-ui.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/shot-list-edit-ui.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/video-playback-ended.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/video-playback-midpoint.png
M	pivots/02-content/docs/demo-qa/issues.md
A	pivots/02-content/docs/plans/2026-11-05-freeform-canvas-plan.md
A	pivots/02-content/docs/plans/2026-11-05-freeform-canvas-status.md
A	pivots/02-content/docs/plans/2026-11-05-freeform-canvas-tasks.md
A	pivots/02-content/docs/plans/2026-11-05-saturday-demo-plan.md
```


## 2026-11-05：Demo readiness 起跑

- tree：demo-readiness，base 2c069a84569cd9ed2a70c4d284626057e5118e36；尚無產品修改。
- 首次 `bash bin/verify.sh full`：exit 1，`verify: RED — existing backend .venv and Node required; nothing installed`。
- 連結既有 .venv/node_modules 後相同命令 exit 0：backend compiles PASS、loads without dotenv PASS、backend tests 1109 passed/2 skipped in 32.59s、frontend unit tests PASS、verify GREEN。使用既有 offline sandbox，沒有讀取憑證／外部 provider／安裝依賴。
- Playwright MCP browser_tabs 實際可呼叫，只有 about:blank，未開新頁。此項只證明工具可用，不是產品 UI 驗收。
- 計畫及派送準備中，UI／HTTP 重啟未跑。


## 2026-11-05：保存契約 regression RED

base 2c069a8、工作區 demo-readiness；先只加 test_store.py 的真 API roundtrip regression，edit 後自動 gate `verify.sh fast` RED：`test_plan_script_and_board_layout_round_trip`、`test_planning_board_footage_round_trips` 失敗（缺欄位 KeyError）；1110 passed、2 skipped in 34.21s，frontend PASS。這是預期重現，不是產品通過。隨後 models.py 補明確型別與 optional 保存欄位，親跑 full/zero-spend 與獨立覆核進行中。

修正後 root 親跑 `bash bin/verify.sh full` exit0：backend compiles/loads/tests PASS，1112 passed/2 skipped in 35.03s，frontend unit tests PASS，verify GREEN。`bash bin/verify-zero-spend.sh` exit0：32 passed in 1.39s。`git diff --check` exit0。產品僅 models.py/test_store.py，獨立覆核與 UI/HTTP 重啟尚未完成。


## 2026-11-05：B 原基準 UI／HTTP 證據整合（整體 FAIL）

B base 2c069a8，test/demo-readiness-ui，未套 root 保存修正。現成證據 /tmp/buildclub-readiness-b/。root 親讀 ui.log/final-run.log/final-full.log/source-manifest.json，並以 Python assertions 核對 lifecycle/generation-audit/script-roundtrip-FAIL/listeners-after/lease-after：exit0，PID更換、DB/media hash相等、2 rows/2 POST不重送、清理與source/patch hash一致。

- 原版本 full 1109 passed/2 skipped in36.74s，frontend PASS；零支出32項通過。
- 七項替代路徑PASS：Research picked對應plan與reload；新mock錯誤保留舊selected；無憑證live拒絕/cache miss明列；Canvas doc/selected/viewport reload與重開；真HTTP重啟；Editor trim/order/text及EN/zh-Hant深淺主題；mock影片重啟後可播放。API seed與UI操作依原ui-results.json，不宣稱全UI建立。
- PID55475→56667；DB SHA256 182991ad82ab9139c1839f4acdfa489bb5a83871f65ca03ee9b20d8451b26d58；媒體hash前後一致；generationRows=2、before/after POST=2。
- 原版本兩項產品FAIL仍保留：真UI script PUT 200但response/GET無script；legacy toolbar無shotId生成影片不能送Editor（attempt-4）。替代路徑PASS不代表這兩項修復。
- cleanup：browser/context closed（worker回報），serverExit=-15、driverExit=0、8972無listener、共享lease held=false（root核對JSON）。原始失敗attempt保留。
- 新增工具patch SHA256 fe6547cf9c9d5b90b77ff153debeebb9eb54b80943b31ce1cb4f74401b1d0891；兩工具檔source hashes與manifest一致。安全性／斷言獨立覆核已交A，尚未接受或整合。
- B組裝report.md被hook攔截，未換工具重試；root依現成artifact寫入本既有紀錄。收尾郵件未送達finished worker的Orca escalation保留，不重複啟動。


## 2026-11-05：整合者接受保存diff；runner覆核REJECT

root親讀 /tmp/buildclub-readiness-a/review-persistence.md，git diff兩檔SHA256與review綁定一致=c6c676ee6392bb196282073eb4192f95b8564db82062acc5d252a85a41992a81，接受spec/quality ACCEPT。A額外models-only檢查false/null/finite/舊plan相容exit0；full與zero結果沿用root同tree親跑。B工具R1（driver wait異常會跳過server清理、context.close異常跳過browser.close、TERM不跑Node finally）及R2（斷言script不存在、診斷7PASS混兩FAIL）REJECT，已交B新dispatch ctx_8c0f72d7b000修；工具尚未整合，不重跑未覆核工具。A追加報告被hook擋下，直接接受Orca msg_87349fd19827作覆核證據，不重試該寫入。


## 2026-11-06：legacy toolbar shot歸屬 regression

相對base2c069a8，root先擴既有actual-handler harness與三組測試；auto gate RED：backend1112/2 GREEN、frontend unit失敗，確認無效選擇仍新增節點。最小修改CanvasScreen.add後 auto gate通過；root另親跑 `node --test unit/canvasPlacement.test.mjs` exit0，9 tests/9 pass：toolbar/icon與全域加號繼承單選shot且不增edge，missing/multi/stale/removed拒絕，明確from仍只connect一次，原workspace/位置/連線回歸通過。完整full重跑進行中。兩檔patch SHA8121e314a37c5e771f8d3bd7690d4b3596025d60657ed7484bd70dd9688c9a6a，覆核未完成、未宣稱UI PASS。

Toolbar修正後root親跑 `bash bin/verify.sh full` exit0：1112 passed/2 skipped in34.43s、frontend PASS、verify GREEN。A msg_ceabbe818aa8 spec/quality ACCEPT，兩檔diff與8121e314…patch一致，root接受；不把handler測試當UI通過。已授權B在其獨立環境套同hash patch完成真UI/保存回歸。


## 2026-11-06：B runner R1/R2進度（尚未接受工具）

B msg_507558842e9a：R1自有Chrome異常清理回歸exit0，root讀 /tmp/buildclub-readiness-b-r2/run-1793884139994688000/cleanup-tests.json：driver ignore-TERM限時清理、controlled cleanup error後server仍exit-15；TERM/context-close-error/ignore-term三組所記自有browser survives=false、groupMembers=[]。此為現成artifact核對，未代替新版工具獨立覆核。R2正向assert在舊2c069a8 RED exit1、finally清理，證據run-1793884038201211000；原紅artifact保留。root回覆兩份已ACCEPT patch路徑/hash，允許B核對後套用並跑正向UI/HTTP及toolbar/history/caption/upload缺口。新工具尚未整合。


## 2026-11-06：R1固定snapshot覆核REJECT（outer timeout）

A msg_c3c221523a3f，patch6171c78a…：原兩清理finding修復，但server/driver各start_new_session與browser setsid逃出outer test-slot group；outer480s SIGKILL清不到，Python無TERM handler不進finally；start health非OSError/interrupt亦有未回傳proc的窗口。root採納blocking，交B先重現Python TERM/outer短timeout/startup exception，再最小修復。原四probe與正常路徑證據保持其限定範圍，不列全R1通過。


## 2026-11-06：13UI final artifact核對，工具R1仍REJECT

B final UI run-1793884616954634000共13checks、errors=[]、context/browser closed。root親跑Python assertions核final-manifest列artifact hashes、tool patch hash與13checks一致exit0；包括script/layout/footage正向保存、toolbar s2/無選拒絕/workspace自由新增、手選history、captions/custom、synthetic take API→UI Editor及真HTTP PID17044→17580、DB/media與3POST/3rows不重送。B full1112/2 in42.76s GREEN。這是工程/UI限定通過，不是正式影片品質。

工具patch52cecf40… Python hash仍ae4a3e65…與先前REJECT版本相同，四probe沒有outer watchdog/Python TERM/start exception；root與A獨立確認，不接受B msg_be90f8a4ac97的R1整體通過。未整合工具。B新續接ctx_77e708837c3f曾start_unknown，root讀exact transcript確認已讀新R1 mails且fresh liveness live，不重複啟動/不殺程序；等新固定patch。


## 2026-11-06：R1根因後架構決定

B msg_146809863862靜態確認with-command timeout SIGKILL/release語義；root批准改用文件化manual lease，由main真owner控制cleanup→release順序，不改全域skill。要求新failure probes與同hash正常路徑後獨立覆核。這是待實作策略，未列PASS。


## 2026-11-06：新manual lease lifecycle evidence

root親讀新五probe及舊真RED JSON，另跑Python assertions exit0：五模式集合正確、before cleanup held且owner PID一致、events acquired→cleanup-start→groups-empty→released且單調、after release held=false、所有記錄actor/browser無survivor/groups空；watchdog exit124、startup exception exit1。候選工具patch SHA460e5662…、Python6ba0ccdb…；A ctx_09d21c92ac30獨立覆核中，B正常13UI回歸中。這是artifact一致性驗證，不提前接受控制流程或宣稱owner SIGKILL/斷電可清理。


## 2026-11-06：root最終6ba版親跑與新launch-gate邊界

root同已接受hash6ba/762整合後親跑：`bash bin/verify.sh full` exit0（1112 passed/2 skipped in38.76s，frontend PASS），`python3 -B bin/demo-readiness.py` exit0，run1793886362799808000有13UI、zero32 in0.99s、真PID53537→54765/DB-media一致/3POST未重送，清理與lease順序JSON斷言exit0。另用verify_offline.profile同策略sandbox、乾淨environment與自有tsbuildinfo路徑跑tsc app/node及ESLint均exit0，命令輸出 /tmp/buildclub-readiness-root-quality.json；Vite build亦由UI runner成功（自有cache/outdir）。

B隨後交4df8/f7/9e launch-gate候選，A增量無blocking但未有新版normal hash綁定；root尚未套。root舊normal run不得追溯稱新版通過，CJS實有wrapper-only spawn6行變動，不稱完全未改。等B固定新版正常artifact後接受／套用／聚焦重驗，不重跑未變產品full。


## 2026-11-06：最終launch-gate整合與root聚焦驗收 GREEN

root接受A msg_3608f4aa8780 spec/quality ACCEPT，確認patch4df8e8d0…/Pythonf7eeabd4…/CJS9e941bb1…；先reverse-check精確6ba候選再替換自己新增的兩工具，產品四檔hash未變，沒有覆蓋使用者修改。

root親跑 `python3 -B bin/demo-readiness.py` exit0，最終證據 /private/tmp/buildclub-readiness-b-r1/run-1793886924801846000。13UI PASS；zero32 passed in0.69s；Vite build PASS；root JSON斷言核13checks/errors空、context/browserClosed、真HTTP PID72060→73387、DB/media hash相同、3rows/3POST不重送、owner lease held→groups空→release，exit0。root manifest /tmp/buildclub-readiness-root-final-manifest.json 綁6產品/工具source hashes與核心artifact hashes。

同產品tree既有root full1112/2 in38.76s與frontend GREEN、TypeScript app/node及ESLint exit0仍適用；最後工具只改啟動時序，依受影響範圍重跑正常UI，沒有重跑未變產品套件。新五lifecycle/原四cleanup依B同最終hash證據及A接受，不冒稱root重跑。原紅/被拒snapshot/兩次診斷失敗/busy紀錄保留。

本輪修改/新增共9檔（沒有刪除）：docs/STATUS.md、docs/test-log.md、pivots/02-content/docs/plans/2026-11-05-saturday-demo-plan.md、pivots/02-content/app/trend-finder/backend/models.py、backend/tests/test_store.py、src/components/canvas/CanvasScreen.tsx、unit/canvasPlacement.test.mjs（後四相對trend-finder）、bin/demo-readiness.py、pivots/02-content/app/trend-finder/e2e/demo-readiness.cjs。另只在自有工作區新增ignored既有依賴連結node_modules與backend/.venv，沒有安裝或修改共享套件。

工作樹清理候選：git worktree list後以origin/main ancestry及git status查得clean/merged：demo-35b436b、handfish、integrate-1102、integrate-main、verify-fe6496、w2-grade-subs-backend。只列清單未移除；其中有共用依賴/ignored本機資料與他人工作區，不自動當可刪。完整paths /tmp/buildclub-readiness-clean-merged-worktrees.json。

## 2026-11-06 全新AI廣告免費preflight

- HEAD2c069a8，分支chore/fresh-ai-preflight（原dirty逐hash保留）。canvas-p1 `bash bin/verify.sh` 五步PASS、GREEN；實際app `bash bin/verify.sh full`：backend compile/load/tests PASS、1115 passed/2 skipped in40.25s、frontend PASS、verify GREEN。
- 新batch離線guard：先缺module RED，再fixture未finish reservation失敗；依未結案停批契約修正fixture後7/7 PASS。這是offline contract，未接真HTTP，paid-readiness仍BLOCKED。
- 既有`READINESS_EVIDENCE=<batch>/evidence/browser-readiness .../python -B bin/demo-readiness.py` exit0：13UI PASS、32 zero-spend PASS in0.58s、真PID重啟DB/media hash一致、groups空後release。
- 自有8976錄影probe：attempt1因隔離HOME找不到ffmpeg FAIL；查到既有cache後指定PLAYWRIGHT_BROWSERS_PATH，attempt2因漏選client FAIL；從末幀和既有runner取得證據後加選client，attempt3 PASS。前兩FAIL/result/video保留。context/browser/backend關閉，test slot已釋放；1440×900WebM full decode PASS。
- 來源政策：21純文字imageInputs=[]；新generation=0，ledger空，實支US$0。Key preflight僅布林，正常入口缺OpenRouter。沒有用舊素材交付全新廣告，未完成新成片與完整成功廣告流程錄影。
- 證據：`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai/`；官方catalog快照、key-preflight、fresh-plan、paid-readiness-review、offline tests、兩個browser probe證據。8982/3/4不碰，原session正在展示。

2026-11-06 本輪收尾再跑 `bash bin/verify.sh full`：1115 passed, 2 skipped in 33.99s；frontend unit tests PASS；verify: GREEN。`git diff --check` PASS。新廣告仍blocked，費用0。

## 2026-11-06：Video canvas 側欄入口修正

- 使用者確認側欄 Video canvas 應進入生成 Canvas。修正 Sidebar.tsx 送出 canvas；App.tsx 在目前 client 只有一個 Plan 時直接開該 Plan 的生成 Canvas，0／多 Plan 進既有 CanvasPick。舊分鏡板與其資料保留。已在同一 Canvas 時不重載，跨資源先走 withCanvasLeave 保存／busy 保護；獨立只讀覆核 ACCEPT。
- 原始修正在隔離工作區 video-canvas-entry／fix/video-canvas-entry @2c069a8；僅把 App.tsx、Sidebar.tsx 兩個乾淨基線檔整合至 demo-readiness／chore/fresh-ai-preflight，原有 dirty 保留。未commit／push／merge／安裝，無新付費。
- 2026-11-06 root親跑實際整合工作區 `bash bin/verify.sh full`：1115 passed, 2 skipped in 34.12s；frontend PASS；verify GREEN。隔離起點1109 passed／2skipped GREEN；修改後TypeScript app/config、ESLint與sandbox build PASS，實際整合build PASS。
- 1440真前端前後比較：原版側欄進 .board-canvas；修正版單Plan直接進 .fc-flow，92nodes／23video保留，再點同入口DOM與graph讀取次數不變；0／多Plan picker PASS（後兩者只在browser mock ideas，不改server DB）。更新8982專用preview靜態index/assets後再跑實際served三情境全PASS、ledger SHA不變、paid0；舊assets保留供已開分頁。沒有改DB、素材、guard或ledger；8982及MacBook18982轉接依使用者檢視需求保留。
- 證據與可重跑命令：`node /Users/tommy/Downloads/buildclub-demo-reference/video-canvas-entry-20261106/check-served.cjs`；同目錄 result.json／served/result.json、前後截圖與錄影、integration.json／preview-update.json。此修正不等於卡片重疊已修，也不等於全新AI廣告已生成。

## 2026-11-06：鏡頭橫排、同鏡版本向下（使用者已批准）

- 主流程按shots順序由左至右；同鏡的upload／image／video分欄，獨立變體往下。新增shotLayout純排版，沿edge推導無shotId來源，共用來源只保留一份置於上方。保守尺寸加實際量測與標題空間，穩定後不重複儲存。
- 新分鏡僅在符合未修改後端初始座標時自動橫排；既有自訂畫布須點Arrange shots。水平模式新增同類節點往下；滑鼠或鍵盤手動移動會解除自動排列。唯讀初始分鏡僅映射顯示、不PUT。FreeformNode將成功歷史版本向下顯示並沿用原Use action，沒有複製generation或改既有選用結果；中英標籤保留。
- 隔離分支fix/canvas-horizontal-layout（工作區video-canvas-entry）實作，將8個前端／測試檔整合demo-readiness，保留原CanvasScreen既有dirty。無backend／依賴／付費服務變更，未commit／push／merge。既有新AI廣告仍待OpenRouter安全設定與paid adapter，不因本輪UI GREEN宣稱paid-ready；其舊source hash證據只對原preflight版本有效。
- root最終實際整合 `bash bin/verify.sh full` GREEN：1115 passed, 2 skipped in44.90s、frontend PASS。TS／ESLint／sandbox build PASS；純排版4項GREEN（先見新module缺失的預期RED），涵蓋順序、資料保存、來源歸屬、共享來源、實際尺寸無交疊、變體不推動其他鏡、未修改匯入與手動位置。
- 1440前端先browser-only saves驗完整案例，再更新8982自有preview static並真UI點Arrange保存：21shots／92nodes／23videos、4歷史圖片向下、全部卡片與標題0交疊、idle PUT穩定、reload後位置相同；data／selected／edges／generations／takes／ideas與edit project不變，只有layout／position／viewport更新，ledger SHA不變、paid0。另browser-only pristine21shot核准自動保存／唯讀0PUT皆PASS；keyboard移動解除auto亦PASS。
- 初期兩個UI harness FAIL保留（硬編不存在video node ID、焦點未選取就按箭頭）；查實際node IDs與已安裝ReactFlow keyboard條件後修正harness，未隱藏原FAIL。獨立只讀review最終ACCEPT，root看首鏡橫排與S19向下版本截圖ACCEPT。
- 成功連續錄影horizontal-layout-demo.mp4：1440×900 H264完整decode PASS，明示既有cached素材＋即時免費排版／保存／重開，不是live生成。全部證據與重跑命令：`node /Users/tommy/Downloads/buildclub-demo-reference/horizontal-layout-20261106/check.cjs --live`。該命令會重新排列此Demo；完整結果live-result.json、import-result.json及來源integration.patch。MacBook18982與8982服務依使用者檢視需求保留；測試owned browser/context全關閉。

## 2026-11-06：新廣告 G1 離線防護通過，live 仍 blocked

- 正式 goal 已建立。兩個唯讀研究／QA代理完成；第三位獨立 reviewer 第一輪 REJECT，root重現問題後修正，第二輪spec/quality ACCEPT。root核對 HEAD2c069a8 與兩檔SHA256一致，僅接受offline候選，不是付費ready或committed approval。
- 新batch runtime.py/test_runtime.py新增完整payload限制、原子獨立預算、固定首圖bytes與hash、不可任意finish導入來源、未知提交/真程序crash後停批、輸出格式與解碼。第一輪新增回歸3FAIL已重現；修復audio-only MP4誤收與帳本暫存/lock symlink後，root24tests PASS in1.365s；reviewer24PASS in1.205s。live模式仍無條件拒絕，所有測試素材標offlineSimulation，沒有生成真廣告。
- 狀態及精確review hash：`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai/runtime-progress.json`。阻礙仍為使用者側安全載入Key尚未確認，以及指定圖片模型完整thinking/output成本上限未證；US$0、無新paid requests。既有產品code/dirty及8982/3/4未改。
- 下一步只在具體關卡解除後接續：收到使用者終端Key檢查結果；取得指定模型成本限制的可執行證據，或使用者另批准有固定單張成本的替代模型/預算配置；然後受限live adapter獨立覆核、3圖pilot，再21鏡與完整成片錄影。不可用本次24offline PASS解鎖paid。

## 2026-11-06：預設單鏡工作區與縮圖導覽（使用者已批准）

- 預設legacy plan進Shot view，上方21鏡縮圖一排且可直接跳轉、上一鏡／下一鏡；下方References／AI images／Videos三欄獨立捲動、放大預覽、播放，設定按需開Inspector。保留Full canvas與全部92nodes，以及Open editor後回到同一鏡。standalone workspace維持完整Canvas。view／shot用每resource本機偏好保存，預覽本地狀態不改selected，Use才沿用既有保存／quote／readonly契約；In edit僅由真clip source ID判斷。
- 新shotWorkspace純資料投影合併同鏡多節點與歷史Generation，沿edge找參考、共享來源不複製，支援真takes。review找到owned upload在visited中消失，新增回歸先RED後GREEN並修正；pending Run／Use／Upload保護、唯讀可看不可寫。Assistant與聚焦鏡頭同步，Inspector明示設定用於下次生成。
- 隔離feat/shot-focus-workspace（video-canvas-entry）實作，7個前端／測試檔整合demo-readiness，原dirty保留；無後端、套件、付費變更、commit／push／merge。獨立只讀review最終ACCEPT，root看1440首鏡與S19／Inspector截圖ACCEPT。
- root整合全套最後 `bash bin/verify.sh full` GREEN：1115 passed, 2 skipped in35.63s；frontend PASS；TS／ESLint／sandbox build PASS。先前full frontend因既有AST handler測試沒注入shotView而RED（641/642）；更新scope並驗兩種view、0 model requests後，定向13tests及full GREEN。shotWorkspace純測試5項PASS，資料不變／版本去重／共享與owned references／cycles／empty pending failed／真takes。
- 1440 preview與實際8982 served完整11步PASS：21縮圖同排、點最末鏡、S19五張圖三支片、預覽不採用、各欄scroll、放大、影片真播放、Inspector不溢出、Full Canvas92nodes、view／shot重開持久、Assistant跟鏡、Editor返回同鏡。data／selected／edges／gens／takes／ideas／edit project皆保留，ledger SHA不變、paid0。另browser-only readonly／empty／pending-owned／zh-Hant四fixtures全PASS；全自有context/browser關閉。
- UI初期native video metadata未等與Editor返回鈕帶箭頭造成harness FAIL，原JSON／錄影保留；查實際媒體readyState與按鈕文字後修harness，產品行為無為此繞過。實際成功連續錄影shot-workspace-demo.mp4：H2641440×900完整decode PASS，內容為既有cached素材的免費操作，不是真AI再生成。
- 全部證據 `/Users/tommy/Downloads/buildclub-demo-reference/shot-workspace-20261106/`：live-result.json／fixtures-result.json／integration.patch與逐步截圖／錄影。重跑 `node /Users/tommy/Downloads/buildclub-demo-reference/shot-workspace-20261106/check.cjs --live`（讀既有案例並容許僅Canvas位置／viewport正常保存；不生成）。8982服務與MacBook18982轉接供使用者檢視保留，僅更新static frontend，未重啟後端。
- 這不是新廣告生成驗收；新AI批次G1／Key／live費用限制狀態依其他最新節與runtime-progress.json，不能以本次UI GREEN解鎖paid。

## 2026-11-06：依使用者要求恢復 Full Canvas，單鏡設計暫停

- 使用者認為單鏡工作區與預期差很多，明確要求暫停，隨後要求回到上一版Full Canvas。已恢復8982 preview加入單鏡前的index；舊assets完整，HTTP實際回傳與備份逐byte相同，MacBook所有18982 Demo分頁已重新整理。
- 已核對目前Demo的7個檔案仍等於本次integration after-hash，再安全反套本次patch，4個既有檔恢復before-hash、3個本輪新增source/test移除。只撤銷本輪單鏡工作區，不影響先前側欄入口修正／橫向排版／版本向下。data／media／edit／ledger保留。
- demo-readiness為目前啟用的舊Full Canvas程式；video-canvas-entry／feat/shot-focus-workspace仍保留未提交的單鏡草稿，供重新對齊時參考，禁止直接重建套回展示。使用者未授權恢復開發，不再自動改設計。新AI生成批次的其他限制仍依最新G1紀錄，這次僅UI恢復。
- 還原驗證：7檔before SHA全部相符；served index逐byte相符；frontend unit637 passed／0 failed in2186ms。無commit／push／安裝／新增付費。證據shot-workspace-20261106/full-canvas-restored.json，原設計與成功／失敗證據及patch均保留。

## 2026-11-06：新批次鎖定前端與 offline 全工程鏈已跑通

- root實際啟動新8978生成鎖定環境，正常後端安全載入既有fal；status顯fal可用／OpenRouter未繼承、provider requests0。真登入→選client→21shot Canvas／三model標籤PASS，無舊frame/footage/import，錄影decodePASS；只關自己的PID8722與browser/context，舊8982不動，lease已釋放。
- 初期鎖定UI兩FAIL保留：實際APP/dist缺失導致404；新QA seed缺savedInLive被live filter隱藏。用既有Vite envFile=false/configFile=false只build到新state/dist；再以meaningful seed regression RED→GREEN修新SavedIdea.savedInLive=True（保留QA非真人批准註記），不改產品篩選邏輯。後端18tests PASS in2.271s、實際app full1115passed/2skipped in32.92s、frontendPASS、GREEN。
- 離線前端工程完整PASS：B/evidence/offline-smoke-1793922762302041000/result.json，11checks包含真UI201→done圖/片→History Use→Editor2s trim→native1080x1920/30fps H264 export/download/full decode/ended→send waiting→無cookiepublic ended→reload。影像為本機testsrc，明示OFFLINE，並非新AI廣告；mode隔離、no inherited keys、paid0；owned backend20598正常停止，ctx/browser finally關閉，lease釋放。先前login race與未選client兩FAIL保留，依HTTP/截圖證據修runner。
- 正式source production ledger仍0請求；3張付費pilot尚未執行。只在零generation／零binding前，依原片產品包裝的視覺分析補純文字描述與手部一致性；原片影格只作分析，imageInputs全部空。改新B/fresh-plan與新production frozen-plan的prompt，沒有重設任何ledger，舊batch不動。
- 現source code／hash／C provisional接受及root integration delta在B/runtime-progress.json。下一步覆核savedInLive單欄seed delta與受限3圖pilot runner；沿已批准Seedream4.5／fal4+OR3=7，先s1/s14/s20三張各.04、總.12估價/上限，完成QA再擴。OpenRouter仍需使用者從同一環境啟動後端來傳入，不讀共用秘密檔或複製Key。


2026-11-06 AEDT：fresh AI更新：21 text-only Seedream images完成，pilot3與擴18真Canvas選用/reload及完整錄影decode PASS；10Hailuo provider done，9已選用，第10因品質hold未選。JPEG→PNG與seekableMP4驗證的單receipt恢復各經獨立review/隔離故障測試ACCEPT，無重POST；runtime32tests PASS。視覺內容QA FAIL（食譜/食物狀態錯位），鎖住新batch，未執行最終21clip export/review E2E。fal預留2.84估價2.74 actual未知；來源/費用/錯誤保留B/runtime-progress.json。這不是完整廣告驗收PASS。

本輪最後 full verify：`bash bin/verify.sh full` → backend1115passed/2skipped in46.60s、frontendPASS、verifyGREEN。內容QA仍FAIL，不能視為成片成功。
