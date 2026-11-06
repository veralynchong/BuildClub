# 一致性靠「每個客戶一套命名參考圖」，不靠訓練模型

> 研究日期：2026-11-03（雪梨）。原始筆記在同一資料夾的 `notes/`：A（畫布型產品：Higgsfield、Runway、Krea、Flora、Weave、Freepik、OpenArt、Stability）、B（Midjourney、Ideogram、Pika、Luma、Google Flow、Kling、Canva、Adobe、廣告影片工具）、C（圖片模型）、D（影片模型）、E（Remake 現有程式碼）。
> 背景報告（不重複）：《AI 節點畫布與剪輯器 研究》（2026-11-02）、規格 `docs/specs/2026-11-02-node-canvas-editor-design.md`。
> **證據標籤**：〔已核對〕＝研究員 2026-11-03 用 WebFetch 開了原頁（WebFetch 會先用小模型摘要，所以是「透過摘要看到」，不是逐字）；〔主筆複核〕＝撰寫本報告時再開一次原頁對過；〔廠商自述〕＝產品自己的頁面；〔第三方〕＝評測、新聞、轉售商；〔僅摘要〕＝只看到搜尋結果摘要，原頁打不開或沒開；〔程式碼〕＝直接讀了 Remake repo（分支 `feat/canvas-p2-models` @ `7db7614`）；〔推論〕＝本報告的判斷，不是任何來源的原話。
> **存取日期**：所有來源都在 2026-11-03 存取。**價格和模型 id 都是當天快照**；這一季模型換得很快（研究期間就發現 Nano Banana 2.1、Kling 4.0、MiniMax H3、Gemini Omni Flash 1.1 都是 2026 年 8–10 月才出的），上線前要回原廠頁再確認。

---

## 結論與建議

**一句話：在每個客戶底下存一組「一致性套組」（角色、產品、場景、風格，每項 1–4 張圖加一行描述、有名字）。每個 plan 從裡面挑出這支片要用的項目，畫布上放一個「套組」節點，自動接到每一個分鏡圖節點；影片節點吃分鏡圖當起始畫面，選了支援參考圖的模型時才另外吃套組。P2 先把轉接層從「一張參考圖」改成「N 張帶角色的參考圖」，套組本身另開一個小階段（建議叫 P2.5），不要塞進 P3 的品牌素材。** 理由有四。

第一，2026 年的產品都收斂到同一個做法：**把參考圖存成有名字的素材，用 `@名字` 或連線重複使用，不用訓練**。Higgsfield Elements（2026-02）、Kling Element Library（2026-02）、Krea Elements（2026-09）、Hedra Elements、Runway 的 saved References、Google Flow 的 Ingredients 都是這個形狀〔已核對，見 §1〕。訓練模型（LoRA）只剩在「真人臉要像」（Higgsfield Soul ID 要 20–80 張照片）和「企業品牌畫風」（Adobe Firefly Custom Models、Stability Brand Studio）兩個地方。

第二，**我們清單上的模型都吃多張參考圖，而且參考圖幾乎不加錢**。Nano Banana 2 一次最多 14 張（其中 4 張角色、10 張物件），Nano Banana Pro 是 5 個人物＋6 個物件＋3 張風格，Seedream 4.5（fal）最多 10 張〔主筆複核〕。Pro 每張輸入圖 $0.0011，Seedream 是一張圖固定 $0.04 不管幾張參考〔已核對〕。所以一致性的成本是「工程」，不是「每次生成的錢」。

第三，**現在的程式只能接一張參考圖**，這是 P2 一定要先改的地方：`ports.ts` 不允許同一個埠接第二條線，`GenRequest.reference` 是單一字串，`generations.py` 只能引用同一個 plan 裡的生成結果〔程式碼〕。如果 P2 照現在的形狀寫完 fal 和 Gemini 轉接層，之後加套組要再改一次所有轉接層。

第四，**品牌組合和畫面一致性是兩件事**。Canva、HeyGen、Creatify 的「Brand Kit」存的是 logo、字型、色碼，是在排版和剪輯時套上去的；只有參考圖和訓練模型會影響 AI 生出來的像素〔已核對，見 §1C〕。所以 P3 的品牌素材（Remotion 疊 logo、字型、主色）照原計畫，套組是另一個東西；兩者可以存在同一個「客戶素材庫」底下，但用在不同階段。

**順帶發現兩個會影響 P2 模型清單的事（要先處理）**：
1. **Veo 3.1 正在退場。** Gemini API 的 Veo 3.1 preview id 已在 2026-10-22 停止，官方建議改用 `gemini-omni-1.1-flash`；fal 的 `fal-ai/veo3.1/reference-to-video` 頁面寫「This endpoint will be deprecated on November 17, 2026」〔主筆複核〕。規格 §6 的「Veo 3.1（Gemini 或 fal）」需要改成 Gemini Omni Flash 1.1（fal 上 720p 每秒 $0.10，支援 9:16 和參考圖〔已核對〕），或只走 Vertex 的 GA 版。
2. **Nano Banana 2.1（`gemini-nano-banana-2.1`）已經是 Google 推薦的預設**，1K 每張 $0.0336，比 Nano Banana 2 的 $0.067 便宜一半，參考圖上限一樣〔已核對；主筆複核了上限〕。另外 MiniMax「Hailuo / H3」在 fal 上真的分成兩代：Hailuo 02/2.3 **不吃參考圖**，H3 Max 才有 reference-to-video。

### 優先順序（短名單）

| 順位 | 做什麼 | 放哪個階段 | 好處 | 代價 |
|---|---|---|---|---|
| **1** | 轉接層和模型清單改成 N 張帶角色的參考圖（`references: [{assetId, role}]`；清單加 `maxRefs`、每種角色上限） | **P2 內** | 不做的話，後面每個轉接層都要重寫；Gemini、Seedream、Kling O3、H3 Max、Omni 都吃多張 | 約多 1–2 天工〔推論〕；連線規則和測試要改 |
| **2** | 客戶層級的「一致性套組」＋ plan 層級的「這支片用哪些項目」＋畫布上一個「套組」節點，自動接到每個分鏡圖節點 | **新階段 P2.5**（P2 驗證完、P3 之前） | 對準 2026 主流做法；對 agency 的價值最大（同一個客戶的每支片都長一樣）；分鏡圖階段就鎖住長相，影片只是讓它動起來 | 需要跨 plan 的素材儲存；要一個簡單的套組編輯畫面 |
| **3** | 影片節點：「分鏡圖當起始畫面」為預設；選了 Kling O3、H3 Max 或 Omni Flash 時，套組裡的角色和產品也一起送進去 | P2.5 | 不吃參考圖的模型（Hailuo 02/2.3、Kling 2.6）也因為起始畫面而一致 | 參考圖模式的單價和長度限制各家不同 |
| **4** | 風格：用文字「風格說明」＋（可選）1–3 張風格圖，自動加進每個 prompt 的固定模板 | P2.5 | 幾乎免費；Figma Weave 官方就是這樣做 | 只有 Nano Banana Pro 有正式的「風格參考」欄位 |
| 不做 | LoRA 訓練、靠 seed、上一鏡最後一格接下一鏡 | — | — | Nano Banana 和 Seedream 都不吃 LoRA；seed 不帶長相；接最後一格會累積偏移（見 §2） |

---

## 1. 別的產品怎麼做

### 1A. 三種存法：訓練模型、命名參考組、品牌組合

**結論 1A-1：2026 年的主流是「命名參考組」：上傳 1–8 張圖、取名字、在 prompt 裡 `@名字` 或連線重複用，圖片和影片都能用，不必訓練。**

證據：
- **Higgsfield Elements**：changelog 2026-02-24「characters, locations, outfits, and props are saved once and called in any prompt with @」；Cinema Studio 3.5（2026-04-13）改成「scoped to the project, reusable elsewhere」；Cinema Studio 4.0（2026-08-12）一次最多 50 張參考圖「to lock a face, product, or style」〔已核對，廠商自述〕([Higgsfield changelog](https://higgsfield.ai/changelog))。Elements 沒有官方說明頁，建立步驟只來自第三方〔第三方〕([aiproductivity.ai, 2026-10-25](https://aiproductivity.ai/blog/higgsfield-consistent-ai-character/))。
- **Kling Element Library**（指南 2026-02-05）：一個元素＝1 張主圖＋1–3 張其他角度（共 2–4 張），或一段 3–8 秒影片；可綁聲音；在 prompt 打 `@` 選用；影片一次最多 7 個元素加參考圖（有影片輸入時 4 個），圖片一次 10 個；元素庫上限依方案 30–500 個；建立免費〔已核對，廠商自述〕([Kling: Element Library user guide](https://kling.ai/quickstart/klingai-element-library-3-user-guide))。Kling 3.0 另有「Bind Subject」開關（2026-06-26）〔已核對，廠商自述，效果數字未驗證〕([Kling blog](https://kling.ai/blog/kling-3-subject-binding-character-consistency))。
- **Krea Elements**（2026-09-09）：每個元素最多 8 張參考圖加文字說明，用一個 `@tag` 叫出來；先在 Seedance Studio 上線，「coming soon to all other Krea tools」〔已核對，廠商自述〕([Krea changelog](https://www.krea.ai/docs/changelog))。
- **Hedra Elements**：每個元素最多 10 張圖，類型有 Character、Environment、Style、Outfit、**Brand Identity**，用 `@name` 重複使用〔已核對，廠商自述〕([Hedra docs: Create element](https://www.hedra.com/docs/pages/app/content-creation/create-element.md))。
- **Runway References**：一次最多 3 張；把上傳的圖「tag to save」取名後用 `@name` 叫出來，可分享給整個工作區〔僅摘要，原頁 403，文章可能是 2025 年的〕([Runway help: Gen-4 Image References](https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References))。
- **Google Flow Ingredients**：拖曳、`@` 搜專案素材或按 Add 加入，逐一描述每個素材怎麼出現；每支片重新加同一組圖；Veo 3.1 Quality 不支援 Ingredients，Fast、Lite、Gemini Omni Flash 1.1 支援；素材可篩「Characters」「Scenes」〔已核對，廠商自述〕([Flow Help 16353334](https://support.google.com/flow/answer/16353334)、[16352836](https://support.google.com/flow/answer/16352836)、[16935308](https://support.google.com/flow/answer/16935308))。
- **Ideogram**：4.5 版角色參考最多 5 張，用 `@img_1` 標；3.0 版風格參考最多 10 張；Library 的 Character＝名字＋1 張圖〔已核對，廠商自述〕([Ideogram docs: Reference features](https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features))。

推理〔推論〕：這些產品的資料結構幾乎一樣：`{名字, 類型, 1–N 張圖, 文字說明}`，在 prompt 裡用名字引用。它們從 2025 年的「每次上傳參考圖」演進到 2026 年的「存起來、命名、跨專案重用」，正好對上 agency 的需求：同一個客戶的主角、產品、門市，每支片都要一樣。Remake 照這個形狀做，使用者不用學新概念。

弱點：Runway 和 Freepik 的說明頁 403，只看到摘要；研究員沒有親手操作任何產品；Higgsfield Elements 的建立步驟只有第三方說法。

**結論 1A-2：訓練模型（LoRA）退到兩個特殊用途：真人臉要像，和企業級品牌畫風。對 Remake 的 demo 不划算。**

證據：
- **Higgsfield Soul ID**：上傳 20–80 張照片（要有全身照、不要墨鏡和合照），訓練「a few minutes」，之後在 Character 分頁選用；訓練好的角色也會自動變成 Seedance 影片可用的 Element〔已核對，廠商自述，2026-09-02 更新〕([Higgsfield help: Soul ID](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character))。第三方說 5–20 張、約 10 分鐘、25 點〔第三方，和官方衝突，以官方為準〕。
- **Adobe Firefly Custom Models**（公開測試 2026-03-19/20）：插畫風格、攝影風格、角色三種；10–30 張圖；訓練幾分鐘到幾小時；訓練 500 點、每次生成 20 點；不能重訓；只做圖片〔已核對，廠商自述〕([Adobe: Firefly Custom Models](https://www.adobe.com/gr_en/products/firefly/features/custom-models.html))。
- **Krea Train**：至少 3 張、建議 10–30 張；訓練出的風格有一個 style code，可用在 Flux、Edit、Enhancer，以及「as an aesthetic for video generation」；價格和時間沒寫〔已核對，廠商自述〕([Krea docs: Training](https://www.krea.ai/docs/user-guide/features/training))。
- **Freepik（改名 Magnific）Custom Characters**：LoRA，只能配 Flux 和 Mystic，每個角色訓練 3,000 點〔已核對價目頁；FAQ 403〕([Magnific pricing](https://www.magnific.com/pricing))。
- **Flora Styles 已停用**：官方文件寫「currently unavailable and has been deprecated for now」〔已核對，廠商自述〕([Flora docs: Styles](https://docs.flora.ai/faqs-how-to.../styles))。

推理〔推論〕：訓練要 10 張以上同一個主體的照片，還要等幾分鐘到幾小時；agency 接新客戶時通常只有幾張產品照和一兩張人像。而且我們選的圖片模型（Nano Banana、Seedream）根本不吃 LoRA（見 §2）。Flora 停掉 Styles、Krea 新出 Elements，看起來產業也在往「不訓練」的方向走（這是從兩個例子推的，樣本很小）。

弱點：Krea、Freepik 的訓練時間和價格沒查到；「產業在退出訓練」只是兩個訊號的推論。

### 1B. 怎麼套到每個鏡頭：`@名字`，或把參考節點接到每個生成節點

**結論 1B-1：畫布型產品有兩種重用方式：在 prompt 裡 `@名字`，或把一個參考節點接到每個生成節點。後者在畫布上看得見，但線多；Remake 可以用「自動接線」拿到兩邊的好處。**

證據：Figma Weave 的官方做法是：參考圖 → Image Describer 節點 → Any LLM 節點寫一份「master style description」，再接到每個生成節點；「consistency is structural, not accidental」〔已核對，廠商自述〕([Figma blog, 2026-04-09](https://www.figma.com/blog/five-figma-weave-workflows/)、[Figma: consistent character](https://www.figma.com/solutions/ai-consistent-character-generator/))。Higgsfield Canvas：Seedance 節點直接吃接上的參考圖，但 prompt 開頭要寫明每張圖的角色；Kling 節點接上的圖是起始畫面，不是角色參考，角色要先做成 Element 再 `@` 叫〔已核對，廠商自述〕([Higgsfield help: Canvas](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas))。Weave 也有「Kling Element」節點〔已核對〕。

推理〔推論〕：Remake 的畫布是由鏡頭清單自動排好的，一支片 6–10 個鏡頭。如果要使用者手動把 3 張參考圖各接到 8 個節點，就是 24 條線。所以用一個「套組」節點，**系統自動接到每個分鏡圖節點**，使用者只在單一鏡頭上取消勾選（例如這一鏡沒有人物）。Higgsfield 的教訓也要照抄：參考圖的「角色」（角色、產品、場景、風格、起始畫面）要寫在線上和送給模型的 prompt 裡，不能只靠連線。

弱點：「自動接線」沒有任何產品這樣做（從沒看到推出的），使用者會不會看不懂線從哪來，要做出來才知道。

### 1C. 「Brand Studio」是誰：品牌組合大多管排版，不管 AI 畫面

**結論 1C-1：字面上叫「Brand Studio」的只有 Stability AI（2026-04-08，只做圖片）。使用者說的比較可能是 Higgsfield 的 Ads Studio／Marketing Studio，或 Runway 的 Brand Kits。**

證據：
- **Stability AI Brand Studio**（2026-04-08）：Brand Central 放「Brand ID」模型（依攝影風格、色盤、設計元素、logo 位置訓練）和 Campaign（上傳品牌指南當參考圖）；Core 方案免費試用、Enterprise 找業務；沒提到影片〔已核對，廠商自述＋第三方〕([Stability AI](https://stability.ai/news-updates/brand-studio-by-stability-ai-creative-production-platform-for-brands)、[The Decoder, 2026-04-08](https://the-decoder.com/stability-ai-launches-brand-studio-for-brand-consistent-image-generation/))。
- **Higgsfield Ads Studio**（2026-09-30／10-01）：品牌組合存 logo、色碼、字型、語氣、受眾、美感、賣點；貼網址自動建立或手動；一次最多 20 張靜態廣告、每張 4 點；**不做影片**〔已核對，廠商自述〕([Higgsfield blog: Ads Studio](https://higgsfield.ai/blog/higgsfield-ads-studio))。**Marketing Studio**（2026-04）：貼產品網址或上傳產品圖、選一個虛擬人；「Reusing an avatar keeps the same face across variations」；圖片和影片廣告都做〔已核對，廠商自述〕([Higgsfield help: Marketing Studio](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-marketing-studio-to-create-video-ads))。
- **Runway Brand Kits**：logo、色碼、字型、背景、產品照；2026-09-22 起「Agents in Runway MCP can now find your Brand Kits and use those assets as references」〔已核對 changelog；說明頁 403〕([Runway changelog](https://runway.com/changelog))。手動生成時會不會自動套色碼和字型，沒有文件。
- **Canva Brand Kit**：logo、色碼、字型、照片、Brand Voice、模板；Canva AI 依品牌模板產生設計。唯一碰到 AI 像素的是「Generate from photo」：拿 Brand Kit 裡的一張照片當風格參考，一次最多 4 張，只做圖片〔已核對，廠商自述〕([Canva: brand assets](https://www.canva.com/help/find-and-manage-brand-assets/)、[Canva: on-brand images](https://www.canva.com/help/create-onbrand-images-with-ai/))。
- **HeyGen Brand System**、**Creatify Brand Space**：從網址抓 logo、字型、色碼，套到之後的專案；沒寫怎麼影響虛擬人或 AI 畫面〔已核對，廠商自述〕([HeyGen](https://www.heygen.com/academy/brand-kit/how-to-create-your-brand-kit)、[Creatify](https://help.creatify.ai/en/articles/12576512-brand-spaces))。

推理〔推論〕：「品牌組合」幾乎都是**剪輯／排版時**套上去的（logo、字、色），而「同一個人、同一個產品」是**生成時**用參考圖或訓練模型做的。Higgsfield 自己也拆成兩個工具：Ads Studio 管品牌、Elements／Marketing Studio 管長相。Remake 的 P3 品牌素材（Remotion 疊 logo、字型、主色）屬於前者；這份報告要補的是後者。兩者可以放在同一個客戶素材庫畫面裡，對使用者來說是「這個客戶的東西都在這裡」。

弱點：Typeface、Pippit、Creatify、Topview 有沒有叫「Brand Studio」的功能，只做了一次合併搜尋，沒逐一查；Runway Brand Kit 在手動生成時的行為沒有文件。

---

## 2. 技術做法，以及我們清單上的模型支援什麼

### 2A. 圖片：多張參考圖是主力，而且幾乎不加錢

**結論 2A-1：分鏡圖階段用多參考圖鎖住長相。Nano Banana 系列最強也最有結構（分「角色」「物件」「風格」三種格子）；Seedream 4.5 最便宜，參考圖不分類型。**

| 模型 | id／端點 | 參考圖上限 | 9:16 | 每張輸出 | 每張參考圖 | seed | LoRA | 依據 |
|---|---|---|---|---|---|---|---|---|
| Nano Banana 2.1（新預設） | `gemini-nano-banana-2.1` | 共 14；角色 4、物件 10、風格無 | 有（1K 768×1376） | 1K $0.0336／2K $0.0504 | 輸入 $1.50／百萬 token（約 $0.001／張〔推論〕） | 欄位有，效果沒文件 | 無 | 〔主筆複核上限〕〔已核對價格〕 |
| Nano Banana 2 | `gemini-3.1-flash-image` | 同上 | 有 | 1K $0.067／2K $0.101 | $0.50／百萬 token（約 $0.0003／張〔推論〕） | 同上 | 無 | 〔主筆複核〕〔已核對〕 |
| Nano Banana Pro | `gemini-3-pro-image` | 共 14；人物 5、物件 6、風格 3 | 有 | 1K/2K $0.134 | **$0.0011／張** | 同上 | 無 | 〔主筆複核〕〔已核對〕 |
| Seedream 4.5（fal） | `fal-ai/bytedance/seedream/v4.5/edit` | **10**（超過只取最後 10 張） | 用自訂尺寸 1440×2560 | **$0.04 固定** | 不另計 | 有欄位，上游可能忽略 | 無 | 〔主筆複核〕 |
| 參考：FLUX.2 dev edit（fal） | `fal-ai/flux-2/edit` | 4 | 自訂 | $0.012／百萬像素（含輸入） | 算在像素裡 | 有 | 另一個端點 | 〔已核對〕 |

證據補充：
- Google 的圖片生成文件逐字寫「Up to 4 images of characters to maintain character consistency」（2.1 和 3.1 Flash）、「Up to 5 images of characters」「Up to 3 images to be used as style references」（3 Pro），總共「Mix up to 14 reference images」〔主筆複核〕([Gemini API: Image generation](https://ai.google.dev/gemini-api/docs/image-generation))。Vertex 文件：每張輸入圖算 560 token，14 張裡最多 10 張可以是網址〔已核對〕([Vertex: gemini-3-pro-image](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image))。價格〔已核對〕([Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing))。
- Google 官方提示建議：在 prompt 裡給每張參考圖一個角色（「Image A for pose, Image B for style…」），並承認「character consistency across edits may vary」〔已核對，廠商自述〕([Google blog: Nano Banana Pro prompting tips](https://blog.google/products/gemini/prompting-tips-nano-banana-pro/))。第三方指南：用名字指稱主體、不要重新描述長相、每個需要的角度都要有一張參考（背面沒給就會亂畫）〔已核對，第三方〕([Runware: NB2 character consistency](https://runware.ai/docs/models/google-nano-banana-2/guides/character-consistency))。
- Seedream 4.5 on fal：「Presently, up to 10 image inputs are allowed」，`$0.04 per images`，`max_images` 1–6 可一次生成一組連續圖，`seed` 欄位存在〔主筆複核〕([fal: Seedream 4.5 edit](https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit/llms.txt))。第三方說上游 BytePlus 的 4.x／5.x 不吃 seed〔第三方〕([InvokeAI docs](https://invoke-ai.github.io/InvokeAI-7/users-guide/models/external-models/seedream/))。
- 速度（沒有官方數字）：第三方 1K 實測 Nano Banana 2 約 8–15 秒、Pro 約 17–31 秒〔僅摘要，第三方〕([Magic Hour](https://magichour.ai/blog/nano-banana-2-vs-nano-banana-pro-we-benchmarked-both-on-the-same-5-prompts))。
- 品質（一般編輯偏好，**不是一致性**）：Arena 圖片編輯榜（2026-10-23）Nano Banana 2.1 1427（初步）、Pro 1390、NB2 1387、Seedream 4.5 1303（第 27 名）〔已核對，第三方〕([Arena: image edit](https://arena.ai/leaderboard/image-edit))；Artificial Analysis 的排序相同〔已核對〕([AA: image editing](https://artificialanalysis.ai/image/leaderboard/editing))。

推理〔推論〕：以一張分鏡圖帶 3 張參考圖算，Nano Banana 2 多出不到 $0.001，Pro 多 $0.0033，Seedream 不加錢。所以一致性**不需要另外報價**，真正的成本是「不像就重生」。Nano Banana 的參考圖分成角色、物件、風格三種格子，剛好對上套組的「角色／產品／場景／風格」，轉接層可以直接對應；Seedream 沒有類型，只能靠 prompt 說「圖 1 是主角、圖 2 是產品」。所以建議「角色一致」預設用 Nano Banana 2.1 或 Pro，Seedream 當便宜草稿。

弱點：沒有任何獨立的多鏡頭角色一致性測試（只有一般編輯偏好榜）；Nano Banana 2.1 才出約 4 週，Arena 分數是初步的；Flash 系列每張輸入圖的 token 數是用 Pro 的 560 推的。

**結論 2A-2：先替每個角色和產品做一張「多角度設定圖」，之後每一鏡都從這組原圖出發，不要一鏡接一鏡改圖。**

證據：Google 文件的「Character consistency (360 view)」建議分次生成多個角度，後面的生成帶入前面的圖〔已核對，廠商自述〕([Gemini API: Image generation](https://ai.google.dev/gemini-api/docs/image-generation))。Kling 的 O1 Image 可以從一張圖自動生成其他角度〔已核對，廠商自述〕([Kling guide](https://kling.ai/quickstart/klingai-element-library-3-user-guide))。第三方提到 Nano Banana 2.1 每次編輯都重畫整張圖，連續修改會慢慢偏掉，建議每一鏡回到原始參考〔僅摘要，第三方〕。

推理〔推論〕：套組裡的一個角色可以只從 1 張照片開始，系統再用 Nano Banana 生出側面和全身（一次性約 $0.07–0.40），使用者挑好後存回套組。每一鏡都送「原始設定圖」，而不是「上一鏡的結果」，偏移就不會累積。

弱點：「自動補角度」的品質沒有測過；生成的側面本身可能就跟正面不像。

### 2B. 影片：起始畫面是基本盤，參考圖模式是加分

**結論 2B-1：影片的一致性主要來自「分鏡圖當起始畫面」，所有模型都支援。要讓角色轉身、換角度還保持長相時，才用 reference-to-video（Kling O3、H3 Max、Gemini Omni Flash）。我們原本清單上的 Hailuo 02／2.3 不吃參考圖。**

| 模型／模式 | fal 端點 | 能吃什麼 | 9:16 | 長度 | 每秒 | 依據 |
|---|---|---|---|---|---|---|
| Kling O3 Standard 參考轉影片 | `fal-ai/kling-video/o3/standard/reference-to-video` | 起始、結束畫面、參考圖、elements（1 張正面＋1–3 張角度，prompt 用 `@Element1`） | 有 | 3–15 秒 | $0.084（無聲）／$0.112 | 〔主筆複核〕 |
| Kling O3 Pro 參考轉影片 | `…/o3/pro/reference-to-video` | 同上 | 有 | 3–15 秒 | $0.112／$0.14 | 〔已核對〕 |
| Kling v3 Pro 圖轉影片 | `fal-ai/kling-video/v3/pro/image-to-video` | 起始、結束、elements | 沒有比例欄位（推測跟起始圖） | 3–15 秒 | $0.112–0.196 | 〔已核對〕 |
| MiniMax H3 Max 參考轉影片 | `minimax/h3-max/reference-to-video` | 參考圖／影片／聲音共 ≤12 個檔、起始／中間／結束畫面 | 有 | 0.92–15 秒 | 480p $0.05／768p $0.08／1080p $0.16 | 〔主筆複核〕 |
| Hailuo 02 Standard 圖轉影片 | `fal-ai/minimax/hailuo-02/standard/image-to-video` | 起始＋結束畫面，**無參考圖** | 沒有比例欄位 | 6／10 秒 | 768p $0.045 | 〔已核對〕 |
| Hailuo 2.3 Standard 圖轉影片 | `fal-ai/minimax/hailuo-2.3/standard/image-to-video` | **只有起始畫面** | 沒有比例欄位 | 6／10 秒 | $0.28／6 秒 | 〔已核對〕 |
| Gemini Omni Flash 1.1 參考轉影片 | `google/gemini-omni-flash/v1.1/reference-to-video` | 參考圖（沒寫上限，範例 6 張，prompt 用 `<IMAGE_REF_0>`）、≤3 段參考影片、起始／結束畫面 | 有 | 約 3–10 秒 | 720p $0.10／1080p $0.15 | 〔主筆複核 Google 文件〕〔已核對 fal 價格〕 |
| Veo 3.1 參考轉影片 | `fal-ai/veo3.1/reference-to-video` | 參考圖（Google：最多 3 張「asset」） | 有 | **只有 8 秒** | $0.20／$0.40 | 〔主筆複核：2026-11-17 停用〕 |
| 參考：Seedance 2.0 參考轉影片 | `bytedance/seedance-2.0/reference-to-video` | ≤9 張圖（共 ≤12 個檔） | 有 | 4–15 秒 | 720p 約 $0.30 | 〔已核對〕 |

證據補充：Veo 3.1 的參考圖模式在 Vertex 上「只支援 8 秒」，每次最多 3 張主體圖〔已核對，廠商自述〕([Vertex: reference images](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation))。Gemini API 的棄用頁：`veo-3.1-generate-preview`、`-fast-`、`-lite-` 於 2026-10-22 停止，替代品 `gemini-omni-1.1-flash`〔主筆複核〕([Gemini API Deprecations](https://ai.google.dev/gemini-api/docs/deprecations))。Kling 4.0（`kling/v4/reference-to-video`，3–30 秒，720p 每秒 $0.157）也已上 fal〔已核對〕，上市日期 2026-10-15 只有一個第三方來源。

推理〔推論〕：Remake 的流程本來就是「每一鏡的分鏡圖 → 圖轉影片」，起始畫面已經把長相、產品、場景帶進去了。所以**分鏡圖階段的一致性做好，影片階段就有八成**，不吃參考圖的便宜模型（Hailuo 02 每秒 $0.045）也能用。參考圖模式適合「人物轉頭、產品換面」這種起始畫面看不到的東西，價格是 Kling O3 Std 每秒 $0.084、H3 Max 768p $0.08、Omni Flash $0.10，跟原清單同一個價位。三個都支援 9:16。如果 P2 要換掉 Veo 3.1，Omni Flash 是同家族、更便宜、有參考圖的替代。

弱點：**沒有任何獨立的影片角色一致性比較**。Artificial Analysis 的圖轉影片榜只量整體偏好（Seedance 2.5、Seedance 2.0、H3 在前，Omni Flash 第 14）〔已核對，第三方〕([AA: image-to-video](https://artificialanalysis.ai/video/leaderboard/image-to-video))。Kling v3／Hailuo 的輸出比例會跟起始圖走，是從「沒有比例欄位」推的，沒有實測。

**結論 2B-2：不要把上一鏡的最後一格當下一鏡的起始畫面；要接得順，就把下一鏡的分鏡圖當這一鏡的結束畫面。**

證據：只有第三方說法：最後一格接力會讓錯誤累積，因為模型拿到的是自己生成的畫面；建議改用鎖定的角色和場景參考〔僅摘要，第三方〕([invideo FAQ](https://invideo.io/faq/how-do-you-fix-character-drift-when-chaining-ai-video/)、[HackerNoon](https://hackernoon.com/how-to-extend-an-ai-generated-video-clip-past-its-length-limit-without-the-drift))。Kling O3／v3、H3 Max、Hailuo 02、Veo 3.1、Omni Flash 都有結束畫面欄位〔已核對〕。

推理〔推論〕：每一鏡都從「套組＋這一鏡的分鏡圖」出發，所有鏡頭共用同一個源頭，不會一路偏下去。結束畫面是「接得順」的選項，不是預設。

弱點：沒有官方文件，也沒有實測。

### 2C. 訓練、seed、風格

**結論 2C-1：LoRA 訓練在我們的模型清單上用不到；seed 不會讓不同 prompt 的鏡頭長得一樣；風格用文字模板加少量風格圖。**

證據：
- Nano Banana 和 Seedream 都沒有 LoRA 參數，也沒找到官方支援〔已核對 schema；第三方比較表也寫 No〕。fal 上能訓練的是開源模型：`fal-ai/flux-lora-fast-training` 一次約 $2、建議 ≥4 張；`fal-ai/flux-2-trainer` 每步 $0.0064（1000 步 $6.40）、建議 ≥10 張；fal 沒寫訓練時間〔已核對〕。影片 LoRA：Wan 訓練器每步 $0.004–0.005（預設 400 步約 $1.6–2）；MiniMax H3 訓練器**只吃影片片段**（≥10 段、24fps），2000 步約 $20–30、1.5–2.5 小時〔已核對，廠商自述〕([fal: H3 LoRA guide](https://fal.ai/learn/devs/how-to-train-a-lora-for-minimax-h3))。
- seed：Gemini 的 `generationConfig.seed` 存在，但圖片模型文件沒提；論壇說連文字模型都不保證可重現〔已核對 API 參考；論壇僅摘要〕([Gemini API reference](https://ai.google.dev/api/generate-content))。seed 只固定雜訊，換了 prompt 就換了畫面〔推論〕。
- 風格：只有 Nano Banana Pro 有正式的「風格參考」格子（最多 3 張）；Figma Weave 官方用「一段 master style description」接到每個節點〔主筆複核／已核對〕。Midjourney 的 `--sref` 風格碼、Krea style code、Ideogram 8 碼 style code 是各家專屬的，API 用不到〔已核對／僅摘要，見筆記 B〕。

推理〔推論〕：風格最便宜可靠的做法是「固定 prompt 模板」：每個生成請求的開頭自動加上套組的風格說明（例：「35mm 底片感、暖色、柔和日光、淺景深」）和色盤（現有 `Shot.palette` 已經從畫面讀出色碼〔程式碼〕），選 Nano Banana Pro 時再附 1–3 張風格圖。LoRA 要等到「某個客戶有 30 張以上一致的品牌照片、而且要用開源模型」才值得，demo 期間不碰。

弱點：「風格說明＋模板」的效果沒有量化證據；Weave 是廠商自述。

---

## 3. Remake 要怎麼做

### 3A. 資料：客戶層的套組＋ plan 層的「這支片的卡司」

**結論 3A-1：套組存在客戶底下（跨 plan 重用），plan 只存「這支片用哪幾項、每一鏡用哪幾項」。素材要搬到客戶層級的資料夾，不能再只認同一個 plan 的生成結果。**

證據〔程式碼〕：`Client` 型別只有 name、niche、audience、memory 等，沒有素材欄位；`generations.py` 用 `one(idea_id, ref_id)` 解析參考圖，所以參考圖只能是同一個 plan 裡的生成或上傳；規格 §8 說品牌素材「先存在 client 的 Brief 上」。

形狀〔推論〕：
```json
// 客戶層：backend 存一份 kit JSON，圖片放 media/clients/<clientId>/kit/
"kit": { "version": 1, "items": [
  { "id": "k_mia",  "kind": "character", "name": "Mia",
    "note": "20 多歲、黑色短鮑伯、黃色帽 T",
    "images": [ { "assetId": "ka_1", "view": "front" }, { "assetId": "ka_2", "view": "side" } ] },
  { "id": "k_cup",  "kind": "product", "name": "抹茶杯", "note": "白杯、綠色 logo 朝前", "images": [ … ] },
  { "id": "k_shop", "kind": "place",   "name": "門市吧台", "images": [ … ] },
  { "id": "k_look", "kind": "style",   "name": "暖色底片", "note": "35mm、暖色、柔光",
    "palette": ["#e9c46a", "#2a9d8f"], "images": [ … ] } ] }

// plan 層：存在畫布 JSON 裡
"cast": { "itemIds": ["k_mia", "k_cup", "k_look"],
          "perShot": { "shot-3": ["k_mia", "k_shop", "k_look"] } }   // 沒寫的鏡頭＝全部

// 送給後端的生成請求（取代現在的 reference?: string）
"references": [ { "assetId": "ka_1", "role": "character", "itemId": "k_mia", "name": "Mia" },
                { "assetId": "g_88", "role": "startFrame" } ]
```

模型清單（`gen_models.json`）多兩個欄位〔推論〕：
```json
"inputs": { "text": "required", "startFrame": "optional", "endFrame": "optional",
            "references": { "max": 14, "byRole": { "character": 4, "object": 10, "style": 0 } } }
```
轉接層負責翻譯：Gemini 是多個 `inline_data` 加 prompt 前綴「圖 1 是角色 Mia，保持臉和髮型…」；Seedream 是 `image_urls` 加「Figure 1…」；Kling O3 是 `elements: [{frontal_image_url, reference_image_urls}]` 加 `@Element1`；Omni Flash 是 `<IMAGE_REF_0>`；H3 Max 是 `reference_image_urls`。超過上限時依「角色 > 產品 > 場景 > 風格」砍，並在節點上提示〔推論〕。

弱點：`perShot` 的預設（全部帶）可能讓沒有人的鏡頭也硬塞人物，要靠使用者取消；用鏡頭文字自動比對名字是可行的升級，沒有驗證。

### 3B. 畫布：一個套組節點，自動接到每個分鏡圖

**結論 3B-1：畫布左上放一個「套組」節點（顯示這支片的卡司縮圖），系統自動畫線到每個分鏡圖節點的參考埠；影片節點預設只吃分鏡圖，選了支援參考圖的模型才自動多接一條。**

證據：見 1B-1（Weave 的參考節點接到每個生成節點；Higgsfield 的角色要寫在 prompt）和 2B-1（起始畫面是基本盤）。現有程式的參考埠一次只能接一條線（`canConnect` 的 `canvas.conn.taken`）〔程式碼〕。

推理〔推論〕：三個選項的取捨：

| 選項 | 做法 | 好處 | 壞處 | 建議 |
|---|---|---|---|---|
| **A. 套組節點＋自動接線** | 一個節點、系統自動接到每一鏡；鏡頭上可取消勾選個別項目 | 一眼看出「這支片用誰」；改套組就標所有下游「過期」（沿用現有規則，不自動重跑） | 新節點類型；線多時要淡化顯示 | **首選** |
| B. 只把參考埠改成可接多條，讓使用者自己接 | 改 `ports.ts` 一條規則 | 最少工 | 8 鏡 × 3 張＝24 條線；換客戶要重接 | P2 先做這個當底層，A 建在它上面 |
| C. 塞進 P3 品牌素材 | 品牌面板裡多一個「角色」分頁 | 只有一個「客戶素材」畫面 | 品牌素材在剪輯階段才用，生成早就跑完了；時間順序不對 | 不選，但兩者可以共用「客戶素材庫」這個入口 |

「過期」規則直接沿用規格 §5：套組改了，下游分鏡圖和影片標過期、不自動重跑，因為重跑要花錢。

弱點：沒有使用者測試；自動接線在 React Flow 上 20 個節點時的效能沒測。

### 3C. 放哪個階段

**結論 3C-1：P2 只改「契約」（N 張帶角色的參考圖、模型清單欄位、轉接層翻譯、參考埠可接多條）；套組的資料、畫面和套組節點放新的 P2.5；P3 品牌素材不變。**

推理〔推論〕：P2 本來就要寫 fal 和 Gemini 轉接層，同時把 `reference?: string` 改成 `references: []` 幾乎不多花工，反過來事後再改要動到每個轉接層、工作表的 `input_hash` 和測試。套組牽涉新的客戶層級儲存、一個編輯畫面、畫布新節點，是一個能獨立驗證的單位：「上傳 1 張人像和 1 張產品照 → 6 鏡分鏡圖都是同一個人拿同一個杯子」。這個 demo 句子本身就是很好的驗收標準。花費：用 Nano Banana 2.1 生 6 張分鏡圖約 $0.20，加 2 段 H3 Max 480p 5 秒影片約 $0.50，總計約 $0.70，低於 US$1（用 768p 則約 $1.00）〔推論，用 §2 的單價算〕。

弱點：P2.5 的工時沒有估；如果 demo 日期近，可能只來得及做 P2 的契約和選項 B。

---

## 風險與未驗證項目

| 項目 | 為什麼重要 | 怎麼確認 |
|---|---|---|
| 沒有任何獨立的「多鏡頭角色一致性」測試（圖片或影片） | 模型推薦只能靠一般偏好榜和廠商說法 | 做一次小 A/B：同一組 3 張參考、6 鏡、9:16，比 Nano Banana 2.1 vs Seedream 4.5；影片比 Kling O3 Std vs H3 Max vs Omni Flash（約 US$2–3，要先報價） |
| Veo 3.1 在 fal 的參考圖端點 2026-11-17 停用；Gemini API preview 已停 | 規格 §6 的「最好」影片模型要換 | 開 fal 和 Google 頁面確認；改列 Omni Flash 1.1 |
| Kling v3、Hailuo 02/2.3 沒有比例欄位，9:16 是推測 | 規格要求只列支援 9:16 的模型 | 用 mock 以外的一次真實呼叫確認（<$0.50） |
| Runway、Freepik、Midjourney 文件 403；Pika 沒有官方來源 | §1 部分產品細節只有摘要 | 試用或換時間再抓 |
| 「自動接線」「多角度設定圖」的效果沒有任何產品數據 | 是本報告的設計假設 | 做出來給團隊試 |
| 價格和模型 id 是 2026-11-03 快照；Nano Banana 2.1、Kling 4.0、H3 都是近 3 個月的新東西 | 註冊表會很快過時 | 上線前逐一開原廠頁 |
| Gemini 的 `seed` 對圖片模型有沒有作用沒測 | 本報告建議不依賴它 | 不需要做 |

## 建議的下一步

1. **P2 範圍內**：把 `GenRequest.reference` 改成 `references: [{assetId, role}]`，模型清單加 `endFrame` 和 `references.max／byRole`，參考埠允許多條線（在上限內），轉接層各自翻成 Gemini／Seedream／Kling／H3／Omni 的格式。mock 模型也要吃 N 張，好讓測試走得到。
2. **P2 範圍內**：模型清單換掉 Veo 3.1（改 Gemini Omni Flash 1.1），圖片加入 Nano Banana 2.1；影片的「角色一致」預設放 Kling O3 Std 或 H3 Max（兩者都要先上官方頁核對價格）。這兩項改動和規格 §6 的起始清單不同，要使用者拍板。
3. **新開 P2.5「一致性套組」**：客戶層的套組 JSON 和 `media/clients/<id>/kit/`；套組編輯畫面（上傳、命名、類型、一行描述、可選「自動補側面」）；plan 的 `cast`；畫布套組節點和自動接線；prompt 模板自動加角色說明和風格說明。
4. **驗收**：同一個客戶的兩個 plan，各 6 鏡，人物和產品一眼看得出是同一個；總花費低於 US$1。
5. **P3 不變**：品牌素材（logo、字型、主色）照原計畫在 Remotion 疊加；介面入口可以和套組放在同一個「客戶素材」頁。產品 logo 若要保證正確，用 Remotion 疊真實 logo，不要指望 AI 畫對字〔推論；Dreamina 自己的頁面也承認 logo 和包裝要人工檢查〔已核對〕〕。

## 結論

這次研究的核心發現是：**一致性在 2026 年已經不是模型訓練問題，而是素材管理問題**。各家產品不約而同做了「命名參考組＋`@名字`」，模型端也都開了 4–14 張參考圖的口，而且參考圖幾乎不收錢。Remake 有兩個天然優勢：一是 agency 本來就以「客戶」為單位工作，套組放在客戶底下，第二支片就自動受益；二是 Remake 的流程先做分鏡圖、再轉影片，所以只要分鏡圖階段鎖住長相，影片模型就算不吃參考圖也能接得上。真正要小心的是時序：P2 現在寫的轉接層只認一張參考圖，先把契約改對，套組之後才能便宜地加上去。

---

## 來源

所有來源存取日期 2026-11-03。標籤：〔主筆複核〕＝撰寫時再開原頁對過；〔已核對〕＝研究員開了原頁；〔僅摘要〕＝只看到搜尋摘要；〔第三方〕＝非原廠。

**產品（廠商）**
- Higgsfield changelog — https://higgsfield.ai/changelog 〔已核對〕
- Higgsfield help: How do I create and use a Soul ID character（2026-09-02 更新）— https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character 〔已核對〕
- Higgsfield help: How do I use Canvas — https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas 〔已核對〕
- Higgsfield help: Marketing Studio（2026-10-26 更新）— https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-marketing-studio-to-create-video-ads 〔已核對〕
- Higgsfield blog: Ads Studio（2026-10-01）— https://higgsfield.ai/blog/higgsfield-ads-studio 〔已核對〕
- Runway help: Creating with Gen-4 Image References — https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References 〔僅摘要，403，可能過時〕
- Runway changelog — https://runway.com/changelog 〔已核對〕
- Krea docs: Training — https://www.krea.ai/docs/user-guide/features/training 〔已核對〕
- Krea changelog — https://www.krea.ai/docs/changelog 〔已核對〕
- Flora docs: Styles (deprecated) — https://docs.flora.ai/faqs-how-to.../styles 〔已核對，無日期〕
- Figma blog: Five Figma Weave workflows（2026-04-09）— https://www.figma.com/blog/five-figma-weave-workflows/ 〔已核對〕
- Figma: AI consistent character generator — https://www.figma.com/solutions/ai-consistent-character-generator/ 〔已核對〕
- Magnific (Freepik) pricing — https://www.magnific.com/pricing 〔已核對〕
- Stability AI: Brand Studio — https://stability.ai/news-updates/brand-studio-by-stability-ai-creative-production-platform-for-brands 〔已核對〕
- Kling: Element Library user guide（2026-02-05）— https://kling.ai/quickstart/klingai-element-library-3-user-guide 〔已核對〕
- Kling blog: Subject Binding（2026-06-26）— https://kling.ai/blog/kling-3-subject-binding-character-consistency 〔已核對，效果數字未驗證〕
- Google Flow Help 16353334／16352836／16935308／16935718 — https://support.google.com/flow/answer/16353334 等 〔已核對〕
- Ideogram docs: Reference features — https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features 〔已核對〕
- Midjourney: V8.1 is now the default — https://updates.midjourney.com/v8-1-is-now-the-default-model/ 〔已核對；docs.midjourney.com 全部 403〕
- Luma: Ray3 Modify user guide — https://lumalabs.ai/learning-hub/ray3-modify-user-guide 〔已核對，頁面日期衝突〕
- Canva: Find and manage brand assets — https://www.canva.com/help/find-and-manage-brand-assets/ 〔已核對〕
- Canva: Create on-brand images with AI — https://www.canva.com/help/create-onbrand-images-with-ai/ 〔已核對〕
- Adobe: Firefly Custom Models — https://www.adobe.com/gr_en/products/firefly/features/custom-models.html 〔已核對〕
- Hedra docs: Create element — https://www.hedra.com/docs/pages/app/content-creation/create-element.md 〔已核對〕
- HeyGen: How to create your brand kit — https://www.heygen.com/academy/brand-kit/how-to-create-your-brand-kit 〔已核對〕
- Creatify help: Brand Spaces — https://help.creatify.ai/en/articles/12576512-brand-spaces 〔已核對〕
- Dreamina: AI video generator for more consistent results（2026-06-24）— https://dreamina.capcut.com/ai-video/ai-video-generator-for-more-consistent-results 〔已核對〕

**模型（官方文件與 fal 頁面）**
- Gemini API: Image generation — https://ai.google.dev/gemini-api/docs/image-generation 〔主筆複核〕
- Gemini API: Pricing — https://ai.google.dev/gemini-api/docs/pricing 〔已核對〕
- Gemini API: Deprecations — https://ai.google.dev/gemini-api/docs/deprecations 〔主筆複核〕
- Gemini API: Omni（Gemini Omni Flash）— https://ai.google.dev/gemini-api/docs/omni 〔主筆複核〕
- Gemini API reference: generateContent（seed）— https://ai.google.dev/api/generate-content 〔已核對〕
- Vertex AI: gemini-3-pro-image — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image 〔已核對〕
- Vertex AI: Veo 3.1 generate — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate 〔已核對〕
- Vertex AI: Use reference images to guide video generation — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation 〔已核對〕
- Google blog: Nano Banana Pro prompting tips — https://blog.google/products/gemini/prompting-tips-nano-banana-pro/ 〔已核對〕
- Google blog: Veo 3.1 Ingredients to Video（2026-01-13）— https://blog.google/innovation-and-ai/technology/ai/veo-3-1-ingredients-to-video/ 〔已核對〕
- fal: Seedream 4.5 edit — https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit/llms.txt 〔主筆複核〕
- fal: Kling O3 Standard reference-to-video — https://fal.ai/models/fal-ai/kling-video/o3/standard/reference-to-video/llms.txt 〔主筆複核〕
- fal: Kling v3 Pro image-to-video — https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api 〔已核對〕
- fal: MiniMax H3 Max reference-to-video — https://fal.ai/models/minimax/h3-max/reference-to-video/llms.txt 〔主筆複核〕
- fal: Hailuo 02 / 2.3 image-to-video — https://fal.ai/models/fal-ai/minimax/hailuo-02/standard/image-to-video/llms.txt 等 〔已核對〕
- fal: Veo 3.1 reference-to-video（停用公告）— https://fal.ai/models/fal-ai/veo3.1/reference-to-video/api 〔主筆複核〕
- fal learn: How to use Gemini Omni Flash 1.1 — https://fal.ai/learn/tools/how-to-use-gemini-omni-flash-1-1 〔已核對〕
- fal learn: How to train a LoRA for MiniMax H3 — https://fal.ai/learn/devs/how-to-train-a-lora-for-minimax-h3 〔已核對〕
- fal: flux-lora-fast-training、flux-2-trainer、wan-trainer — https://fal.ai/models/fal-ai/flux-lora-fast-training/llms.txt 等 〔已核對〕

**第三方**
- aiproductivity.ai: Higgsfield consistent AI character（2026-10-25）— https://aiproductivity.ai/blog/higgsfield-consistent-ai-character/ 〔已核對，第三方，和官方數字衝突〕
- The Decoder: Stability AI launches Brand Studio（2026-04-08）— https://the-decoder.com/stability-ai-launches-brand-studio-for-brand-consistent-image-generation/ 〔已核對〕
- Runware: NB2 character consistency guide — https://runware.ai/docs/models/google-nano-banana-2/guides/character-consistency 〔已核對〕
- InvokeAI docs: Seedream — https://invoke-ai.github.io/InvokeAI-7/users-guide/models/external-models/seedream/ 〔已核對〕
- Arena: Image edit leaderboard（2026-10-23）— https://arena.ai/leaderboard/image-edit 〔已核對〕
- Artificial Analysis: Image editing / Image-to-video leaderboards — https://artificialanalysis.ai/image/leaderboard/editing 、https://artificialanalysis.ai/video/leaderboard/image-to-video 〔已核對〕
- Magic Hour: NB2 vs NB Pro benchmark — https://magichour.ai/blog/nano-banana-2-vs-nano-banana-pro-we-benchmarked-both-on-the-same-5-prompts 〔僅摘要〕
- invideo FAQ: character drift when chaining — https://invideo.io/faq/how-do-you-fix-character-drift-when-chaining-ai-video/ 〔僅摘要，廠商行銷〕
- HackerNoon: extend an AI video clip without drift — https://hackernoon.com/how-to-extend-an-ai-generated-video-clip-past-its-length-limit-without-the-drift 〔僅摘要〕

**程式碼**（Remake repo，`pivots/02-content/app/trend-finder/`）：`backend/gen_models.json`、`src/lib/canvas/ports.ts`、`src/lib/canvas/graph.ts`（`GenRequest`）、`backend/generations.py`、`src/types.ts`（`Client`、`Shot.palette`）〔程式碼〕
