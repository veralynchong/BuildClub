# Flora / Figma Weave / Krea Nodes：節點畫布 UI 流程截圖筆記

整理日期：2026-11-03。方法：YouTube 影片（字幕＋抽幀）＋官方文件／部落格圖。沒有登入任何產品、沒有付費 API。
圖片根目錄：`/Users/tommy/Desktop/my-vault/research/ui-flow-node-canvas-2026-11-03/`（以下用 `…/` 表示，每個產品一個資料夾 `flora/`、`figma-weave/`、`krea-nodes/`）。

---

## 一、Flora（flora.ai，代理 FAUNA）

### 來源
| 影片 | 頻道 | 上傳日 | 用途 |
| --- | --- | --- | --- |
| How To Use Timeline Editor https://www.youtube.com/watch?v=AsoPSWCdRh0 | FLORA AI（官方） | 2026-07-16 | Timeline Editor 全流程（第 3、8、9 階段） |
| How To Use FAUNA https://www.youtube.com/watch?v=I2xyckFQoGE | FLORA AI（官方） | 2026-04-02 | FAUNA 代理（第 1、7、10 階段） |
| FAUNA Walkthrough https://www.youtube.com/watch?v=UtUfT757dXc | FLORA AI（官方） | 2026-04-02 | 人像＋產品 → 廣告 → 動態（第 2、6、10 階段） |
| FLORA AI For Beginners https://www.youtube.com/watch?v=gHQfJLSMDYA | Escapism | 2026-02-11 | 空畫布、加節點、選模型、點數／時間（第 1、3、4、6 階段） |
| Flora AI Tutorial for Beginners https://www.youtube.com/watch?v=Y2brgwlmGl4 | Artturi Reviews | 2026-06-08 | 檢視面板的 Cost 欄（第 3、4、5 階段） |

UI 版本風險：Escapism 影片 2 月、其餘 4～7 月；Flora 迭代很快，模型清單與點數數字隨時會變。

### 重點發現（先講結論）
- **Timeline Editor 確實存在**（官方影片 2026-07-16 親眼看到畫面）：從任何影片節點拖線 → 選 Timeline → 在畫布上直接展開時間軸編輯器；可切／複製／刪除片段、多軌、淡入淡出、文字片段、右鍵跳回來源節點、匯出 MP4／GIF／EDL／XML／FCPXML，可交給 Premiere。先前「來源衝突」可結案：它是真的。
- **成本顯示**：影片裡看到的是兩個位置：(a) 模型選單每個模型旁的點數徽章＋預估生成時間（例如 Kling 2.1 Master 1.5k、6m）；(b) 選取節點後右側檢視面板的 `Cost` 欄，帶美元數（GPT Image 2 顯示 $0.160）。**沒有親眼看到 Run 按鈕上直接寫美元**，先前背景說法未能驗證（只能說「面板有美元 Cost 欄」）。
- **Story Analysis（劇本→分鏡）**：沒找到畫面證據（只有第三方文章，無官方文件或影片）。
- **視覺族譜（branching）**：FAUNA 選定節點後「分支」出新選項，整張畫布呈現樹狀（第 7 階段有畫面）；沒看到獨立的「版本 v1／v2」切換 UI。

### 1 進入 Entry
- `…/flora/01-entry-what-will-you-create-assist-auto.jpg`：首頁就是「What will you create today?」一個大輸入框，可丟素材，下方有 Assist／Auto 切換與範例（Consistent character across scenes、10 ad variations from one design、Product photos from one reference、Image to a 5-second video）。按 Enter 自動開新專案並帶入提示與素材。
- `…/flora/01-empty-canvas-double-click-hint.jpg`：空畫布只有一句提示「Double-click anywhere to create a new block, or start with…」＋三個快速起手 chip。
- 對我們的啟示：入口用「一句話＋範例 chip」比空白畫布友善；範例 chip 就是 onboarding。

### 2 起手 First node
- `…/flora/02-first-node-import-assets-and-describe.jpg`：選檔對話框丟入人像＋產品圖，輸入框顯示兩張縮圖＋一句描述。
- 對我們的啟示：起手點是「素材＋一句話」，而不是先選節點類型。

### 3 加節點與接線
- `…/flora/03-add-node-menu-and-fauna-shortcut-hint.jpg`：左側圓形 + 開「Add Node」搜尋選單：Text(T)、Image(I)、Video(V)、Audio(A)、Technique、Upload(U)、Export；底部還有 Layer／Action／Batch／Router／Element。畫布上提示「Double-click 建節點，⌘/ 叫 FAUNA」。快捷鍵一個字母一種節點。
- `…/flora/03-add-blocks-menu-text-image-video-upload.jpg`：Escapism 版（2 月）較早的 Add Blocks 選單。
- `…/flora/03-nodes-wired-ports-image-to-video.jpg`：文字→圖→影片接線；節點左側有 Prompt／Image 0/10 這類**帶張數上限的輸入端口**。
- `…/flora/03-timeline-node-ports.jpg`：Timeline 節點的輸入端口分 Video／Image／Audio／Prompt 四種。
- 對我們的啟示：端口用名稱＋可接張數（Image 0/10）而不是只用顏色；字母快捷鍵加雙擊就能快速建節點。

### 4 選模型與參數
- `…/flora/04-image-model-picker.jpg`：圖片節點頂端工具列：模型 / 比例 / 風格。
- `…/flora/04-model-picker-use-multiple-models-toggle.jpg`：模型選單有「Auto select model」與「Use multiple models」開關，一個提示可同時打多個模型比較。
- `…/flora/04-video-model-picker-credits-and-eta.jpg`：影片模型清單：供應商分組（Kling、Alibaba、Bytedance、Google、Lightricks），每個模型一行帶**點數徽章（1.5k／2.2k…）＋預估時間（4m／6m）**，懸停提示「Estimated time of generation using default settings」。
- 對我們的啟示：模型 picker 一行同時顯示「價錢＋等待時間」，這是我們 ≈US$ 的最好參考。

### 5 執行前費用
- `…/flora/05-inspector-cost-row-gpt-image-2.jpg`：右側檢視面板 Generate 區塊：Quality／Aspect Ratio／Resolution／**Cost $0.160**。
- `…/flora/05-inspector-cost-row-seedance.jpg`：影片節點（Seedance 2.0）同一面板，Cost 欄隨參數（時長、解析度）變動。
- `…/flora/04-video-model-picker-credits-and-eta.jpg`：左下角有帳戶總點數（592.9K）。
- 沒找到：獨立的「確認執行費用」對話框；也未親眼確認 Run 按鈕上有美元。
- 對我們的啟示：費用放在「改參數就即時變動的面板欄位」＋「選模型時的徽章」兩處；不需要彈窗確認。

### 6 執行中／結果／失敗
- `…/flora/06-running-queue-active-placeholders.jpg`：執行中節點變灰色佔位，右下角 Queue「1 active」可展開。
- `…/flora/06-result-image-appears-in-node.jpg`：結果圖直接長在節點內，下方帶提示文字。
- `…/flora/06-running-motion-clips-pending-eta.jpg`／`06-results-motion-clips-with-model-label.jpg`：FAUNA 一次產一組動態片段，等待中的節點寫著預估時間（~3m），完成後節點頂端標示模型（Seedance 1.5 Pro）。
- 失敗狀態：沒找到。
- 對我們的啟示：節點內佔位＋全域 Queue 面板；批次結果用群組（Group）框起來並命名（Motion Clips）。

### 7 迭代
- `…/flora/07-branching-variants-from-chosen-node.jpg`：選定一張圖後，FAUNA 在其右側分支出 4 個新變體，用連線表示來源。
- `…/flora/07-genealogy-whole-canvas-overview.jpg`：縮小看整張畫布：從原圖一路分支的樹狀（視覺族譜）。
- 對我們的啟示：版本不是 v1/v2 標籤，而是「分支節點＋連線」；我們若用 v1/v2，要有「從這版分支」的動作。

### 8 組成影片（Timeline Editor）
- `…/flora/08-timeline-add-from-node.jpg`：從既有節點拖線，選單點 Timeline（字幕「Drag out from an existing node, and click on Timeline」）。
- `…/flora/08-timeline-tracks-split.jpg`：編輯器在畫布上直接展開：預覽、多軌（影片軌／音軌）、工具列（切割、複製、刪除），時間軸頂有播放頭。
- `…/flora/08-timeline-fade-inspector.jpg`：右側檢視面板調位置、裁切、播放速度、淡入淡出、音量。
- `…/flora/08-timeline-text-clip.jpg`：可加文字片段（紫色軌），右側有字型面板。
- `…/flora/08-timeline-jump-to-node.jpg`：右鍵片段可「跳到來源節點」（字幕確認）。
- `…/flora/08-timeline-result-video-node.jpg`：離開編輯器後，Timeline 節點在畫布上像一個影片節點可直接播放，並可再接到下游。
- 對我們的啟示：這是最貼近我們「Add to timeline → 全螢幕編輯器」的現成範例；重點是「時間軸節點本身仍是畫布節點」，片段能回跳到來源節點。

### 9 交付
- `…/flora/09-timeline-export-menu.jpg`：下載按鈕展開匯出選單：解析度選項、MP4(H.264/H.265)、MOV(H.264/ProRes)、GIF，以及 Timeline＋Assets：EDL、XML、FCPXML。
- `…/flora/09-timeline-premiere-handoff.jpg`：把 XML 匯入 Premiere Pro 繼續剪（字幕「Import your XML file into Premiere Pro」）。
- 各畫面右上角常見 `Share Project` 按鈕（非本次重點，沒看到客戶審核／留言流程）。
- 沒找到：客戶審核或核准流程。
- 對我們的啟示：匯出 NLE 交換檔（XML／EDL／FCPXML）是專業客戶需要的；「送審」仍是我們可差異化的缺口。

### 10 AI 代理（FAUNA）
- `…/flora/10-fauna-builds-graph-with-chat-panel.jpg`：右側聊天面板＋左邊畫布；FAUNA 邊思考邊建節點，面板可停靠／收合。
- `…/flora/10-fauna-text-note-analyses-assets.jpg`：用一個文字筆記節點分析上傳素材，再展開 5 個方向。
- `…/flora/10-fauna-ad-variants-group.jpg`：結果以群組「Ad Variants」呈現。
- `…/flora/10-fauna-chips-animate-into-video.jpg`：回覆下方有下一步 chip：Make 4 more／Refine a favorite／Animate into video。
- `…/flora/10-fauna-select-node-context-next-step-chips.jpg`：選取畫布節點即「給 FAUNA 上下文」，chip：Make 4 more／Pick a favorite／Create campaign shots。
- `…/flora/10-fauna-evaluation-links-to-nodes.jpg`：請它評選最佳，回覆內的節點連結可點擊跳到畫布位置。
- 另有 Assist／Auto 兩種模式（`01-entry…` 圖）。
- 對我們的啟示：代理的核心不是聊天，而是「選取節點＝上下文」＋「下一步 chip」＋「回覆內可點節點連結」。

---

## 二、Figma Weave（原 Weavy）

### 來源
| 影片 | 頻道 | 上傳日 | 用途 |
| --- | --- | --- | --- |
| How to Get Started with Figma Weave https://www.youtube.com/watch?v=1pwXwbtqjBQ | Figma Weave（Ron Baranov，官方） | 2026-08-17 | 主要來源，約 58 分鐘完整流程 |
| Figma Weave for Beginners https://www.youtube.com/watch?v=Nv0rDLT-Mjg | DesignWithArash | 2026-05-05 | 只讀字幕（佐證右鍵加節點、變數） |
| Figma Weave Tutorial: …Sharable UI App https://www.youtube.com/watch?v=D3GJ81-YnvQ | Figma Weave（官方） | 2025-04-01 | 只讀字幕（舊 UI：Output 節點自動產生簡易 App） |

主要截圖來源是 2026-08 官方影片，UI 版本新；右上點數顯示為帳戶總點數。

### 1 進入
- `…/figma-weave/01-dashboard-workflow-library-templates.jpg`：儀表板頂端 Workflow library（範本卡片）＋Tutorials 分頁；左欄 My Files／Shared with me／Workspace Files／Tools／Trash；「Create New File」。
- `…/figma-weave/01-template-readonly-duplicate-to-my-files.jpg`：開範本是唯讀（頂端「You're viewing a read-only version… Duplicate to My Files」），複製到自己檔案後才可編輯，拿來學習別人怎麼接。
- 對我們的啟示：「唯讀範本＋一鍵複製」是很乾淨的範本機制。

### 2 起手
- `…/figma-weave/02-first-node-prompt.jpg`：第一個節點是 Prompt（文字框＋Add variable），右側輸出端口粉紅色並標示「Prompt」。
- 對我們的啟示：起手是純文字節點，端口顏色＝資料型別。

### 3 加節點與接線
- `…/figma-weave/03-right-click-add-node-search-menu.jpg`：右鍵空白處出搜尋式選單，分類（Image models／Video models／Tools…）。
- `…/figma-weave/03-search-add-node-nano-banana.jpg`：輸入「nano ba」直接搜模型加節點。另有「從端口拖出放開 → 直接選節點」與「把線放到節點本體會自動長出對的端口」（字幕 10:00、37:00 所述，未截圖）。
- `…/figma-weave/03-compare-node-two-typed-inputs.jpg`：Compare 節點兩個輸入（綠色圖片端口）、兩個輸出，模式 Slider／Toggle。
- 端口顏色：Prompt 粉紅、Image 綠、Result 綠（在 05/06 圖可見）。
- 對我們的啟示：三種加節點方式（右鍵、左欄拖、端口拖出）都應支援；端口標籤加顏色讓接錯一眼看出。

### 4 選模型與參數
- `…/figma-weave/04-left-rail-model-palette-and-params-panel.jpg`：左欄是模型調色盤（Image models：ChatGPT Images 2.0、Flux 2、Imagen…），選中節點時右側出現參數面板（Model、Quality、Size…）。
- 同一提示可同時接到多個模型節點比較（06 圖）。
- 對我們的啟示：左欄調色盤＋右側參數面板的雙欄結構。

### 5 執行前費用
- `…/figma-weave/05-run-panel-runs-total-cost-credits.jpg`：選取節點後右下角「Run selected nodes」區：**Runs（−2＋）、Total cost 22 credits、Run selected**；右上角也有節點旁小點數（≈11）。講者原話「可看到這次 run 花多少點數，並可選執行次數」。
- 說明：計價單位是 credits，不是美元；模型旁沒有像 Flora 的價格徽章（左欄調色盤未見價格）。
- 對我們的啟示：「Runs 次數 × 單價 = Total cost」的小計框很清楚，可直接借用。

### 6 執行中／結果／失敗
- `…/figma-weave/06-running-prompt-to-multiple-models.jpg`：一個 Prompt 同時連到多個模型節點，各節點內顯示轉圈或佔位。
- `…/figma-weave/05-run-panel-runs-total-cost-credits.jpg`：節點內進度「60%」「0 / 2」＋取消 X；右上「Tasks 2 Running」。
- `…/figma-weave/06-result-in-node-with-run-model.jpg`：結果圖在節點內，顯示解析度（2048×2048），節點底部有「Run Model」。
- 失敗狀態：沒找到。
- 對我們的啟示：節點內進度＋全域 Tasks 計數。

### 7 迭代
- `…/figma-weave/07-batch-6-images-stack.jpg`：同一節點多次執行會堆疊成「6 images」格狀，可翻頁。
- `…/figma-weave/07-gallery-info-panel-prompt-model-versions.jpg`：放大檢視：右側 Info 面板顯示模型、提示、參考圖、比例、解析度，右緣縮圖條切換各版本（如 4/5）。
- 對我們的啟示：版本＝節點內的結果堆，不是分支；資訊面板保留「這張用什麼提示、什麼模型」，利於回溯。

### 8 組成影片
- `…/figma-weave/08-compositor-layers-and-timeline.jpg`：Compositor 節點「Edit」開全螢幕編輯器：左圖層面板、中央畫面、右屬性面板、下方時間軸（多軌色條），可加文字、影片、音訊層。
- 對我們的啟示：全螢幕編輯器也從節點進入（和 Flora 相同做法）。

### 9 交付
- `…/figma-weave/09-workflow-graph-before-publishing-as-tool.jpg`：要發佈的整張流程圖。
- `…/figma-weave/09-tool-mode-inputs-run-deploy.jpg`：頂端 Canvas／Tool 切換，Tool 模式變成簡單表單（檔案上傳、文字欄位、Run），右上「Ready to release? Deploy」。
- `…/figma-weave/09-tool-running-progress.jpg`：Tool 執行中顯示百分比（1%→10%）。
- `…/figma-weave/09-tool-result-with-history-strip-rerun.jpg`：結果＋歷史縮圖條＋Re-run。
- 舊影片（2025-04）說明：Output 節點可自動產生簡易 UI，透過鎖定/解鎖決定哪些參數暴露，再用 Share 連結分享。
- 沒找到：客戶留言／核准流程。
- 對我們的啟示：把整條流程包成「表單式 App」讓非技術人使用，是「送審／交付」之外另一種交付型態。

### 10 AI 代理
- 沒找到：Weave 內沒有「描述目標 → 自動建圖」的代理。網搜顯示 Figma 的 AI agent 目前主要在 Figma Design 內生成設計／外掛／著色器，Weave 以 Tools 形式出現在 Figma 畫布（來源多為第三方文章，Figma 自家公告需再核對：TechCrunch 2026-05-20、Digg）。不可當定論。

---

## 三、Krea Nodes（含 Node Agent、Node Apps、Trim/Stitch）

### 來源
| 來源 | 頻道／出處 | 日期 | 用途 |
| --- | --- | --- | --- |
| Automate image gen and edits with Krea.ai Nodes! https://www.youtube.com/watch?v=7leDnIEMLP8 | Christian Venables | 2026-01-22 | 節點 UI、執行、CU 成本、Node Apps（約 49 分鐘） |
| KREA NODES EXPLAINED https://www.youtube.com/watch?v=uvLRNHxY7PM | visionmachine_ai | 2026-03-10 | Node Editor 首頁、Prompt to Workflow、結果檢視 |
| NEW Krea Agents Just Changed Everything! https://www.youtube.com/watch?v=lWTfz6OWRWI | Julian Goldie SEO | 2026-09-12 | Krea Agent（聊天式）畫面（行銷成分重，只取 UI） |
| Krea 官方文件 Nodes workflows https://www.krea.ai/docs/user-guide/features/nodes | Krea docs | 2026-04 截圖 | 端口、Video Utility（Trim/Stitch）、Node Agent 說明 |
| How to Edit Video with Krea Agent https://www.krea.ai/blog/how-to-edit-video-with-krea-agent | Krea 官方部落格 | 2026-09-18 | Agent 內的時間軸編輯器 |

UI 版本風險：Venables 影片 2026-01、visionmachine 2026-03，節點樣式可能已更新；代理畫面是 2026-09。**注意**：搜尋結果裡 HfVCsVo2ySk（Tech Storm「Node Agent」）內容實為 DaVinci AI 教學，已捨棄不用。

### 重點發現
- **Node Agent（官方文件文字）**：先讀你畫布現況 → 顯示計畫（可換模型、刪階段、核准）→ 節點逐層出現並接線 → 自動驗證（補缺參數、修錯型別連線）→ **逐節點顯示算力成本，你說 go 才執行**。這是文件描述，**沒有找到 Node Agent 的實際操作影片或截圖**；影片裡 2026-03 的是較早的「Prompt to Workflow」，2026-09 的是聊天式 Krea Agent。
- **節點成本在節點標題旁**：每個模型節點右上角寫 `28 CU`（Seedream 5 Lite）、`150 CU`（Nano Banana Pro）、`566 CU`（Kling 2.6，字幕與畫面一致）。講者提醒「按 generate 前一定要看 CU」。
- **端口依型別上色**：文字＝黃、圖片＝藍（官方文件截圖＋影片）。

### 1 進入
- `…/krea-nodes/01-node-editor-landing-projects-apps-examples-templates.jpg`：Node Editor 首頁：分頁 Projects／Apps／Examples／Templates，大按鈕「New Workflow」，下方是專案縮圖。
- 對我們的啟示：Apps 與 Templates 直接與專案並列。

### 2 起手
- `…/krea-nodes/10-prompt-to-workflow-input-box.jpg`：新工作流中央是「Describe your intended workflow」框＋範例 chip（Product Photography、Cinematic Montage、Podcast、Commercial、Car Chase）。
- 另有簡單範本起手（影片 0:00：「simple image generation」範本直接建好節點）。

### 3 加節點與接線
- `…/krea-nodes/03-toolbar-prompt-to-workflow-and-add-node-hint.jpg`：空畫布提示「Double click, right click, or press N」，底部工具列（+、選取、手、剪刀、Prompt to Workflow、連線）。
- `…/krea-nodes/03-right-click-add-node-menu.jpg`：右鍵選單（Image、LLM、Generate image、Enhance、Edit image、Image Utility、Generate Video…）。
- `…/krea-nodes/03-doc-type-coloured-ports-yellow-text-blue-image.png`：官方文件圖：LLM Call → Line Splitter → Text；黃色圓點＝文字端口、藍色＝圖片端口；輸入端口顯示「Receiving input」縮圖與 Add file。
- 對我們的啟示：端口顏色＋輸入端口內嵌縮圖（Receiving input）能一眼確認上游。

### 4 選模型與參數
- `…/krea-nodes/05-run-node-and-cu-cost-on-model-node.jpg`：節點內有 Model 下拉（Seedream 5 Lite）；參數（Aspect Ratio、Resolution、Duration、Generate Audio）直接列在節點上，不另開面板。
- `…/krea-nodes/05-cu-cost-on-node-nano-banana-150.jpg`：影片節點 Start Frame／End Frame 端口＋Duration 下拉＋Generate Audio 開關。
- 對我們的啟示：參數直接放在節點裡（我們的節點也可以）。

### 5 執行前費用
- `…/krea-nodes/05-run-node-and-cu-cost-on-model-node.jpg`：節點標題旁「28 CU ⓘ」，節點左上懸浮「▶ Run node」。
- `…/krea-nodes/05-cu-cost-on-node-nano-banana-150.jpg`：「Nano Banana Pro Copy 150 CU ⓘ」＋「▶ Run node」，結果頁籤 1/2。
- `…/krea-nodes/09-node-app-concept-car-video-inputs-compute.jpg`：Node App 底部「~2505 compute units」＋藍色 Generate 按鈕。
- 官方文件：Node Agent 逐節點顯示成本、App 每次執行的成本在執行前顯示。
- 對我們的啟示：CU 常駐在節點標題旁（不點開），Run 按鈕在節點上方；App 把總成本放在 Generate 上方。

### 6 執行中／結果／失敗
- `…/krea-nodes/06-running-stop-node-badge-and-glow.jpg`：執行中節點外框發光（藍/綠），節點上方藍色「Stop node」徽章；下游節點要等上游完成才啟動（講者 29:00「this node can't start until the one above has finished」）。
- `…/krea-nodes/07-result-viewer-version-thumbnails.jpg`：點結果放大：左側資訊（提示、尺寸、檔案大小、模型），底部縮圖條。
- 失敗狀態：影片內有「not listening to the end frame」這類品質問題，但沒找到錯誤／失敗 UI 畫面。
- 對我們的啟示：Run node／Stop node 是同一個位置的狀態切換，語意清楚。

### 7 迭代
- `…/krea-nodes/07-result-viewer-version-thumbnails.jpg`：重跑的結果疊在同一節點（1/2、1/4 翻頁），全螢幕檢視底部縮圖條切換。講者：「rerun prompts and they stack in here」（11:00）。
- 對我們的啟示：同 Weave：版本＝節點內結果堆；沒有分支。

### 8 組成影片
- `…/krea-nodes/08-doc-video-utility-menu-trim-stitch.png`：Utility 選單的 Video Utility：Combine Video & Audio、Crop Video、Get Video Frame、Stitch Videos、Trim Video、Video Hue & Saturation、Video Speed、Video Time Ramp。**Trim 與 Stitch 是畫布上的獨立節點，不是時間軸**。
- `…/krea-nodes/08-agent-timeline-two-clips-blog.jpg`／`08-agent-timeline-extension-added-blog.jpg`：2026-09-17 起 Krea Agent 內建時間軸編輯器：影片軌／音軌（預設各 2，最多 8 軌）、Cut／Change video／Add frame to chat 按鈕、「延伸」會在軌上生成中的片段（87% 進度條）、右上 Export。官方說明代理本身不編輯時間軸，剪輯由使用者手動做。
- 對我們的啟示：Krea 兩套並存：節點式 Trim/Stitch（可自動化）與代理內時間軸（手動剪）。我們兩者擇一或都做要想清楚。

### 9 交付
- `…/krea-nodes/09-node-apps-gallery.jpg`：Apps 圖庫（Doll Maker、Sims Character、CCTV Footage…）卡片牆。
- `…/krea-nodes/09-node-app-concept-car-video-inputs-compute.jpg`：App 頁：左側表單（上傳圖、Generate），右側結果牆；顯示作者、生成次數、Share。
- `…/krea-nodes/09-node-app-sims-character-form.jpg`：另一個 App，多個輸入欄位（自己的圖、環境照）。
- 文件：Node Apps 可分享給客戶／團隊，Business 方案可私有分享、可用 API 觸發；建議輸入欄位 5–7 個內。
- 沒找到：客戶留言／核准流程。
- 對我們的啟示：與 Weave 的 Tool 模式一樣，把流程「表單化」交付。

### 10 AI 代理
- 2026-03 Prompt to Workflow：`…/krea-nodes/10-prompt-to-workflow-input-box.jpg`（輸入框）→ `…/krea-nodes/10-prompt-to-workflow-generated-graph.jpg`（一次生成整張圖，以黃色便利貼標示 STEP 1、2、3… 並連上 LLM／圖片節點）。講者提醒「產生的是範本，不是完成品，要檢查再按 run，否則會出錯並多花錢」。
- 2026-09 Krea Agent（聊天式，非節點圖）：`…/krea-nodes/10-krea-agent-asks-clarifying-question.jpg`（先問選擇題，例如目標受眾）、`…/krea-nodes/10-krea-agent-brief-prompt.jpg`（一段需求描述，輸入框旁有「500 free credits left」與 Auto Medium 設定）、`…/krea-nodes/10-krea-agent-tool-trace-with-images.jpg`（執行軌跡：Collecting brand references、Ran N commands、Generated 3 of 5 images，圖在側欄累積）。
- Node Agent（官方文件）：計畫 → 核准 → 逐層建節點 → 驗證 → 逐節點成本。**未找到畫面**。
- 對我們的啟示：代理應「先給計畫、列成本、你核准才跑」；同時提供「產出可編輯的圖」。

---

## 四、跨產品小結：最強的 UI 模式

1. 費用顯示位置：Krea 把 CU 常駐在節點標題旁、Flora 在模型選單徽章＋面板 Cost 欄、Weave 在選取節點時的「Runs × Total cost」小計。最適合我們：節點上常駐 ≈US$ ＋ 執行前可改次數看小計。
2. 模型 picker 帶價格與時間：Flora 一行同時顯示點數與預估時間，是目前看到最能幫人決策的。
3. 端口顏色／名稱表示型別（Krea 黃文字藍圖片；Weave 粉紅 Prompt 綠 Image；Flora 帶張數上限的端口名）。
4. 版本做法分兩派：Weave／Krea 為「節點內結果堆（翻頁＋縮圖條）」；Flora FAUNA 為「分支節點樹」。我們 v1/v2 較接近前者。
5. 組成影片：Flora Timeline Editor 與 Weave Compositor 都是「從節點開全螢幕／原地展開編輯器，節點本身仍留在畫布」；Flora 還能右鍵回跳來源節點、匯出 EDL／XML／FCPXML；Krea 則用 Trim／Stitch 節點加代理內時間軸。
6. 代理：Flora FAUNA「選取節點＝上下文、下一步 chip、可點節點連結」最順；Krea Node Agent（文件）「計畫＋逐節點成本＋核准才跑」最安心。
7. 交付：Weave Tool 與 Krea Node Apps 都把流程包成表單 App；Flora 強在匯出 NLE 檔。三者都沒看到客戶審核／留言流程，這是我們可以差異化的缺口。

## 五、未驗證／風險
- Flora Run 按鈕是否直接顯示美元：未驗證（只有面板 Cost 欄與模型徽章）。
- Flora Story Analysis（劇本→分鏡）：沒有畫面證據。
- Krea Node Agent 的實際畫面：沒有影片證據，只有官方文件文字。
- 三個產品的失敗狀態（錯誤訊息／重試）：均沒找到。
- 部分影格是從縮圖拼圖中判斷後直接抽出，未逐張再單獨開圖確認；若要引用請先打開確認。
