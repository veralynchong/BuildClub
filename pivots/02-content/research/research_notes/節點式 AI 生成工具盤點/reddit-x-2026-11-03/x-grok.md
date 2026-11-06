# X 側：Grok 回答（使用者於 2026-11-03 貼回）

## oEmbed 抽查（verify_x.py，2026-11-03）：6/6 作者、日期、內文相符；按讚數無法驗證

| 連結 | 作者 | 日期 | 結果 |
|---|---|---|---|
| https://x.com/ComfyUI/status/2105697121190178891 | @ComfyUI | 2026-10-01 | 相符（官方公告，非使用者經驗） |
| https://x.com/RaphaelLiu10/status/2115913910075449637 | @RaphaelLiu10 | 2026-10-29 | 相符；原文另寫 "MIT licensed… bring any AI-video provider's API" |
| https://x.com/c__byrne/status/2049619957647028538 | @c__byrne（ComfyUI 員工） | 2026-04-29 | 相符；利害關係人 |
| https://x.com/MengTo/status/2117298331361915188 | @MengTo | 2026-11-02 | 相符 |
| https://x.com/FellMentKE/status/2117295315565121868 | @FellMentKE | 2026-11-02 | 相符；Grok 稱回覆多為合作／促銷，疑似 Dreamina 業配 |
| https://x.com/SataEricUX/status/2116938308043559412 | @SataEricUX | 2026-11-01 | 相符 |

未抽查：#6 @SD_Tutorial、#7 Krea（Grok 沒給具體連結）、#8–#10 低互動抱怨貼文（#9、#10 Grok 未給或只給部分連結）。

## 可信度標記
- 高互動的 #2、#5、#3 都是廠商或開源作者自己發的；#4 疑似業配。真正的「使用者抱怨」只來自低互動貼文（#8–#11）。
- Grok 自己標註多則「N 個免費 GitHub 工具」貼文是模板化洗流量內容。
- Grok 很少找出反對意見；「沒找到反對」應視為「沒查」。

## Grok 原文

**以下整理自 2025-11-03 起 X 上較高互動的貼文／串（以 likes、reposts、bookmarks 為主，優先具體經驗與意見；純公告／廣告較少納入）。數字為工具回傳的近似值，無法確認者標「unknown」。所有主張皆對應具體貼文。**

1. **@MengTo**（2026-11-02）https://x.com/MengTo/status/2117298331361915188 — 約 296 likes / 21 reposts / 321 bookmarks。用 Figma Weave 單一 canvas 產出四季同一構圖、深度圖與 motion studies，再交給 Claude Code 建頁。回覆：多為讚美與詢問細節；有人提到折扣碼，無明顯反對。
2. **@RaphaelLiu10**（2026-10-29）https://x.com/RaphaelLiu10/status/2115913910075449637 — 約 581 likes / 61 reposts / 666 bookmarks。開源 Higgsfield Canvas 替代品，可本地跑 ComfyUI、無訂閱。回覆：有人說會吸引新手、有人提到 GPU 負擔；整體偏支持開源。
3. **@c__byrne**（ComfyUI 工程師，2026-04-29）https://x.com/c__byrne/status/2049619957647028538 — 約 436 likes / 17 reposts / 473 bookmarks。ComfyUI 是 agentic 媒體創作最佳方式，workflow 是可重現的 primitive。回覆：硬體門檻（高 VRAM）、開源模型仍落後付費 API。
4. **@FellMentKE**（2026-11-02）https://x.com/FellMentKE/status/2117295315565121868 — 約 179 likes / 114 reposts / 68 bookmarks。Dreamina Canvas 讓創作不必每次從零開始。回覆：有人建議保留早期想法方便回退；多為合作／促銷相關。
5. **@ComfyUI**（2026-10-01）https://x.com/ComfyUI/status/2105697121190178891 — 約 5732 likes / 133 reposts / 953 bookmarks（官方）。Comfy Agent 可在 canvas 上規劃、建與修 workflow，降低複雜度。回覆未深入檢查。
6. **@SD_Tutorial**（2026-11-03）https://x.com/SD_Tutorial/status/2117520590823383413 — 約 92 likes / 172 bookmarks。ComfyUI H3 Continuity Studio node pack，支援 multi-shot、跨場景視覺記憶。
7. **@krea_ai 相關**（約 2026-10-30）無具體連結 — 約 176–184 likes。Krea Nodes 支援 multiplayer 即時共編。"Node graphs were always the part… stayed single player…"
8. **@YuliyaValen1999**（2026-10-30）https://x.com/YuliyaValen1999/status/2116151418008768683 — 低互動。ComfyUI 更新太多跟不上，只固定既有 workflow，仍需 Photoshop 手修。
9. **@Not_Weird_Green**（2026-10-31）https://x.com/Not_Weird_Green/status/2116377396722938080 — 低互動。"the absolute cancer of comfyui… comfy outputs ALWAYS look worse"
10. **@SodaLenss**（2026-10-30）無連結 — 低互動。"ComfyUI's node spaghetti is a whole course by itself"
11. **@SataEricUX**（2026-11-01）https://x.com/SataEricUX/status/2116938308043559412 — 低–中互動。因 credit 過期與 burst 使用模式，不再付費 Higgsfield／Weave／Flora，改自建。
12–15. 多為「ComfyUI + 免費 repo 列表」型貼文（如 @e1genqq，500–6000+ likes），模板化／engagement-farmed。

### 總結
- A 共識：Node／canvas 讓 workflow 可重用、可分支、可分享，比「一次 prompt 一次結果」適合複雜專案；開源本地可避訂閱與 credit 驚喜花費；canvas 有助保持方向一致、減少每次重來。
- B 爭議：學習曲線（Agent 降門檻 vs. node spaghetti、更新太多、輸出較差）；canvas vs 單 prompt；開源免費 vs 付費 credit 過期、burst 使用不划算。
- C 少數觀點：Krea multiplayer 讓 graph 變工作室資產；workflow 成為 agent 可推理的 primitive；有人自建 canvas 取代 Higgsfield／Weave／Flora；H3 Continuity 類 node pack 處理 multi-shot 一致性。
- D 找不到：一致性失敗的具體案例；「偏好 timeline 勝過 node」的高互動個人經驗；Freepik Spaces、Runway Workflows、ImagineArt、Flora 的深度使用者抱怨；credit 驚喜花費的高互動具體數字；2025-11 到 2026 年中的較早討論。
