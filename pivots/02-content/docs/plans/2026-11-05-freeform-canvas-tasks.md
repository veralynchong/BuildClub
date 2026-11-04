# 空白自由畫布 Tasks 與驗收

日期：2026-11-05 Sydney。計畫：`2026-11-05-freeform-canvas-plan.md`。T1 完成後由 lead 依實際程式固定新增檔名及共享契約，再開始 writer；不得由兩位 writer 猜不同 API。

| ID | 工作、檔案範圍與相依 | 可觀察驗收與驗證 |
|---|---|---|
| T0 | Lead 建立 origin/main 整合分支、安全離線 gate、本機 Plan／Status／Tasks | `bash bin/verify.sh full` 全綠；確認不載入 dotenv；git diff 只有安全入口與任務文件；既有依賴 symlink 不提交 |
| T1 | 唯讀探索：`backend/{canvas,generations,agent,editing,takes,server}.py`、`src/App.tsx`、`src/lib/canvas/`、`src/components/{canvas,editor}/` | 回報具體 file:line、空白畫布的儲存／識別／建立契約、audio 與 editor/approval 接法、保留舊資料方式、確切 writer 檔案與測試清單；禁止 edits／browser／API |
| T2 | 唯讀全站接線盤點：`src/`、`backend/`、既有測試與 QA 文件；與 T1 可並行 | 每個主要畫面列 UI action→前端呼叫→route→資料表／provider、狀態分類及證據；區分 mock、未實測與無實作；回報核心路徑阻礙，lead 寫入本 Status，不由 worker 新建文件 |
| T3 | 後端 writer；依 T1 契約修改 `backend/canvas.py` 及必要的 generations／agent／editing／takes／server 接點與對應 tests | 新畫布無 shots 也能建立且 nodes/edges 為空；重開保留內容；既有 canvas/素材不遺失；未登入拒絕；過期版本409；錯誤型別／循環拒絕；實際 node generation/upload/audio 產物可進 editor；測試先紅後綠；`bash bin/verify.sh full` |
| T4 | 前端 writer；T1 契約確定且 契約已固定後於獨立工作區與 T3 並行；整合時以 T3 實際介面驗收，，擁有 `src/components/canvas/`、`src/lib/canvas/`、`src/styles/canvas.css`、Canvas 入口 App／picker 與必要 strings、unit tests | 不需批准計畫即可進空白畫布；七類已確認能力可操作；拖接／拖到空白新增只列相容節點；節點內 prompt/模型/執行；右 dock 不重疊；有費用確認與錯誤恢復；助手套用可操作；兩語言；`node --test unit/`、`npm run build`、`npm run lint` |
| T5 | Lead 單一 browser owner，本機 E2E writer／測試；T3+T4 整合後 | 從 UI 建立空白畫布→文字→mock 圖→mock 影片，確認下游輸入與上游內容相同；重整及重啟保留。上傳真實本機 fixture、配音連線、剪輯、輸出、建立 review link、送審→另一隔離 context 核准；ffprobe 驗證可播放 MP4、時長及音軌；錯誤重試／過期結果不可誤送；1440 截圖，英文／zh-Hant；阻擋非 loopback 網路，mock不是供應商實測 |
| T6 | 獨立唯讀 review → writer 修正 → lead 接受；完整 base..HEAD，禁止只審最後一筆 | 需求與品質兩份結論、SHA、file:line 與實際命令；blocking findings 清零後 `bash bin/verify.sh full`、build、lint 及必要 E2E 於整合版本通過；舊 SHA 的 review 不自動覆蓋新 commit |
| T7 | Lead 更新 Status／docs/STATUS.md，commit、push、PR；不 merge | 提交前顯示 git status 及 diff 摘要；明列全部變更檔、驗證輸出、測試命令、未實測外部服務／明早清單；PR base main；git status upstream 正確，無未推送提交；`git worktree list` 只盤點不刪除 |

## 失敗必查

- 空畫布 GET 偷偷建立 shot／kit／timeline 節點：失敗，畫布必須真正空白。
- 無計畫入口只是暗中偽造已批准的計畫：不可接受；既有審批語意須保留。
- 線可畫但 generation 不消費上游值，或 audio 無法進輸出：未完成。
- 模擬供應商／發布被標成真實成功：失敗。
- 重新載入會失去內容、兩分頁互蓋資料、已有素材被刪：失敗。
- 需要新依賴或外部服務才可繼續：記錄阻礙，不能擅自安裝／呼叫。

明早使用者驗證：真實模型生成與價格、真實配音品質及等待時間、外部服務失敗／權限、實際內容品質。今晚不得執行這些項目。

T1 契約已寫入 Plan 的「固定實作契約」與「串接細節與安全邊界」。T3/T4 可從同一 contract commit 獨立並行，無共用檔案；介面變更必須先通知 lead，T5 僅在兩者整合後執行。

T5入口：`python3 /Users/tommy/.agents/skills/test-slot/scripts/test_slot.py --resource local:127.0.0.1:8872:buildclub-e2e with-command --wait 10 --timeout 950 -- python3 bin/freeform-e2e.py`。後端8872、renderer8892；8871屬他人，禁止接管。`--check-tools`預檢不安裝；`--script`供驗證runner隔離smoke；正式產品測試使用app/e2e/freeform.cjs，待T3/T4整合後完成。

T3真實本機HTTP/媒體驗收（lead已執行PASS，沒有UI）：
```sh
python3 /Users/tommy/.agents/skills/test-slot/scripts/test_slot.py --resource local:127.0.0.1:8872:buildclub-e2e with-command --wait 10 --timeout 650 -- python3 bin/freeform-e2e.py --script pivots/02-content/app/trend-finder/e2e/freeform-backend.cjs --evidence /tmp/freeform-backend-proof --timeout 600
```
預期空白workspace→實際mock queue→圖/影/配音與上傳→真MP4→signed-out核准四步PASS、cleanup-audit survivors={}；clips muted時音量>-50dB證明voice確實進輸出。這不替代T5真實UI操作。

2026-11-05整合驗收更新：4ca5884完整gate1021passed2skipped、frontendPASS、build/lint0；T5正式UI首次FAILED，App.tsx:1390舊planMissing把獨立workspace導回Plans。失敗截圖/results/cleanup已保存於docs/demo-qa/2026-11-05-freeform/ui-*；自有程序survivors={}。須先修正入口並加回歸驗證，再重跑完整UI；尚未通過的助手套用、拖到空白新增相容節點、兩分頁CAS與恢復、legacy UI、實際1440視覺均不得用單元測試取代產品驗收。
