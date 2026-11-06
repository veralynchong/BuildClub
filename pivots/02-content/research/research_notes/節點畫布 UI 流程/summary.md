# 節點畫布 UI 流程：競品 vs 我們（結論與該改什麼）

整理日期：2026-11-03。依據同資料夾四份筆記（flora-weave-krea.md、dreamina-ltx-runway.md、other-six.md、ours.md）。圖片在 /Users/tommy/Desktop/my-vault/research/ui-flow-node-canvas-2026-11-03/。影響與工作量是研究者判斷，不是量測；競品截圖來自 2026 年影片與文件，介面可能已改版。

## 重點結論
1. 我們是唯一走到「送審」的產品；競品停在匯出檔／NLE 交換檔／表單 App。但我們第一次送審就被擋（錯誤指向不存在的「Shortlist」）。
2. 時間軸是畫布上的節點（Flora Timeline、Dreamina Timeline 節點、Weave Compositor、NodeTool Timeline clip），片段可回跳來源。我們「Add to timeline」整頁跳走、回來看不出加過。
3. 價格放在做決定的那一刻：Flora 選單點數＋等待時間、Krea CU 常駐節點標題、Dreamina 改參數即時 +68→+364、Runway「Run all • 66 credits」。我們的 ≈US$ 被窄節點截斷，沒有常駐 shot 總價。
4. 接線要先替使用者接好：Node Banana 拖線放開只列相容節點、Freepik 自動長出下游。我們 Start frame 不自動接。
5. 版本兩派：節點內結果堆（Weave/Krea/Runway 2/2）vs 分支樹（Flora）。我們 v1/v2 膠囊 25×14px、無縮圖，有結果後仍寫「Generate」。
6. AI 代理已是標配；好的代理先追問、先給計畫與成本、核准才跑。我們沒有。
7. NodeTool 最像我們（分鏡卡為主、節點為 shot 展開層、核准靜幀才跑影片），但圖是行銷素材。
8. 入口：競品用「一句話＋範例 chip」或「複製範本」；我們只能從核准計畫進入，側欄入口視角放大裁切。

## 我們該改什麼（依優先順序）
| # | 改什麼 | 階段 | 參考 | 我們 → 參考截圖 | 影響 | 工作量 |
|---|---|---|---|---|---|---|
| 1 | 修好送審：連結關閉時直接建立或同面板給按鈕；錯誤改指 Plans「Get link」；5 步驟列不預先打勾 | 9 | 無（獨有） | ours/09-export-done-send-blocked-no-link → ours/09-sent-waiting-for-approval | 高 | 低 |
| 2 | Start frame 自動接同 shot Storyboard；拖到空白放開出相容選單；埠放大；Text 線不穿過 Storyboard | 3 | Node Banana、Freepik、Runway | ours/03-video-node-added-unwired → node-banana/03-add-node-menu-from-handle | 高 | 低 |
| 3 | Add to timeline 不跳頁：toast＋「已在時間軸」徽章；說明 Add vs Main clip；編輯器片段可跳回節點、名稱帶 shot/版本 | 8 | Flora、Dreamina | ours/08-back-on-canvas-after-add → flora/08-timeline-jump-to-node | 高 | 中 |
| 4 | 側欄進入也 fitView；頁標題寫計畫名；選擇頁加 shot 數與狀態 | 1 | Flora、Krea | ours/02-canvas-opens-zoomed-cropped-via-sidebar → flora/01-empty-canvas-double-click-hint | 中 | 低 |
| 5 | 加寬節點；自訂模型選單（全名、≈US$、等待時間、檔位徽章） | 4 | Flora、LTX、Krea | ours/03-wired-start-frame → flora/04-video-model-picker-credits-and-eta | 高 | 中 |
| 6 | shot 總價常駐並即時更新；付費單點首次確認；剩餘額度換算成支數 | 5 | Runway、Weave、Dreamina | ours/05-cost-run-whole-shot-dialog → runway/05-cost-run-all-66-credits | 中 | 低 |
| 7 | 按鈕改「Regenerate（v4）」、版本縮圖／並排比較、「用這版設定重做」；查版本外溢 | 7 | Runway、Weave | ours/07-versions-v1-v2-v3 → runway/07-iteration-multi-result-counters | 中 | 低 |
| 8 | 執行中顯示經過／預估時間、全域佇列；失敗狀態收斂成一個；結果圖可放大 | 6 | Flora、Weave、Krea | ours/06-failure-try-again → flora/06-running-motion-clips-pending-eta | 中 | 中 |
| 9 | 「一個 shot 完整節點鏈」範本可一鍵複製；之後考慮一句話起手 | 1 | Runway、Weave、Dreamina | ours/01-entry-canvas-chooser → runway/01-entry-template-gallery | 中 | 中 |
| 10 | AI 代理最小版：替 shot 建鏈＋逐節點估價，核准才跑；選取節點即上下文；下一步 chip | 10 | Krea Node Agent（文件）、Flora FAUNA、Runway Agent | （無）→ krea-nodes/10-prompt-to-workflow-generated-graph | 高 | 高 |

## 其他我們的 UX 問題
- 匯出面板蓋住右側分頁；素材清單每段都叫「Clip · Generated · 4s」；「Main clip of this shot」被截斷；右上 Add 沒有 Footage；沒有 minimap。

## 限制與未驗證
- 所有競品失敗狀態都沒拍到。Flora Timeline 由官方影片 2026-07-16 確認；Flora Run 鈕是否顯示美元未驗證。
- Runway：workflow→時間軸、交付都沒畫面。Krea Node Agent 只有文件。NodeTool 圖為 README 行銷素材。VidMuse 無畫面。Martini 為 2025-10 舊版。Freepik 費用抱怨來自部落格。
- 我們：付費價格行未實拍（無 key）；模型下拉為強制展開示意；分支 feat/canvas-p2-5-kit、mock 模型；送審成功畫面是先用 API 補連結才拍到。
