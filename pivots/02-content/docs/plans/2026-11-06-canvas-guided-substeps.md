## 2026-11-06 Codex 執行決定（優先於下方建議）

### 三個問題的決定

1. **Generate 由使用者按原 Run／Generate**，只回放已備素材；圖片／影片小步提供明確的「跳過這次回放」。未完成也未明確跳過時不自動前進、不偷跑生成，跳過會記在本次隔離導覽狀態。其餘小步主要看節點、連線與原版本操作。
2. **沿用原選取及置中**：原 `is-selected` 外框、`fitView`、原 Inspector／History。連線步驟選取真 edge 並框住兩端節點，不加新畫布布局／大遮罩／新高亮設計。
3. **固定 Shot 19／第 19 鏡**：現有 high-angle 與 low-macro 是唯一首幀／短片成對預備素材，均為 AI angle concepts、非實拍。AI6步可用其固定首幀/短片；攝影師第3步指向原footage上傳位置，但本Demo只能展示這些概念素材，不宣稱已上傳實拍，也不建立假Take。

### 進度：7個主階段＋巢狀Canvas

目前原站有9個實際畫面步驟（搜尋起步需求已完成），不刪任何畫面；顯示歸為7個主階段：搜尋/結果=1、分析/Research=2、腳本=3、選路線=4、Canvas=5、剪輯=6、結果=7。Canvas顯示如 **5 / 7 · Canvas 2 / 6**；攝影師為2/4。Next/Previous先在Canvas內移動，最後一小步才進Editor；從Editor返回落在最後Canvas小步。reload恢復實際子步及焦點，路線改變或reset回第一小步，不攤成12/14步。

### 實際目標與資料界線

| 小步 | AI路線原節點/edge | 攝影師路線原節點/edge |
| --- | --- | --- |
| shots | n_shot_s19 | n_shot_s19 |
| prompt | n_prompt_s19 | n_prompt_s19 |
| image | n_high-angle_image，原Inspector | 不適用 |
| connect | n_high-angle_image→n_high-angle_video，真in:start線 | 不適用 |
| video | n_high-angle_video，原Inspector | 不適用 |
| footage | 不適用 | n_footage_s19，原Choose file位置；預覽明示非實拍概念 |
| versions | 同n_high-angle_video的原版本/History | 同n_footage_s19的原版本/History |

Prompt會從第19鏡腳本描述帶入；圖→影片必須是實際原graph契約，不能只畫線。只准同plan/S19完成的允許首幀ID，URL/其他鏡/跨plan/多餘reference一律拒絕。既有21主線motion未交付仍不可用。high/low兩預備概念以誠實imported版本顯示在同教學節點；不把同檔案反覆回放冒充不同內容，不把整片拆成21支假生成。

攝影師文案第3步採：「**放入實拍素材**／正式專案可在這裡上傳實拍；此Demo以預備AI角度概念示範素材位置，並非實拍。」英文：「**Add your footage**／Upload filmed clips here in a real project. This demo previews prepared AI angle concepts, not filmed takes.」其他EN/zh表沿用下方意圖，shot N換成19，Generate標原按鈕Run/Generate。

### 實作與驗收

起點full：1109passed/2skipped in34.53s、frontendPASS、GREEN。原資料目前沒有Prompt/footage/edge且拒絕startFrame，因此先補固定資料契約，不能只改講解文字。Root唯一擁有contracts/tour/App/Canvas focus橋接；UI worker獨立寫canvasTour純資料/小浮框；資料worker獨立寫fixtures/prepared/nativecaller測試。兩者只讀同一root契約，review唯讀、browser唯一且8992隔離；使用者預覽8991/SSH18991不碰。

成功須證明：主7／Canvas6或4正確、不早進Editor；真選取置中/edge；原Run→prepared首幀→同源startFrame影片；外來reference拒絕及reload身份不丟；同節點不同預備版本能比較/選用並沿原Use in Edit到剪輯；明確Skip無付費且可回來重做；reload/Previous/reset/exit/改路線穩定；正式native資料不變、零provider/paid外送，EN/繁中、full/build/lint與錄影。沒有新增依賴/paid/commit/push/merge。新全AI成片仍由既有agent處理pending。

---

# Guided Demo：Canvas 步驟拆分建議（給 Codex）

日期：2026-11-06。Tommy 要求：Codex 目前的工作跑完後讀這份，把導覽的 Canvas 步驟拆細。
研究依據：`pivots/02-content/research/magnific-canvas/tutorial-research.md`（截圖在同資料夾 `tutorial-assets/t01–t14`）。

## 為什麼要拆

`feat/guided-tofu-demo` 的 `src/lib/demo/steps.ts` 把 Canvas 寫成一步（`canvas`：「比較預先準備的版本，為同一個豆腐故事選用鏡頭」）。
Tommy 希望明天 demo 時，使用者從 Shot list 進到 Canvas 之後，能一步一步看懂：這是 Prompt、怎麼產生首幀圖、怎麼變成影片。

## 不變的界線（沿用 Saturday Demo Plan 最新一節）

- 只加在既有的小型浮動導覽框，不重新設計 CanvasScreen，不新增頁面或大卡片。
- 按 Generate 時顯示 prepared 素材，零付費，也不宣稱是即時生成。
- Try the Demo 的自由操作不受影響。
- 外觀變更仍需和 Veralyn 對齊。這份只定步驟和文案，高亮的樣式由 Codex 用最小改動做。

## 研究得到的模式（推論，見研究檔第 5 節）

1. 先讓使用者認地圖，再要求動手。第一步只指出 shot 卡片。
2. 每步一個動詞標題加一句話。Magnific 文件是「粗體動詞片語 + 一句說明」。
3. 連線講成往右流：output 接 input。
4. 「比較版本」單獨一步。
5. 全程只用同一個鏡頭，最後給「重來 / 自由探索」的出口。

Magnific 的第一個 workflow 教學是 4 個大步，Figma Weave 的短教學涵蓋 6 個重點，所以 Canvas 拆成 5 到 6 個小步是合理範圍。

## 建議子步驟：AI 廣告路線

全程固定同一個鏡頭，選有 prepared 首幀圖和影片的那一鏡，由 Codex 依 `tofuCase.ts` 決定。
高亮對象用 `lib/canvas/types.ts` 的 NodeKind。

| # | id 建議 | 高亮對象 | EN 標題 / 說明 | zh-Hant 標題 / 說明 |
|---|---|---|---|---|
| 1 | `canvas-shots` | 該鏡的 `shot` 節點（整排 shot 可淡顯） | **Your shot list is now on the canvas** / Each card is one shot from your script. Let's follow shot N. | **Shot list 已經放上畫布** / 每張卡就是腳本裡的一個鏡頭，我們跟著第 N 鏡走一遍。 |
| 2 | `canvas-prompt` | 該鏡的 `prompt` 節點 | **This is the prompt** / It describes what this shot should look like. It came from the script, and you can edit it. | **這是 Prompt** / 描述這一鏡畫面要長什麼樣，從腳本自動帶入，可以直接修改。 |
| 3 | `canvas-image` | `storyboard` 節點（含模型 / 比例設定） | **Make the first frame** / Pick a model and ratio, then Generate. In this demo, a prepared image appears. | **產生首幀圖片** / 選模型和比例後按 Generate，Demo 會顯示預先準備好的圖。 |
| 4 | `canvas-connect` | storyboard 到 video 的連線，指向 video 的 Start frame 埠 | **Connect image to video** / Outputs flow left to right. The image becomes the video's start frame. | **把圖片接到影片** / 由左往右流，圖片的輸出接到影片節點的「起始畫面」。 |
| 5 | `canvas-video` | 該鏡的 `video` 節點 | **Turn it into video** / Generate a short clip from the start frame and prompt. A prepared clip plays here. | **生成影片** / 用起始畫面和 Prompt 生成短片，Demo 播放預先準備的片段。 |
| 6 | `canvas-versions` | 「Other versions」/ 上一版本、下一版本控制 | **Compare and pick a version** / Flip between versions and keep the one you like. It goes to the editor next. | **比較並選定版本** / 切換不同版本，留下最滿意的，下一步送進剪輯。 |

第 6 步之後接回既有的 `edit` 主步驟，不另加「送 Editor」子步。

## 攝影師路線

如果導覽走攝影提案路線，第 3 到第 5 步改成一步：

| # | 高亮對象 | EN | zh-Hant |
|---|---|---|---|
| 3' | `upload` / `footage` 節點 | **Add your footage** / Upload what you shot for this shot; it lands on the same card. | **放入實拍素材** / 上傳這一鏡拍好的影片，會接在同一張卡上。 |

第 1、2、6 步沿用，所以攝影路線是 4 個子步。

## 進度顯示（建議，待 Tommy 確認）

- 建議巢狀顯示：主進度維持 7 步，進到 Canvas 時顯示「5 / 7 · Canvas 2 / 6」，避免總步數膨脹成 12 步。
- 替代方案：直接攤平成 12 步。這樣比較簡單，但進度條看起來很長。

## 給 Codex 的待確認事項

1. 子步驟的 Next 是「只看」還是要求使用者真的點 Generate？建議第 3、5 步讓使用者自己點（可以跳過），其餘只看。
2. 高亮要用既有 CSS class 做最小外框，還是不高亮、只把畫布捲到該節點並置中？後者對版面改動最少。
3. 文案中的「shot N」換成實際的鏡號。

## 研究的限制

- Magnific 的 app 內新手導覽在登入牆後面，沒有實際看到。步數來自官方文件和 Academy 課程結構。
- YouTube 字幕抓不到，只有標題、長度和章節。
- 詳見研究檔第 6 節。
