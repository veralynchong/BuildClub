# 空白自由畫布執行狀態

更新：2026-11-05 Sydney。

## 目前

Goal active；使用者已核准無人值守 Multi Agent 實作、commit、push、開 PR，不合併。禁止外部 API 測試、花費與新增依賴。整合 worktree `/Users/tommy/orca/workspaces/BuildClub/freeform-canvas`，分支 `feat/freeform-canvas`，產品基準 `e442b3ae80964ee53fda7265df61d18a210f66b3`。

| Task | 狀態 | Owner／證據 |
|---|---|---|
| T0 | 完成 | Lead：新分支、本機三份計畫文件、安全離線驗證保護；起始 gate GREEN：984 passed, 2 skipped，frontend PASS |
| T1 | 完成 | task_9671d805b114／ctx_3b4ed7ce46f5；三份唯讀契約回報，NOT RUN tests，已整合 Plan |
| T2 | 完成 | task_5209fcd0805d／ctx_b9df19f20eb6；來源07d3d93，唯讀，測試 NOT RUN |
| T3 | 執行中 | task_e0cfdcc6e808／ctx_53453c5ad8cc；freeform-canvas-backend；base a521141；backend唯一writer |
| T4 | 執行中 | task_e8f98ecfcaeb／ctx_95a4a3a4957b；freeform-canvas-frontend；base a521141；src/unit唯一writer，先視覺再核對API |
| T5–T7 | 待整合 | 本機E2E／review／交付 |

## 已核對

- 2026-11-05：origin/main 為 e442b3a；舊 Canvas 在 `backend/canvas.py` 強制 shots，App 入口依批准計畫，現有 Media 型別未包含 audio。
- 2026-11-05：安全參考 worktree `/Users/tommy/orca/workspaces/BuildClub/offline-verify-context` @1fc1747 完整離線 gate GREEN：984 passed, 2 skipped，frontend unit PASS。這不是新版產品驗收。
- 2026-11-05：Playwright MCP `browser_tabs action=list` 呼叫成功，未開產品 tab；後續測試仍需獨立環境與 browser owner。
- ignored 依賴 symlink 指向 canvas-p1 既有 backend/.venv 及 node_modules，未安裝、不得刪來源。

- 2026-11-05：整合基線 07d3d93，`npm run build` exit 0（僅既有 bundle size 提醒），`npm run lint` exit 0。尚未修改產品程式。

## 全站接線盤點

T2 來源 07d3d93，完整訊息 msg_ea7f2a8dcca4。分類依來源，不推測 runtime keys；所有本輪 live tests NOT RUN。

| 功能 | 追查證據（app 根目錄相對路徑） | 結論／本輪處理 |
|---|---|---|
| 搜尋／參考素材拆解 | App.tsx runLiveSearch/runLinkSearch/runImageSearch → lib/live.ts → server.py /api/search,/like,/like-image,/analyze → cache/Apify/Anthropic | 真實實作與 mock 分支並存；本輪禁止外部測試，不能稱全部可用 |
| Research rows/slots | App.tsx → state.ts useResearch/useResearchSlots → useStored/localStorage | 本機持久化，沒有跨機 API；列後續，不擴成平台 |
| Plans/shot board | App saveIdeas → lib/live.ts → server.py PUT /ideas → SQLite store | 真實後端已存在，保留 |
| Board AI rewrite/insert | lib/boardAssist.ts:51/75 → 無對應後端 route → sample fallback | 有接線缺口；不作新版助手範本，不誤稱真 AI |
| Board media | lib/boardMedia.ts:26 → object URL/deviceOnly | 分頁暫存，非真正上傳；本輪新 Canvas 必須持久化 image/video/audio |
| 舊 Canvas | App.tsx:1734/1745 → canvas/api.ts → canvas.py GET/PUT | 強制 approved plan/shots，直接阻擋空白自由畫布；T3/T4 替換 |
| 生成/助手/Kit | canvas api → generations.py/agent.py/kit.py → queue/provider/files | 已有實作，但助手依賴 shot；T3/T4 改 workspace 契約。歷史直接 FalAdapter smoke 不等於新版 UI 真驗收 |
| 配音 | VoiceTool → editor/api.ts → editing.py voice/tts/from-gen → media/voices | 已有 editor 管線；需 Canvas audio port/node 與輸出連接 |
| 剪輯/輸出 | EditorPanel → editor/api.ts → editing.py/renders.py → Remotion/ffmpeg | 真實本機引擎可重用；本輪重新驗證 workspace source 至 MP4 |
| 送審 | ExportBar → cut/share API → renders.py/share.py/cut_review.py → cut_reviews | 有 token/version/revocation guards，需支援 workspace/client，保留隔離 |
| 社群發布 | PublishPanel → publish.ts → publishing.py → publishers.py fake/Ayrshare | 預設模擬；真發布/公開媒體 hosting 非本輪 |
| 首頁成效 | ClientHome/Overview LaterSection；現有 decisionStats/production summary | 流程統計有資料；post-performance 是明示佔位，非已完成 analytics |
| auth/settings | auth.ts → server/auth/google_auth；save clients → SQLite；preferences local | 本機 auth 存在；register UI 呼叫 login、client login coming soon、OAuth未驗；本輪保留登入保護，不擴大帳戶系統 |


## 下一步

1. 接收 T3 先行CRUD/auth/DTO回報，核對固定契約後轉交T4；任何變更集中由lead整合。
2. 兩位writer各自驗證提交，lead讀完整base..head、指派唯讀review、修正後整合。
3. T5使用自有8872後端／8892渲染環境、單一browser owner、外部網路封鎖、暫存DB與真實本機媒體輸出驗收。
4. 最終更新本表、根STATUS與handoff，推送並開PR，留下明早真實測試清單。

## 尚未驗證

新版 Canvas 尚未實作；外部模型、配音及真實發布本輪禁止測試。沒有任何新版產品完成聲明。

## 本機測試入口準備

`bin/freeform-e2e.py` 使用清除憑證的環境、暫存backend/DB/media、macOS sandbox只允許loopback，拒讀dotenv/憑證及日常設定。既有依賴與Remotion browser預檢PASS，沒有安裝。test-slot資源 `local:127.0.0.1:8872:buildclub-e2e`。原8871由Desktop/BuildClub的其他session持有（Orca ports證據），未停止或存取；使用允許的8872隔離backend及8892 renderer。

2026-11-05 smoke：PASS sandboxed owned backend, temporary account, 1440 browser and cleanup。證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/freeform-evidence-o4c0w0bn`。這只證明隔離入口，不代表新版產品E2E。首次使用/usr/bin/python3出現xcrun cache拒寫提醒但exit0，改用同一既有Homebrew sys.executable避免系統launcher；待新版整合再次驗證。

2026-11-05：runner使用Homebrew sys.executable後smoke再次PASS且無xcrun提醒；證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/freeform-evidence-lkuan1n7`。新runner納入後root `bash bin/verify.sh full` 四步PASS，984 passed,2 skipped in35.22s，frontend PASS，verify GREEN。T3暫存分支進度回報991 passed,2 skipped（待提交／review，不等於整合驗收）。

## 審查與修正檢查點

- Backend writer第一版9796217→163c732（998pass）及typed ports修正cd9cafc（999pass）已提交；尚未接受。完整review ctx_a78df15f5bf6 對979 source REJECT：typed ports None==None與upload media mismatch；前者已修待複審，後者／串流後node重核與confirm snapshot條件競態由原worker新dispatch ctx_39f6b97b8b62（task_0c64c90e10ac）接續。Orca曾報start_unknown，但transcript/worker-list證明同一terminal仍在工作，沒有重開writer。
- Reviewer stop-hook另見full gate RED：migrate_medians ALTER duplicate n、背景render讀到已清除DB；已交backend追查新tests背景jobs清理／migration競態，不能沿用先前GREEN覆蓋。
- Frontend第一版24535a6：offline backend984pass2skip、frontend536/536、build/lint0；追加翻譯1fee4f4後獨立分支full gate只有serverText stale因base缺backend新模組而RED，已知整合相依，未放寬。最新完整前端review ctx_c3c1eefe71bd/task_19ef123c91cf 執行中，尚未接受。
- Lead補test_server_text collector（尚未提交）辨識workspaces tuple第一項、ValueError、HTTPException.detail，並納入MODULES；保持missing/stale雙向assert，待backend/frontend整合跑。
- 隔離runner1eee371曾被ctx_d34d469c7a4e REJECT：任意loopback/Unix放行、共享render cache、detached renderer逾時清理。Lead已改成只允8872/8892/8893/8894、禁止Unix proxy、暫存render app/cache、在sandbox外追蹤自有PID+starttime，renderer增加測試所需MEDIA_PORT/BROWSER_EXECUTABLE環境接點（未設時原行為）。修正未提交／待複審。
- 真實本機isolation測試PASS：other-session loopback denied、Unix proxy denied、render22.0s→1080x1920/30fps/AAC/6.016s，音訊-24.1dB、muted -91dB，證據 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/freeform-evidence-bjhza5_3`。後加原cache拒寫assert需再跑。
- 故意timeout18秒測試預期exit124：detached實際renderer99422，結束後26個追蹤自有程序全消失（PID+starttime核對）。證據 `/private/tmp/freeform-timeout-evidence`。這些仍是runner／render驗證，不代表新版Canvas全流程。
- T5正式e2e/freeform.cjs尚待已review產品整合後寫與執行，沒有宣稱整晚目標完成。

2026-11-05更新：stop-hook因root提前加入workspaces MODULES但尚未整合檔案而RED；已保存精確collector擴充於`/tmp/freeform-server-text.patch`並恢復root目前版本，保留原missing/stale雙向assert。重跑full gate GREEN：984passed2skipped in42.14s、frontendPASS。整合backend與翻譯時必須一起apply此patch再驗。

最新isolation完整測試PASS，含原cache拒寫斷言：render13.9s、1080x1920/30fps/AAC/6.016s、audio -24.1dB muted -91dB，證據`/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/freeform-evidence-72ah9gi4`。

前端完整review source1fee4f4（ctx_c3c1eefe71bd）REJECT：7項blocking（離開期間生成完成恢復；voice history→voiceId；換voice後隱形舊軌；CAS草稿遺失；upload改媒體保留不相容線；legacy footage shotId複製；legacy kit refs/操作被省略）。已交原writer逐項回歸修正。frameImage writeback/client切換/port翻譯也納入。不是已驗收前端。

Backend續修已以真正跨process barrier重現confirm競態與upload mismatch；進度1001/1003passes，尚未final。slow_editor fixture teardown只release未等待RenderJobs._run完成，已定位為既有跨fixture背景job風險，writer用deterministic證據修tests，不擅改runtime migration。

## 最新複審（2026-11-05）

Backend eeb7cad（1005pass2skip、乾淨）由ctx_0f76b84fb4a9複審：ports/image-video upload/原子confirm/slow_editor fixture均ACCEPT；整體REJECT，因audio upload另一條完成路徑未重驗node/transaction。已交原backend terminal用新任務續修editing.py＋test_workspaces（同scope/audio、stream刪改、insert失敗零row/檔），最終未接受。

Runner5a27180由ctx_d5d7096c544a複審：特定loopback/Unix限制與暫存app/cache ACCEPT；cleanup仍REJECT（PPID最後快照後spawn並reparent可漏）。已分派獨立writer ctx_a93f386a06a5/task_e09dc0267f78，worktree freeform-test-lifecycle from5a27180，唯一寫bin/freeform-e2e.py、render/render-reel.mjs與對應e2e isolation/timeout/lifecycle。要求原子launcher registry/stop握手與確定性最後快照後spawn回歸，不僅縮短poll。期間該worker獨占8872/8892/8893/8894與自有headless測試browser；lead不競用。

Frontend原writer修正任務ctx_a76d7cc54369/task_9a97c9d84e3a仍執行；第一組保存session/完成恢復/voice映射/CAS已加5項實際狀態序列回歸，legacy/media/kit第二組待後續回報。全部仍需新SHA複審與整合E2E。

T5正式`e2e/freeform.cjs`已由lead草擬並通過node --check，涵蓋UI空白建立、prompt/image/video/voice/upload/editor拖線、保存重開、來源實際inputs、MP4ffprobe/連入voice可聽、另一context審批及零fake ideas；尚未執行，待清理入口驗收及產品整合。測試只fixture clients，不seedplan/shots/library。

Backend音訊修正ce95559固定（僅editing.py+test_workspaces）：先RED4failed1005pass2skip，最後GREEN1015pass2skip/frontendPASS。新增from-gen刪node/改type/media/source-node/mapping失敗/成功重複匯入檢查；已啟動精確兩檔獨立複審，待接受，不以writerGREEN取代review。

音訊ce95559複審ctx_d27df6f3dfbe確認一般attach交易與清理有效，但整體仍REJECT：canonical workspace在gate後body await中metadata消失會被voice_node=None降級legacy、略過attach；已交原writer最小固定scope種別與消失/鎖/commit故障回歸。這是防止scope降級，不新增刪除workspace功能。

清理writer最新回報：最後snapshot barrier先紅後綠、微秒birth身分不誤殺、未被poll發現的reparent群組可收割，isolation+UI Chromium+真MP4及timeout12sec exit124 survivors={}皆PASS，full984pass2skip；待固定commit與review，不以進度訊息當最終接受。

Frontend七項修正f047c382＋9322db47已提交（最終9322db47，原base1fee4f4）；原版7/7具體RED，修後14流程回歸＋551unit、build/lint綠；full仍僅已知backend翻譯相依stale紅。獨立複審ctx_1b24f13a44d7/task_4b4dc638d62d進行中，尚未接受。

T5 lifecycle8fb8da0提交（worktree freeform-test-lifecycle）：四檔限定、flock launch/stopping＋kernel微秒birth；full984pass2skipGREEN、isolation37pid與timeout26pid全消失、四埠釋放。複審ctx_67e46be8f005/task_54e3aa6d19d8進行中。延遲的8872舊訊息觸發ctx_2b570eb699de follow-up，lead已告知不需新實作/重跑、保持固定source；沒有新writer或接管埠。

Backend防scope降級修正任務ctx_dfe8e8c427ed/task_208f5dacd655執行中，只editing.py/tests/test_workspaces.py，固定route種別及await邊界scope消失回歸，另測音訊BEGIN/commit故障與source kind/status。

## 已接受並整合的測試基礎

Source8fb8da0，base5a27180，scope為bin runner與isolation/timeout/lifecycle四檔。Reviewer ctx_67e46be8f005 verdict ACCEPT（完整報告/tmp/freeform-t5-report.txt）；lead已讀diff及證據，Integrator ACCEPT：可信macOS wrapper的登記/停止互斥與kernel birth/group收割，未回退loopback/Unix及temp/cache隔離。小增量4619f1只改缺cache時wx probe目錄，lead已讀3行差異並接受，writer cold-cache isolation/GREEN證據保留。

整合cherry-pick為e776c2b＋3d40f79，rootfull gate親跑GREEN：984passed2skipped in36.17s、frontendPASS。產品backend/frontend尚未接受，不把runner接受延伸成產品完成。
