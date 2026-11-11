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

2026-11-06最新進度：原3張補圖pilot已真正生成/Use/reload/完整錄影decodePASS；獨立圖QA s2PASS、s13PASS、s16LIMITED（熟餅正確但白線已有3–4段）。累計24圖/10Hailuo；原31品質鎖不改，repair3另記，fal總reserve2.96/publicestimate2.86/actual未知。繼續原Hailuo補做quota中的s2單支動態免費實作/覆核（若執行max新.20、合計3.16<=4），未新增支出；不需新cap批准才能作此一支。fal實際餘額GET403、OR正常Key未載入未查帳；不可把reserve當餘額。原21動態/成片仍未完成。

2026-11-06續行：使用者再次要求持續完成goal。原授權尚有3張補圖quota，現只準備s2/s13/s16原Seedream文字補圖pilot，每張.04／新增最多.12，合併fal預留最多2.96<=原cap4；總image最多24。另建read-only linked aggregate guard與獨立repair state，不解原31筆品質鎖、不reset歷史；獨立review與逐鏡視覺QA仍必要。新fal6提案尚未批准，不得啟用。

最新核實（2026-11-06 AEDT）：新AI批次21圖／10支Hailuo已生成；獨立視覺QA未過，s13/16/17/18錯食物/動作且多鏡整塊豆腐復原。s10回收後品質鎖halted，31requests全done，fal預留US$2.84／公開估價US$2.74／actual未知，OR0；未重送、未reset舊ledger。16圖修正草案B/correction-candidate.json需另批fal累計6/OR3及擴quota，尚未批准；OpenRouter正常後端未載入。完整21動態、成片、最終前端錄影尚未完成，不能稱goal完成。自有8978與browser已關，舊8982/3/4不動。

## 2026-11-06：新批次鎖定前端與 offline 全工程鏈已跑通

- root實際啟動新8978生成鎖定環境，正常後端安全載入既有fal；status顯fal可用／OpenRouter未繼承、provider requests0。真登入→選client→21shot Canvas／三model標籤PASS，無舊frame/footage/import，錄影decodePASS；只關自己的PID8722與browser/context，舊8982不動，lease已釋放。
- 初期鎖定UI兩FAIL保留：實際APP/dist缺失導致404；新QA seed缺savedInLive被live filter隱藏。用既有Vite envFile=false/configFile=false只build到新state/dist；再以meaningful seed regression RED→GREEN修新SavedIdea.savedInLive=True（保留QA非真人批准註記），不改產品篩選邏輯。後端18tests PASS in2.271s、實際app full1115passed/2skipped in32.92s、frontendPASS、GREEN。
- 離線前端工程完整PASS：B/evidence/offline-smoke-1793922762302041000/result.json，11checks包含真UI201→done圖/片→History Use→Editor2s trim→native1080x1920/30fps H264 export/download/full decode/ended→send waiting→無cookiepublic ended→reload。影像為本機testsrc，明示OFFLINE，並非新AI廣告；mode隔離、no inherited keys、paid0；owned backend20598正常停止，ctx/browser finally關閉，lease釋放。先前login race與未選client兩FAIL保留，依HTTP/截圖證據修runner。
- 正式source production ledger仍0請求；3張付費pilot尚未執行。只在零generation／零binding前，依原片產品包裝的視覺分析補純文字描述與手部一致性；原片影格只作分析，imageInputs全部空。改新B/fresh-plan與新production frozen-plan的prompt，沒有重設任何ledger，舊batch不動。
- 現source code／hash／C provisional接受及root integration delta在B/runtime-progress.json。下一步覆核savedInLive單欄seed delta與受限3圖pilot runner；沿已批准Seedream4.5／fal4+OR3=7，先s1/s14/s20三張各.04、總.12估價/上限，完成QA再擴。OpenRouter仍需使用者從同一環境啟動後端來傳入，不讀共用秘密檔或複製Key。

## 2026-11-06：依使用者要求恢復 Full Canvas，單鏡設計暫停

- 使用者認為單鏡工作區與預期差很多，明確要求暫停，隨後要求回到上一版Full Canvas。已恢復8982 preview加入單鏡前的index；舊assets完整，HTTP實際回傳與備份逐byte相同，MacBook所有18982 Demo分頁已重新整理。
- 已核對目前Demo的7個檔案仍等於本次integration after-hash，再安全反套本次patch，4個既有檔恢復before-hash、3個本輪新增source/test移除。只撤銷本輪單鏡工作區，不影響先前側欄入口修正／橫向排版／版本向下。data／media／edit／ledger保留。
- demo-readiness為目前啟用的舊Full Canvas程式；video-canvas-entry／feat/shot-focus-workspace仍保留未提交的單鏡草稿，供重新對齊時參考，禁止直接重建套回展示。使用者未授權恢復開發，不再自動改設計。新AI生成批次的其他限制仍依最新G1紀錄，這次僅UI恢復。
- 還原驗證：7檔before SHA全部相符；served index逐byte相符；frontend unit637 passed／0 failed in2186ms。無commit／push／安裝／新增付費。證據shot-workspace-20261106/full-canvas-restored.json，原設計與成功／失敗證據及patch均保留。

## 2026-11-06：預設單鏡工作區與縮圖導覽（使用者已批准）

- 預設legacy plan進Shot view，上方21鏡縮圖一排且可直接跳轉、上一鏡／下一鏡；下方References／AI images／Videos三欄獨立捲動、放大預覽、播放，設定按需開Inspector。保留Full canvas與全部92nodes，以及Open editor後回到同一鏡。standalone workspace維持完整Canvas。view／shot用每resource本機偏好保存，預覽本地狀態不改selected，Use才沿用既有保存／quote／readonly契約；In edit僅由真clip source ID判斷。
- 新shotWorkspace純資料投影合併同鏡多節點與歷史Generation，沿edge找參考、共享來源不複製，支援真takes。review找到owned upload在visited中消失，新增回歸先RED後GREEN並修正；pending Run／Use／Upload保護、唯讀可看不可寫。Assistant與聚焦鏡頭同步，Inspector明示設定用於下次生成。
- 隔離feat/shot-focus-workspace（video-canvas-entry）實作，7個前端／測試檔整合demo-readiness，原dirty保留；無後端、套件、付費變更、commit／push／merge。獨立只讀review最終ACCEPT，root看1440首鏡與S19／Inspector截圖ACCEPT。
- root整合全套最後 `bash bin/verify.sh full` GREEN：1115 passed, 2 skipped in35.63s；frontend PASS；TS／ESLint／sandbox build PASS。先前full frontend因既有AST handler測試沒注入shotView而RED（641/642）；更新scope並驗兩種view、0 model requests後，定向13tests及full GREEN。shotWorkspace純測試5項PASS，資料不變／版本去重／共享與owned references／cycles／empty pending failed／真takes。
- 1440 preview與實際8982 served完整11步PASS：21縮圖同排、點最末鏡、S19五張圖三支片、預覽不採用、各欄scroll、放大、影片真播放、Inspector不溢出、Full Canvas92nodes、view／shot重開持久、Assistant跟鏡、Editor返回同鏡。data／selected／edges／gens／takes／ideas／edit project皆保留，ledger SHA不變、paid0。另browser-only readonly／empty／pending-owned／zh-Hant四fixtures全PASS；全自有context/browser關閉。
- UI初期native video metadata未等與Editor返回鈕帶箭頭造成harness FAIL，原JSON／錄影保留；查實際媒體readyState與按鈕文字後修harness，產品行為無為此繞過。實際成功連續錄影shot-workspace-demo.mp4：H2641440×900完整decode PASS，內容為既有cached素材的免費操作，不是真AI再生成。
- 全部證據 `/Users/tommy/Downloads/buildclub-demo-reference/shot-workspace-20261106/`：live-result.json／fixtures-result.json／integration.patch與逐步截圖／錄影。重跑 `node /Users/tommy/Downloads/buildclub-demo-reference/shot-workspace-20261106/check.cjs --live`（讀既有案例並容許僅Canvas位置／viewport正常保存；不生成）。8982服務與MacBook18982轉接供使用者檢視保留，僅更新static frontend，未重啟後端。
- 這不是新廣告生成驗收；新AI批次G1／Key／live費用限制狀態依其他最新節與runtime-progress.json，不能以本次UI GREEN解鎖paid。

## 2026-11-06：使用者go批准固定單價替代方案，接線待覆核

- 使用者在估價4.92美元／cap fal4+OpenRouter3=7／Seedream4.5純文字新圖提案後回go，已記錄新批次授權；原片與舊衍生圖依舊禁止generation input。21圖＋12Hailuo6秒＋9Veo4秒無音，各最多3補做。未新增付費請求，支出0。
- 新batch fixed_runtime.py/provider_transport.py實作固定model／payload／單張、單次POST、先保存provider receipt後GET polling、首圖同bytes、分帳cap與counts、下載不帶Key到CDN；runtime.py支援mode/policy分離，原Nano Banana live仍拒絕。只fake HTTP跑40focused tests PASS，還不能當真provider驗證或paid-ready。現候選精確hash見runtime-progress.json fixedReviewFiles，待獨立覆核。
- 使用者詢問Key已載入要去哪裡看，尚不是後端載入確認。check-account.py僅由使用者已載入環境執行，顯示存在布林與免費OpenRouter account結果，不顯示或另存Key；agent不讀取共用秘密設定。此輪app baseline full1115passed/2skipped in38.42s，frontendPASS、GREEN；保留其他session新橫排UI dirty及舊8982/3/4。

## 2026-11-06：新廣告 G1 離線防護通過，live 仍 blocked

- 正式 goal 已建立。兩個唯讀研究／QA代理完成；第三位獨立 reviewer 第一輪 REJECT，root重現問題後修正，第二輪spec/quality ACCEPT。root核對 HEAD2c069a8 與兩檔SHA256一致，僅接受offline候選，不是付費ready或committed approval。
- 新batch runtime.py/test_runtime.py新增完整payload限制、原子獨立預算、固定首圖bytes與hash、不可任意finish導入來源、未知提交/真程序crash後停批、輸出格式與解碼。第一輪新增回歸3FAIL已重現；修復audio-only MP4誤收與帳本暫存/lock symlink後，root24tests PASS in1.365s；reviewer24PASS in1.205s。live模式仍無條件拒絕，所有測試素材標offlineSimulation，沒有生成真廣告。
- 狀態及精確review hash：`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai/runtime-progress.json`。阻礙仍為使用者側安全載入Key尚未確認，以及指定圖片模型完整thinking/output成本上限未證；US$0、無新paid requests。既有產品code/dirty及8982/3/4未改。
- 下一步只在具體關卡解除後接續：收到使用者終端Key檢查結果；取得指定模型成本限制的可執行證據，或使用者另批准有固定單張成本的替代模型/預算配置；然後受限live adapter獨立覆核、3圖pilot，再21鏡與完整成片錄影。不可用本次24offline PASS解鎖paid。

## 2026-11-06：鏡頭橫排、同鏡版本向下（使用者已批准）

- 主流程按shots順序由左至右；同鏡的upload／image／video分欄，獨立變體往下。新增shotLayout純排版，沿edge推導無shotId來源，共用來源只保留一份置於上方。保守尺寸加實際量測與標題空間，穩定後不重複儲存。
- 新分鏡僅在符合未修改後端初始座標時自動橫排；既有自訂畫布須點Arrange shots。水平模式新增同類節點往下；滑鼠或鍵盤手動移動會解除自動排列。唯讀初始分鏡僅映射顯示、不PUT。FreeformNode將成功歷史版本向下顯示並沿用原Use action，沒有複製generation或改既有選用結果；中英標籤保留。
- 隔離分支fix/canvas-horizontal-layout（工作區video-canvas-entry）實作，將8個前端／測試檔整合demo-readiness，保留原CanvasScreen既有dirty。無backend／依賴／付費服務變更，未commit／push／merge。既有新AI廣告仍待OpenRouter安全設定與paid adapter，不因本輪UI GREEN宣稱paid-ready；其舊source hash證據只對原preflight版本有效。
- root最終實際整合 `bash bin/verify.sh full` GREEN：1115 passed, 2 skipped in44.90s、frontend PASS。TS／ESLint／sandbox build PASS；純排版4項GREEN（先見新module缺失的預期RED），涵蓋順序、資料保存、來源歸屬、共享來源、實際尺寸無交疊、變體不推動其他鏡、未修改匯入與手動位置。
- 1440前端先browser-only saves驗完整案例，再更新8982自有preview static並真UI點Arrange保存：21shots／92nodes／23videos、4歷史圖片向下、全部卡片與標題0交疊、idle PUT穩定、reload後位置相同；data／selected／edges／generations／takes／ideas與edit project不變，只有layout／position／viewport更新，ledger SHA不變、paid0。另browser-only pristine21shot核准自動保存／唯讀0PUT皆PASS；keyboard移動解除auto亦PASS。
- 初期兩個UI harness FAIL保留（硬編不存在video node ID、焦點未選取就按箭頭）；查實際node IDs與已安裝ReactFlow keyboard條件後修正harness，未隱藏原FAIL。獨立只讀review最終ACCEPT，root看首鏡橫排與S19向下版本截圖ACCEPT。
- 成功連續錄影horizontal-layout-demo.mp4：1440×900 H264完整decode PASS，明示既有cached素材＋即時免費排版／保存／重開，不是live生成。全部證據與重跑命令：`node /Users/tommy/Downloads/buildclub-demo-reference/horizontal-layout-20261106/check.cjs --live`。該命令會重新排列此Demo；完整結果live-result.json、import-result.json及來源integration.patch。MacBook18982與8982服務依使用者檢視需求保留；測試owned browser/context全關閉。

## 2026-11-06：Video canvas 側欄入口修正

- 使用者確認側欄 Video canvas 應進入生成 Canvas。修正 Sidebar.tsx 送出 canvas；App.tsx 在目前 client 只有一個 Plan 時直接開該 Plan 的生成 Canvas，0／多 Plan 進既有 CanvasPick。舊分鏡板與其資料保留。已在同一 Canvas 時不重載，跨資源先走 withCanvasLeave 保存／busy 保護；獨立只讀覆核 ACCEPT。
- 原始修正在隔離工作區 video-canvas-entry／fix/video-canvas-entry @2c069a8；僅把 App.tsx、Sidebar.tsx 兩個乾淨基線檔整合至 demo-readiness／chore/fresh-ai-preflight，原有 dirty 保留。未commit／push／merge／安裝，無新付費。
- 2026-11-06 root親跑實際整合工作區 `bash bin/verify.sh full`：1115 passed, 2 skipped in 34.12s；frontend PASS；verify GREEN。隔離起點1109 passed／2skipped GREEN；修改後TypeScript app/config、ESLint與sandbox build PASS，實際整合build PASS。
- 1440真前端前後比較：原版側欄進 .board-canvas；修正版單Plan直接進 .fc-flow，92nodes／23video保留，再點同入口DOM與graph讀取次數不變；0／多Plan picker PASS（後兩者只在browser mock ideas，不改server DB）。更新8982專用preview靜態index/assets後再跑實際served三情境全PASS、ledger SHA不變、paid0；舊assets保留供已開分頁。沒有改DB、素材、guard或ledger；8982及MacBook18982轉接依使用者檢視需求保留。
- 證據與可重跑命令：`node /Users/tommy/Downloads/buildclub-demo-reference/video-canvas-entry-20261106/check-served.cjs`；同目錄 result.json／served/result.json、前後截圖與錄影、integration.json／preview-update.json。此修正不等於卡片重疊已修，也不等於全新AI廣告已生成。

## 全新 AI 廣告批次：免費準備完成，缺 OpenRouter Key（2026-11-06）

本輪目標是全部21鏡新圖＋新AI動態；下方舊Demo完成紀錄只屬舊批次，不能代替新需求。實際工作區分支已由`test/demo-readiness`切至`chore/fresh-ai-preflight`，HEAD仍`2c069a8`、無upstream；原有dirty保留，未commit/push/安裝。

- 新批次：`/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai/`。21組純文字新場景提示、315frames/30fps剪輯節奏、獨立空media/state/ledger；僅復用原片文字分析，沒有原片frame或舊衍生圖進generation，攝影師路線不重做。本輪付費請求0、支出US$0，fal3／OpenRouter10授權分開未動用，餘額未查。
- 正常設定載入檢查只輸出布林：demo-readiness三Key皆無；舊批次正常canvas-p1入口fal/Anthropic有、OpenRouter無。具體阻礙為`OPENROUTER_API_KEY`尚未透過正常後端設定提供；沒有讀印或複製秘密，不source keys.fish。未執行新圖、新影片或新成片。
- 官方免費catalog快照已保存。Hailuo standard 768p/6秒US$0.19；Veo Lite 1080p/4秒/無音訊US$0.20。最終1080p匯出不代表Hailuo來源原生1080p。Nano Banana現有images adapter沒有可證的輸出token硬上限；chat/max_tokens3072的US$0.19保留僅提案，待嚴格input bound與實際傳遞約束，不能稱paid-ready。
- 新離線記帳契約7測試PASS，但尚未接HTTP，不是已完成付費防護。獨立覆核要求真接線前綁完整payload、provider回應bytes/requestID/immutable輸出hash，以及video輸入同bytes/hash；詳見`paid-readiness-review.json`。原舊guard/ledger/state沒有修改。
- 自有8972前端13項PASS、zero-spend32PASS、真重啟DB/media hash相同；owned groups空、lease釋放。8976隔離登入→選client→Research→Plans錄影PASS且完整decode，僅錄影能力證據，不是新廣告完整成功錄影。兩次先前FAIL保留（ffmpeg快取路徑、漏選client），無安裝。所有自有context/browser/backend已關閉。
- 驗證：`bash bin/verify.sh full` GREEN，1115 passed/2 skipped（40.25s）、frontend PASS；canvas-p1五步GREEN。既有產品code與runner逐hash維持原dirty。8982/8983/8984依協作通知交由原session展示舊Demo，本session未啟停或寫入。
- 下一步：正常後端設定安全提供OpenRouter Key後，先免費驗account與request-bound cap；完成最小受限adapter與來源綁定，再3張新關鍵圖QA→21圖→12Hailuo＋9Veo→Editor成片/匿名送審/reload/完整成功錄影。授權不需重問，同模型批次變更或額外花費才另問。

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

# STATUS

## 2026-11-06：固定Reel免費前端已錄影，Claude分析取消自動重試

- Tommy選定原片產品／Reel `DVp3xOdFaHL`，主線固定Research→Plan→Canvas；AI重現與攝影提案兩路，全部在mini執行保存。人工21段只作準備與對照，不代替真自動分析。
- mini來源與準備在`/Users/tommy/Downloads/buildclub-demo-reference/`：原片、21張人工參考畫格／prompt；另`analysis-input-20261106`依現有analyzer得20個候選段／12張送Claude尺寸畫格，沒有呼叫provider。
- 免費UI錄影run06（6PASS）及run08（8PASS）在`frontend-evidence-20261106/`：真UI建client→Research加入原Reel→reload→Pick送Plan→analysis預期429零預算拒絕→打開來源Plan。shotList仍空；無自動分析、生成或正式MP4成功宣稱。Research前綴只證明browser-local保存；不宣稱跨browser同步。自有browser/context與服務均清理、groups空後release。
- 本次只整合`backend/analyze.py`與`backend/tests/test_analyze.py`：Anthropic(max_retries=0)，移除本函式請求的server fallback；保留模型、16000 output tokens、結果與錯誤處理。獨立review ACCEPT、root明確接受patch SHA256 9b6ad1c728d31308160a77931f364faad065160ba3b20eeff206960f71de6c30，兩檔source hash與worker一致。整合前9個既有dirty檔逐byte一致，之後只追加本次文件紀錄。
- root親跑基線full1112/2、整合後`bash bin/verify.sh full` GREEN1115 passed/2 skipped in33.62s、frontend PASS；`git diff --check` exit0。worker三項先RED再GREEN；fake測試不是live HTTP證據。
- 未完成：付費前端報價／確認、美元硬上限、真Claude分析與原片frame→shot接線、script與shot台詞權威契約、雙路正式成品／正式錄影／彩排。本機0.08記帳不是硬cap；僅取消重試不代表已能花錢。尚未讀key、帳戶餘額或修改provider設定；US$0、未提交／推送／合併。
- 本輪詳細計畫仍在canvas-p1既有`pivots/02-content/docs/plans/2026-11-05-saturday-demo-plan.md`的最新2026-11-06節；此處保留本分支原計畫與歷史。

## 2026-11-06：不依賴主題的工程驗收已完成；整份Demo計畫尚有產品決策

- 工作區 demo-readiness／test/demo-readiness，HEAD與origin/main仍2c069a84569cd9ed2a70c4d284626057e5118e36；本輪全部未提交，無PR、push或merge授權。
- 完成：保存script/boardLayout/shot.footage metadata；legacy toolbar video只繼承單選有效shot且無效不新增；原地程式＋自有持久DB/media的零支出UI/HTTP runner。產品兩patch c6c676ee…/8121e314…及最終工具4df8e8d0…均獨立spec/quality ACCEPT，root接受。
- 最終工具Python f7eeabd4c26b45b862421acaa3671e2e61266ca0d05083ae9ef58292ece00b90、CJS9e941bb1ada844e30b42a6c12dc7746d8011a145417a366415d9b98f33105905；root已替換並親跑正常UI exit0，證據 /private/tmp/buildclub-readiness-b-r1/run-1793886924801846000。
- 最終驗證：同產品tree full1112 passed/2 skipped in38.76s、frontend PASS；最終工具13UI PASS、zero32 passed in0.69s，Vite build PASS；TypeScript app/node及ESLint exit0。root source/artifact manifest /tmp/buildclub-readiness-root-final-manifest.json，full與quality輸出 /tmp/buildclub-readiness-root-full.log、/tmp/buildclub-readiness-root-quality.json。
- root真HTTP PID72060→73387，DB/media hash一致、3rows/3POST未重送；browser/context關閉、owned groups空、cleanup完成後lease釋放。B最終新五lifecycle＋舊四cleanup同hash通過且A接受，manifest /tmp/buildclub-readiness-b-r1/final-manifest.json（root未重跑這九probe）。
- 待決：完整script要即時同步Shot.line，或保留獨立草稿。async選項未回覆，不擅自實作。onScreen自動export未授權；board metadata非server take、舊無shot節點未遷移、原片frame自動帶入未接、搜尋錯誤只有API測試、theme未做computed對比/overflow、真provider/真人品質/正式影片未驗。正式影片依最新指示等隊友選題。
- 本階段止於已授權工程驗收完成；完整Demo計畫不標全部Done。後續先決定script契約，再固定主題／素材、逐次批准真模型、正式MP4與實機彩排。無付費或依賴安裝。


## 2026-11-06：root已驗6ba版全綠，最後launch-gate增量待綁定

- root接受A msg_a69ab9d86e65後整合工具460e5662…（Python6ba0ccdb…/CJS762c2d74…），親跑full1112/2 in38.76s、frontend PASS；正常13UI/HTTP、zero32 in0.99s、TypeScript app/node與ESLint全GREEN。
- root正常證據 /private/tmp/buildclub-readiness-b-r1/run-1793886362799808000：PID53537→54765，DB/media hash一致、3rows/3POST不重送、owned groups空、browser/context closed、cleanup後release。完整log /tmp/buildclub-readiness-root-full.log，quality /tmp/buildclub-readiness-root-quality.json。
- B收尾另補登記前留tracked父group的launch gate，候選patch4df8e8d0faf37942144fe9bf252c7d4d500c2d16df0f2726b879c252b882ccf8／Pythonf7eeabd4…／CJS9e941bb1…（wrapper-only spawn增6行，13UI邏輯未變）。root尚未套新版；A ctx_8aa8925dd5b2候選review無blocking、新五probe綠，但等B新版同hash正常run/manifest，不能把root舊run綁新版。
- 已要求B凍結最後候選，不自行擴其他強化；本輪最後只做delta覆核及受影響正常啟動/UI回歸，不重跑未變產品套件。整份計畫仍未標Done；腳本權威選項待答覆。


## 2026-11-06：manual lease新五probe綠，獨立覆核中

- B新Python hash6ba0ccdb42eaf802d751d46552fe27ef5d9270717dc9db36b27841ba6bf7cffa；工具候選patch460e566217c9c7453dbec358aa6297422bcaea29f4bf0b47991a130246db7461。尚未整合。
- 新lifecycle selftest exit0，證據 /tmp/buildclub-readiness-b-r1/run-1793885944034407000/lifecycle-tests.json：owner-term、inside-term、真watchdog exit124、startup exception、leader-exit；root親跑JSON斷言核五case、租約owner一致/cleanup前held、groups無survivor、release最後，exit0。是否精確測到所有實作路徑仍由A覆核。
- 舊watchdog真RED /private/tmp/buildclub-readiness-b-r1-red-1793885402756098000/red.json：exit124時租約已釋放但3actor存活；B事後按birth清理。兩次前置診斷失敗未混稱RED成功。
- A ctx_09d21c92ac30覆核固定候選與新證據，B ctx_77e708837c3f重跑manual lease正常流程；產品pair保持不變。待接受後才整合工具及最終root gate。


## 2026-11-06：R1改採manual lease活owner策略（工具未整合）

- B確認全域with-command timeout直接SIGKILL child group並release，群組內handler無法保證detached child清理。root採技能已文件化manual lease，由外層活main持有真port租約、監督sandbox workload、核token/kernel-birth/PGID清理本次owned程序後最後release，不改全域skill或加guardian框架。
- 要求新RED/GREEN覆蓋owner TERM、inside TERM、真正with-command短watchdog殺workload但owner/真port lease保持至groups空、startup exception及leader消失group audit；同hash新patch/manifest後覆核。不可捕捉owner SIGKILL/斷電不在自動清理保證範圍。
- 既有13UI限定成功與已接受產品兩patch保留；新工具正常路徑須回歸，B ctx_77e708837c3f執行中。script同步產品選項待答覆。


## 2026-11-06：13項正向UI完成，R1外層清理未接受

- B在兩份已接受產品patch上交13項UI PASS，final manifest /tmp/buildclub-readiness-b-r2/final-manifest.json；root核27個artifact hash及checks/errors/cleanup一致，並未據此接受runner整體。
- 工具52cecf4037c844b925f4e408282bf1e990b5547c508bce72246fcefc74f065bb的Python仍ae4a3e65舊版，只有原4cleanup cases，欠outer watchdog/Python TERM/start exception。root/A均拒絕R1總通過宣稱；未整合工具。UI成功仍保留。
- A ctx_48fb2c6635f8僅覆核13UI斷言/產品相容並維持R1 REJECT。B已自動續接ctx_77e708837c3f，Orca曾turn-start-unobserved；root親讀exact transcript確認新turn已讀4封新R1郵件且liveness live，未重複啟動或重送prompt。
- 下一步：B只修新R1並交新hash與真失敗路徑證據；A覆核後root才整合工具/最終驗證。script權威同步選項未答覆；其餘正式影片/真provider仍延後。


## 2026-11-06：runner外層timeout清理仍阻擋驗收

- A對工具snapshot6171c78a2900b6f598b6701f5870e6c22e845bc0ff4ac55304f640a590eb2599確認原driver-error/server與context.close/browser兩點修復；但outer test-slot watchdog只清inside group，server/driver/browser另session可能殘留，且Python無TERM cleanup、start health例外有handle窗口。R1仍REJECT。
- 新鮮獨立證據已交B ctx_8c0f72d7b000，要求先Python TERM／outer短timeout／startup exception聚焦RED/GREEN，再修兩工具；禁止加長timeout掩蓋或動全域skill。正常路徑四probe不等於外層失敗通過。
- 產品兩份已接受patch保持不變；工具未整合，final UI/HTTP尚未接受。script同步選項仍待答覆。


## 2026-11-06：legacy toolbar shot歸屬修正進入覆核

- 依A有界查核，root只追加改 CanvasScreen.tsx與unit/canvasPlacement.test.mjs；既有plan新增video必須沿用單選且存在/未removed的shot，無有效選擇使用既有提示並不新增；明確from才自動連線，workspace自由節點保持原行為。舊保存的無shot節點不遷移，不宣稱已修復。
- actual production add handler regression先RED，再修正後root親跑 `node --test unit/canvasPlacement.test.mjs` 9/9 GREEN；patch SHA256 8121e314a37c5e771f8d3bd7690d4b3596025d60657ed7484bd70dd9688c9a6a。A ctx_33771905afec spec/quality ACCEPT且hash一致，root已接受；已授權B套toolbar patch做真UI回歸。root另親跑full GREEN1112/2 in34.43s、frontend PASS。
- B ctx_8c0f72d7b000已交R1異常清理artifact及R2舊版正向RED，root核對cleanup JSON；正等待兩patch套用後UI結果及新版工具獨立覆核。之後須補toolbar真UI、手選history/字幕設定保存及合成素材真upload/take接Editor。正式影片品質與真provider仍不做。
- 已向使用者提出script即時同步shot台詞或獨立草稿選項；此產品契約未答覆前不實作同步或onScreen export。其他工作照常推進。


## 2026-11-06：保存修正覆核接受，測試工具待修

- root核對兩產品檔diff SHA256 c6c676ee6392bb196282073eb4192f95b8564db82062acc5d252a85a41992a81 與 /tmp/buildclub-readiness-a/review-persistence.md 一致，明確接受 spec/quality ACCEPT。此結論只涵蓋保存，不代表腳本與字幕接線或整體UI成功。
- B工具覆核有R1異常清理與R2舊缺陷斷言兩項blocking。已續派 ctx_8c0f72d7b000（同隔離UI工作區）修兩工具並驗已覆核保存patch，舊FAIL artifact保留，新結果另存。
- 已提供 /tmp/buildclub-readiness-persistence-reviewed.patch，僅 models.py/test_store.py；B只可套這份產品patch，不可另改產品。
- 2026-11-06：A已正式worker_done保存ACCEPT/工具REJECT；另派ctx_c342507aab10唯讀釐清toolbar shot繼承及script台詞/字幕契約最小方案，不改外觀、不與B重複。
- 下一步：B交付異常cleanup回歸、正向script/layout/footage保存與HTTP重啟；A覆核新版工具後才整合。legacy toolbar shot association、script與shot台詞/字幕仍open。整體未完成，無付費／提交／推送。


## 2026-11-05：資料保存修正與獨立覆核進行中

- 使用者授權無一般問題時自動繼續，目標完成既定 plan；正式主題與真生成仍延後。
- A 查核 /tmp/buildclub-readiness-a/report.md 確認 script/boardLayout/shot.footage 被後端 schema 丟棄；另有 script 未同步 shot 台詞及 board upload 僅裝置素材限制。B 抓到 legacy toolbar video 無 shotId 無法進 Editor，已保留 FAIL 並續驗既有 shotId 路徑。
- 新修正 worker 的派工文字兩次被 hook 誤判秘密存取攔截；未改寫重試／改 hook／讀取秘密。使用者確認後，改由 root 在本隔離工作區直接做已授權兩檔修正。
- 產品僅改 backend/models.py、backend/tests/test_store.py；真 PUT→GET 回歸先 RED：script/footage KeyError 兩項、其他1110 passed/2 skipped；再補明確 Footage/BoardPos/ScriptLine/PlanScript，舊計畫 optional 相容，board metadata 不等於 server take。
- 獨立覆核已派 ctx_35f1b56b007f（A follow-up）；B ctx_5c1c5ba841dc 繼續 UI/HTTP。root 親跑 full GREEN：1112 passed/2 skipped in 35.03s、frontend PASS；zero-spend 32 passed in 1.39s。B 原base替代路徑7項UI/HTTP通過，兩產品FAIL保留；root已核對PID/DB/media/提交數/cleanup與hash。A正在覆核保存修正與B工具；修正版UI尚未跑，整體未驗收完成。無付費、安裝、commit/push/merge。


## 2026-11-05：Demo readiness 驗收開始（未提交）

- 使用者授權寫分階段計畫並以 multi-agent 執行；正式主題／影片等待隊友，付費批准 US$0，不 commit/push/merge。
- 基準 origin/main `2c069a84569cd9ed2a70c4d284626057e5118e36`，工作區 demo-readiness／分支 test/demo-readiness。舊交付 8ee2459 已包含於 main。
- 計畫見 `pivots/02-content/docs/plans/2026-11-05-saturday-demo-plan.md` 最前更新：契約查核、原地程式＋自有資料的持久 HTTP/UI 驗收、最小修正與獨立覆核、最終 gate。
- 起跑首次因新工作區缺 .venv RED；只連結既有依賴後親跑 `bash bin/verify.sh full` GREEN：1109 passed、2 skipped（32.59s）、frontend PASS。未安裝依賴。
- 已派 A `ctx_93ea8db23c4a` 唯讀契約查核、B `ctx_5c1c5ba841dc` 獨立工作區唯一 UI 持有人；run `run_1dfae916faa8`，等待事件回報。只修改既有計畫、STATUS、test-log；產品未改。舊 backend 副本路線不重試，禁止外網與付費憑證。
- 未完成：最新整合版 UI、持久 HTTP 重啟、資料契約查核與獨立覆核；真生成／正式影片／彩排不在本輪。


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

2026-11-06 本輪收尾再跑 `bash bin/verify.sh full`：1115 passed, 2 skipped in 33.99s；frontend unit tests PASS；verify: GREEN。`git diff --check` PASS。新廣告仍blocked，費用0。

2026-11-06 待使用者決定：固定單價Seedream4.5純文字生圖21張(.04/張)＋12Hailuo6秒(.19/支)＋9Veo1080p4秒無音(.20/支)，基礎估價4.92美元；提案fal cap4／OpenRouter cap3、總cap7，各最多3次補做，最高planned reservation6.36。只是替代提案，尚未批准／切換／付費；原Nano Banana方案成本上限仍未證。詳runtime-progress.json pendingDecision。
