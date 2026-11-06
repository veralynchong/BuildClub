## 2026-11-06 使用者兩項修正完成並開至MacBook（15:25 AEDT）

- Guided入口從原Search開始，預填Tofu Recipe/Instagram；真原Search提交→Results可見tofu→真tile點選自動Breakdown→Research→Script→route→Canvas→Editor→result，兩路原站9步全部實測通過。不是直接從Research起步，也沒有替代前端頁面。
- 右上精簡卡片expanded top80/right20/300px，自有12/15px字級與32px小按鈕，不套全站大pill；可見Collapse縮到top16/right20/220×44px header-only，可再Expand用導航。原InspectorClose及History真pointer操作均可透過正常收合/展開完成；並未改原Canvas布局。
- Sole QA search-first/ui-round3：主流程79筆＋補充16筆觀察/斷言exit0（非95個獨立測試案例）；涵蓋pending不提前commit、未知詞拒絕/錯誤Previous重試、Resultsreload、RunUseReuse/nativePlayer/seek/ended/allowlist下載、繁中、reset/exit完整native observer隔離與零guided API外送。所有歷史FAIL保留。13source/49dist測前後hash相同，10錄影decodePASS，owned8992/browser/lease清理完畢。
- root再核13hashMATCH，有限接受最終新需求source與UI；review-v3/v4 Spec/Quality ACCEPT；44定向tests PASS；本版full1109passed/2skipped in50.17s、frontendPASS、GREEN；build/lint exit0。
- MacBook已開 `http://127.0.0.1:18991/?guided=tofu` fresh入口；遠端實際index與已驗收stablepreview index SHA都為a031420b910a9686ec3279156aaa8048f105bdfbc9cef421f14a929a91df8d40。使用者preview8991(own terminal term_36afe79b-a3a8-4f08-88ac-2163316d7284)與SSH18991保留供操作；獨立stable目錄 /tmp/buildclub-guided-demo/macbook-preview/dist，不再隨scratchbuild變動。
- 新錄影／report／hash在 `/Users/tommy/Downloads/buildclub-demo-reference/guided-native-demo-20261106/search-first/`。新全AI影片仍由既有agent處理pending；本次沒有新paid/install/commit/push/merge，不把prepared當新成片。舊整體Goal的film外部依賴不等於這兩項UI未完成。

## 2026-11-06 最新使用者修正：搜尋起步＋右上精簡導覽（14:57 AEDT）

使用者實看MacBook後要求：從原Search輸入Tofu Recipe開始、原Results找到並點進影片，再走完整原站流程；不再直接從Research起步。導覽固定右上角並整理視覺層級/尺寸，避免全是大型pill。原網站其他前端不重設計。

Root擁有contracts/tour/App原導航接線，步驟擴為search→results→breakdown→research→script→route→canvas→edit→result；沿原搜尋/卡片click觀察真畫面，不以counter代替。prepared資料worker只補固定tofu搜尋與原native library caller安全形狀；overlay worker只改兩個浮動UI檔，分別隔離worktree。查詢/頁面動作不得逃到provider，原Try自由流程保持。

起點親跑full1109passed/2skipped in43.99s、frontendPASS、GREEN。新native caseIDs採原searchLive產生的ig-DVp3xOdFaHL/live-DVp3xOdFaHL；共享契約由root唯一編輯，worker只讀複製。baseline已驗收的40+9/72不涵蓋本次新增搜尋，須重新測真Search→Results→click及新右上controller不擋原操作，build/lint/full。

先前blocked只適用等新AI成片；現有新local工作進行中，不宣稱新要求已完成。新全AI成片仍由原agent處理，無新付費/安裝/commit/push/merge。

# 2026-11-06 最新修正：同一原網站、兩個入口、懸浮導覽

使用者已明確澄清並回覆 ok：本節優先於下方所有舊設計與 Goal 的舊版面描述。不是另一個展示網站；不重新設計 Research、Plan、Canvas、Editor，不套用五段折疊或單鏡工作區。

## 需求與兩個入口

- **Try the Demo**：原本入口、原本自由操作流程、原本網站頁面與功能，全部保留。不得改名或改接成導覽模式。
- **Watch a Guided Demo**：首頁現有入口旁新增次要按鈕（暫定此英文文案）；仍然進入同一套 App、Sidebar、ResearchScreen、PlanScreen、CanvasScreen、EditorPanel。只增加右上／右下小型懸浮導覽控制器，不另做七個展示頁面或替代 Canvas／Editor。
- 固定 tofu 資料、分析、腳本、圖片、影片預先準備／本地下載；按原本的分析或生成操作時，以 prepared 資料逐步顯示，不能實際扣費，也不能宣稱即時模型生成。
- 控制器提供上一步、下一步、進度、一句簡短說明、退出／重新開始；操作者決定停留時間。兩條製作路線在同一原介面操作，由導覽提示選攝影提案或 AI 廣告，不新增分岔全頁設計。
- 導覽導航呼叫既有 App 的頁面／plan／Canvas／Editor入口，遵守既有 busy／leave／保存規則。不是把 step counter 改了但原頁面沒動。
- 示範資料／修改需和原有自由操作及正式帳戶隔離。退出回到原網站，reset只清本次導覽案例，不動原資料、生成帳本或其他 session。
- 本輪 paid0、無依賴安裝、無commit/push/merge；既有影片負責人繼續 MP4，不重開生成。新AI未交付則如實pending，舊衍生素材不得冒充新場景。

## 資料接線選擇（同站最小回放，非新後端系統）

依使用者已批准的固定資料／不重設前端範圍，選擇只在 guided=tofu 模式啟用、嚴格固定案例的 prepared fetch adapter；直接供給原App既有API呼叫所需的已準備回應，不代理正式API或付費provider。一般模式完全不安裝adapter。這不是另一個網站或萬用API模擬器：僅具名案例／原路由契約，未知model/source/node/ref/action拒絕，所有圖片與影片使用已核本地URL；不假裝新生成或新export。

同一origin的localStorage及sessionStorage在導覽視窗中使用獨立session prefix代理；只清自身prefix，原自由模式與其他tab仍讀原本storage。必須在原App模組掛載前裝好、安裝失敗不得半套落到正式API。退出以正常頁面重新載入還原原storage與fetch；query token只是本地示範namespace，不是登入或API憑證。真E2E用同context的另一個非導覽tab讀原生storage，不能讓proxy自己讀自己就宣稱原資料不變。

正常模式原API／auth／Try Demo callback不變；導覽為明示公開prepared例子，不能修改正式cookie、冒充staff身份、讀寫原DB或實際provider。原App及各screen元件原樣重用；只允許必要資料媒體URL與導航action橋接，不重寫頁面布局。

## 舊草稿與證據的正確定位

此前 guided-tofu-demo 的 /demo/tofu 獨立 DemoExperience／DemoCanvas／DemoEdit 不符合使用者意思，不能交付、部署或當成本需求驗收。其32項E2E、33項單元、build與full GREEN，只證明舊草稿工程行為，不證明這個原網站導覽完成。保留原patch/hash／成功及失敗紀錄供追溯；可重用已核實素材manifest與純狀態工具，不重用替代頁面設計。原 demo-readiness／既有展示服務未被這份草稿覆蓋。

## 修正版階段、成功與 Testing

| 階段 | 工作／責任 | 成功定義與測試 |
| --- | --- | --- |
| P0 原站基準 | Lead恢復自己改錯的Try Demo／main接線，凍結原站來源；既有reader唯讀盤點原App與prepared資料接入 | App／LoginScreen／LandingAltitude／main逐檔對回原站已凍結hash；原自由TryDemo正確且無新獨立頁；bash bin/verify.sh full GREEN |
| P1 兩入口＋小型控制器 | Lead擁有App／Login／Landing共用接線；UI worker只寫小型浮動元件與純步驟狀態 | 原Try Demo callback不變；新增導覽入口；畫面保留原Sidebar與各screen；上/下/退出/reset/reload測試；不是新頁面替代品 |
| P2 固定資料接入 | 資料worker先比較既有獨立prepared後端／受限adapter，選最小可維護方案；不重做一般後端 | 原分析／生成按鈕能顯示同案已準備結果，原Canvas與原Editor真操作；paid endpoints零外送、未知來源拒絕、正式資料不變；用有意義的RED→GREEN邊界測試 |
| P3 原站七步接線 | Lead沿原Research→分析→Plan腳本／shot list→原Canvas兩路素材→原Editor→成片，所有動作走既有UI | 每步能在原App對應screen看見原有控制項，原文／改編清楚；Full Canvas保留，不加新分組設計；1440預設與無導覽基準比較，允許差異只有新增入口、浮動控制器、固定案例資料 |
| P4 原站端到端與交付 | 唯一隔離browser QA；原reviewer只讀覆核實際整合diff與證據 | 自由TryDemo可操作且不啟動導覽；Guided可完成兩路、原生生成按鈕prepared回放、保存/reload/reset/退出、原Editor播放／成片ended與下載hash；零新增付費，完整成功錄影／解碼／cleanup；build/lint/full、STATUS/test-log更新 |

## 原站實作驗收檢查點（2026-11-06，更新至14:27 AEDT）

- P0／P1原站基準與雙入口已接入：實作樹 `guided-tofu-demo`，保留原Try the demo callback；新增Watch a guided demo，原App／Sidebar／Research／Plan／Canvas／Editor加角落控制器，舊獨立頁21個自建檔已移除，歷史patch／FAIL證據仍保留在專案外。
- P2資料與P3接線已完成source實作並經精確dirty-hash獨立暫審；source/base2c069a84569cd9ed2a70c4d284626057e5118e36，尚未commit依使用者限制。prepared runtime不落回真API，素材使用原生imported身分；不假造21支影片／實拍take／新render。
- 原站UI第二輪證實兩路七步、Previous互斥、reload/reset/exit及四個formal/sibling sentinel不變、無guided API外送。它只證明導航；Editor來源缺失當時未通過，已後續修正，不可追溯改稱第二輪完整成功。
- 第三輪實測原Inspector Run被guide覆蓋，保留FAIL；已最小調整Canvas步驟guide預設左下，並有Move guide切角落。未改原Canvas版面；第四輪唯一browserQA在凍結build驗真Run/Use/Reuse、trim保存、ended／下載hash、故障延遲與兩路錄影。
- 完整最新已完成驗證：`bash bin/verify.sh full` 1109passed／2skipped in41.43s、frontendPASS、GREEN；本輪overlay版本build/lint exit0。這些不取代第四輪真UI與內容驗收。
- 內容核對補回原片三段已驗on-screen文字／時間戳，與adapted plan分開、say空白且無虛構旁白。fixtures增量14項測試PASS，獨立審查中；待第四輪結束才套入root及重建，現有測試版本不變。
- P4尚未完成：同context非導覽分頁正式資料比對、Run/Use/Reuse、native trim/reload、prepared影片ended及下載hash、完整成功錄影與最後版本重驗均需具體回報。全新AI廣告仍pending；不增加付費或重啟影片生成。
- 主要證據位於 `/tmp/buildclub-guided-demo/`：Native-integration-v2-review.md、Native-prepared-sources-review.md、native-ui-round2/、native-ui-round3/、native-ui-round4/（執行中）、progress.json。任何未回報項目維持未驗，不以舊獨立頁32checks補足。

## 2026-11-06 原站 prepared Demo 工程交付通過（14:46 AEDT）

- 最終native-ui-final：兩路fresh英文40項、繁中及原文可視9項全部exit0；精確3段原片畫面引文/時間/非口述歸因與未驗營養聲明、獨立Adapted copy及21空Say均真UI確認。兩路原7step、Run/Use/Reuse、原Player/seek、ended、allowlist下載、同context非guided observer隔離/reset/exit通過。
- 原Round4同hash程式之72項fault/trim/guard證據窄範圍仍適用；最終delta只為reviewed transcript兩檔。root再次核45程式/公開素材hash完全符合Native-final-source-manifest.json，有限接受最終prepared UI交付。
- 原Guide可見Move正常使用；位置會跨步保留，若遮時間尺或Settings需Move一次。早期遮擋FAIL保留，未force/JSclick或改DOM/guard。保持原站原Canvas布局與21鏡，不待舊獨立頁版面批准。
- 親跑完整verify1109passed/2skipped in36.37s、frontendPASS、GREEN；latest build/lint exit0。所有owned browser/server/lease已清理，8991無listener；零guidedAPI/provider外送，手機waived，無新增付費/安裝/commit/push/merge。
- 最終完整原始錄影與hash交付：`/Users/tommy/Downloads/buildclub-demo-reference/guided-native-demo-20261106/` 的 final-shoot-walkthrough.webm、final-ai-walkthrough.webm、delivery-checks.json與source-and-public-assets.json。QA完整報告 `/tmp/buildclub-guided-demo/native-ui-final/Native-ui-final-report.md`，10段歷史/最終錄影decodePASS。
- **Goal仍active／新全AI廣告pending**：既有影片agent尚無完整21鏡manifest或真人批准；不得把此prepared UI交付或錄影當新AI成片。原影片來源/概念聲明與waiting保持，繼續等其既有任務成果，不新增生成。
- canvas-p1另因stop hook混寫log修正bin/verify.sh為每次獨立tmp log；該樹親跑五步PASS/verifyGREEN。先前duplicate medians間歇根因未修；沒有改產品後端。


## Multi Agent 修正分工與依賴

沿用已有writer／reviewer，不重啟已完成影片任務、不無界增加人數。先做兩份bounded唯讀盤點（原站狀態與原prepared backend接點），Lead選資料隔離方案後才派互不重疊的writer。Lead唯一擁有App／Login／Landing／main、狀態文件與最終整合；overlay writer只擁有浮動元件／純導覽狀態；prepared worker只擁有受限fixture啟動／資料adapter及其測試；reviewer不寫產品、不開browser。寫作仍各自獨立Orca worktree，只回delta patch/hash與真驗證，不commit或push。

DAG：原站基準核對＋兩份唯讀盤點 → Lead固定介面／隔離方式 → 兩入口/overlay與prepared adapter有界平行 → Lead串行接原站頁面 → 同一原站兩路真UI → 精確hash獨立覆核 → 交付。依賴未解不並改同檔。

## 仍保留的驗證命令與界線

- 在修正版實際整合樹執行 `bash bin/verify.sh full`，再在 TF 跑 `npm run build`／`npm run lint`（沿已允許隔離build流程，不寫共享依賴）。
- 先前 `e2e/guided-tofu-demo.cjs` 是獨立頁測試，需改成原站實際screen selector／真API契約後才可驗本需求，不能以舊PASS替代。
- 用同一Viewport1440確認原頁面結構與沒有導覽時一致；無新大卡片、替代workspace或大底欄。手機waived。
- 既有 /demo/tofu 草稿可保存在未提交檔／歷史patch，但正式入口不得指向它；最終清理僅限本任務自建的孤立程式，不能刪其他人的dead code／dirty。

---

# 2026-11-06：導覽式 tofu Demo 執行計畫（最新範圍）

本節優先於下方歷史計畫；舊成果、付費紀錄及限制保留。目標為 2026-11-07 Demo，先把已完成能力串成清楚、可控制、可重播的產品體驗，不以完成全 Canvas 或重建後端為目標。使用者要求本計畫包含階段成功定義、Testing、Multi Agent 分工及執行 Goal；隔離實作與覆核已進行；最新執行檢查點如下，不能把程式或單元通過當作完整 Demo 驗收。

## 執行檢查點（2026-11-06）

- 實作在隔離 `guided-tofu-demo`／`feat/guided-tofu-demo`，HEAD2c069a8加未提交成果；來源展示版及生成batch不動。Orca run `run_79873a505725`，scratch進度 `/tmp/buildclub-guided-demo/progress.json`。
- A導覽、B案例、Native原生Canvas／剪輯已獨立Spec／Quality ACCEPT並按exact hash整合。入口首輪spec缺原片文字，已補三段原文／時間／新改編對照並重審ACCEPT。
- 整合 full 1109 passed／2skipped in39.79s、frontend PASS、GREEN；build／lint exit0；demo28項定向測試PASS。27公開媒體hash核對、4MP4完整decodePASS。
- E2E前三輪均保留FAIL，不是完整成功證據；已從實際DOM/aria及截圖修正table blockquote／雙語combobox與固定底欄捲動定位。最新一輪在自有8990、test-slot、owned browser執行，結果未定。已到達的參考播放、原文對照、script reload與21鏡清單下載、route選擇、Canvas素材reveal、EN/zh-Hant、正式storage不變／零API寫入有分項PASS。
- optional共用index跳過外部字型的修改被安全hook攔下，整批未執行、不改寫重試；現保留既有index，瀏覽器只放行既有公開字型GET，禁止其他外網與API寫入，不宣稱離線UI。使用者可另決定字型偏好。
- 新AI素材已由生成agent品質鎖定，尚無approved新成片；目前AI路線明示舊原片衍生素材。編輯為真本地草稿，預備檔下載不含變更，不冒稱新render。Canvas Layout preview尚待Tommy／Veralyn看圖確認。Goal active，未完成。

## 1. 已確認需求與設計邊界

- 固定 Ever Green tofu 案例，展示找到內容、理解／拆解、腳本與分鏡、製作、剪輯和成片。
- 可進入 Demo 模式；推薦入口為「Try tofu demo」按鈕，不新增一套帳號系統。現有登入若為必要，沿用隔離示範帳號，不在前端放帳密或繞過正式授權。
- 使用者控制前進：上一步、下一步、步驟進度、重新開始、退出導覽；不自動跨頁。
- 簡短講解：每一步一個標題、一句用途；需要時只標示當下主要操作。先不做語音旁白。
- 按下一步切換正確頁面並定位內容；使用者可以停留、播放、互動再繼續。
- 兩條製作路線共用前半段：攝影師取得 shot list／storyboard 並試不同拍法；AI 路線使用新圖／影片組成廣告。可回到分岔切換路線。
- 圖片／影片分批呈現、有處理感；使用預先生成的真素材，明確標示 prepared demo，不宣稱現場呼叫模型。避免刻意長等，讓操作者決定何時繼續。
- Canvas 過滿需改善，但保留 Full Canvas、全部 shots、來源、歷史版本和選用結果，不自動恢復已撤回的單鏡工作區。
- 「4–5 段可展開、每鏡先顯示選用圖、其他版本按需查看」是待視覺確認的建議，不是使用者已批准的確定外觀。先提供 1440 寬預覽，再由 Tommy／Veralyn 確認；其他獨立工作可先繼續。
- 這是 desktop 1440 範圍，手機 waived；英文內容與英文 UI 為展示主線，zh-Hant 不退化。
- 本輪新付費授權為零；既有影片 agent 按自己的授權工作，本 Goal 不增加或挪用其額度。無安裝、commit、push、merge、外部通知。

## 2. 起點與目前證據

2026-11-06 本 session 已核對：canvas-p1 在 docs/agents-md-for-codex，具 upstream；開場 git pull 已最新，bash bin/verify.sh 五項 PASS／GREEN。此綠燈只屬本工作區，不代替實際 Demo 整合版。

實際產品整合來源為 demo-readiness／chore/fresh-ai-preflight（HEAD 2c069a8 加既有 dirty）；不要從本文件分支的舊 UI 開發。開工前重新列出檔案與 hash，和現有影片 agent 分清寫入範圍。

- 舊 batch-20261106 有 21 鏡、約 10.5 秒 MP4、攝影角度提案、Editor／公開待審驗證及約 112 秒 prepared 操作錄影。舊 AI 首圖來自原片衍生，不能標成全新場景。
- 另一個「執行 BuildClub AI 廣告成片」agent 正在工作；本 session 最近 terminal screen 回報 9／21 張新圖完成、其餘進行中，不能當成新影片完成證據。狀態會變，接收時重查 manifest。
- tofu 無可當料理旁白的口述 transcript；呈現內容分析、原片畫面文字、改編 script，Say 可為空。不得把歌曲辨識當旁白，或聲稱既有手工回填是自動功能。
- 目前啟用 Full Canvas 水平排列；單鏡工作區已撤回，禁止直接套回。
- Playwright MCP browser_tabs 實際成功回傳 about:blank，已證工具可呼叫；正式 QA 仍須取得自己的隔離 context／port，不接管其他 session。

## 3. 七步導覽與成功畫面

| 步驟 | 畫面與說明 | 操作者動作／可驗結果 |
| --- | --- | --- |
| 1 找到內容 | Research 的 tofu 來源與有日期的快取表現資料 | 選 tofu；來源可查，不捏造即時熱門數字 |
| 2 理解內容 | 摘要、動作、節奏、畫面文字／無口述提示 | 按分析示範後逐步呈現真分析結果；不發付費請求 |
| 3 改編腳本與分鏡 | 英文 script、對應 shot list 與 storyboard | 可查看／調整 demo 草稿；來源分析與新提案可辨 |
| 4 選製作方式 | Plan a shoot／Create an AI ad | 任選一路；回到本步能改選，不丟失另一條 |
| 5 Canvas 示範 | 聚焦一個能講清楚的鏡頭決定 | 攝影路線換高角／macro；AI 路線逐步呈現圖、影片並選用 |
| 6 剪輯 | 原生 Editor 與已選素材時間線 | 播放、做一個小調整；免費匯出若可用沿用原流程 |
| 7 成片 | 播放驗過的 MP4，簡短回顧本案例 | 完整播放到 ended；可返回另一條路或重新開始 |

下一步不代按生成或同意付費，不冒充審核人批准。影片最後停 waiting；送審可作補充，不阻擋七步主線。

## 4. Demo 狀態與素材契約（提案介面）

新增介面，不改 Shot.line 或 provider 契約：

- DemoSession：caseId、stepId、route（shoot／ai／未選）、revealedAssetIds、demoDraft。每個 session 隔離；不覆寫正式 clients／ideas／canvas／edit。
- DemoStep：id、title、description、view、target、requiredAction。navigate 必須遵守現有 Canvas leave／busy guard，失敗顯示可恢復訊息，不假裝已進下一步。
- DemoCase：來源 URL、分析／script／shots、分組對照、兩路素材與 edit seed；每個 asset 記錄來源 batch、檔案 hash、媒體種類、是否原片衍生、可用性。只接收影片 agent 明確交付的完整檔案，勿讀正在寫入的 output。
- 演示狀態 idle → revealing → ready／error；上一步、退出、reset 必須取消未完成 timer，避免離頁後顯示或覆寫另一鏡。雙擊不重複加入素材。
- 建議以版本化 demo 專用 sessionStorage 保存當前進度與草稿；reload 可恢復，重新開始只清 demo namespace。不改正式 storage migration。
- 優先純前端固定資料及自有靜態媒體。若真 Editor 需要 server state，僅用自有示範 DB／media；由 integrator 單獨做最小接線，不增新身份、provider 或資料服務。
- Demo 資料／action adapter 集中處理；正式模式沿現有 API。測試需直接觀察 network，證明 analyze／generation／TTS 等付費入口沒有送出，而非只看 UI 顯示零元。
- 新 AI 廣告未交付時可展示已驗的攝影路線和清楚標示的舊重製路線；不得悄悄把舊片換名。若要宣稱全新 AI 廣告，必須有新 batch 來源證據與驗過的成片，缺少時明列未完成。

## 5. 分階段工作、成功與 Testing

### P0：凍結基準與可展示素材

負責：integrator；影片 agent 只交付自己的素材。讀最新 STATUS、dirty diff、manifest 和啟動方式；取得整合來源精確 hash，在 origin/main 建隔離 feat/guided-tofu-demo，再只套已接受且相關的未提交 patch，保留來源與來源工作區。不要複製 secrets、整份後端或運行中的 DB。

成功：有可重現的產品基準、兩條路的可用／待補素材表、獨立 Demo state；未改影片 batch、原素材、ledger 或他人 dirty。
Testing：在目標 checkout 親跑 bash bin/verify.sh full，讀實際輸出；若 wrapper 有已知無參數 Bash 問題，明確使用 full，不把失敗隱藏。核對影片 hash、ffprobe／decode；未交付素材列 pending。

### P1：導覽骨架與安全的 Demo 入口

檔案：新增 src/lib/demo/session.ts、steps.ts、對應 unit/demoSession.test.mjs；新增 src/components/demo/DemoGuide.tsx、demo.css。App.tsx／入口頁／共用 i18n 由 integrator 單一擁有，worker 不並改。

成功：入口進 step 1；七步標題／進度正確；前後切換、分岔回返、退出、reset、reload 工作；導覽不遮操作區；非 demo 路徑仍正常。
Testing：先寫狀態回歸測試，應在缺少轉移／timer 取消時 RED，再最小實作。覆蓋 first／last、未選路線、雙擊、返回切路線、reset、未知儲存版本回到起點。瀏覽器驗真頁面導航與 leave guard，不能只有步數改變。

### P2：固定案例與有節奏的素材呈現

檔案：新增 src/lib/demo/tofuCase.ts、actions.ts、unit/demoActions.test.mjs；沿既有 sampleResearch／ResearchScreen／PlanScreen／CanvasScreen 接口，由 integrator 做薄接線。新增公開媒體只限 manifest allowlist，不攜帶私人登入資料。

成功：七步使用同一 tofu case；analysis／script／shot 可追溯；攝影和 AI 路線各能完成一次主要操作；圖片／影片逐步出現，切頁即停止；prepared 標示清楚；不發任何新付費請求。
Testing：測空／缺媒體、延遲完成、reset 中斷、連點、路線切換；監聽付費路由 POST 為零，正式 DB／ledger hash 不變；媒體 error 有重試或返回，不永久 spinner。

### P3：Canvas 減少擁擠（視覺關卡）

檔案：Canvas worker 僅擁有新增 src/lib/demo/canvasPresentation.ts、unit/demoCanvas.test.mjs 及隔離的 preview；CanvasScreen.tsx、FreeformNode.tsx、styles/canvas.css 的整合由 integrator 串行做，不與 P1／P2 共寫。

先比較「分段展開」與「保留水平 Canvas、按路線／段落暫時過濾」兩個輕量預覽。推薦前者，但 Tommy／Veralyn 看過前不得當成已批准成品。沿現有設計系統，不重做全站外觀。
成功：1440 初始畫面能辨識整支故事與下一個操作；可到全部 21 鏡、其他版本和 Full Canvas；不改 generation、selected、edges、edit sources 或原始節點位置；未恢復撤回設計。
Testing：純投影比對輸入未變、全部 shot 可達、共享來源無遺失；browser 看展開／收合、影片播放、版本選用、Full Canvas 返回；截圖人工確認清楚且導覽不遮擋。未取得外觀確認則記 pending，繼續 P2／P4 的獨立部分。

### P4：整合、兩路彩排與交付

檔案：新增 e2e/guided-tofu-demo.cjs（沿已安裝 Playwright／既有 CJS runner）、更新既有 e2e/FLOWS.md、docs/test-log.md、docs/STATUS.md；以上只有 integrator 可整合與更新狀態。

成功：同一凍結版，攝影路線與 AI 路線各完整走通；至少一段連續、可讀的成功錄影；MP4 真播放到 ended；reset 後第二次彩排無殘留；正式模式基本路徑仍可用。最終提供啟動指令、Demo URL、素材限制與測試結果，不自動發布。
Testing：1440×900 真前端七步＋兩路回返；reload／reset／退出；EN 與 zh-Hant；無未處理 console error、無橫向溢出、主要操作不被遮住。錄影及成片完整 decode，無 cookie 播放只在既有分享功能範圍測。只關自己 browser/context/server，finally 清理；手機 waived。

## 6. Multi Agent 執行 DAG 與所有權

不另開重複影片生成工作。總並發以最小數量為原則，先查現有 agent／browser lease，避免與影片 agent 爭用。用 Orca orchestration 建立有回報的 worker；每個寫作 worker 使用獨立 Orca worktree／分支，禁止共用 checkout 並行寫入。

| 角色 | 範圍／輸出 | 依賴與禁止 |
| --- | --- | --- |
| Lead／integrator | 基準、介面、App／頁面接線、合併 patch、唯一文件狀態、最終測試 | 不代改影片 ledger；不 commit／push；全部共用檔串行 |
| A 導覽 worker | P1 新 demo/session、steps、DemoGuide 與定向測試 | P0 後；不改 App 或 Canvas |
| B 案例／Canvas worker | 先 P2 case／actions，再 P3 投影與 preview | 用相同 DemoSession／DemoCase 契約；不改 A 的檔，不開正式瀏覽器 |
| C 唯讀 reviewer／QA | 先獨立查 diff、契約與測試；整合凍結後唯一 UI QA | 不改產品，不發付費；browser 要取得獨立 lease，與既有影片 QA 串行 |
| 既有影片 agent | 完成既有新圖／影片／成片／來源 manifest | 外部依賴，不新增派單或支出；只接收明確交付 |

DAG：P0 → A(P1) 與 B(P2 純資料／P3 preview) 平行 → Lead 串行接線 → C 只讀覆核 → 修正並重審 → 視覺確認 → P4。影片成片可晚接入，不能阻塞導覽／資料骨架；其未交付不得標為已完成。

每次 dispatch 寫清：檔案 allowlist、輸入 hash、接受條件、verification command、不得安裝／付費／push／碰其他 dirty。交付固定格式：branch／commit（若無 commit 則精確 patch＋SHA256）、全部修改檔、測試原始輸出、已驗／未驗、blockers。Lead 明確接受被覆核的精確 hash 後才整合；整合改動須再驗。

## 7. 驗證指令與判定

從實際凍結 Demo checkout 執行，不拿 canvas-p1 的舊測試代替：

```bash
bash bin/verify.sh full
cd pivots/02-content/app/trend-finder
node --test unit/demoSession.test.mjs unit/demoActions.test.mjs unit/demoCanvas.test.mjs
npm run build
npm run lint
```

以上 demo 測試檔是計畫新增，未建置前不得聲稱已跑。沿現有 AST／CJS unit 寫法，不新裝 runner。E2E runner 也是計畫新增，需支援：

```bash
node e2e/guided-tofu-demo.cjs --base-url <isolated-demo-url> --route shoot
node e2e/guided-tofu-demo.cjs --base-url <isolated-demo-url> --route ai
```

runner 只對預先準備且明示的自有 demo state 操作；不能重設其他 session 的環境。等待 DOM／media ready 狀態，不用固定 sleep 當成功依據。輸出逐項結果、network paid POST=0、媒體 ended、截圖／錄影路徑與 cleanup 結果。既有 lint 問題需區分 baseline，但新問題必須修正。

最終 Done 必須同時：P0–P4 綠燈、外觀確認紀錄、兩路成功證據、來源標示、零新增付費、正式資料保存、可重啟／可 reset、未解阻礙如實列出。若新全 AI 影片未交付，只能報導覽完成／新成片 pending，不得宣稱全部完成。真人簽核保持 waiting。

## 8. Goal 與下一步

Goal：完成上述固定 tofu 導覽式 Demo，提供可控七步講解、攝影師與 AI 兩條製作路線、經確認的清楚 Canvas、可播放成片和可重設案例；以隔離 Orca workers 執行，零新增付費、無新依賴、無提交推送，完成整合驗證及可重播證據。影片生成沿既有 agent，不重開生成任務。

執行順序：
1. 重查影片 agent／Orca 工作區與寫入所有權，凍結 P0 產品／素材清單及測試基準。
2. 固定 DemoSession／DemoCase 契約，dispatch A／B 的獨立工作；Canvas 先做可 review 預覽。
3. Lead 串行整合，C 只讀覆核；把具體 Canvas 外觀交 Tommy／Veralyn 確認。
4. 接入已驗成片，在唯一隔離 UI QA 跑兩路、reset／reload 和錄影，修正阻斷問題。
5. 跑最終驗證，更新既有 STATUS／test-log，提供連結、檔案與真實限制；不 commit／push。

---

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

日期：2026-11-05 週四至 2026-11-07 週六，Sydney 時區。
使用者已確認以下優先順序，並授權恢復執行。Canvas 由現有 agent 負責，其餘主線由 demo-flow-qa session 接續；付費生成、提交與推送仍須另行授權。

## 2026-11-06：固定 Reel 案例，執行至付費前

本節依 Tommy 本次確認，優先於下方舊日期、等隊友選題與「只跑深一條路」的安排。已選定原片產品，展示 AI 重現與攝影提案兩條路線；不是新增品牌改編。Goal 已建立，付費批准仍為 US$0，沒有提交／推送／合併授權。

### 最新授權：整套計畫批次生成，總上限US$10

Tommy後續明確要求自行設定預算、無人值守完成全部既定計畫。此新指示優先於下面歷史US$0／逐筆等待的記錄；本節不宣稱已支出。

- 批次授權範圍：原片Research→Claude自動分析→Plan→Canvas；AI重現與攝影角度提案；正式剪輯／MP4／主管確認／至少一次完整成功錄影。全部mini執行保存，主片及產品固定不變。
- 帳戶預定為專案既有Anthropic與fal，不自行改用其他付費帳戶。總額最多US$10：分析0.50、圖片3（每次0.12）、影片6.50（每次0.20）。單鏡品質通過再擴大；未知結果不自動重送。價格／可控上限不符或總額不足時停止受影響項目，不突破上限追求完成。
- 此為本次整套計畫的批次付費授權，後續執行仍須逐筆記錄用途／模型／數量／輸入／報價／上限及實際或待結算費用；不是讓背景任務無限制持續扣費。
- 尚需實作並驗證分析quote／確認與美元限制。Key由應用既有安全路徑處理，不檢視、印出、複製或提交秘密；不使用會複製backend或刪除正式資料的舊launcher。
- 帳戶接入查核：迴圈式settings存在檢查曾被安全hook拒絕，依hook明示允許改用literal existence check後通過；僅知demo-readiness設定檔不存在、canvas-p1存在，沒有讀內容。既有8875 /api/health顯示live/demo，不證明付費帳戶可用。
- Goal工具現況：舊零支出Goal仍blocked且未完成；嘗試以新整套目標建立Goal被拒（unfinished goal）。不能假標舊目標complete；工具無修改objective／恢復active介面。此計畫保存最新批次授權與完整完成條件，舊Goal描述不代表新授權被撤回。

### 本輪使用者後續確認與實測（mini）

- Tommy已允許自有隔離Chromium；最新指示全部在Mac mini執行／保存，不再自動轉傳MacBook。
- 主線仍固定 **Research → Plan → Canvas**，來源就是本次提供的Reel／本機下載原片。獨立Canvas不是替代主線；21段人工拆解僅作付費前準備／對照，不取代Demo的Claude自動分析。
- 已在原地`demo-readiness`程式＋自有DB/media跑前端，沒有複製後端、改產品、讀key或呼叫付費provider。使用既有Chrome Headless Shell、Playwright及ffmpeg快取，1440×900，OS禁止外網、付費預算0，瀏覽器只允許自有loopback。
- run06完整免費前綴成功：UI登入→建立Ever Green案例client→Research Add from link→保存乾淨Reel URL→reload展開同來源。6項PASS、page errors空；錄影VP8 1440×900、5.68秒、無音軌。這是工具自動化速度的證據，不是正式Demo講解錄影。
- run08沿相同主線再按Pick，真POST `/api/analyze`收到429 `New Claude work is turned off`；打開Video canvas顯示正確來源Plan、空shots及空script。8項PASS、page errors空；錄影VP8 1440×900、6.4秒，完整解碼exit0。這是預期付費gate拒絕成功，不是自動分析／Canvas完成。
- Research及未選plan的來源保存在browser localStorage；run06不證明跨browser／server保存。當時server library查不到是契約限制，不以刪掉保存驗收掩蓋。run08選Plan後的server保存未獨立宣稱驗收。
- UI路徑實證：新client的Video canvas側欄開`boardPick`；已有Plan則開ShotBoard。`CanvasPick`新建workspace form有實作，但本次側欄沒有該可見入口；不宣稱功能不存在。依使用者指示不繼續獨立workspace路線，也不自行改導航。
- 兩個成功run均查自有SQLite：generations 0，分析usage檔0；OS deny外網已做實際TEST-NET socket拒絕驗證。result.json的paidCalls欄只是原腳本常數，不當provider spy；零支出結論結合乾淨env、預算0、OS政策、429前置拒絕與本機資料查核。
- 自有context/browser均closed；owner lifecycle證明groups-empty後才release，無survivors，未關他人Chrome／既有8875服務。
- 證據已保存在mini `/Users/tommy/Downloads/buildclub-demo-reference/frontend-evidence-20261106/`，含run06/run08錄影、截圖、原始result、cleanup、payment audit及SHA256 manifest；原始隔離環境在`/tmp/buildclub-reel-ui-20261106/`。測試腳本只在tmp新增。
- 失敗紀錄保留：run01缺隔離HOME的錄影ffmpeg（改用已有快取）；run02按鈕名少+；run03舊port無listener但暫不能bind；run04誤假設全browser只有1筆Research；run05誤假設未選Plan的source已存server；run07驗證獨立workspace入口不通。依實際截圖／source釐清後才重跑，不把這些run列PASS。

### 本輪目標與停點

- 固定來源 `https://www.instagram.com/reel/DVp3xOdFaHL/`；一律使用不帶 tracking query 的 URL，避免不同 hash／分析快取。
- 來源 H.264 檔：`/Users/tommy/Downloads/buildclub-demo-reference/DVp3xOdFaHL.mp4`，1080×1920、30fps、約10.5秒，含 AAC。原始 VP9 另存 `DVp3xOdFaHL-source.mp4`。
- 本輪交付：有來源的人工鏡頭拆解、英文提示草稿、兩路 Demo 任務／驗收、第一筆付費入口的帳戶／成本／硬上限查核，以及能安全執行的免費前端錄影。
- 停在第一個需要真 API／credits 的動作之前；若還有免費可完成的獨立工作，繼續完成。遇到資料權限、瀏覽器占用或產品契約阻礙則記錄，不能把未測寫成通過。
- 本輪不改現有 Agent 擁有的產品檔案。工程交付來源為 `demo-readiness` 的 `2c069a8` 加其已覆核未提交修正；不能用此 `canvas-p1` 文件分支測試代替整合版 UI。

### 原片拆解與資產

2026-11-06 已用本地 ffmpeg 畫格人工查核：原片是 Ever Green SILKEN TOFU (SOFT) 300g 豆腐大阪燒料理短片，主要是同場景動作快切。字幕的營養宣稱只當原片文案，不視為已驗證營養數據。

- 依現有 `analyze.py` 同等門檻的純本地 scene detector 得20段；人工另外辨識約3.233秒的攪拌切換，暫整理21個剪輯段。這是可修訂的人工基準，不宣稱產品 AI 已回傳21 shots。
- 本地語音辨識結果像歌曲歌詞，不能當料理旁白或生成script的台詞。完整歌詞不進計畫、字幕或配音。原音樂沒有確認再利用權利；新成片音樂先保持未決／靜音，不為此呼叫付費工具。
- 原片字幕分三段：開場豆腐轉料理鉤子、成品介紹、留言索取食譜CTA；在 Editor 另加文字，避免要求影片模型同時重畫小字。
- 來源畫格與結構化草稿：`/Users/tommy/Downloads/buildclub-demo-reference/prepaid-preparation-20261106/`，`reel-preparation.json` 含時間、動作、英文prompt與來源hash，另有21張中間畫格。這些是本機手動準備資料，尚未匯入產品。

| Shot | 秒數（約） | 畫面／動作 |
| --- | --- | --- |
| S01 | 0.000–0.533 | 豆腐入白碗 |
| S02 | 0.533–1.600 | 叉子壓碎豆腐 |
| S03 | 1.600–1.933 | 加蛋 |
| S04 | 1.933–2.200 | 淋深色調味液 |
| S05 | 2.200–2.533 | 另一個調味液動作切換 |
| S06 | 2.533–2.867 | 加白色調味料，成分未確認 |
| S07 | 2.867–3.233 | 加粉，成分未確認 |
| S08 | 3.233–3.900 | 攪拌麵糊 |
| S09 | 3.900–4.300 | 加高麗菜絲 |
| S10 | 4.300–4.700 | 加蔥 |
| S11 | 4.700–5.133 | 拌勻 |
| S12 | 5.133–5.600 | 麵糊入煎鍋 |
| S13 | 5.600–6.133 | 壓平整形 |
| S14 | 6.133–6.633 | 金黃煎餅 |
| S15 | 6.633–7.467 | 裝盤後淋深色醬 |
| S16 | 7.467–7.967 | 美乃滋角度一 |
| S17 | 7.967–8.467 | 美乃滋角度二 |
| S18 | 8.467–9.033 | 撒柴魚片 |
| S19 | 9.033–9.767 | 成品近景與CTA |
| S20 | 9.767–10.267 | 原產品包裝特寫 |
| S21 | 10.267–10.500 | 回接豆腐入碗形成loop |

重現目標先保留產品、動作順序、白碗／白盤、廚房光線與快速節奏；不是保證像素一致。包裝文字與手部操作需要逐鏡品質確認。每個0.3–1秒切鏡不能直接假設模型只按該秒數收費，常需生成最短5／6秒後剪取。

### 階段、責任與通過條件

| 階段 | 負責／範圍 | 可觀察通過條件與證據 |
| --- | --- | --- |
| G1 原片準備 | 本session；既有計畫與本地資料 | 影片可解碼；時間段涵蓋10.5秒；每段有實際來源畫格、動作與prompt；區分歌曲／字幕／台詞 |
| G2 免費前端 | 唯一UI持有人；不改產品 | 1440×900，Research Add from link保存乾淨URL，reload仍在；錄到完整成功一次。第一個Plan分析入口停止；不把手動拆解匯入冒充自動分析 |
| G3 生成前檢查 | 本session唯讀；既有產品目錄／provider官網 | 模型參數、實際入口、價格日期、帳戶類型及硬限制可核對；不讀key、不按付費confirm |
| G4 單shot付費，待批准 | UI持有人，逐次批准 | 優先S19成品圖1張；圖經Tommy確認再單獨批准1段影片。真結果可保存、重開、進Editor；記費用與等待，不自動重試 |
| G5 兩路產出，待後續批准 | 整合＋UI；保留原Agent程式所有權 | AI重現版有完整真MP4；攝影提案版有至少同shot的兩個不同角度方案、原版對照與主管對正確版本的確認 |
| G6 成功錄影與彩排 | 唯一UI持有人＋Tommy | 完整前端成功一次連續錄影，另存短展示版；MacBook兩次彩排及離線播放。真生成可預製，但錄影／講稿明示已生成結果 |

每段記錄commit與未提交patch hash、URL、開始狀態、輸入、預期／實際、PASS／FAIL／未測、錄影檔與清理結果。錄影工具先做短smoke確認畫面及時長；Playwright一般page錄影不含系統音訊，不能稱含聲音完整錄屏。成品音訊另外用解碼、波形／音量及實際播放驗證；如需錄下系統聲音，另驗可用工具。

### 實作契約查核與阻斷項

2026-11-06唯讀查核 `demo-readiness`，不是UI驗收：

1. Research `Add from link` 只建metadata與空shotList，可免費；Find貼URL會走相似影片分析及live search，可能再觸發Apify，免費階段不用。
2. `Plan it`／開空shots計畫／planning board會自動 `breakDown` → `/api/analyze`。新URL在有真預算／憑證環境可付費，不能為了測免費流程直接按。隔離環境必須預算0、禁外網，最多驗拒絕及無假成功。
3. 第一筆付費因此可能是Anthropic原片拆解。`server.py`的`ANALYZE_USD=0.08`只是本機記帳；`analyze.py`用`claude-opus-5-5`、`max_tokens=16000`、最多12張圖，且有server fallback；已讀安裝的Anthropic SDK原始碼，`DEFAULT_MAX_RETRIES=2`且目前建構client未覆寫，故一次UI觸發最多可能有初次請求加兩次SDK重試；不能推定每次均計費或均不計費。server fallback另開啟，provider實際單次成本上限尚未核定。未有硬限制前不能以US$0.08報保證上限。
4. `Write the script` 是免費規則模板，不是AI轉錄；可能自加follow CTA。script與Shot.line獨立；字幕／Canvas不保證讀到script改動。既有Agent等待「同步或獨立草稿」決策；本session不擅自改契約，採明確標示的逐shot動作／螢幕文字準備，不亂填歌曲台詞。
5. legacy Plan要先approved才能生成Canvas；與「Canvas探索後才主管確認」順序不完全一致。freeform workspace後送審路線需另驗；目前不能宣稱兩者已接通。
6. Plan→Canvas會自動建立每shot的Shot與Storyboard節點；不會自動建立每shot Video generator。原片分析frames尚未映射為shot.frameImage；不能將placeholder稱原片參考圖。
7. workspace `confirm:false` 才是免費server quote。legacy-plan顯示前端估價；不可向legacy `/gen`送confirm:false問價，因為該路徑仍可能排程生成。
8. 共用Playwright MCP實際呼叫仍回browser already in use；不關他人Chrome。Tommy後續已允許自有隔離Chromium；本輪成功錄影及範圍見最前mini實測節，不沿用工程合成片作本案例驗收。

### 第一筆支出與後續候選（尚未批准）

執行分支必須明確：A 真自動流程先批准原片分析，核對實際shots與script後才另批准圖片；B 先用明示「手動原片拆解」的案例準備Canvas，再另批准圖片。B不算Research自動拆解驗收，且手動匯入入口尚需前端實測。G4只描述圖片關卡，不授權跳過A的分析付費關卡。

來源均於2026-11-06查閱。當次批准前仍須核對實際部署設定／帳戶與server quote。沒有讀key或查帳戶餘額，不宣稱帳戶可用。

| 項目 | 模型／數量 | 官方／本機估價 | 上限與決策 |
| --- | --- | --- | --- |
| 原片自動拆解 | Anthropic Claude Opus5.5，一次分析 | 官方input US$4/MTok、output US$20/MTok；16000 output tokens僅輸出即可US$0.32，另加輸入圖片／文字；本機0.08不是帳單 | 尚無可保證單次硬上限；先釐清fallback／重試／輸入token或provider預算限制。未準備好批准執行 |
| S19第一張成品圖 | fal Seedream4.5 edit，9:16，1張，以S19原片畫格為參考 | 官方US$0.04/image，本機相同 | 建議應用層上限US$0.05、單次1張、不重試；provider硬cap與額度未查。不是本次執行批准 |
| S19短影片 | fal Hailuo2.3Fast standard，1×6秒，首圖取已確認輸出 | 官方US$0.19/6秒；本機0.032×6=0.192 | 建議應用層上限US$0.20；先確認實際quote與首圖。圖未成功不執行下游 |
| 攝影角度探索 | 同shot俯拍及低角度macro各1張 | Seedream共約US$0.08 | 等第一張品質確認後，逐次批准；不先跑批次 |

- fal官方圖片價格：https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit
- fal官方影片價格：https://fal.ai/models/fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video
- Anthropic官方價格：https://platform.claude.com/docs/en/about-claude/pricing
- App層預留額與固定生成數量限制不能冒稱provider帳單硬cap。任何批准均需帳戶、用途、模型、輸入、數量、估價、可強制上限與失敗處理；執行後回報實際／待結算費用及可取得餘額。

### 2026-11-06：單次請求修正已整合驗證

- Worker `fix/analysis-single-request`交付兩檔patch 9b6ad1c728d31308160a77931f364faad065160ba3b20eeff206960f71de6c30；獨立review ACCEPT後root明確接受，核對base吻合並只套兩檔至demo-readiness，9個原dirty檔先驗byte-identical。
- root親跑整合`bash bin/verify.sh full`：1115 passed/2 skipped in33.62s、frontend PASS、verify GREEN；`git diff --check`exit0。worker的3個新增測試先RED、後GREEN；source hash與交付吻合。
- 已取消SDK自動retry與本函式請求的server fallback；不是美元硬cap，沒有增加分析付款UI。SDK證據顯示fallback為opt-in，省略正確，不存在合法fallbacks='none'。
- 同步追加demo-readiness既有STATUS／test-log／計畫，保留各原內容。產品與worker均無commit/push/merge、付費／key讀取。

### 2026-11-06：單次分析請求修正開始

- Tommy要求繼續；本輪仍US$0，沒有批准真分析。先作兩檔最小修正，取消原片`analyze.breakdown`的SDK重試及server fallback，不更換模型／token限制，不擴張成新的付款系統。
- root在`demo-readiness`親跑`bash bin/verify.sh full`基線GREEN：1112 passed/2 skipped in33.65s、frontend PASS。原有9檔dirty保留，分析兩檔與它們不重疊。
- 寫作worker用Orca獨立工作區、base origin/main；僅`backend/analyze.py`、`backend/tests/test_analyze.py`。先以fake RED驗重試／fallback，修正後GREEN，回傳patch/hash，不commit/push/merge、不開瀏覽器。
- root之後核對base及patch、獨立唯讀覆核、只整合這兩檔、重跑受影響檢查；此修正不能宣稱美元硬上限或已完成前端報價。
- 已用實際本機analyzer免費準備原片20個detector segments與12張360px寬provider畫格，檔案在mini `Downloads/buildclub-demo-reference/analysis-input-20261106/`；`input-manifest.json`綁來源hash／模型／16000 output token上限。無provider請求、無input token計數或帳戶驗證。
- Anthropic官方token counting免費但計數仍屬estimate；task budgets是advisory，不是美元硬cap。查閱2026-11-06：https://platform.claude.com/docs/en/build-with-claude/token-counting 、https://platform.claude.com/docs/en/build-with-claude/task-budgets 。不得因免費就自行讀key或發送原片畫格。

### 付款前仍須完成的工程條件（未實作）

- 原片分析必須停用自動SDK重試與server fallback，或以已核實且經當次批准的明確限制涵蓋它們。前端按鈕防重複不能代替SDK層限制。
- 要求分析前能看見「哪個provider／模型、一次分析、輸入內容、輸出tokens限制、估價與不能保證的部分」；目前自動Plan入口欠此確認，不把它當已完成付款UI。
- 素材生成先用1張S19圖片；圖通過後再批准影片。不在單一批准內暗帶圖片→影片整鏈、批次變體或重試。
- 首筆自動分析沒有可靠帳單硬cap時，仍停在該gate，交付未決原因；不能拿圖片較容易控制的費用來證明分析也有上限。
- 自有隔離瀏覽器已批准，僅使用自己新開的context／browser；不把21張來源畫格稱UI截圖。前端成功錄影只涵蓋免費前綴與預期付費gate。

### 本輪驗證

- `canvas-p1`開場 `bash bin/verify.sh`：五項PASS、verify GREEN；僅此分支基線，不代表本案例整合UI。
- 原片 `ffprobe`確認H.264/AAC、1080×1920、30fps、10.518639秒container；`ffmpeg -v error -i <video> -f null -`成功無錯誤。
- 最新整合工程既有紀錄：`demo-readiness`完成1112/2、13UI/HTTP及32零支出；本輪只查紀錄。新session回報其無參數verify wrapper在Bash3.2出錯，使用明確參數的既有`bash bin/verify.sh full`才有可重現入口；本輪未修wrapper。
- 新UI免費前綴及預期付費gate已錄影通過；真provider／自動同案例拆解／兩路正式成品仍未測，不標整體Done。

---

## 目標與完成標準

以同一個客戶、一個固定內容案例，完整展示：

找熱門影片 → 分析 shot list／storyboard → Canvas 改編 → AI 生成或真人拍攝素材 → 剪輯 → 匯出 MP4。

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
| 送審與狀態 | 送審 → 匿名播放 → 退回並填理由 → 修改重匯出 → 再送審 → 核准 | 雙方狀態同步、理由保存；舊成品不冒充新成品；核准對應正確影片版本 |
| 保存與重啟 | 記錄素材 hash 與計畫／時間線，reload、離開重開，再正常重啟專用 backend | 同一持久 DB／素材目錄保留內容與可播放檔案；重啟不是重建空環境 |

真 provider 另逐項驗證一張圖片、一段影片或一段配音：經 UI 確認報價、完成生成、保存輸出、重開可用，記錄等待時間及支出。不自動重送不明結果；未批准的項目不執行。

週四關卡：找熱門影片、拆解、Canvas 改編及第一支完整 MP4 已下載並看完，核心主線跑通；缺陷依下列分類。若真生成未獲批准，以真人素材完成第一支，保留真生成未驗標記。

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
- 預設五分鐘配置：案例與需求 30 秒、研究／計畫 60 秒、Canvas 60 秒、剪輯與成品 90 秒、送審與結果 60 秒。依展示時長調整。
- 準備本機正式 MP4、完整流程錄屏及關鍵截圖；實際斷網播放 MP4 和錄屏，確認含聲音。錄屏避免顯示憑證、私人素材或不必要的個資。
- 準備可重複展示的獨立案例副本，避免正式案例已核准後按鈕消失，或前一輪測試改動正式資料。
- 真發布／analytics 若仍未接線，不以現場操作宣稱已完成；主線止於核准即可達成本次目標。

週五關卡：正式成品確認、P0 清零、核心展示路徑 P1 清零、兩次彩排完成、錄屏與離線成品可播放。成效分析與送審不列核心關卡。未達標時縮短現場主線並明確標記限制，不把尚未測通的生成當作展示依賴。

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
