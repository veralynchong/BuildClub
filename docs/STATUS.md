# STATUS

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
