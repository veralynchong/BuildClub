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

## 2026-11-07：native host導覽Editor 401修正驗收

- Repro: mini8980 POST /api/guided/sessions/diagnostic-editor-check/shoot ->401 Sign in to continue。使用者MacBook18980 guided Canvas14/14與此相符；之前單獨native及standalone驗收未覆蓋這個入口組合。
- Source修正限guided_demo.py api_prefix/attach_editors、server.py optional3路徑啟用精確public namespace＋index meta、runtime.ts依meta/preset選namespace；後端與runtime兩份既有tests加回歸。native權限不放寬到/api/ideas/workspaces；空／foreign/null Origin策略不改，foreign/null測403，provider操作405，同sid雙preset獨立DB/CAS，media與cutURLprefix一致，/與/index meta一致。
- Opening full1124passed2skipped36.55s GREEN；整合後full1125passed2skipped35.90s GREEN；finalshared-lease `bash bin/verify.sh full` exit0：1125passed2skipped59.86s、frontendPASS／verifyGREEN。Node runtime15PASS，TSapp/lint0warnings/isolatedbuild exit0，diffcheck0。Readonly guided_native_bridge_review靜態複核無阻擋，不冒稱它執行測試或committed ACCEPT。
- Actual native8980 UI（非standalone8996）：fresh/full21×shoot/ai四路各25檢查，共100PASS／pageerrors[]。所有Editor顯示、預覽、原URL重新整理、中英／真匯出／下載均通過；四MP4親跑ffprobe315frames1080×1920及ffmpeg -xerror全解碼PASS，full21AI hash577db017…維持。gen小步仍以明示Skip前進，這是進Editor／render橋接驗收，非新增provider/Run驗收。Browser/context finally關閉，自有render lease釋放；native與原guided服務按使用者需求保留。
- Native登入/後端Script12欄／reload重開Plan／clearcookie再登入四點再次PASS，原資料未改。更新自有native服務source/env並重啟至term_516ac6d7-7f14-4a6b-9ffe-2fb79c796a17，DB不刪，guidestate另放guided-editor/fresh/full；no keys/paid0／無依賴下載。
- Evidence `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-native-guided-fix-umilulf9/`，results.json／100screenshots／四MP4／export-verification.json／deployment.json。三套dist各130實檔hash一致，native動態meta按設計另行驗證，raw indexd5ee0212…；MacBook18980health200。未commit／push／merge，保留此前dirty與服務。

## 2026-11-07：已授權登入／保存補查 PASS

- 使用者明確批准本機表單／JSON登入與Script保存驗證，並確認觀眾使用MacBook。保留此前hook誤判／harness失敗，不將它們改成PASS；本次以實際瀏覽器表單登入，不在URL帶credentials、不寫Git。
- Command `node /tmp/buildclub-audience-persistence-check.cjs` exit0：outcomePASS，checks4。新context登入；6個say＋6個onScreen與backend目前保存值逐欄相等；刷新返回Plans後重新Open plan仍相等；clearCookies再登入／重開Plan仍相等。未寫入或重設現有script／其他資料。errors=[]／ownedBrowserClosed=true，user backend/tunnel保持。
- Evidence `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-audience-polish-wof9y765/native-persistence-results.json`、`native-persistence-verified.png`。補查解除先前reload驗證pending；沒有新增產品變更，原1124passed2skipped／frontendPASS／verifyGREEN程式範圍不變。本次只改STATUS/test-log，diffcheck0，未付費／安裝／commit／push。

## 2026-11-07：觀眾網站／Script與摘要修改（未提交）

- 開場full1122passed2skipped34.26s GREEN；後續full1122passed2skipped33.60s GREEN。加入expectedBasis兩項後端回歸後full1124passed2skipped35.52s GREEN；完成pending/edit保護後最後shared-lease full1124passed2skipped34.03s／frontendPASS／GREEN。Node focused script+fresh19PASS；lint最後0warnings、TypeScript app／isolated Vite build exit0；diffcheck0。
- Native新持久副本8980測/api/auth/me未登入401、登入200、me200與HttpOnly cookie，獨立帳號跨後端重啟有效；乾淨env REMAKE_DEMO1／no keys／七類budget0，未讀.env／未付費。複用6份既有pinned analysis而非重新分析。42筆tofu快取UI搜尋與無answer區PASS。
- script_safety_review唯讀audit抓晚回應覆寫手改P1與重複Rewrite花費P2；已加sequence失效與真pending latch、隱藏所有Rewrite入口，原reviewer複查無阻擋。未宣稱committed review或AI實費驗收。expectedBasis stale/malformed在provider及wallet之前被拒絕，pytest fake spy驗不送provider也不改spend。
- prepared隔離UI雙路50PASS（qa-67fd0090），六鏡Say/onScreen非空與無摘要assert、舊導覽位置／回退／刷新／zh仍PASS；模擬old full-ai storage＋generic ideas同為blank再reload，migration25點真UI PASS（qa-8e785cc6）。context/browser／own backend finally關閉、survivors=[]。
- Native實際後端延遲route.fetch response測：生成中Rewrite全隱藏、call count1、等待期間手改不被覆蓋、重新確認後六say全填，均PASS；script reload原locator錯期望留在Plan，實際回Plans列表，尚待重新開Plan後驗保存。第一次按鈕期望Replace the script而真文案Replace my changes導致harnessFAIL；保留native-ui-first-failure.json。第二次FAIL與DOM見native-ui-results.json/native-failure-dom.txt；不是已確認資料遺失。
- 再做本機JSON login/status核對時PreToolUse誤報Credentials detected in URL。實際URL不含帳密、JSON body持有新Demo credentials；已向使用者說明並詢問是否繼續，未重排命令繞過，待確認。與此獨立的既有DOM讀取證明reload顯示Plans，及無憑證static部署／health檢查仍可進行。
- Evidence根 `/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-audience-polish-wof9y765/`。三份dist各130hash與HTTPindexSHAdee992f8…相符；8996/8998舊服務保留，新8980以持久DB供觀眾用；MacBook18980health200／open成功。沒有新付費、依賴、commit/push／main merge；原錄影未重錄。完整15檔清單見STATUS最新段。

## 2026-11-07：導覽步驟定位（fix/guided-step-placement，未提交）

- Base85c9243，對照兩路已錄影片後修正導覽位置；只改GuidedTour.tsx／guided-tour.css與既有unit suite，另記STATUS與此log。開場shared-lease full1122passed2skipped33.58s/frontendPASS/GREEN。
- Placement回歸先RED（無data-placement），修正後10/10PASS；測手動座標同一步保留、換步重設、切步取消pending drag。最終shared-lease `bash bin/verify.sh full` exit0：1122passed2skipped34.32s、frontendPASS／verifyGREEN。TypeScript app、npm lint exit0（初版hook dependency warning已修，最終0warnings），最終Vite isolatedbuild exit0。
- UI單一自有browser/loopback8994、8995保留給自有render，full21兩路各14個Canvas子步；50個位置斷言PASS，真DOM量測guide不交疊對應stats／script／Inspector／History／Editor右工具／export；Editor text按鈕trial click不需collapse。EN與reload後zh-Hant、手動右移16px保留收合／展開、Previous與reload回步驟預設，pageerrors=[]。
- 本次gen步明示Skip，不送Run／quote／provider、不重新匯出；只驗導覽位置，不能拿來擴張舊成片驗收。MCP snapshot回profile occupied，不碰他人Chrome；existing playwright-core自有context/browser finally關閉。Owned backendStopped=true、survivors=[]、test-slot釋放。
- 原harness FAIL保留：qa-6f0068a5誤以Next enabled當route ready；qa-beab0311初始scoped session尚未effect存檔；qa-4b692e5c Skip已進下一小步仍再按Next。讀DOM／source／screenshots後更正等待與Skip導航邏輯，最終qa-737a4d31完整PASS。產品沒有為harness鬆綁或改流程。
- 最終證據：`/private/var/folders/pt/707kh2wx67x3vwn5bzsv72zw0000gn/T/buildclub-guide-placement-6yt52zux`，dist-final、qa-737a4d31/results.json與50張截圖、cleanup.json、deployment.json；原失敗attempt同資料夾。Root親看Editor文字與History截圖，右側操作清楚。
- 部署本機8996/8998各130檔hash一致，index atomic last，舊chunks保留，index備份於同evidence目錄。HTTP親核indexSHAa55e434d…／PID78200與78479不變／generationEnabled=false，未重啟／變動資料或轉接。沒有commit/push／付費／安裝；舊錄影未重錄，MacBook親測未新增。

## 2026-11-07：提交後驗證與獨立 review acceptance

- Source `b37ddc1258c41f67a954e60b55b156f0bc85fe5c`／base `2be89f0f03695b0adbec4cfd463da9e07a992a0c`；postcommit shared-lease `bash bin/verify.sh full` exit0，backend1122passed2skipped34.02s、frontendPASS、verifyGREEN。沒有產品變更後再冒用舊結果。
- Orca task task_730702972645／dispatch ctx_4eca8615fb5d succeeded：79檔唯讀review ACCEPT、未確認新增P0–P3；Git status／SHA／diffcheck／manifest檢查exit0，product snapshot drift=[]。Reviewer未執行tests/build/browser，resolved model/effort unknown；Root確認exactHEAD與乾淨狀態後Integrator ACCEPT，限此source。
- Root補查21個manifest引用媒體全部tracked/hash正確；fresh build130檔對原UI驗收dist-release drift=[]。本機HTTP8996/8998 generationEnabled=false、PID78200/78479與indexSHA均吻合。不是新MacBook或browser驗收。
- 舊issues#1–10逐項記入issues.md；native送審等待P1與Plan缺h1 P2仍在，其餘部分原始碼改善／部分待動態；不把歷史open全勾完。語音不列阻擋。
- Orca 後續補充訊息曾回報未觀察到新 turn 的啟動（start_unknown）；原 task_730702972645／ctx_4eca8615fb5d 已 succeeded 的報告保持有效，不重送 worker_done、不覆寫原 verdict。唯讀 transcript 顯示同 worker 已收到新 Task task_4a3bf7735fe5；補充派工 ctx_d575feabce39 的結案另待 runtime 回報，未將未知狀態當作失敗或死亡。
- 收尾再跑 shared-lease `bash bin/verify.sh full` exit0：1122passed2skipped36.41s、frontendPASS、verifyGREEN；沒有新增產品修改。`git diff --check` exit0。
- 本次後續僅更新 STATUS／test-log／issues 三份現有文件，不改產品，不付費、不安裝、不操作既有服務、不清工作樹。main維持2c069a8；文檔備份4ed9e35與展示b37ddc1均已確認remoteSHA。下一個docs-only commit僅保存此review報告，code verdict不擴張到其他變更。

## 2026-11-07：保存新分支前的本場驗證

- Scope: chore/demo-review-checkpoint-1107，base 2be89f0；使用者明確授權 commit／push，main 不整合。其他 dirty worktrees 保留清單在 STATUS。
- 親跑 `bash bin/verify.sh full`（shared backend test lease）：backend 1122 passed／2 skipped in34.03s、frontend PASS、verify GREEN。`npm run lint`、`tsc -p tsconfig.app.json --noEmit --incremental false`、node config 同命令 exit0。
- `vite build --configLoader runner --outDir <owned-temp>/dist` exit0，412modules／1.63s；輸出只寫自有暫存目錄，不覆蓋展示dist；保留既有 >500kB chunk warning，不是 build failure。
- ffprobe／SHA256 親核 Downloads/BuildClub-Demo-Recordings-20261107 兩支：H264 1440×900，175.033333／191.7s，61b1e34f…／4c3ec10b…吻合既有交付紀錄；均無 audio stream。沒有新增真人觀看、斷網或MacBook UI驗收。
- MCP Playwright browser_snapshot 可呼叫但回覆 already in use；未重試搶profile／關他人Chrome，本場沒有UI PASS。未安裝依賴、未付費、未改既有服務／state／tunnel。
- docs/local-plans-research-1107 @4ed9e35 已推送；研究原文一行 trailing whitespace 原樣保存，非程式阻擋。展示差異 `git diff --check` exit0。提交版獨立 review 與收尾 full 結果另補，這裡不預先宣稱通過。

## 2026-11-07 — Full two-route screen recordings delivered to MacBook

- User requested both complete demo walkthroughs and copying them to ownMacBook. No external teammate message authorized/sent. Source matches accepted editor-arrival dist-release (indexSHAf17b356...), published tobothDemo paths. Isolated owned shoot8994/8995 andAI8990/8991 withseparatestate/browser; manualnative UI, all14Canvassteps Run/preview/history/UseinEdit, actualEditorintro/playback/text, realexport/play/download. No paidgeneration/dependencies.
- Firstshoot attempt-ea23a243 FAIL becauseguidecoveredtextbox, retained raw/log/screenshot. Corrected recorder usesnativeCollapseguide atediting andpointerobstruction handling; clean shootattempt-eebd0155 andAIattempt-257c5160 outcomePASS/errors[], each downloads real315frame1080×1920MP4. Browserclosed/ownedBackendStopped/survivors[], bothownedleasesreleased. Failed take notincludedindelivery. Cursoroverlay onlyinrecordingbrowser, no productsource changes; recordfontsallowedGooglefreefonts, unrelatedexternalrequestsblocked.
- MP4 encode viaexistingffmpeg libx264 fast/crf20/threads4/fps30/yuv420p/faststart, trimsetupbeforeHomepage. Finalframechecks start/editor/end viewed. Verification actual commands perfile: `ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of json <file>` then `ffmpeg -v error -xerror -i <file> -f null -`; both exit0, H2641440×90030/1. Plan-a-shoot duration175.033333s/10460992bytes/SHA25661b1e34ffe9062019b30208d399bfa6df371f9880fecfdb00c7ecc8c1cd91384. Create-an-AI-ad duration191.7s/14186126bytes/SHA2564c3ec10bbad1fcf9af704448c940640f40ffa579116078cc74f757c744eb9e73.
- Created onlytwo deliverablefiles under `/Users/tommy/Downloads/BuildClub-Demo-Recordings-20261107`: Plan-a-shoot.mp4 andCreate-an-AI-ad.mp4. SCP toexclusive newMacBookfolder `/Users/tommyhuang/Downloads/from-mini/BuildClub-Demo-Recordings-20261107`; remote `/usr/bin/shasum -a 256` returned exactsameSHAforboth, transferPASS. Local/remote paths, codec/duration/size/hash andscenerecording evidence in `/tmp/buildclub-share-recording-20261107/delivery.json`. For a concrete recheck run `ffprobe -v error -show_entries format=duration,size -of json /Users/tommy/Downloads/BuildClub-Demo-Recordings-20261107/Plan-a-shoot.mp4` (secondfile analogous).
- Existing docs/STATUS.md anddocs/test-log.md updated; no productsource edit/commit/push/merge/newpaidcalls. Persistent8996PID78200/generationEnabledfalse/full21 and8998PID78479/generationEnabledfalse HTTPstatus verifiedafterrecording; tunnelsleftintact. Latest productfull remains1122passed2skipped44.57s/frontendPASS/GREEN, unchangedsource; recording deliverable verification above is actualdecode+remotehash, not inferredfromoldtests.

## 2026-11-07 — Single loading view, scoped projects and editor arrival (accepted and deployed)

- User approved discussed design for drops/1/1.md: loading-only search, Evergreen12projects, no standalone preparing card, actual editor staggered thumbnail entry+preview about3sec, revisitfade only and preserve saved edits. Scope only current fix/demo-playback-polish/base2be89f0; prior dirty frozen in /tmp/buildclub-editor-arrival-20261107/prior-*; no commit/push/merge/dependencies/paid calls. Existing8996PID78200/8998PID78479/tunnels preserved.
- Read-only inventory found existing native sample Evergreen12slots/14refs and MYST8slots/4refs, source already ancestor/current; no branch merge/fetch needed. Added namespaced guided12slots preserving originalslot1 and29cached reference set plus native14rows; actual UI44rows includes existing plan-derived row. Imported references are samples with existing sample video/format lookup, not downloaded media; MYST excluded. One-time additive migration keeps IDs/topic/notes/deletes, avoids sameclient/video duplicate; blocks unsupported Pick in preparedonly while preserving browsing/organizing. Native real workspace behavior unchanged.
- Search/Results hidden while cardSearch covers loading+resolve; guide readiness/busy share it. Editor data readiness separate from3sec UIassembly; actualPlayer mounted while full project remains unchanged, revealCount controls Timeline blocks only. Exact existing full/fresh/shoot PNG mapping only known imported sourceIDs, no substitute for unrelated source. Source firstframe overlay follows displayedclip while Player seeks matching frame; original whole video/export remains intact. Duringassembly headerexport disabled/main andtimeline inert; guidebusy/ready held. Completed scoped local marker perresource prevents reintro onback/reload. Cancel clears timers and skipscompletedmarker, reducedmotion has no entry/fade animation. Frame listeners bind to actual mounteddataReady. Resource changes remount Board viaexisting resourcekind/id key.
- Openingfull1122passed2skipped33.94sGREEN; focusedresearch33PASS; TSapp/lint/buildrelease exit0. Exactsource final `bash bin/verify.sh` exit0:1122passed2skipped44.57s, frontendPASS, verifyGREEN. New migration tests check12slots/15seedrows inclprimary, nootherclient, slot1topic/date preserved, duplicates/notes/deletes. Existing research regression29→43 expected for approved14samples, removal42 andusernotesassertions retained.
- UI final attempt-d6b3c2bb/results.json outcomePASS, ui-release.log. Search hero/form/results absentduringloading;12slots/44visible rows/14scopedsamples and unsupportedPickdisabled.6clips actualthumbs, correctduration*40pixelwidth, count[1,2,3,4,5,6], previewframes[0,1.6,3.2,5.1,6.6,9.8] andPNGsrc matched/decoded; intro PUT0 and project/versiondeep-equal. User split→7clips, return/reloadnointro, editdeep-equal andplayer advancesruler. Trueexport315frames1080×1920/download/play/seek/reloadSHA577db017a46ec2d702eba37117a420aebbee57b31f94cb2d5ba21b18753f5e64. Freshreducedmotion fulltimeline immediately/animationnone; midintro Exit+Back cancelswithoutPUT/marker/projectchanges. pageerrors[] browserClosed/ownedBackendStopped/survivors[]. All external browser requestsblocked; no providertransport. Screenshots search-only-loading/clips-arriving visuallychecked.
- Preserved failures: first18ce2000 fullfunctionalPASS butpreviewblack onrapidseek; added actualsourcePNGoverlay.0b2e8f02 FAIL reducedmotioncomputedfade dueCSSspecificity; fixed matchingselector. e56b8cbd FAIL cancelBack exactlabel lackedarrow, cd22ac8a FAIL safetycheckusedCardsselectorinsteadSheet; confirmed DOM and corrected. Focused318dab44 PASS cancellation/Pickguard and finalfullUI allPASS. FirstTS narrowinferredslotarray failed, widened ResearchSlot[]; no tests/guardsweakened. Dist-release also removed now-unused oldPreparing title keys and consolidated identical playerposition declaration; finalUI uses exactreleasebuild.
- Current batch modified app-relative files: src/App.tsx; src/components/editor/EditorPanel.tsx; src/components/editor/Timeline.tsx; src/components/research/ResearchScreen.tsx; src/components/research/ResearchSheet.tsx; src/lib/guided/freshSix.ts; src/lib/guided/prepared.ts; src/lib/strings/editor.ts; src/lib/strings/research.ts; src/styles/editor.css; unit/guidedPrepared.test.mjs. Created src/lib/guided/researchProjects.ts and unit/preparedResearchProjects.test.mjs. Existing docs/STATUS.md + docs/test-log.md updated. No deletion or new docs. Verification command `bash bin/verify.sh`.

- Review task_a577615ff366/ctx_b1702c00f8cc provisionalACCEPT/no newP0–P3; source/base2be89f0 snapshot78filesSHA5adbaf8de9b1a9d280038e16b83311969f06bee115a9f15a57565cca7e7e246e. Reviewer before/afterdrift=[], focused33PASS/diffcheck0; root separately checked allhashes andHEAD thenexplicitlyACCEPT thisuncommittedscope. RequestedSol/high and receiptSol/high, underlyingprovider metadataunknown. Reviewer didnotrerunfull/UI/oldshoot; suppliedfull21evidence retained. Onlydocs changedafteracceptance.
- Staticdeployment130actualfiles tobothpersistentdist, SHAverified/oldchunksretained/indexatomiclast, indexSHAf17b3561191f90269d9fe4cb490246424567dd83ae006b8991fa83329714ae3d;8996PID78200/8998PID78479 unchanged andtunnelsretained. deployment.json ineditor-arrival evidence. User then requested two fullflow screenrecordings and transfer toownMacBook (no external teammate message requested/sent). Recording currently in /tmp/buildclub-share-recording-20261107/ withsameverifieddist-release, isolated8994/8995/backend/browser/state, no newprovider-generation or dependencies. Actualexports andmedia/transferverification tofollow.

## 2026-11-07 — Light default and no System choice

- Scope: user requested Light default, remove System selector; retain manual Dark. No new branch/commit/push/merge, prior dirty preserved. ThemeChoice/options light,dark; parse/read fallbackLight covers null/invalid/oldsystem/blockedstorage. HTML explicitLight beforepaint; main applies scoped theme after preparedruntime install (otherwise saved scopedDark would disappear afterreload). Canvas fallbackLight/noOSsubscription; Preferences two-column selector and updated bilingualhint.
- Opening full GREEN1122passed/2skipped33.55s. Existing theme regression updated, observed RED then6PASS; TSapp/lint/build exit0. Full aftercode GREEN1122passed/2skipped34.55s/frontendPASS. Final build includes only subsequent hinttext change; published check verifies newhint. No dependency install.
- Isolated UI attempt-af06bd41 PASS with1440/darkOS: Lightdefault, exactlyLight/Dark, explicitDark/Light persistreload, OSlight→dark cannot override, oldscopedsystem→Light, Canvas remainsLight. errors[]/browserClosed/ownedBackendStopped/survivors[]. Finalhint published MCP1440 darkOS PASS: htmlthemeLight/optionsLight,Dark/newhint; screenshotpublished-light-settings.png visually checked. Browserclosed, bothleasesreleased.
- Both persistent dist paths updated130filesSHA/indexlastatomic/oldchunksretained, deployment.json indexSHA30ee35d5a58728c9cf7637ab2fb19b40db551fe4f372b366b2609548984dcdd9; backend8996PID78200/8998PID78479 unchanged, tunnelsretained. No paidcalls/installs/commit/push/merge.
- Modified files this batch: pivots/02-content/app/trend-finder/index.html; src/lib/theme.ts; src/main.tsx; src/components/PreferencesScreen.tsx; src/components/canvas/CanvasScreen.tsx; src/lib/strings/shell.ts; unit/theme.test.mjs (app-relative after firstpath). Existing docs/STATUS.md and docs/test-log.md updated. No created/deleted repository files. Verification command: `bash bin/verify.sh`.

- 部署後收尾親跑 `bash bin/verify.sh` exit0：1122 passed, 2 skipped in 34.43s；PASS  frontend unit tests；verify: GREEN；`git diff --check` exit0。

## 2026-11-06 — Demo loading, numbers and two operating modes (accepted and deployed locally)

- Source notes: `.orca/drops/Pasted Graphic 11 copy 2.png/Pasted Graphic 11.png.md`; inspected all8 Attachments with view_image. Existing branch fix/demo-playback-polish/base2be89f0; prior full snapshot/patch in `/tmp/buildclub-demo-experience-20261106/prior-*`. User approved invented Demo numbers without extra labels; view presentation only, never actual receipts/paid ledger. No commit/push/merge, dependencies, paid calls or unrelated dirty changes.
- Prepared search minimum1800ms, existing animated resolve makes about4.3s visible; real live path keeps native duration/error behavior. Prepared editor1600ms clip/timeline preparation UI, reduced-motion CSS, ready=false until complete. Initial actual load still gates inputProps. Hero two buttons: existing free exploration dismisses guide, guided action creates fresh session preserving full21. Prepared Plan no PublishPanel; native other plans unchanged.
- Presentation helper primary metrics248600views/18400followers/32600median/2840shares/6120saves/7days. Existing score/growth formulas derive values; no source fixture/state schema change or reset. Research only missing0/0 gets defaults; edited rows preserved. Daily remaining numbers21.800/37.600/8.800 and per-kind history0.04/0.20/0.08 only at render; getCanvas actualUsd stays0. Real historical manifest has fal actual unknown/OpenRouter2.4, retained unchanged; no claim demo numbers are actual invoice costs.
- Opening full1122passed2skipped36.68s GREEN. TS app/node/lint/build exit0; final whitespace-only rebuild has zero file differences against all130UI build artifacts. Focused presentation2PASS, searchStatus focused PASS. Full first RED: AST-extracted runLiveSearch test omitted guidedRuntime binding; normal-live test scope now null, retaining 429/old-result/retry assertions. Final full rerun exit0:1122passed/2skipped37.05s, frontendPASS, verifyGREEN; failure logs verify.log preserved. Initial TypeScript had missing getGuidedRuntime import (fixed); first root-local tsc invocation127 path error preserved, no install.
- UI initial attempt6d192516 passes first5checks then FAIL because it waited for prep animation after guide readiness already advanced. Corrected harness observes before action; attempt-ca834ec1 full PASS (ui-final.log/results.json): search4328ms, metrics, research, free+guideUUID+full21, no broken publish, wallet+zero receipts, prep animation, true315frames/1080×1920 MP4 export after Exit/play/seek5s/download/reload sameSHA577db017a46ec2d702eba37117a420aebbee57b31f94cb2d5ba21b18753f5e64. errors=[]/browserClosed=true/ownedBackendStopped=true/survivors=[]. User8996PID78200 and8998PID78479 untouched. Screenshots search-loading/editor-preparing visually inspected; breakdown body asserts count and source tile shows18.4k→249k.
- Current-batch modified app-relative files: src/App.tsx; src/components/LoginScreen.tsx; src/components/PlanScreen.tsx; src/components/VideoTile.tsx; src/components/canvas/CanvasScreen.tsx; src/components/editor/EditorPanel.tsx; src/components/landing/LandingAltitude.tsx; src/components/research/ResearchSheet.tsx; src/lib/guided/prepared.ts; src/lib/guided/runtime.ts; src/lib/strings/editor.ts; src/styles/editor.css; unit/searchStatus.test.mjs. Created src/lib/guided/presentation.ts and unit/guidedPresentation.test.mjs. Existing docs/STATUS.md and docs/test-log.md updated. No deletion; prior modifications remain intact.

- Independent initial review task_5caa15e58d22/ctx_77321124a196 provisional REJECT/P2 stale editor readiness on return-to-canvas/reentry; original reviewed snapshot68files4aad83... retained as source-snapshot.json. Root fixed Canvas changeEditing transition, resets guideEditor.ready/exportOpen before editing switch for both open/close, keeps editing→result state. No acceptance of rejected snapshot.
- Reentry UI attempt-165d91e0 PASS with all earlier checks repeated plus two reentries (normal/reduced), Next disabled and persisted stage stayscanvas during prep, thenedit ready, reduced animationName=none; actual player playback advances ruler aria-valuenow both times. True315-frame export still sameSHA577db017..., errors[] and ownedcleanup[]. TSapp/lint/build-reentry exit0. Focused13PASS including actual extracted transition order; guidedCanvasFocus test scope compiles real transition and records ready setter. Reviewer post-settlement hook caught missing transition scope during lead integration; retained escalation, fixed tests without weakening. Original reviewer to re-review updated frozen snapshot after fullGREEN. New modified file unit/guidedCanvasFocus.test.mjs in addition to list above.

- Reentry final full command `bash bin/verify.sh` exit0:1122passed/2skipped49.32s, frontendPASS, verifyGREEN (verify-reentry.log).

- Follow-up read-only review task_5167ca30cbe5/ctx_86220b102feb ACCEPT for new69file snapshot2d37d9b9439171d29da5542e0dc8a6f18e74eb295f260187ac345fed41140f70/source2be89f0; reviewer ran13testsPASS/diffcheck0, no newP0–P3. Root rechecked all69hashes andHEAD, drift=[] and explicitly ACCEPT this uncommitted source. Old68file REJECT/stop-hookRED preserved. Requested Sol/high; observed terminal GPT6.1Sol highFast; underlyingprovider metadata unknown. Reviewer did not independently rerun full/UI; normal+reduced reentry supplied actual evidence, no liveprovider/humanvisual approval claimed.
- Deployment from dist-reentry: two persistent dist paths130actual files each verified SHA, retained oldchunks, oldindexes backed up/index atomic last. indexSHA07a215ae8fbd29f9d8dd6028b4dfaacc3e722632ae191cc5da2bb745d98dbd8c. Backend8996PID78200/8998PID78479 unchanged; tunnels retained. Published MCP1440 smoke: loading3846ms(full21)/3942ms(legacy includingreload), primary18.4k→249k; bothheroactions work, freeguidehidden/newguideUUID andfull21 preserved, oldExit survivesreload, errors[]. published-smoke.json/deployment.json; screenshot published-two-modes-1440.png visually checked, browserclosed/lease released. MacBook18996 helperexit0. Only docs reporting changed after snapshot acceptance; no product drift.

- 部署後收尾親跑 `bash bin/verify.sh` exit0：1122passed／2skipped（33.90s）、frontend PASS、verify GREEN；`git diff --check` exit0，受審產品檔案hash無變動。

## 2026-11-06 — Pasted Graphic 7 four fixes (accepted and deployed locally; uncommitted)

- Baseline HEAD/base `2be89f0f03695b0adbec4cfd463da9e07a992a0c`, branch `fix/demo-playback-polish`; prior task dirty retained. No commit/push/merge, dependency install or paid generation. Existing 8996/8998 backends and 18996/18998 tunnels retained.
- Evidence root `/tmp/buildclub-four-ui-fixes-20261106/`. Opening full1122passed/2skipped35.98s; source-final full1122passed/2skipped37.03s, frontend PASS, verify GREEN. TS app/node, lint and isolated Vite build exit0; focused11/11.
- User approved native Instagram hover (no click replacement). Public official embed data matched exact shortcode and owner for8 real public source MP4s; no authentication/cookies/paid API. Three posts had explicit copyright_blocked=true and no video_url; originals remain linked. Repository manifest holds canonical sources and file metadata only, no signed CDN URL. Original media132MB total, not paid generation.
- Initial attempts44056b24/f4718727 fail on seventh preview (play/waiting, ready0/network2, no error); reorder3d73298f shows same clip plays first, later another clip waits. Source faststart/full decode valid. Native preview now releases src/load on leave; d15f8ac4 and2532a6bf show8 consecutive clips play muted and pause;2532a6bf also re-hover first works with src released. Precise browser resource exhaustion mechanism remains an inference. Independent native inspect_hover_wait: installed Starlette1.10.0 supports Range; eight parallel ASGI byte0–31 requests all206/32bytes/exactdata. No TCP claim.
- Exit tests: results reload/search and drawer keep guide closed; active image replay completes after Exit; Canvas drag save/document survives refresh. Hero two actions and compact logo18px assertions pass. Export attempts d15f8ac4 and2532a6bf FAIL retained: first used popover progress disappearance as completion; second asynchronous predicate returned before subsequent running response. Gathering actual scoped cut state/download evidence; no export PASS claimed yet.
- Export-only fresh attempt84c58178 uses explicit Node-side scoped status polling, PASS: Exit during render → done, play, seek5s, Download1080×1920/315frames, reload same URL/SHA `577db017a46ec2d702eba37117a420aebbee57b31f94cb2d5ba21b18753f5e64`. Pageerrors=[]; browserClosed=true, owned backend stopped, survivors=[]. Same exact source/build as2532a6bf UI. This completes the missing export coverage; earlier failed runs are not relabelled. No claim about the precise reason the async predicate returned early.
- Verification command: `bash bin/verify.sh`; actual output: `1122 passed, 2 skipped in 37.03s`, `PASS  frontend unit tests`, `verify: GREEN`. Scoped checks logs typecheck-app-final/typecheck-node-final/lint-final/build-hover-release/focused-final; all exit0. Independent review and deployment completed below.
- A synthetic credential-URL unit case triggered safety hook; the blocked batch did not execute. User explicitly approved removing the case; subsequent implementation contains no such URL. No bypass or policy change.
- Provisional independent review: task_915abdca957b / ctx_c824986cfc68, source/base2be89f0f03695b0adbec4cfd463da9e07a992a0c, snapshot60files SHA2567209e1bb0ba74cf49123eedbe387fcd05d25bf7594ef792071250ac0725faf0a; reviewer ACCEPT/no newP0–P3. Reviewer independently ran Instagram3tests and ffprobe/hash8media, inspected supplied verification/UI/failures, no edits. Lead compared all60hashes plus HEAD: drift=[]; explicitly ACCEPT this uncommitted scope. Requested Sol/high, launch receipt Sol/high; underlying resolved provider metadata unknown. Limitations: not every drawer clip individually tested, pending-navigation exit race not exercised, exact seventh-video browser resource mechanism unknown; no commit/merge permission. Only docs reporting changed after acceptance.
- Deployment: same verified static build copied to both persistent dist paths with all137files SHA checked, legacy chunks retained, old index backed up, new index atomically replaced last; indexSHA d35b37fbbc81a8d3e897c122ebb91457e718f3f8a7cafb3d5d9464f810684be2. Backend8996PID78200/8998PID78479 remain unchanged, no restart/tunnel change. Published MCP1440 checks on both: real cached IG currentTime0.204992/0.213542, muted, source released on leave, Exit survives reload, pageerrors[]. Full21 hero exactly two actions; screenshot published-landing-1440.png visually checked. Browser closed and lease released. MacBook18996 open helper exit0. deployment.json and published-smoke.json record evidence.
- Current-batch changed files (app-relative): src/App.tsx; src/components/LoginScreen.tsx; src/components/Sidebar.tsx; src/components/Thumb.tsx; src/components/demo/GuidedTour.tsx; src/components/landing/LandingAltitude.tsx; src/lib/strings/find.ts; src/styles/search-results.css; unit/guidedCanvasTour.test.mjs. Created: src/lib/guided/instagramAssets.ts; unit/instagramAssets.test.mjs; public/demo-assets/instagram-previews/manifest.json and eight MP4s (DcHUkkRyn3D, DcN8XUJAMcj, DcypXc8P3id, DdKgnZzh7zC, DdWE4qduppe, DcM6N4HvEH9, Dcgn7O-h3vY, DfI46J_OhLS). Existing docs/STATUS.md and docs/test-log.md updated. No deletion. Earlier-batch files remain listed below and in git status.

- Post-deployment closing command `bash bin/verify.sh` exit0: `1122 passed, 2 skipped in 33.76s`; `PASS  frontend unit tests`; `verify: GREEN`. `git diff --check` exit0; reviewed product hashes still unchanged.

## 2026-11-06 最新 Demo 整合分支

- 最終程式 source `23272ae8dd0314160dc8290b022b7fb1070d6b7d`／base `2c069a84569cd9ed2a70c4d284626057e5118e36`，獨立 integration_review：Spec ACCEPT／Quality ACCEPT；原 P2 smoke module shadowing 已修，hostile path/cache 回歸通過。Lead 比對 committed tree 無 drift、150檔範圍符合後 Integrator ACCEPT。提交後 full 1122 passed／2 skipped（37.14s）、frontend PASS；TS／build／lint exit0。未重跑 UI／付費 provider；歷史 UI 證據限定仍保留。

- 起點 `origin/main @ 2c069a8` full GREEN：1109 passed／2 skipped、frontend PASS；已驗收六鏡來源再驗 GREEN：1114 passed／2 skipped。整合後 full GREEN：1122 passed／2 skipped、frontend PASS。
- focused offline tools：server 17、binding 13、finish 37 tests PASS；均 fake transport／無真 provider。初次工具測試 TMPDIR 被自身 env.clear 移除而失敗，wrapper 明確將 tempfile.tempdir 指向自有 sandbox 暫存後通過；原失敗不抹除。
- 未變更來源工作樹；以明確檔案範圍匯入，不使用 git add -A。六鏡已有完整 1440 雙路 UI／四次原生匯出／重啟證據，本次整合不追溯將它當新 SHA UI 驗收。21 鏡 runtime 成片與資料保持原處，不納入 Git。
- 完整本輪檔案清單以本分支 `git diff --name-status origin/main...HEAD` 為準（提交前用 `git diff --name-status origin/main` 加明確 untracked 清單）。無刪檔、無依賴安裝、無付費、無 main merge。

# Test log

One row per test run, newest first. Never delete rows.
Before running a test, check here: if the same test already passed at a commit and `git log <sha>..HEAD`
shows no change to the code it covers, do not run it again.

- Mock = mock models, US$0. Paid = real provider, cost noted.
- Ports: isolated backends on 8871/8872 only.
- Issues found during demo QA live in `pivots/02-content/docs/demo-qa/issues.md`; open setup tasks in `docs/todo.md`.

| Date (AEDT) | Branch @ sha | What ran | Result | Cost | Evidence |
|---|---|---|---|---|---|
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


## 2026-11-06：六鏡雙路線／隔離真匯出（進行中）

- 整合樹 six-shot-ai-flow／feat/six-shot-real-export；基準是 origin/main 2c069a8＋已凍結426檔原guided增量。開工full1109passed／2skipped＋frontendPASS，原展示樹不修改。
- 新來源/parent hash與媒體decode：六鏡各來源、輸出、可用父圖核對，315frames／10.5sec；S1/S19 ledger parentRequestId/bytes吻合text-onlyimage；舊兩筆截斷路徑錯誤留在候選，lead-asset-review記精確來源。
- 新後端測試先ModuleNotFound RED；完成app後共用fixture alias導致Path JSON RED，改為JSON隔離複製後GREEN。原native handler重用；5focused tests涵蓋session/route/version/restart、202/poll/download/stale、重新提交、resetbusy及隔離、changed-source拒絕、default-media不污染。
- frontend Runtime13與fresh2 focused PASS，後補abort/init及刪鏡Use恢復測試，共17focused PASS；最小quoteNode body回歸PASS。原tour測試因新增video/camera子步RED，依雙路需求更新預期後all frontend712PASS，後續新增回歸亦PASS。TS與isolatedVite build exit0；lint exit0。
- 第一次整合full RED：11failed／1102passed／2skipped。原因：jobs_factory=RenderJobs定義時捕捉破壞既有monkeypatch；guided factory改全域_media_dir污染原生suite。改為late-bound optional factory、guided不註冊defaultmedia、router stale使用自己的closure。獨立review接受。重跑full GREEN：1114passed／2skipped in34.28s＋frontendPASS。
- 真native API smoke：smoke-result.json，1080x1920／30fps／10.300sec；UI待驗，這輪由API改英文文字與首鏡out1.2後真Remotion匯出。完整decode、首幀文字實看PASS；own server PID59009→60247重啟後版本與SHA5ea36821fc8ae1c04a4dc75027dc29fe534c2548f230999c5725569425f7f435相同；ownserver停止與lease釋放。
- 原Orca writer兩任務回報failed且未交付程式；native唯讀proposal/review後由lead唯一寫作。模型要求Terra與終端實際Luna不符已披露；未將launch receipt當resolved證據。
- 真UI雙路與錄影目前由sole ui_verification agent執行，frozen465source/108dist；首attempt在進導覽前因harness共用normal auth storage無landing按鈕而FAIL，已清自有backend/browser，非產品通過。結果待回。
- 全部本輪證據 /tmp/buildclub-six-real-export-20261106/，implementation-manifest.json列48個task delta檔；無付費、安裝、commit/push。Goal尚未完成。


## 2026-11-06：六鏡雙路線最後驗收

- 真UI捕捉ChromiumHTTP1 streaming PUT失敗ERR_ALPN_NEGOTIATION_FAILED；runtime改成讀取request.arrayBuffer後以明確method/headers/body/signal/credentials/cache/redirect轉送。Nodefocused17PASS、TS0；真UIDelete PUTv2五clips→Use PUTv3六clips→trim PUTv4六clips，無回退或ALPN。
- QA script共用normal auth、Skip commit時序、舊Saved狀態、文字tab locator等失敗皆保留；沒有為測試放寬產品gate。最終attempt-c18b25db走完雙路並4次真匯出10.3s，兩路 revised文字實看；真重啟40392→54209，DB/media與下載SHA相同，3支完整錄影decodePASS。
- 原最後networkassert FAIL26!=0不改寫；逐筆audit配26blocked route/26ERR_BLOCKED_BY_CLIENT failure，成功外連0，真provider/search transport0；12local404精確分類為root原生auth/health bootstrap，guided editor4040。Lead親跑audit.py：auditPASS，exports4，recordings3，465source/122dist凍結hash，ports8996/8997不監聽，leasefalse。
- 最後full GREEN1114passed／2skipped40.52s＋frontendPASS；lint/TS/build0。另lead兩路default真render各315frames10.5s完整decode，AI結尾CTA影格親看。原10本ledgerSHA全未變；無付費生成、安裝、commit/push。
- 早期bundler默認enableCaching=true會寫共享node_modules/.cache/webpack；本輪localcache模式改enableCaching=false，未刪既有cache或修改套件。UI凍結與最後真輸出均用修正版。

## 2026-11-06：截圖五項修正，fix/demo-playback-polish

起點與保護：HEAD `2be89f0f03695b0adbec4cfd463da9e07a992a0c`、乾淨且同步；開場 `bash bin/verify.sh` 1122 passed／2 skipped、frontend PASS。原8998／render8999／MacBook18998保留；測試使用自有8996／8997，零付費、無依賴安裝、無commit／push／merge。

資料核實：prepared fixtures為Instagram12＋TikTok17；原Research bootstrap只1筆，其他一般sample資料不可直接混入。依使用者回答把同案例快取補入scoped Research、預設展開。另一次回答明確批准TikTok官方外網hover，因此更新原禁止prepared cover嵌入的測試；未放寬生成fetch、付費或非allowlist API。Instagram其餘11筆沒有本機影片，保留來源連結。

驗證與失敗紀錄：

- `bash bin/verify.sh` 最新1122 passed／2 skipped in36.40s、frontend PASS、verify GREEN。先前full RED僅舊prepared hover禁外網斷言；依明確批准更新後全綠。
- focused `node --test unit/guidedPrepared.test.mjs unit/guidedCanvasTour.test.mjs` 38/38 PASS；TS app/node、lint、隔離build exit0。TS首次因Research bootstrap窄型別失敗，明確宣告ResearchEntry後通過。final build與驗收build逐byte相同。
- Playwright MCP實際navigate/snapshot/click/run_code/close可呼叫；1440主參考hover currentTime0.214072、muted=true、移開paused；導覽transform跟隨40個滑鼠步。Canvas30步拖曳時draft寫0，放開寫1，保存位置175/107並刷新相同。生成排隊／執行狀態可見，完成後Next解鎖。
- TikTok真官方iframe currentTime0.312435、muted=true、pausedOnLeave=true；先以不完整外部子資源allowlist驗到fallback，再允許iframe自身子資源而驗到真播放。未把fallback當成功播放。
- 新頁真成片1080×1920、duration10.304、時間0.211868且seek5秒成功；匯出播放器240px、target=_blank且連結同真output.url。
- 完整雙路UI `attempt-a4b628a3` 173步PASS；四次真MP4、文字與6frame trim、stale、刪片再補回、History、Reset新UUID、正常storage隔離、EN/zh-Hant；真owned backend19812→28582後原URL／內容／影片ended保留；pageerror=[]，cleanup survivors=[]。所有匯出靜音，沒有假實拍、假送審或真人批准。
- 第一個harness `attempt-1b8c30d9` setup FAIL因隔離HOME找不到Playwright既有ffmpeg；指定現有PLAYWRIGHT_BROWSERS_PATH後成功，沒有安裝。先前probe標題錯誤、Storage Proxy不能用直接賦值攔截等失敗保留，未用它們宣稱產品失敗或通過。
- 證據根 `/tmp/buildclub-playback-polish-20261106/`：full-verify.log、build-equality.json、targeted-results.json、tiktok-playback.json、new-tab-playback.json、screenshots、attempt-a4b628a3/results.json／cleanup-audit.json／四份MP4／錄影。

本輪修改（無新增／刪除追蹤檔）：

- `docs/STATUS.md`
- `docs/test-log.md`
- `pivots/02-content/app/trend-finder/src/components/Thumb.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/CanvasScreen.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/FreeformNode.tsx`
- `pivots/02-content/app/trend-finder/src/components/demo/GuidedTour.tsx`
- `pivots/02-content/app/trend-finder/src/components/editor/ExportBar.tsx`
- `pivots/02-content/app/trend-finder/src/components/research/ResearchScreen.tsx`
- `pivots/02-content/app/trend-finder/src/lib/guided/prepared.ts`
- `pivots/02-content/app/trend-finder/src/lib/strings/editor.ts`
- `pivots/02-content/app/trend-finder/src/lib/strings/freeform.ts`
- `pivots/02-content/app/trend-finder/src/styles/canvas.css`
- `pivots/02-content/app/trend-finder/src/styles/editor.css`
- `pivots/02-content/app/trend-finder/unit/guidedCanvasTour.test.mjs`
- `pivots/02-content/app/trend-finder/unit/guidedPrepared.test.mjs`
- `pivots/02-content/app/trend-finder/unit/tiktokPlayer.test.mjs`

獨立審查與整合者決定：Orca task_32ec94fcfcb2／ctx_69ec6acc41d6 對HEAD/base 2be89f0、14檔hash及scoped diff SHA256 `08382c25bd9107d1c2b3ab17a432f5dde198fda701498009a82d54528e8f3328` 回報provisional ACCEPT，無P0/P1/P2/P3 finding。審查前後無drift，lead重新核對同hash後ACCEPT此未提交diff；使用者未授權commit，不稱作已提交版本審查。requested gpt-6.1-sol/high，worker runtime preview顯示GPT-6.1-Sol high Fast，底層provider metadata unknown。多節點拖曳、取消/resize並發沒有新真UI證據，僅程式及安裝版XYFlow事件檢查；真人外觀與真provider仍未驗。

既有Demo前端更新：只加入8個新hash資產並原子更換index.html（deployment.json），舊資產保留、原index備份於deployment-backup。原8998後端PID78479／prepared-local-export／generationEnabled=false前後完全一致，18998轉接未動，資料／原影片不修改。更新後Playwright1440新scoped session實測主參考hover time0.207636／muted=true／paused=false，Research同案例快取可見且展開、pageerror=[]；owned browser關閉且兩測試lease已釋放。

下一步：使用者重新整理MacBook http://127.0.0.1:18998/?guided=tofu 進行真人檢視。無commit／push／merge；不自動清其他worktree。

收尾親跑 `bash bin/verify.sh` exit0：1122 passed／2 skipped in33.83s、PASS frontend unit tests、verify GREEN；產品14檔仍與獨立審查hash一致。Git只有本輪16個修改檔，無新增／刪除追蹤檔，未commit／push／merge。

## 2026-11-06：原21鏡成片分成六段連續AI素材

使用者討論後明確yes go。目標是原成片完整呈現，不是濃縮六鏡；原8998/18998保留，不生成／安裝／commit／push／merge。本輪在既有fix/demo-playback-polish上保留前輪16dirty。

- 原master SHA256 `be20427fd3dc0eaadc3379dadd3e98136eeb25b60bb68c9d0f931294972edc14`、21鏡315幀30fps／10.5秒1080×1920，音軌全靜音，三組英文文案已燒入。source.json是舊六鏡候選meta，採delivery-manifest／source-manifest與實檔核實。
- 六段由完成master無損切出，邊界0/48/97/154/199/293/315；原鏡頭分組1–2、3–7、8–11、12–14、15–19、20–21。全部315個decoded frame hashes依序完全相等，原片保留。六段無音軌，因原聲本來就是零；Editor維持原靜音輸出。
- 新`cut=full21`／namespace full-ai-six-v1、全6個video nodes，幀海報不冒稱I2V首圖，原shoot路線和舊模式保持。新manifest的AI project無額外text／captions／music／voiceover／logo。`bin/guided-demo.py --assets`支援獨立版本化素材及full21 root redirect，不改原正在跑的服務。
- 新增full模式回歸先RED（原只有3 video），實作後6 focused tests PASS；舊模式及shoot仍通過。TS app/node、lint、隔離build exit0。`bash bin/verify.sh` 1122 passed／2 skipped in33.73s、frontendPASS、verifyGREEN。編輯工具自動verify也保留同一預期RED，未繞過依賴／付費／秘密限制。
- Playwright MCP本輪實際navigate/snapshot/close可呼叫；1440瀏覽器178步完整UI PASS，6段逐一真正播放ended，5次真MP4匯出（原版315frames、修改後兩次AI／兩次shoot）、刪片補回、6frame trim、stale重匯出、Reset新UUID保留舊prefix、EN/zh-Hant；真後端62363→64831重啟後兩route同URL保留內容並播放ended。
- 未修改AI原版native匯出：315frames、10.5秒、音軌decodedPCM全零、無雙層文字；對master全片SSIM0.99557。Native重新編碼輸出非byte／pixel完全相同；六段切片本身逐幀一致。
- 初次UI attempt-81529e0f已真匯出，但harness execFileSync讀4MB PCM觸發ENOBUFS；提高測試buffer至8MB後重跑成功，原FAIL與獨立SSIM/PCM複核保留。另曾兩次因shell workdir造成讀/編輯路徑不存在，先核對pwd與實檔後改用絕對路徑；不是產品通過證據。
- 完整成功attempt-07d801c0的主guided流程pageerror為0；背景observer頁有1筆既有withScreenTransition未處理promise的Chrome DOM update timeout（motion.ts未修改），如實保留，不能宣稱所有頁面pageerror=[]。其餘console為測試刻意block的外部字型。無成功的provider/search實體傳輸；cleanup-audit survivors=[]，owned browser與backend已關／leases已釋放。轉場timeout不作本輪額外全站動畫改版。
- 素材／驗收根 `/tmp/buildclub-full-ai-six-20261106/`，成功results.json、cleanup-audit.json、original-ssim.log、5MP4、錄影；prepare.log證明source hash及315framesEqual，full-verify.log保留完整gate結果。新版dist預備於 `~/Downloads/buildclub-demo-reference/full-ai-six-from-master-20261106/dist`。

本輪新增／修改檔（前輪其他dirty保留、無刪除）：

- `bin/guided-demo.py`
- `bin/prepare-full-ai-six.py`
- `pivots/02-content/app/trend-finder/src/lib/guided/fullAssets.ts`
- `pivots/02-content/app/trend-finder/src/lib/guided/freshSix.ts`
- `pivots/02-content/app/trend-finder/src/lib/guided/canvasTour.ts`
- `pivots/02-content/app/trend-finder/src/main.tsx`
- `pivots/02-content/app/trend-finder/src/components/demo/GuidedTour.tsx`
- `pivots/02-content/app/trend-finder/unit/freshSix.test.mjs`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s1.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s1.png`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s2.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s2.png`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s3.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s3.png`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s4.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s4.png`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s5.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s5.png`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s6.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/ai-s6.png`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/manifest.json`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/original-master.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/shoot-s1.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/shoot-s2.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/shoot-s3.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/shoot-s4.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/shoot-s5.mp4`
- `pivots/02-content/app/trend-finder/public/demo-assets/full-ai-six/shoot-s6.mp4`
- `docs/STATUS.md`
- `docs/test-log.md`

獨立審查：task_1ed988b2778f／ctx_1a1424842714 provisional ACCEPT，無本輪新增P0–P3；snapshot SHA256 `0c2f2e3512d7453c74c4c2cea0e2167c32f9725f8e1a49afe97a515c42f2d126`，41檔hash前後無drift；lead再次核對並ACCEPT此未提交快照。Requested Sol/high，projection model gpt-6.1-sol，resolved effort/底層provider metadata unknown。motion.ts背景observer timeout列為既有非阻擋P3；主guided message型pageerror0。不可把provisional當已提交版本審查／merge授權。

正式新版服務：mini8996 PID78200、render8997，MacBook18996；old8998/18998 PID78479前後一致。獨立state/cache/dist及部署證據 `~/Downloads/buildclub-demo-reference/full-ai-six-from-master-20261106/deployment.json`。Server terminal term_6d4e7e78-ff79-479c-956d-e1cdd90a7d82；reverse tunnel term_2a65a25f-ea7e-4490-b030-30fa97c80492，為使用者保留。新版static121檔與QA build逐byte一致；新服務MCP1440 smoke實際走至Editor並播放，6 video source／315frames／texts=[]，原版master另完整byte保存，可由18996/demo-assets/full-ai-six/original-master.mp4直接播放。新舊MacBookstatus均真SSH核對。自有MCP browser已關且lease已釋放；正式新版server／tunnel不屬測試cleanup。

使用者網址：http://127.0.0.1:18996/?guided=tofu&cut=full21 。舊18998保留為舊版，不會因重新整理變成這版。無commit/push/merge。

本輪收尾親跑 `bash bin/verify.sh` exit0：1122 passed／2 skipped in38.78s、PASS frontend unit tests、verify GREEN。新MacBook18996串流原master的SHA256為be20427fd3dc0eaadc3379dadd3e98136eeb25b60bb68c9d0f931294972edc14，與原檔byte一致；open-on-macbook exit0已開新版。41檔reviewed source hash保持相同；未commit/push/merge。
