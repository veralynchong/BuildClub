# 讓 AI 做苦工，讓人做決定：兩週剪輯功能取捨

**結論先講：未來兩週建議做三個 AI 功能（排序是推論，不是來源直接給的結論）：(1) 逐字時間戳自動字幕，加上每個客戶一組品牌樣式預設；(2) 每個鏡頭的「清剪」，自動去掉靜音、贅詞（um/uh）和重來的段落，但先列成建議清單，讓人逐項確認後才套用；(3) 腳本對位，把每個分鏡格位上傳的素材轉成逐字稿，對照該鏡頭的腳本台詞，自動抓出 in/out 點、標出缺漏或不符的台詞，同一格有多個 take 時列出前三名讓人挑。** 前兩項在市場上已是標配：Descript、OpusClip、Submagic、Gling、Kapwing 幾乎都有，下週的外部測試者會預期看到，沒有就扣分。第三項才是差異點：會拿腳本去對使用者「自己拍的」素材的產品只有 invideo agent、ClipMatch、Cutback、DaVinci Resolve IntelliScript 等少數幾個，而且**沒有一家以「分鏡格位」當輸入**。我們的流程本來就知道每段素材屬於哪個鏡頭，最難的配對問題因此消失，AI 只需要在格位內對齊台詞。UI 方面，建議以分鏡卡格位當主畫面，時間軸收起來當微調工具；AI 結果一律用可逐項接受的清單呈現，不要一鍵直接套用；審核連結要有明確的「核准／要求修改」按鈕。Reddit 和 X 上的使用者一致的看法是：AI 適合做機械性的工作，不擅長品味判斷。所以這三項都設計成「AI 提議、人決定」。**上線前必查：Remotion 不是開源軟體。超過 3 人的公司需要付費授權，而且官方 FAQ 明文把「做影片編輯器或使用 Remotion Player 的組織」歸入 Remotion for Automators：每次 render US$0.01，每月最低 US$100（2026-11-11 已對照原頁核對）。**

**證據標記說明。** 本報告每個結論都按「證據 → 推理 → 弱點」寫。證據的核對狀態分三級：「**已核對**」表示撰寫本報告時（2026-11-11）重新打開原頁對照過；「**筆記讀過原頁**」表示研究筆記作者用 WebFetch 讀過原頁，但 WebFetch 會先用小模型摘要，價格和方案細節可能有擷取誤差，本次沒有再核對；「**二手／摘要**」表示來源是第三方評論、搜尋摘要或論壇貼文，可信度較低。Reddit 貼文是透過 Arctic Shift 存檔讀取的，分數是存檔當時的快照；X 貼文的作者、日期、內文用 oEmbed 確認過，但**拿不到按讚數，熱門程度未知**。所有存取日期都是 2026-11-11，除非另外註明。

## 三項建議與兩週排程一覽（推論）

下表是本報告的建議摘要。排序和工時都是推論，依據是後面各節的證據，以及我們已有的技術堆疊（React + Vite + TS、React Flow、Python/SQLite、ffmpeg、Remotion、本機 whisper-cli）。

| 排序 | 功能 | AI 做什麼 | UI 模式 | 預估工時（推論） | 主要風險 |
|---|---|---|---|---|---|
| 1 | 逐字自動字幕 + 品牌樣式預設 | whisper-cli 產生逐字時間戳 → 轉成 Remotion `Caption` | 字幕文字清單可逐字修改、在畫面上拖曳位置、每個客戶存 3–5 組樣式 | 3–4 天 | 澳洲口音、品牌名稱的辨識率未知 |
| 2 | 每鏡頭清剪（靜音／贅詞／重來） | 同一份逐字稿 + ffmpeg `silencedetect` → 算出保留區段 → 寫成 trim in/out | 建議清單：逐項試聽、保留／刪除、全部套用、可還原 | 3–4 天 | 切太狠會切到字尾；Whisper 可能漏掉贅詞 |
| 3 | 腳本對位 + take 建議 | 逐字稿對照該格腳本台詞，算出相似度，自動定 in/out、標出缺漏，多個 take 時排前三名 | 分鏡卡上顯示「6 格中 5 格有素材、4 格台詞已對上」；卡片內用版本堆疊放候選 take | 4–5 天 | 沒有現成開源專案；選 take 碰到「品味」問題 |
| 非 AI 但必做 | 審核連結明確核准 | 無 | Frame.io 式時間碼留言 + 「核准／要求修改」按鈕 | 1–2 天 | 無 |

建議的節奏是：下週測試前完成 1 和 2，因為這兩項是測試者會預期看到的基本功能；第二週做 3，這是差異點，可以拿測試者回饋來調整。

## 清剪和字幕已是標配，「腳本對真實素材」幾乎沒人做

**結論 A：去靜音／贅詞／重來、動態字幕、9:16 輸出已是商品化功能。沒有這些會被扣分，但做了也構不成賣點。**

證據方面，Descript 的定價頁把「Remove filler words」列在所有方案（Free 版有限制）([Descript pricing](https://www.descript.com/pricing))。Gling 連 Free 方案都有去靜音和「remove bad takes」([Gling pricing](https://www.gling.ai/pricing))。Submagic 的「Smart Trim」有 Natural/Fast/Extra Fast 三種模式，字幕支援 118 種語言，並和 Brand Kit 連動 ([Submagic Auto Video Editor](https://www.submagic.co/features/auto-video-editor))。OpusClip Starter 有語音清理，Pro 加上 bad-take 移除 ([OpusClip pricing](https://www.opus.pro/pricing))。Kapwing 有「Smart Cut」([Kapwing pricing](https://www.kapwing.com/pricing))。以上都是**筆記讀過原頁**，來源都是廠商頁面。

推理：功能分布這麼廣，代表代理商用過任何一套工具後都會把它當成預設。對我們來說，這兩項是「入場券」，不是護城河。

弱點：全部是廠商自己的說法，沒有獨立測試。筆記也指出 Submagic 定價頁對「哪個方案有去靜音」前後不一致，定價細節可能有擷取誤差。

**結論 B：拿腳本去組裝使用者自己拍的素材，這類產品很少，而且沒有一家以分鏡格位為輸入。這是我們最明確的空隙。**

證據方面，invideo 的 agent 頁寫著，有腳本時會「cut against it line by line and flag anything the footage is missing」，並且「Every cut the agents make is a clip on the timeline」；Resolve 要透過 OpenTimelineIO 匯入 ([invideo auto video editor](https://invideo.io/make/auto-video-editor/))（**已核對**）。ClipMatch 是逐行對素材，每行給三個候選和一個信心分數，低分會標出來給人檢查，輸出 1080×1920 MP4，並且明說「You don't touch a timeline」([ClipMatch](https://clipmatch.io/script-to-video))（**已核對**，但只有廠商頁，找不到獨立報導，頁面也沒有說明分數的尺度或門檻）。Cutback 的 Premiere 外掛有 Strict 模式（完全照腳本，可能丟掉不符的素材）和 Flexible 模式（保留腳本外的內容）([Cutback Auto Rough Cut](https://intercom.help/cutback-79a5f04f05ec/en/articles/11659231-auto-rough-cut))（**筆記讀過原頁**）。DaVinci Resolve 20 Studio 的 IntelliScript 會依腳本挑最佳 take 建立時間軸，候選 take 放在額外軌道 ([Engadget](https://www.engadget.com/apps/davinci-resolve-20s-latest-ai-feature-can-create-an-entire-timeline-based-on-a-script-120009351.html))，但這是 2025-04 的消息，**已超過 12 個月**，而且是桌面軟體。Adobe Premiere 的 AI Assistant（2026-06 公測）目前還明確「not yet supported」腳本輸入 ([Adobe community](https://community.adobe.com/announcements-727/meet-your-new-assistant-editor-ai-assistant-in-premiere-pro-is-now-in-public-beta-1629317))（**筆記讀過原頁**）。OpusClip 自己的部落格也承認，AI Producer 是為單人對鏡頭的素材設計的，不適合多鏡頭 ([OpusClip blog](https://www.opus.pro/blog/best-ai-video-editing-agents))。

推理：既有產品要解決的是「這段素材對應哪句台詞」的配對問題，做法是靠語音比對（IntelliScript、Cutback）或畫面描述（ClipMatch）。我們的使用者是按鏡頭上傳素材，配對在上傳那一刻就完成了，AI 只剩兩件小事：在格位內對齊台詞，以及在多個 take 之間排序。這是設計上的推論，沒有任何來源直接這樣說。

弱點：研究用的是關鍵字搜尋，可能漏掉小型產品。沒有任何產品的腳本對位準確度有獨立評測。Descript Underlord 的「assemble scenes from a script」到底是用上傳的素材還是生成畫面，也還沒確認 ([Descript video editing](https://www.descript.com/video-editing))。

**結論 C：2026 年的主流方向是 agent／MCP 對話式剪輯，但這不是兩週內該追的東西。**

證據方面，VEED 在 2026-04-30 推出 MCP server，2026-08-03 推出 OpenEdit ([VEED changelog](https://changelog.veed.io))。OpusClip 4.0 在 2026-11-02 推出 AI Producer 外掛 ([OpusClip 4.0](https://www.opus.pro/blog/opusclip-4-0))。Descript 在 2026-11-03 推出 Underlord Skills ([Descript updates](https://www.descript.com/blog/article/descript-updates-oct-2026))。以上都是**筆記讀過原頁**。不過使用者對 Underlord 的評價很差：「Underlord is mostly useless. Does the wrong tasks and never confirms before doing it」([r/Descript 2026-01-15](https://www.reddit.com/comments/1qdx64t))（二手，小型討論串）。

推理：大廠已經把 agent 做出來了，兩週內正面競爭沒有勝算。使用者抱怨的重點又正好是「不先確認就動手」，所以先把可審核的確定性功能做好，比較划算。

弱點：負評樣本小，而且 r/Descript 本來就是容易聚集不滿用戶的客服型社群。

## 介面設計正在收斂：一個主畫面配一條時間軸，AI 建議先審核再套用

**結論 D：主流介面是「一個主要操作面（逐字稿、分鏡卡或格位）＋一條次要的多軌時間軸」。我們的 React Flow 分鏡卡正好可以當那個主要操作面。**

證據方面，Descript 的編輯器分成 Script editor、Scene editor、Timeline 三個區塊，另有 Storyboard 視圖把每個場景顯示成磚塊，拖曳就能重排 ([Descript editor interface](https://help.descript.com/hc/en-us/articles/37585546799757-The-editor-interface)；[Descript Scenes](https://help.descript.com/getting-started/scenes.md))（**筆記讀過原頁**）。CapCut 的網頁版模板編輯器底部是一排編號格位：選一個格位、點一段素材，預覽就會重建；旁邊的「Batch replace」會顯示「5 of 6」這種已替換數量 ([CapCut web editor template guide](https://www.capcut.com/create/capcut-web-editor-template-guide))（**筆記讀過原頁**，文章日期 2026-08-31）。LTX Studio 也是分鏡加時間軸的雙視圖，在時間軸上移動鏡頭，分鏡會同步更新 ([CineD](https://www.cined.com/ltx-studio-takes-its-next-big-step-editing/))。Descript 的「Replace media」換素材時會保留已套用的字幕和調整 ([Descript Replace media](https://help.descript.com/visuals/replace-media.md))。

推理：行銷人員想事情的方式是「一串鏡頭」，不是「多條軌道」。建議做法：分鏡卡當主畫面；每張卡是一個格位，空的時候顯示虛線「拖素材到這裡」；畫面頂部放 CapCut 式的完成度計數；時間軸預設收起，只在精修 in/out 時展開；換素材時保留字幕設定。CapCut 和 Frame.io 都沒有完全這樣做，這是組合兩者的設計推論。

弱點：沒有找到針對行銷人員比較不同介面範式的可用性研究。Canva 和 Premiere 的介面細節都是二手資料（Adobe 的 helpx 頁對抓取工具回傳 403）。

**結論 E：AI 的編輯建議應該做成「可逐項接受的清單」。一鍵魔法加事後 undo 的做法，正是使用者抱怨的對象。**

證據方面，Descript 的贅詞面板會列出偵測到的每個詞，附時間碼和試聽。每一項有四個選項：Delete、Delete and replace with gap、Ignore（劃線但移除音訊）、Remove from transcript（只改文字、保留音訊）。另有「Avoid harsh cuts」選項，會跳過「can't be removed without clipping into nearby words」的贅詞 ([Descript Filler words](https://help.descript.com/hc/en-us/articles/10164806394509-Filler-words))（**已核對**）。刪掉的媒體只是隱藏，可以用「Restore removed media」還原（同頁，**筆記讀過原頁**）。Underlord 每次回應都附 Revert 按鈕，並在動手前存一個 checkpoint ([Descript Revert](https://help.descript.com/ai-assistant/revert.md))。另一種做法是 VEED Magic Cut 的「one click」直接套用 ([VEED tools](https://veed.io/tools/video-editor))（二手）。使用者端的說法是：「the suggested edits are 80% accurate but I ultimately keep the other 20%… still saves me an hour or two」([r/Descript 2026-01-15](https://www.reddit.com/comments/1qdx64t))。

推理：AI 大約八成正確、兩成需要人修，這種情況下「先列清單、預設全選、可逐項取消、可還原」最合適。我們的 trim 存成 SQLite 裡的 in/out 數值，本來就是非破壞性編輯，做還原的成本很低。

弱點：沒有找到任何前後對照（A/B 切換）的 AI 編輯介面可以參考。除了 OpusClip 的 Virality Score 和 ClipMatch，沒有編輯助理顯示信心數字，OpusClip 自己的文件也說那個分數只能在同一支影片內比較 ([Opus Virality score](https://help.opus.pro/docs/article/virality-score.md))。

**結論 F：審核連結可以照抄 Frame.io 的免登入留言模式，再補上 Frame.io 文件裡沒寫的「明確核准」。**

證據方面，Frame.io 的客戶分享連結不需要登入；未登入的人第一次留言時會被要求填姓名和 email；開始打字時影片自動暫停，留言因此帶時間碼；可以拖曳黃色選取器做時間範圍留言；點圓圈可以把留言標為完成 ([Frame.io share links for clients](https://help.frame.io/en/articles/9105242-share-links-explained-for-clients))（**已核對**）。核對時發現該文**沒有描述正式的核准步驟**，最接近的是可以讓審閱者更新評分或狀態的「Featured Field」，所以筆記裡「Frame.io 沒有核准」的說法要修正為「沒有明確的核准流程」。Adobe Workfront 整合用的是 Approve／Approve with changes／Needs work 三種狀態 ([Adobe Workfront](https://experienceleague.adobe.com/en/docs/workfront/using/review-and-approve-work/document-reviews-and-approvals/review-and-approve-documents/review-with-frame))。使用者端，r/editors 一篇 208 分的貼文說「A vague brief turns into 4 rounds. A clear one turns into 1」，並建議把修改次數上限寫進合約 ([r/editors 2026-05-25](https://www.reddit.com/comments/1tn3lhc))。X 上也有剪輯師抱怨客戶傳來一份 60 多項、由 ChatGPT 分析出來的修改 PDF，其中有些修改影片裡早就做了 ([Flores o Editor 2026-07-28](https://x.com/floresoeditor/status/2082090488707129854))。

推理：修改來回是 Reddit 和 X 都出現的痛點。有時間碼的留言加上一個明確的「核准」按鈕，讓客戶的回饋落在影片的某個時間點上，可以減少散落在 email 和 PDF 裡的意見。這不是 AI 功能，但它是我們流程的最後一步，成本低、可見度高。

弱點：Frame.io 的實際介面可能比文件寫的功能更多。也沒有找到代理商談論「編輯工具內建審核」的使用者討論。

## 使用者要 AI 做機械工作，不要 AI 替他決定什麼好

**結論 G：在 Reddit 和 X 上都站得住的共識是「AI 適合機械性剪輯，缺的是品味」。使用者重視的依序是字幕、清剪、逐字稿導覽；對 AI 自己挑「最佳 take」或全自動成片則有敵意。**

證據方面，r/VideoEditing 一篇 442 分的討論串（2026-09-08）裡，最高分留言（452 分）說「The important value you are providing is knowing what to edit, not controlling the software… Develop taste」；另一位外掛開發者說 AI 自動做出來的社群影片「Most are mid at best」([r/VideoEditing](https://www.reddit.com/comments/1wavkzc))。r/editors 談 Premiere AI Assistant 的貼文（82 分）有人留言「I decide what the best shot is not an assistant」([r/editors 2026-06-25](https://www.reddit.com/comments/1ufo9r9))。X 上有人轉述廠商自己的測試：AI 和專業剪輯師「made the same cuts 84% of the time… the last ~16% is where a human's judgment wins」([Kimmonismus 2026-06-15](https://x.com/kimmonismus/status/2066508157585956934))。字幕被當成理所當然的基本功能：CapCut 把自動字幕放進付費牆，引起「Greedy bastards」的抱怨（37 分）([r/CapCut 2026-03-13](https://www.reddit.com/comments/1rsj92l))；r/VideoEditing 的版主公告甚至說字幕「costs pennies per month. Not dollars」([r/VideoEditing 2026-08-28](https://www.reddit.com/comments/1w0sst2))。

清剪品質也有很具體的門檻。一位全職接案剪輯師的 840 分貼文建議「Cut in breathing pauses, never mid-sentence」，最後一個字之後保留「3 to 6 frames」的空氣 ([r/NewTubers 2026-10-16](https://www.reddit.com/comments/1x7qx4d))。Descript 官方人員也承認，一次轉錄改版造成「Remove Filler Words leaving little bits of audio behind, or cutting too aggressively」([r/Descript 2026-06-03](https://www.reddit.com/comments/1tw4n2a))。

推理：第一，清剪的預設前後緩衝應該設在約 4 個影格（30fps 約 0.13 秒），並且讓使用者可以調整。第二，時間戳準不準就是這個功能的成敗關鍵，所以字幕和清剪應該共用同一份經過人工校正的逐字稿。第三，選 take 只能當「建議前三名」，不能自動拍板。

弱點：Reddit 只覆蓋到各版過去一年熱門前 100 篇，r/premiere、r/socialmedia、r/SocialMediaManagers 等版沒有深入讀；小討論串常有廠商偽裝成使用者；X 的熱度無法量測；**完全沒有澳洲代理商或澳洲口音字幕準確度的證據**。

**結論 H：拿掉 AI 生成畫面、只用真實素材，在使用者證據裡是加分，不是減分。**

證據方面，「I spent 15k on high-production ads for a client and got beat by an unedited iPhone video」（112 分），最高分回覆說「'bad' quality is authentic」([r/SocialMediaMarketing 2026-10-26](https://www.reddit.com/comments/1xftnhx))。另一家代理商說客戶要求全部用 AI 生成後「performance dropped 80%」（23 分）([r/SocialMediaMarketing 2026-08-12](https://www.reddit.com/comments/1vm6fl6))。還有一篇 123 分的貼文聲稱，Instagram 會把用過 AI 音訊增強或生成填補的 Reels 標成「AI Generated」([r/SocialMediaMarketing 2026-09-22](https://www.reddit.com/comments/1wnaujc))，這是發文者自己的說法，**未經驗證**。CapCut 的授權條款在專業圈引起不信任：有留言說雲端專案等於授予「a perpetual, sublicensable licence to that footage」([r/VideoEditing 2026-08-28](https://www.reddit.com/comments/1w0sst2))，X 上也有相同的說法 ([Yuli Kay 2026-09-22](https://x.com/yulikay/status/2102390645067288766))。但 CapCut 的條款原文沒有取得。

推理：「真實素材、AI 只做清理、人來核准」本身就是一個定位。我們用本機 whisper-cli 轉錄，客戶素材不必送到第三方 AI 服務，這可以寫進對代理商的說明（推論，前提是部署方式真的如此）。

弱點：都是單一代理商的軼事；Instagram 標籤的機制沒有被證實。

## 三個功能怎麼用現有技術做（推論）

**功能 1：逐字字幕 + 品牌樣式。** 技術路徑：ffmpeg 把每個格位的素材轉成 16 kHz 單聲道 WAV，交給 whisper-cli 產生 token 級時間戳，再轉成 Remotion 的 `Caption` 型別。Remotion 官方的 `@remotion/install-whisper-cpp` 文件寫明需要 16-bit 16 kHz WAV，並建議 `tokenLevelTimestamps` 搭配 `t_dtw` 以取得較準的時間 ([Remotion transcribe](https://www.remotion.dev/docs/install-whisper-cpp/transcribe))（**筆記讀過原頁**）。我們的 Python 後端可以直接呼叫 whisper-cli，輸出轉成同樣的資料形狀，不必再架一個 Node worker。UI 參考 OpusClip：選取字或句子後編輯、在畫面上拖曳字幕位置、字型／大小／顏色／描邊放在側欄 ([Opus Change captions](https://help.opus.pro/docs/article/change-captions.md))。每個客戶存幾組預設，對應 Reddit 上代理商自己手寫「每個客戶、每種風格的規則」的做法 ([r/agency 2026-10-25](https://www.reddit.com/comments/1xfc4en))（該文作者疑似在推銷）。另外可以加一個 9:16 安全區疊層，但**沒有找到來源**說明競品怎麼做，這是推論。弱點：澳洲口音和客戶品牌名稱的辨識率未知。可以把品牌詞彙餵進 whisper 的 prompt 來改善，這是推論，尚未實測。

**功能 2：每鏡頭清剪。** 技術路徑：沿用功能 1 的逐字時間戳，加上 ffmpeg `silencedetect`（或 MIT 授權的 silero-vad ([silero-vad](https://github.com/snakers4/silero-vad))），在 Python 裡算出保留區段，寫成該格素材的 trim in/out，交給 Remotion render。auto-editor（Unlicense，活躍維護）功能類似，但它是 Nim 寫的 CLI，README 只寫了命令列用法 ([auto-editor](https://github.com/WyattBlue/auto-editor))，我們自己算區段就夠了。偵測「重來」的方法：同一段素材裡重複出現同一句台詞的開頭時，把前一次標成建議刪除（推論）。UI 照抄結論 E 的審核清單：每一項可以試聽、保留或刪除，提供全部套用、還原，以及一個前後緩衝的影格數滑桿。弱點：筆記指出 Whisper 可能不會轉錄出贅詞，這點**沒有來源驗證，必須實測**。Descript 的退步事件也說明，時間戳偏移一點點就會留下半個「uh」。

**功能 3：腳本對位與 take 建議。** 技術路徑：每個格位都有腳本台詞和上傳素材的逐字稿。用文字相似度（Python 標準庫 `difflib` 就夠，不必新增依賴）找出台詞在逐字稿裡的起訖詞，自動設定 in/out。相似度低於門檻時，在卡片上標「台詞缺漏／不符」，這呼應 invideo「flag anything the footage is missing」的做法。同一格上傳多個 take 時，用「台詞相似度 + 贅詞數 + 停頓長度」排出前三名，在卡片內做成版本堆疊（參考 Frame.io 的 version stacks ([Frame.io Premiere V4 panel](http://help.frame.io/en/articles/9859849-adobe-premiere-frame-io-v4-comments-panel-overview))），由人挑選。沒有台詞的 B-roll 格位直接標「手動」，跳過對位。弱點：開源研究（2026-11-11 用 `gh search repos` 搜尋）**沒找到任何現成專案**做最佳 take 選擇或腳本對素材，這部分全是自研；FunClip 這類以文字選片段的工具，其 README 沒有讀，是否適用未確認 ([FunClip](https://github.com/modelscope/FunClip))。排序 take 也會碰到結論 G 的品味問題，所以一定要定位成「建議」，不能自動拍板。

## 先不做：自動重構圖、對拍點、AI B-roll、聊天 agent、爆紅分數

以下判斷都是推論，依據如表。

| 不做的功能 | 理由與證據 | 弱點 |
|---|---|---|
| 自動重構圖（auto reframe） | 素材本來就是直式拍攝；開源沒有成熟方案，AutoFlip 維護狀態未確認，後繼專案都只有 15–25 顆星 ([KazKozDev/auto-vertical-reframe](https://github.com/KazKozDev/auto-vertical-reframe)) | 若測試者常上傳橫式素材，就要重新評估 |
| 對拍點剪輯（beat sync） | librosa（ISC）可以做 ([librosa](https://github.com/librosa/librosa))，但沒有任何使用者證據顯示代理商重視；CapCut AutoCut 的 Beat Sync 連 CapCut Web 都沒有提供 ([CapCut AutoCut](https://www.capcut.com/help/how-to-use-auto-cut)) | 沒有證據不等於不需要 |
| AI B-roll | 與移除生成畫面的決定衝突；Instagram 的 AI 標籤風險（未驗證） | 用素材庫的 B-roll 也許可以接受 |
| 聊天 agent | 大廠已推出；使用者抱怨 Underlord「never confirms」，也抱怨點數燒太快 ([r/Descript](https://www.reddit.com/comments/1up5t5f)) | 中長期可能是趨勢 |
| 爆紅分數（virality score） | 是為長片切短片設計的；OpusClip 自己的文件說分數只能在同一支影片內比較 | 無 |
| 套用大型開源編輯器 | OpenCut 正在改寫成 Rust/WASM，也不是可嵌入的元件 ([OpenCut](https://github.com/OpenCut-app/OpenCut))；openvideodev/react-video-editor 同樣有「超過 3 名員工要買公司授權」的條款 ([README](https://github.com/openvideodev/react-video-editor)) | 若要現成時間軸元件，可以評估 MIT 授權的 react-timeline-editor，但它的功能還沒驗證 |

## 上線前必查：Remotion 公司授權（團隊超過 3 人）

**結論 I：BuildClub 團隊超過 3 人，對外收費或正式上線前必須購買 Remotion 授權，而且我們的產品形態落在每月最低 US$100 的 Automators 方案。**

證據（**已核對** [Remotion license FAQ](https://www.remotion.dev/docs/license/faq.md)，2026-11-11）：Free License 只涵蓋「an organization or team of individuals with up to 3 people」；「organizations building video editors, prompt-to-video tools, automated video pipelines or using the Remotion Player」屬於 Remotion for Automators，價格是「$0.01 per render, with a minimum spend of $100/month」；另外「not allowed to let users bring or upload their own Remotion code」。研究筆記讀過的 [LICENSE.md](https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md) 還提到「尚未商業使用的評估者」可以用免費授權，授權條款也會在 Remotion 5.0「slightly」調整（**筆記讀過原頁，本次未核對**）。第三方網站報的價格（例如每 1000 次 render US$10）和官方說法有出入，以官方為準。

推理：我們是影片編輯器，而且很可能用 `<Player>` 做預覽，兩個條件都對得上 FAQ 的描述。下週的外部測試也許還算「評估」階段，但只要開始對代理商收費，或測試者拿成品交給真實客戶，就應該先買好授權。依目前價目，每月最低成本是 US$100；如果團隊成員自己寫 Remotion 程式碼，可能還要加 Creators 方案的每人每月 US$25（同一份 FAQ，筆記讀過）。替代方案是只用 ffmpeg 合成，但會失去 Remotion 的字幕樣式能力，兩週內不建議換。

弱點：這不是法律意見。約聘人員和實習生算不算在人數內、測試期算不算評估，FAQ 都沒有說清楚，**應該直接寫信問 Remotion**。另外兩項同性質的上線前檢查（推論）：一是寫清楚上傳素材的使用與保存條款，這正是 CapCut 被專業圈質疑的地方；二是用幾支澳洲口音的實拍素材測字幕準確度。

## Conclusion

這次調查最有用的發現是：**我們的分鏡格位流程，把業界最難的「素材配對」問題變成了一個便宜的「格位內對齊」問題。** 其他產品必須靠語音或畫面辨識去猜哪段素材屬於哪句台詞，我們在上傳那一刻就知道答案。所以差異點不在於做更多 AI，而在於做「知道每段素材應該說哪句台詞」的 AI：它能指出缺了哪句、哪個 take 唸得最順，再交給人決定。同時，市場正往聊天 agent 衝，但使用者給好評的是可以審核的機械性幫手，這讓「真實素材、AI 清理、人來核准」成為一個少有人佔據、但有證據支持的位置。

還沒有答案的問題要靠下週的測試者來回答：澳洲口音的字幕準確度、Whisper 會不會漏掉贅詞、代理商是否真的願意一格一格上傳素材。建議在測試腳本裡直接量這三件事，再決定第二週要不要把腳本對位做到排序 take 的程度，或是停在「自動抓 in/out + 標缺漏」就好。
