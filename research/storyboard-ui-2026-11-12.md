# Storyboard UI 研究：把 Canvas 改成單純的 Storyboard（2026-11-12）

存取日期：2026-11-12。只用免費頁面，沒有登入任何工具，所以介面細節大多來自廠商說明頁和部落格，不是親手操作。Reddit 在這個環境被擋，使用者抱怨的證據來自 Trustpilot。

## 使用者的想法（2026-11-12）

- Canvas 整個改成單純的 Storyboard，一格一個鏡頭，格狀排列（例如 4×2）。
- 每格的圖或影片由 AI 產生，使用者改 prompt 就能改那一格的畫面。
- 每格下面有一行台詞，和拍攝細節（例如 35–50mm 焦段、角度），主要給攝影師看。
- 參考圖：MakeStoryboard 的六格版面（編號、標題、描述，右側開關：顯示鏡頭類型、長度、描述）。

## 結論

1. **市面上的 AI storyboard 幾乎都是同一個做法**：先出鏡頭清單（可以改，還沒花錢），每格有自己的 prompt（預設從鏡頭描述帶入），每格有只重產那一格的按鈕。LTX Studio、Boords、Storyboarder.ai、StoryboardHero 都這樣。
   - 證據：LTX 部落格 2026-05-01「Tap any panel to regenerate it, swap its model, or rewrite its description without touching the rest of the board」 https://ltx.io/blog/how-to-storyboard ；Boords 每格 prompt 框 https://boords.com/ai-storyboard-generator ；Storyboarder.ai 每格「Modify Prompt」與 Retry https://help.storyboarder.ai/en/articles/14745160-what-people-ask-most ；StoryboardHero 的 AI prompt 預設複製描述、可另外改 https://storyboardhero.ai/tutorial/how-to-edit-shots-in-a-storyboard 。都是廠商頁，已讀原文。
2. **傳統工具的卡片上，預設只放編號、描述、台詞**；鏡頭大小、角度、運鏡、焦段放在另一個「shot list」表格分頁，兩邊是同一批鏡頭。
   - 證據：Boords 預設欄位 Label／Sound／Action，Storyboard 與 Shot list 兩個分頁 https://boords.com/docs/storyboard-views 、https://boords.com/docs/creating-storyboards ；StudioBinder shot list 欄位可顯示／隱藏（2024-08 部落格）https://www.studiobinder.com/blog/shot-lists-complete-customization-intuitive-interface/ ；StoryTribe 表格與 storyboard 雙向同步（2026-08-29）https://storytribeapp.com/help/getting-started/scenes-shots-and-frames-explained 。
3. **攝影師實際看的欄位**：鏡頭編號、主體與動作描述、鏡頭大小（WS/MS/CU）、角度、運鏡、焦段、器材（腳架／穩定器）、地點、收音、拍完打勾。
   - 證據：Boords shot list 範本 14 欄（2026-10-22 更新）https://boords.com/shot-list-template ；StudioBinder：導演寫清單、攝影指導補焦段器材 https://www.studiobinder.com/shot-list-storyboard/ （行銷頁）；Celtx 的 shot menu https://www.celtx.com/product/pre-production/shot-list/ （行銷頁）。
4. **每排幾格**：可調是常態。StudioBinder 1–4 欄（2017 部落格，可能過時）；ShotGlide 3/4/5 欄 https://shotglide.featurebase.app/help/articles/1270473-board-view ；Boords 用縮放、分享頁有每排格數滑桿（changelog 2025-01-13）https://boords.com/changes 。
5. **最大的抱怨是重產很燒錢、角色會走樣**（Trustpilot 評論，個人意見）：LTX 一位評論者說 6 格 storyboard 用掉 2,610 credits（2026-10-26）https://ca.trustpilot.com/review/ltx.studio ；Higgsfield「一天就把 credits 燒光」（2026-11-11）https://www.trustpilot.com/review/higgsfield.ai 。對策：按鈕上先顯示價錢（Higgsfield 的做法 https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-popcorn ）、只重產一格、局部修改。
6. **改鏡頭欄位不會自動重產圖**：Storyboarder.ai 明講改了 shot list 要按 Retry 才重產。我沒找到任何工具會自動重寫 prompt。這是推論出的安全預設。

## 我們程式裡已經有的（2026-11-12，`feat/canvas-restore`）

路徑相對 `pivots/02-content/app/trend-finder/`。

- `Shot` 模型（`backend/models.py:141`）：描述 `shot`、台詞 `line`、`framing`（wide/medium/close_up/…）、`angle`、`movement`、`tip`、`frameImage`。**沒有焦段、沒有存起來的 prompt、沒有數字長度**（`time` 是字串）。
- Plan 頁的 `StoryboardSection` / `ShotItem`：已經是卡片格＋表格切換，每格可改台詞、重寫台詞、重產圖。但重產圖不能改 prompt（`frame_prompt` 即時組出來，不存）。
- Canvas 的生成後端 `/api/ideas/{id}/gen`（`backend/generations.py:730`）：自訂 prompt、圖或影片、圖轉影片、預算檢查、失敗退款、每格完整版本紀錄。只限已核准的企劃。
- 剪輯器目前開在 `CanvasScreen` 裡面，素材是每個鏡頭節點選定的版本。拿掉 Canvas 時，剪輯器的入口要保留。
- 拍攝打勾：`ShotChecklist`（核准後每格上傳 take）。

## 建議（推論，不是查到的事實）

- 新的「Storyboard」畫面取代側欄的 Canvas：格狀，一排 2／3／4 格可切，預設 4（9:16 直式卡片）。
- 卡片：編號、9:16 畫面、台詞一行、鏡頭標籤（鏡頭大小 · 角度 · 運鏡 · 焦段）、長度。
- 點卡片開右側面板：prompt（預設從描述＋鏡頭＋台詞帶入，可改）、「重產（約 US$0.04）」按鈕、版本列、「做成影片」、鏡頭欄位。
- 第二個分頁「Shot list」：同一批鏡頭的表格，給攝影師，有拍完打勾；之後加 PDF 和分享連結。
- 改欄位不自動重產，只標示「prompt 已變，按重產更新」。
- 後端：`Shot` 加 `lens`、數字長度；prompt 和版本沿用 Canvas 的 `/gen` 與 canvas 文件，剪輯器不用改。
- Canvas 程式先保留、從側欄拿掉，不刪。

## 弱點

- 介面細節大多是廠商自己的說明，沒親手操作；Canva、ShotDeck、Krock 讀不到細節。
- 評論樣本很小（Trustpilot 幾則），且 Luma 的評測是競爭對手寫的。
- StudioBinder 的欄數資料來自 2017 年部落格。
