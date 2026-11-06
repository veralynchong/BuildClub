# 工具不缺，缺的是一本會對帳的帳本

> 研究日期：2026-11-04（雪梨 AEDT）。依據：`research_notes/AI 代理測試與待辦記憶工具/` 八份筆記（own_history_problems、task_trackers、memory_servers、test_run_memory、opencode_and_baseline、reddit_x_community，第二版新增 github_workflow_frameworks、flow_plugin_eval），加上主筆撰寫當天對 repo 與本機設定做的唯讀複核。
> **證據標籤**：〔已核對〕＝研究員當天用 WebFetch 或 `gh api` 開過原頁（WebFetch 給的是小模型摘要，不是逐字原文）；〔僅摘要〕＝只看到搜尋結果摘要或第三方轉述，原頁沒開或打不開；〔社群〕＝Reddit/X 貼文，Reddit 分數是 Arctic Shift 快照（「分數/留言數」），X 沒有任何互動數；〔本機〕＝研究員讀了本機檔案或對話紀錄；〔主筆複核〕＝主筆 2026-11-04 親自重跑指令或讀檔確認；〔推論〕＝本報告自己的判斷，不是任何來源說的。
> 星數、版本號都是 2026-11-04 的快照。

> **本版更新（2026-11-04 第二版）**
> 1. **修正框架。** 第一版說「沒有工具同時管好這幾本帳」，太籠統。記憶、任務、工作流程儀式、worktree 管理的工具其實很多，你也已經裝了兩個（Superpowers、你朋友做的 flow），worktree 則由 Orca 管。真正沒人做的缺口很窄，只有三件：「已測」要綁到一筆真的執行紀錄、帶成本與證據的測試／花費帳本（同樣內容跑過就跳過）、只有人類能做的事的提醒。第一版的搜尋漏掉了工作流程框架這一層。
> 2. **新增三節**：第一節「記憶、任務、工作流程三類工具」（回答「關鍵字是不是錯了」「要的是長期記憶還是任務系統」）、第四節「工作流程框架盤點」、第五節「flow 評估」。
> 3. **前三名調整。** 第 1 名的核心不變，但改寫成「沿用已裝的工作流程層，再補 `AGENTS.md` 和一本帳」，並把 STATUS 改成 OpenAI ExecPlan 的四段格式；第 2 名改成「在一個任務上試 flow 的完整流程，同時請你朋友加帳本功能」（條件式）；Backlog.md 從第 2 名移到第 3 名；Beads 移出前三名，改列觀察。worktree 管理工具沒有進榜，因為 Orca 已經在做這件事。
> 4. 用語修正：隊友一律稱「隊友」；Vibe Kanban「公司 4 月關閉」改成「狀態不明」（見第四節）。

---

**結論先講：工具不缺，缺的是一本帳。不要換工具，也不要多學一套流程；沿用你已經裝好的工作流程層（Superpowers、flow 的守門 hook、Orca 的 worktree），再補兩樣東西：一份每個工具都會讀的 `AGENTS.md`，以及一支記錄「哪個測試在哪份內容上跑過、結果、花多少錢、證據在哪」的腳本。這兩樣都由 hook 自動處理，你不用改習慣。**

你問「是不是關鍵字錯了」：一半是。第一版查的是「記憶」「任務追蹤」「測試紀錄」，漏掉了你最接近的那一類：**工作流程框架／harness**，也就是規定每場 session 怎麼開場、怎麼驗證、怎麼收尾、怎麼隔離平行工作的工具。補查後，這一層有幾十個熱門專案（Superpowers 311,938★、Spec Kit 146,739★、OpenSpec 73,841★），計畫遺失、worktree 隔離、交接這幾類問題都有很多工具在處理。但換了關鍵字之後，**「測試帳本／跑過就跳過」「只有人類能做的提醒」仍然是零結果**，「已測要綁證據」也只有幾個小專案在做。所以結論的核心沒變，只是範圍變窄了。

你問「要的是長期記憶系統還是任務系統」：兩者都不是主角。記憶系統回答「我們之前知道什麼」，而且是模糊回憶；任務系統回答「還有什麼要做、誰做」；你反覆出事的地方，是「每場 session 有沒有照同一套流程做」和「這件事到底有沒有被證明過」，前者是工作流程層，後者是帳本。

從 9 天、71 場 session 的紀錄看，你原本提的三個桶子（計畫/進度、待辦與人類提醒、測試紀錄）只涵蓋大約一半的事故，另一半是常駐決策與預算、沒證據的「已測」、git/worktree 搞錯、平行 session 與隊友改了共享狀態（第二節）。主筆複核時另外發現一個結構性缺口：**BuildClub repo 根目錄沒有 `AGENTS.md`**，常駐規則放在 Claude 專屬、只存在這台機器的 auto memory 裡，Codex、另一台 Mac、隊友都看不到。你朋友的 flow 在 BuildClub 上只被當成守門層用過（9 天 784 次 `test_slot` 呼叫、228 次擋下危險或沒取鎖的指令），它的記憶功能從沒用過，而且大部分要走它完整的 manager/worker 流程才會生效（第五節）。

以下排名是〔推論〕：**第一名**是「沿用已裝的工作流程層＋`AGENTS.md`＋`bin/tested.sh` 測試帳本＋開場簡報 hook＋STATUS 改成 ExecPlan 四段」，不用安裝任何東西；**第二名**是平行、互相依賴的 PR 工作每週都在發生時，在一個任務上試 flow 的完整流程，同時把帳本相關的建議交給你朋友；**第三名**是待辦變多或隊友開始派工時，用 Backlog.md 取代 `docs/todo.md`。Beads 移出前三名。記憶伺服器、Task Master、Claude Code 內建 Tasks 都不建議拿來當事實來源。

## 你要的不是記憶系統，也不只是任務系統

**結論：** 工具分三類，各自回答不同的問題：**記憶系統**回答「我們之前知道什麼」，**任務系統**回答「還有什麼要做、誰做、卡在哪」，**工作流程框架／harness** 回答「每場 session 是不是都照同一套流程開場、驗證、收尾」。你的 8 類問題裡，大部分落在工作流程層；剩下的「已測」與「測試／花費」兩類，需要的是第四種東西：**帳本**，一行一筆、能精確查詢、綁到 commit 或內容 hash 的事實紀錄。市面上沒有主流的帳本工具。所以你要的東西最接近「工作流程層＋一本帳」，而工作流程層你已經裝了。

| 類別 | 回答的問題 | 代表工具 | 怎麼存 | 對應第二節的問題 |
|---|---|---|---|---|
| 記憶系統 | 「我們之前知道什麼？」（偏好、事實、對話摘要） | claude-mem、Mem0、Basic Memory、Claude Code auto memory | 向量或摘要，多半在本機 DB，模糊比對 | 2，但你的常駐規則要精確、有日期、每個工具都讀，所以該放 repo 檔案 |
| 任務系統 | 「還有什麼要做、誰做、卡在哪？」 | Beads、Backlog.md、GitHub Issues、Task Master | 每項一筆，有狀態、依賴、負責人 | 7，部分 1 |
| 工作流程框架／harness | 「每場 session 是不是照同一套流程做？」 | Superpowers、Spec Kit、OpenSpec、GSD Core、Trellis、OpenAI ExecPlan；Orca、Worktrunk、Claude Squad；你朋友的 flow | 技能與指令、hook、repo 裡的計畫檔 | 1、4、5、6；3 多半只是提示文字 |
| 帳本（缺口） | 「這件事有沒有被證明過、花了多少？」 | 沒有主流工具；最接近的是 Martin Loop、ThreadPort（都很小） | 一行一筆、可查、綁 commit 或內容 hash | 3、8，加上 7 的提醒 |

**證據：**〔主筆複核〕第一版的六份筆記（own_history_problems、task_trackers、memory_servers、test_run_memory、opencode_and_baseline、reddit_x_community）沒有一份查工作流程框架。第二版補查的 github_workflow_frameworks 筆記〔已核對，研究員當天用 `gh search repos` 與 `gh api` 取 metadata 和 README〕用了 "agent harness"、"context engineering claude code"、"spec-driven development"、"multi-agent git worktree"、"parallel agents worktree"、"session handoff claude" 等十多組關鍵字和十個 topic，取了約 45 個 repo 的資料，例如 [Superpowers](https://github.com/obra/superpowers) 311,938★（v7.0.2，2026-11-03）、[Spec Kit](https://github.com/github/spec-kit) 146,739★、[OpenSpec](https://github.com/Fission-AI/OpenSpec) 73,841★、[Herdr](https://github.com/herdrdev/herdr) 47,904★、[Worktrunk](https://github.com/max-sixty/worktrunk) 10,577★。同一份筆記另外用七組「test ledger／skip if passed／stop hook verify／human todo reminders」查缺口，**零結果**〔負面結果〕。〔主筆複核〕`~/.claude/plugins/installed_plugins.json` 顯示 Superpowers 7.0.0 從 2026-09-03 起裝在 user scope 並啟用，flow 0.6.123 從 2026-10-14 起。官方文件把記憶定位成回憶層、規則放 repo 檔案：Codex 文件說必須遵守的團隊規則要放在 `AGENTS.md` 或簽入的文件，memories 只是本機回憶 ([Codex memories](https://learn.chatgpt.com/docs/customization/memories?surface=app))；Claude Code auto memory 是 "machine-local" ([Claude Code memory](https://code.claude.com/docs/en/memory))〔已核對〕。

**推理〔推論〕：** 你的 8 類問題裡，1（進度失聯）、4（git/worktree）、5（平行 session）、6（交接漂移）都是「流程有沒有被照做」的問題，屬於工作流程層；2（常駐決策）需要精確、有日期、每個工具都讀，所以是 repo 檔案，不是記憶系統；7（人類待辦）只需要一個很小的任務清單，`docs/todo.md` 已經夠用；3（沒證據的已測）和 8（測試與花費）是帳本。用第二節的人工權重粗算，三個真正沒人做的缺口（3、7、8）合計大約 28% 的事故；其餘大部分已經有工具，問題在於你裝了卻沒接上 repo（沒有 `AGENTS.md`），或還沒用（flow 的完整流程）。這解釋了為什麼「工具很多」和「我的問題還在」同時成立。

**弱點：** GitHub 搜尋是 all-words 比對，零結果不等於不存在；長尾小 repo、非英文 repo（例如筆記提到但沒讀的 `runesleo/claude-code-workflow`）沒掃完；「涵蓋哪些問題」是讀 README 判斷，沒有安裝實測。28% 用的是第一版的人工權重，誤差可能有 ±10 個百分點。「關鍵字錯了」只對一半：測試帳本那一塊，第一版就查到零，第二輪換關鍵字仍是零。

## 一半的痛點落在三個桶子之外

**結論：** 計畫/進度、人類待辦、測試記憶這三桶要做，但只做這三桶，大約會漏掉一半的事故。另外四類也該涵蓋：有日期、可被取代的常駐決策與預算；每句「已測」都要能對到一筆紀錄；共享環境清單；「上次之後誰改了什麼」的動態。

**證據**〔本機〕：研究員讀了 2026-10-27 到 11-04 的 Claude Code 對話紀錄（約 629 則使用者訊息、71 場 session），用關鍵字比對加人工閱讀。有 **26 場是用手寫的接續提示開場**，24 場 session 裡出現 **38 次 context compaction**，「跑到哪了」這類詢問約 25–30 次、分布在 18 場。使用者主動說「幫我在本地記住」**7 次**，目前有 7 個常駐規則的 memory 檔（花費 US$1 以下可自行跑、Apify 額度留給 demo、PR 開在隊友的 repo、不准擅自合併隊友的 main、不做手機版、影片只做英文、fal 餘額 US$10）。實質的錯誤狀態陳述約 6 件，最嚴重的是 2026-11-03 一則 PR 說明寫「已在 #38 用 fal 實測」，追查後的結論是「很可能今天根本沒有人真的跑過付費測試」；retro 也記了 `verify.sh | tail -5 && git commit`，因為 `tail` 的關係回傳 0，verify 紅燈也照樣 commit 了（`pivots/02-content/docs/retros/2026-11-03-canvas-p1-p4-retro.md`）。git 類事故約 8 件：worker 從錯的 base 開分支、本地 `fork/main` 過期導致分支開在 `eaf5550`、「PR #9 做好」被理解成把 134 個 commit 合進隊友的 main。平行與隊友類約 15 件：另一場 session 在 8871 開了 server，把截圖 agent 的 server 換掉；workflow 留下 13 個 Chrome 視窗；Figma 檔開太多；影片不只一次照過期的前端設計做。〔主筆複核〕`git worktree list` 目前是 **36 個**；`gh issue list -R veralynchong/BuildClub --state all` **回傳 0 筆**；repo 根目錄**沒有 `AGENTS.md`**，專案 `CLAUDE.md` 是完整內容，不是 `@AGENTS.md` shim；`~/.codex/sessions` 的 73 個檔案沒有一個提到 BuildClub（研究員〔本機〕）。

| 排名 | 反覆出現的問題 | 頻率（關鍵字下限） | 三桶能蓋到嗎 | 缺的那種紀錄 |
|---|---|---|---|---|
| 1 | 進度失聯：「跑到哪了」「其他 session 在幹嘛」 | 約 25–30 次／18 場；38 次 compaction | B1 計畫/進度 | 每場收尾寫的現況，加上跨 session 回顧 |
| 2 | 常駐決策與預算只活在對話裡 | 7 次「幫我記住」 | 大多蓋不到 | 有日期、可被取代、每個工具開場都會讀的規則清單 |
| 3 | 沒證據的「已測／已完成」 | 約 6 件實質錯誤 | 跟 B3 相鄰 | 每句「已測」都指向一筆帳本紀錄 |
| 4 | git／分支／remote／worktree 搞錯 | 約 8 件；36 個 worktree | 蓋不到 | 寫明正式 remote、開分支前先 fetch、定期清 worktree |
| 5 | 平行 session 與隊友改了共享狀態 | 約 15 件／10 場 | 蓋不到 | 共享資源表，加上「上次看之後誰改了什麼」 |
| 6 | 交接檔與 STATUS 漂移 | 約 6 件 | B1 | 檢查交接檔 baseline sha 和 git 差多少 |
| 7 | 人類專屬待辦（key、帳單、帳號） | 使用者約 10 則、AI 約 28 則 | B2 | `docs/todo.md`（已經在用） |
| 8 | 測試與付費執行的記憶 | 約 12 則／8 場，外加 Apify 超支 | B3 | 機器查得到的測試帳本 |

**推理：** 研究員用人工加權估計，三桶大約涵蓋 55% 的事故（B1 約 35%、B2 約 8%、B3 約 12%），其餘 45% 是決策/預算、沒證據的陳述、git、平行/隊友。使用者反覆做的兩件雜事（「去看所有 session 做了什麼」和「幫我在本地記住」），其實就是在手動實作兩個缺少的工具：跨 session 回顧，和常駐決策庫。這兩件事的價值比更好的待辦清單高。再看現有檔案本身：研究員發現同一組數字（unit 466/466、pytest 969、各 polish E2E 通過數）同時寫在 `docs/STATUS.md`、`docs/test-log.md` 和交接檔三個地方，交接檔的 baseline 是 `5e4f117`，HEAD 已經往前走了。主筆複核時，研究員抓到的那個矛盾（todo 打勾說 fal smoke 已確認，test-log 卻沒有那一列）已經在 commit `373eebb` 補上了；**但那一列的 Evidence 欄寫的是「script + outputs in session scratchpad `fal-smoke/` (not kept)」**，證據在寫下的當天就沒了。所以要花的成本是「對帳」，不是「儲存」。

**弱點：** 次數是關鍵字比對的下限。使用者用語音輸入、錯字多，很多抱怨抓不到；量的是事故件數，不是花掉的時間；45/55 的拆分誤差可能有 ±10 個百分點。完全沒有 Codex 在這個專案上的資料，所以「跨工具交接」目前只是假設中的需求，不是已經發生的痛點。使用者說這「主要是我自己的問題」，但第 5 類顯示隊友那一側也有份，這點沒有釐清。

## 記憶與任務工具：各管一角，沒有一個記測試帳

**結論：** 專用追蹤器只管任務，記憶伺服器只做模糊回憶，測試工具只回答「這次 diff 可能影響什麼」，不記「這份內容已經被證明過」。帶成本與證據的測試帳本，市面上沒有成熟產品，要自己做。（工作流程框架另見第四節，flow 見第五節。）

### 任務追蹤器：Beads 最強也最重，Backlog.md 最像你現在的檔案

| 工具 | 存放方式 | 跨 Claude Code／Codex | 人類專屬項目 | 成熟度（2026-11-04） | 對你的判斷〔推論〕 |
|---|---|---|---|---|---|
| Beads（`bd`） | Dolt 資料庫放在 `.beads/`，`issues.jsonl` 只是匯出 | CLI 加 `AGENTS.md`；`bd setup claude/codex/opencode` | **唯一有原生支援**：`bd human`、human gate、`bd defer --until` | 28,466★、v1.3.3（2026-11-03）、約 1,609 個未關 issue；repo 已移到 `gastownhall/beads` | 過重；第二版移出前三名，改列觀察 |
| Backlog.md | 每個任務一個 `.md` 放在 `backlog/`，含 `decisions/` | CLI 指示檔；MCP 可選 | 只能用 label／assignee 慣例 | 7,271★、v1.55.3（2026-10-23）、幾乎每天發版 | 條件式升級，第 3 名 |
| Task Master | `.taskmaster/` 裡的 JSON | 以 MCP 為主 | 沒有 | 28,297★，但最後一版是 2026-03-31 | 排除 |
| Claude Code Tasks | `~/.claude/tasks/` | 只有 Claude、只在這台機器 | 沒有 assignee | 新模型預設關閉 | 不能當事實來源 |
| OpenSpec／Spec Kit | repo 裡的 markdown | 30+ 種助手 | 沒有 | 73,835★／146,700★ | 是規格流程，不是追蹤器（見第四節） |
| GitHub Issues＋`gh` | GitHub 伺服器 | `gh` CLI | **唯一會通知隊友** | 你的 repo 目前 0 筆 | 只放隊友要處理的項目 |

**證據**〔已核對〕：Beads 在 2026 年 2 月把唯一後端換成 Dolt，獨立開發者遇到外部 server 和 port 設定的摩擦，之後改回內嵌模式為預設 ([DoltHub blog, 2026-04-02](https://www.dolthub.com/blog/2026-04-02-restoring-beads-classic/))。README 寫明 JSONL 是 "an export for viewers and interchange, not the source of truth"，內嵌模式只允許單一寫入者 ([Beads README](https://github.com/steveyegge/beads))。人類項目有 `bd human list/respond/dismiss` ([bd human](https://github.com/steveyegge/beads/blob/main/docs/cli-reference/human.md))，gate 有 `human`、`timer`、`gh:pr` 等類型，但文件把 human 標為 "Phase 1" ([bd gate](https://github.com/steveyegge/beads/blob/main/docs/cli-reference/gate.md))。第二版補充：`gh api` 顯示 repo 擁有者已改成 [gastownhall/beads](https://github.com/gastownhall/beads)，舊網址會轉址；"CI is red on main"（2026-10-27，31 則留言）([#7914](https://github.com/gastownhall/beads/issues/7914))。Backlog.md 是 "no server, no account, no telemetry"，web UI 只綁 127.0.0.1 ([Backlog.md README](https://github.com/MrLesk/Backlog.md))。Task Master 的 PRD 拆任務需要模型 key 或 CLI provider，README 寫的授權是 "MIT License with Commons Clause" ([Task Master README](https://github.com/eyaltoledano/claude-task-master))；星數與發版日期來自 [GitHub API](https://api.github.com/repos/eyaltoledano/claude-task-master)。Claude Code 官方文件說 task 工具只在 Opus 4.7、Sonnet 4.6、Haiku 4.5 及更早的模型上預設開啟，其他模型要設 `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`，資料放在 `~/.claude/tasks/` ([Interactive mode docs](https://code.claude.com/docs/en/interactive-mode))。這點和 Reddit 一則引用 changelog 的貼文說法一致：2.1.233（8 月 14 日）起新模型預設關閉〔社群〕 ([r/ClaudeCode 1vp7ix8](https://www.reddit.com/comments/1vp7ix8))。

**推理：** 你用的是 Opus 5.5，Tasks 預設就是關的；就算打開，它也是 Claude 專屬、單機，正好違反「跨工具、跨機器」這個需求。Beads 是唯一把「卡在人類」做成一等功能的工具，但它的事實來源是二進位資料庫：每台機器都要裝 `bd` 才讀得到，兩人協作要學 `bd dolt push/pull`。而你最痛的第 4、5 類（port、worktree、隊友改前端），它完全不處理。Backlog.md 的格式跟你的 `docs/todo.md` 幾乎同構，差在它多了 CLI、看板和 MCP，所以升級成本低，但目前的待辦量（`docs/todo.md` 25 行）還用不到它。

**弱點：** Beads 的「CI 紅燈、問題多」來自 issue 清單，不是實際使用；兩人協作的 Beads 和 Backlog.md 都沒有獨立使用者的報告。研究員沒有安裝任何工具，所以「設定成本」全部是推論。

### 記憶伺服器：做的是模糊回憶，不是精確狀態

**證據：** 官方 MCP memory server 是本機 JSONL 知識圖、不需要 key，但 `create_entities` 遇到已存在的名稱會直接忽略、不報錯〔已核對〕 ([MCP memory README](https://github.com/modelcontextprotocol/servers/tree/main/src/memory))。Basic Memory 是 markdown 加 SQLite 索引、AGPL-3.0、需要 Python 3.12+，雲端版每月 US$15 起〔已核對〕 ([Basic Memory](https://github.com/basicmachines-co/basic-memory))。claude-mem 用 hooks 擷取工具使用紀錄，再用 LLM 壓縮後注入下一場，存放在 `~/.claude-mem/`；星數約 112k，但授權寫法有衝突（Apache-2.0 對 AGPL-3.0）〔已核對／衝突未解〕 ([claude-mem](https://github.com/thedotmack/claude-mem))；第二版的 `gh api` 回報 Apache-2.0、v15.9.0（2026-11-02），README 說某些環境預設用託管的 "CMEM Pro"。Mem0 預設用 OpenAI 模型 ([Mem0](https://github.com/mem0ai/mem0))，Graphiti 需要 Neo4j 之類的圖資料庫，而且自稱 MCP server 不該用在正式環境 ([Graphiti](https://github.com/getzep/graphiti))。Anthropic 自己做長時間代理時，用的是 `claude-progress.txt` 加 git 歷史加一個 JSON 功能清單，理由是模型比較不會亂改 JSON 檔 ([Anthropic Engineering, 2025-11-26](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents))。OpenAI 的 Codex 文件也明說必須遵守的團隊規則要放在 `AGENTS.md` 或簽入 repo 的文件裡，memories 只是本機的回憶層 ([Codex memories](https://learn.chatgpt.com/docs/customization/memories?surface=app))。Claude Code 的 auto memory 也是 "machine-local"，不會跨機器 ([Claude Code memory](https://code.claude.com/docs/en/memory))。連賣圖記憶的 Zep 都承認，對於讀取 repo 指示檔的程式助手，markdown 是 "clear fit" ([Zep, 2026-06-23](https://www.getzep.com/blog/markdown-is-not-agent-memory/))。

**推理：** 你要的是「`e2e-polish-a` 在 inputs hash X 是 PASS」這種精確比對。向量或摘要式的回憶天生是模糊的，而且大多多了一層要花錢的 LLM 抽取，這正好和你「付費 API 要逐次核准」的規則衝突。最關鍵的一點是：**你那 7 條常駐規則現在就放在 Claude 的 auto memory 裡**，依官方文件，Codex 和另一台 Mac 都讀不到。所以要搬的方向是把它們搬回 repo，而不是再加一個記憶伺服器。

**弱點：** 沒有任何中立的基準測試比較「檔案」和「記憶伺服器」在程式狀態任務上的表現；Letta 的 74.0% 對 68.5% 是廠商自己跑的，作者也說這個基準意義不大 ([Letta, 2025-08-12](https://www.letta.com/blog/benchmarking-ai-agent-memory))。支持 markdown 的證據是「兩家大廠的設計選擇」，不是實驗結果。

### 測試記憶：零件都在，沒有現成成品

**證據：** pytest-testmon 把「測試對應到執行過的程式碼」存在 `.testmondata`，但不追蹤靜態檔和網路服務〔已核對〕 ([testmon.org](https://testmon.org/))。`git-test` 用 git notes 記 pass/fail，key 是**被測的 tree**，所以 rebase 之後結果還在；但工作目錄有未提交變更時它只跑、不記錄，而且只記 pass/fail，沒有成本和證據欄位，最後的活動停在 2017 年〔已核對〕 ([mhagger/git-test](https://github.com/mhagger/git-test))。git notes 預設不會 push，`notes.rewriteRef` 沒有預設值，不設定的話 rebase 後 notes 不會跟著搬〔已核對〕 ([git-notes](https://git-scm.com/docs/git-notes))。Turborepo 和 Nx 可以用輸入 hash 快取任何指令，但前提是 monorepo 設定加上「任務是確定性的」 ([Turborepo caching](https://turborepo.dev/docs/crafting-your-repository/caching))。ProofRun（2026-08）把結果綁到 commit 加未提交 diff 的 hash，程式碼一變狀態就轉成 STALE〔僅摘要，第三方頁面〕 ([zeli.app](https://zeli.app/en/story/49316605))；claimstamp 是 hash 鏈式的驗證紀錄〔僅摘要〕 ([PyPI](https://pypi.org/project/claimstamp/0.1.0/))。搜尋「skip tests already passed at this tree hash」的 MCP server 或 Claude Code skill，結果是零〔僅摘要，負面結果〕；第二版在 GitHub 上換七組關鍵字再查，仍是零（見第一節）。兩邊的 hook 都有：Claude Code 的 PostToolUse 輸入有 `tool_input.command`，但成功時的 Bash 回應**沒有記載 exit code 欄位** ([Claude Code hooks](https://code.claude.com/docs/en/hooks))；Codex 的 PostToolUse 在非零 exit 時也會觸發，專案層 hooks 放在 `.codex/hooks.json`，要先 trust 專案才會載入，文件自己也說 hook 是 "a useful guardrail, not a complete enforcement boundary" ([Codex hooks](https://learn.chatgpt.com/docs/hooks))。

**推理：** 這個 repo 沒有 `@playwright/test`、沒有 Vitest，也不是 monorepo（E2E 是手寫的 `e2e/*.cjs` 加上 `playwright-core`，前端單元測試用 `node --test`），所以 `--only-changed`、`nx affected` 這類工具都接不上。hook 只能「記下跑了什麼」，沒辦法逼代理「先查再跑」，而且拿不到可靠的 exit code。最穩的做法是一支包裝指令：它自己知道真正的 exit code、自己算 hash、自己讀成本，Claude Code、Codex、OpenCode、人手動執行都是同一支 shell 指令。key 只算「這個測試涵蓋的路徑」的 tree hash（`git rev-parse HEAD:<path>`），不算整棵 tree，這樣改 `docs/` 不會讓付費 E2E 失效。這是設計推論，沒有來源針對這個用途描述過。

**弱點：** ProofRun、claimstamp、AgentOps 的 repo 都沒有直接讀過，功能是二手資訊。內容 hash 看不到供應商那一側的變化（fal 換了模型），所以付費測試一定要設有效期限。Claude Code 的 PostToolUse 有一則未經確認的回報說它在 Bash 上不一定會觸發 ([claudeissues #36310](https://claudeissues.com/issue/36310-posttooluse-hooks-not-invoked-for-bash-tool-calls))。

## 工作流程框架：三層都很熱鬧，缺口只剩三件

**結論：** 這一類分成三層：**A 方法論／儀式框架**（規定開場、計畫、驗證、收尾）、**B 平行 session／worktree 管理器**（同時跑很多代理）、**C 狀態與協調底層**（讓多個代理共用一份狀態）。計畫遺失（1）、worktree 隔離（4）、交接（6）被很多工具蓋到；常駐決策（2）部分有；「已測」（3）大多只是提示文字，真正把「完成」綁到新鮮執行證據的只有幾個小專案；人類專屬提醒（7）和帶成本的測試記憶（8）幾乎沒人做。這個領域變動很快，好幾個高星專案已經封存或停更，授權也要逐一看。最值得直接借用的是 OpenAI 的 ExecPlan（PLANS.md）格式，因為它是純檔案，而且就是你 STATUS.md 的強化版。

**三層的代表**（星數、最後 push、授權都是 2026-11-04 的 `gh api` 快照）〔已核對〕：

| 層 | 專案 | 星數 | 最後 push | 授權 | 狀態存哪 |
|---|---|---:|---|---|---|
| A 儀式 | [Superpowers](https://github.com/obra/superpowers) | 311,938 | 2026-11-03 | MIT | skills（你已裝 7.0.0） |
| A 儀式 | [Spec Kit](https://github.com/github/spec-kit) | 146,739 | 2026-11-03 | MIT | repo 規格檔 |
| A 儀式 | [OpenSpec](https://github.com/Fission-AI/OpenSpec) | 73,841 | 2026-11-04 | MIT | `openspec/changes/` |
| A 儀式 | [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 54,962 | 2026-11-03 | NOASSERTION | repo 檔案 |
| A 儀式 | [planning-with-files](https://github.com/OthmanAdi/planning-with-files) | 27,861 | 2026-11-03 | MIT | 三個 md，預設 gitignore |
| A 儀式 | [Trellis](https://github.com/mindfold-ai/Trellis) | 15,094 | 2026-09-29 | **AGPL-3.0** | `.trellis/` |
| A 儀式 | [GSD Core](https://github.com/open-gsd/gsd-core) | 11,212 | 2026-11-03 | MIT | repo 檔案 |
| B 平行 | [Herdr](https://github.com/herdrdev/herdr) | 47,904 | 2026-11-03 | Apache-2.0 | 應用程式 |
| B 平行 | [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) | 28,584 | 2026-11-03 | Apache-2.0 | 應用程式（可自架） |
| B 平行 | [Worktrunk](https://github.com/max-sixty/worktrunk) | 10,577 | 2026-11-04 | NOASSERTION | git worktree |
| B 平行 | [Claude Squad](https://github.com/smtg-ai/claude-squad) | 8,728 | 2026-08-20 | **AGPL-3.0** | tmux＋worktree |
| C 狀態 | [claude-mem](https://github.com/thedotmack/claude-mem) | 112,060 | 2026-11-04 | Apache-2.0 | 本機 worker／託管版 |
| C 狀態 | [Beads](https://github.com/gastownhall/beads) | 28,466 | 2026-11-04 | MIT | Dolt DB |
| C 狀態 | [Gas Town](https://github.com/gastownhall/gastown) | 18,687 | 2026-10-28 | MIT | Beads＋git hooks |
| C 狀態 | [MCP Agent Mail（Rust）](https://github.com/Dicklesworthstone/mcp_agent_mail_rust) | 231 | 2026-11-04 | NOASSERTION | Git＋SQLite |

**涵蓋矩陣**（● README 寫明有對應功能、▲ 部分或只靠提示、○ 沒找到；這是研究員讀 README 的判斷〔推論〕，沒有實測）：

| 專案 | 1 計畫 | 2 決策/預算 | 3 已測證據 | 4 git/worktree | 5 平行/隊友 | 6 交接 | 7 人類提醒 | 8 測試+成本 |
|---|---|---|---|---|---|---|---|---|
| Superpowers | ● | ▲ | ▲ 提示 | ● | ▲ | ▲ | ○ | ○ |
| Spec Kit | ● | ● | ▲ | ○ | ○ | ▲ | ○ | ○ |
| OpenSpec | ● | ● | ○ | ○ | ○ | ▲ | ○ | ○ |
| GSD Core | ● | ● | ● Verify 步驟 | ○ | ● | ▲ | ○ | ○ |
| planning-with-files | ● | ▲ | ▲ | ○ | ▲ | ● | ○ | ○ |
| Trellis | ● | ● | ● `trellis-check` | ○ | ▲ | ● | ○ | ○ |
| cc-sessions（停更） | ● | ● hook 擋 | ○ | ● hook 擋 | ○ | ● | ○ | ○ |
| ccpm | ● | ▲ | ○ | ● | ● | ● | ▲ Issues | ○ |
| Beads／Gas Town | ● | ▲ | ○ | ▲／● | ● | ● | ○ | ○ |
| MCP Agent Mail | ○ | ○ | ○ | ● 檔案租約 | ● | ▲ | ○ | ○ |
| B 層管理器（Worktrunk 等） | ○ | ○ | ○ | ● | ● | ○ | ○ | ○ |
| Martin Loop（394★） | ○ | ● `--budget-usd` | ● 綁執行證據 | ○ | ○ | ○ | ○ | ▲ 花費稽核 |
| ThreadPort（103★） | ○ | ● | ● 指令＋diff hash | ● | ○ | ● | ○ | ▲ |
| 你朋友的 flow（第五節） | ▲ | ▲ | ▲ PR 格式檢查 | ▲ | ▲ 單一 session | ▲ | ▲ 部署後 | ▲ 只有 token |

**證據**〔已核對，README 與 `gh api` 當天讀取〕：Superpowers 的流程是 brainstorming → using-git-worktrees（"verifies clean test baseline"）→ writing-plans（2–5 分鐘的小任務附 "verification steps"）→ subagent-driven-development → TDD → requesting-code-review → finishing-a-development-branch，README 寫 "Mandatory workflows, not suggestions"，並有 `verification-before-completion` skill ([Superpowers README](https://github.com/obra/superpowers))；熱門 issue 是「v7's brainstorm questions are rather annoying」（29 則留言）([#2530](https://github.com/obra/superpowers/issues/2530)) 和「slowness in responses」（27 則）([#743](https://github.com/obra/superpowers/issues/743))。cc-sessions 的 DAIC 用 hook 完全擋住 Edit/Write，直到人類用觸發詞核准待辦，並強制分支紀律，但它只支援 Claude，最後 push 是 2025-12-17，有 issue 問「Is this being maintained?」([#92](https://github.com/GWUDCAP/cc-sessions/issues/92))。Martin Loop：「completion requires fresh verifier evidence bound to the active run and workspace」，有 `--budget-usd` 硬上限和 `martin dossier` 收據，但要改用它的 `martin run` 包裝，README 沒找到「這個 sha 已通過就跳過」([Martin Loop](https://github.com/Keesan12/martin-loop))。ThreadPort 的 Capsule 記錄目標、決策、指令、測試、git 身分和 dirty-diff hash，README 自己說 "external user validation remain pending" ([ThreadPort](https://github.com/Frankie-Xu/threadport))。

**封存、停更與搬家**〔已核對〕：GSD 原 repo（64,166★）已封存，README 指向 [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core)（11,212★），舊比較文看到的是舊 repo；cc-sessions 停在 2025-12-17；[Crystal](https://github.com/stravu/crystal) 停在 2026-02-26；Task Master 最後 push 2026-04-28；MCP Agent Mail 的 Python 版標示 "Deprecated"，改用 Rust 版；Cavekit 標示 "Frozen"。**更正第一版：** 第一版說 Vibe Kanban「公司 2026 年 4 月關閉」〔僅摘要〕；`gh api` 顯示它最後一個 release 是 v0.1.44（2026-04-24），但 2026-11-03 仍有 push，所以狀態不明，不能再說是已關閉。

**授權提醒**〔已核對，GitHub API 欄位〕：Trellis、Claude Squad 是 AGPL-3.0；BMAD、Worktrunk、MCP Agent Mail、Failproofai、Paradev、Task Master 在 GitHub API 顯示 NOASSERTION 或 "other"，要自己讀 LICENSE 檔才知道能不能用。

**ExecPlan／PLANS.md**〔已核對〕：OpenAI Cookbook 的「Using PLANS.md for multi-hour problem solving」定義 ExecPlan 是代理照著做的設計文件，必須包含並持續更新 Progress、Surprises & Discoveries、Decision Log、Outcomes & Retrospective 四段（"These are not optional"），而且要寫到「只靠這份 ExecPlan、不靠其他東西」就能從頭接手；何時使用由 `AGENTS.md` 規定 ([OpenAI cookbook](https://developers.openai.com/cookbook/articles/codex_exec_plans))。該頁沒有日期，並註明這份食譜已封存、可能提到過時的模型；第三方部落格說用它跑了 7 小時或 25 小時的 session，未經證實 ([例](https://codex.danielvaughan.com/2026/04/19/the-execplan-pattern-structuring-long-codex-sessions-with-plans-md/))。

**推理〔推論〕：** 你現在的設計（`docs/STATUS.md`＋`bin/verify.sh`＋外部交接檔＋worktree）跟 Trellis、planning-with-files、Agent Handoff Kit、ExecPlan 是同一個形狀，所以換框架能得到的不多，還要付學習成本和授權風險。沒有任何一個框架補上 3（強制）、7、8。Superpowers 從 2026-09-03 起就裝著，11-03 的「已在 #38 用 fal 實測」照樣發生；那場有沒有觸發 `verification-before-completion` 沒有查，但至少說明**提示層的「要先驗證」擋不住沒證據的宣稱**，需要一支會自己寫紀錄的包裝指令。worktree 管理器（Worktrunk、Claude Squad 等）解決的是「怎麼開很多 worktree」，你的 36 個 worktree 是「沒人收」的問題，Orca 已經負責開，所以缺的是開場時自動列出「已合併又乾淨、可以清的」那幾個，不是再裝一個管理器。值得借的想法有三個：ExecPlan 的四段格式（放進 STATUS）、cc-sessions 用 hook 擋而不是用文字勸（用在付費測試）、Martin Loop 的「完成要綁到這次執行的證據」（用在 Claims rule）。

**弱點：** 矩陣是讀 README 的判斷，Herdr、Emdash、Paradev、OpenRig、LoopX 只讀了開頭，涵蓋可能被低估。Superpowers 13 個月 311,938★、ECC 9.5 個月 296,613★ 的星數異常高，研究員沒查星數曲線；兩者都有活躍發版和大量 issue，不像空刷，但星數只能當「有人在維護」的訊號，不能當品質。研究員沒安裝任何工具，和你現有 hook（`guard-git-push.sh`、`protect-secrets.sh`）的衝突沒測過。

## flow：你目前只用到它的守門層

**結論：** 你朋友做的 flow 是一個 worktree＋PR 的編排 plugin：主 session 開 manager，manager 派 worker（一個 worktree 一個 PR），reviewer 負責合併、跑完整檢查、發版和部署。記憶功能（inbox、決策、常駐答案、人工檢查清單、筆記、`/flow resume`、成本帳）是這條流水線的副產品。你在 BuildClub 9 天裡**只用到被動的守門層**：AI 呼叫 `test_slot` 784 次、`guard_tests` 15 次、hook 擋下 228 個指令；從沒啟動過 manager、worker 或 reviewer，也沒用過任何 `/flow` 指令。對 8 類問題，它沒有一類完整涵蓋，6 類部分涵蓋（1、2、3、4、7、8），2 類幾乎沒有（5、6），而且大部分功能要走它的完整流程才會生效。它值得留著，因為守門層確實在擋事；但它現在還不是你要的那本帳。最有價值的改進方向，是請你朋友加上以內容為 key 的測試帳本、讓 PR 的 `Ran:` 能對帳，以及一個「只用狀態、不派工」的模式。

**證據**〔本機，研究員從 BuildClub 對話紀錄的結構化 JSON 精確計數，並讀了 plugin 的 README、`docs/how-it-works.md`、`docs/reference.md` 和部分 hook 原始碼〕：

- 呼叫次數（2026-10-27 至 11-04）：`mcp__flow__test_slot` 784 次（typecheck 類 267 次 acquire＋260 次 release；未指定類 122＋123；test 類 4＋4；status 4），`guard_tests` 15 次，`status` 1 次；其他所有 flow 工具（`ask`、`fyi`、`check`、`standing`、`handover`、`plan`、`note` 等）0 次；`flow:*` 代理 0 次；使用者訊息裡的 `/flow` 指令 0 次。31 場頂層 session 有呼叫，177 個有呼叫的對話檔裡 153 個是 subagent，也就是**照著 hook 做事的是 AI worker，不是你**。
- hook 擋下的指令 228 次：108 次是 `pkill`／`killall`（「所有 flow 代理都在這一場 Claude Code session 裡」），109 次是「這是 typecheck，請先 acquire `test_slot`」（訊息本身還寫著 slot 是空的），11 次是用 `lsof` 但沒加 `-sTCP:LISTEN` 的 `kill`。高峰是 11-02 的 82 次。排隊只發生 7 次（約 267 次 typecheck acquire 中），表示鎖幾乎沒有競爭。
- 你朋友在文件裡寫明的限制：所有東西都跑在一場 session 裡，關掉就停（`/flow resume` 可接回）；所有代理用同一個帳號的額度；鎖「covers every worktree of the session's agents, not other Claude sessions」。Codex、Gemini、OpenCode 只能當 flow 在 Orca 或 tmux 裡啟動的 worker，而且「loads no plugin」，不受任何守門規則保護，並以關閉權限檢查的方式啟動（例如 `codex --dangerously-bypass-approvals-and-sandbox`）。
- 〔主筆複核〕安裝版本 0.6.123（2026-10-14 安裝、10-17 更新）；`/Users/tommy/Desktop/BuildClub/.git/flow/` 只有 `ledger.json`（約 223 KB）、`log.jsonl`（6 行）、`seeds-offered.json`、`test-slots/`；repo 裡沒有 `.claude/flow.json`；`hooks/clean.ts` 第 672 行執行的是 `git branch -D`。

**對照 8 類問題**〔本機讀文件與原始碼；涵蓋程度是研究員判斷〕：

| 問題 | flow 的對應機制 | 程度 | 限制 |
|---|---|---|---|
| 1 進度失聯 | `status`／`/flow` 即時樹、`/flow resume`、`note`、context 到 40% 自動交接成新 worker | 部分 | 只管 flow 自己的代理；主 session 只收到提示；不寫 `docs/STATUS.md` 或你的交接檔 |
| 2 常駐決策 | `fyi` 決策（可保留或撤銷）、`standing` 常駐答案、種子規則 `tracker`／`prod-env` | 部分 | 回答的是代理的提問，不存「fal 餘額 US$10」這類事實；沒有取代關係、到期、花費上限；存在本機 `.git/flow/config.json`；種子規則從沒套用 |
| 3 沒證據的已測 | `handover` 拒收沒有 `## Verification`（`Ran:`／`Exercised:`／`Not verified:`）的 PR；`guard_tests`；reviewer 在合併後的 sha 跑完整檢查 | 部分（最強） | `Ran:` 是 worker 自己寫的文字，沒有比對真的執行；只適用經過 flow 的 PR，不管對話裡的宣稱 |
| 4 git/worktree | `clean` 自動清 flow 開的 worktree 和分支（認得 squash merge）；worker 從新鮮的 `origin/<base>` 開分支；`merge_mode`／`push_mode: confirm` | 部分到大部分 | 不碰你自己（Orca）的 worktree；假設只有一個 origin；主 session 仍能自己 `gh pr merge` |
| 5 平行與隊友 | `test_slot` 鎖、`pkill`／`lsof` 守門 | 幾乎沒有 | 只鎖同一場 session 的代理；沒有 port 或瀏覽器視窗表；看不到隊友的 push。11-03 的 8871 衝突是另一場 session，正好在範圍外 |
| 6 交接漂移 | worker 交接寫在 PR 和 `handoffs/*.md`；`resume` 以 GitHub 狀態為準 | 幾乎沒有（對你的檔案） | 不讀也不檢查 `~/.claude/handoffs/*.md` 或 `docs/STATUS.md` |
| 7 人類待辦 | `check`（部署後的人工檢查，可 pass／fail／skip）、`handover env`（要你設的 secret 會擋住部署） | 部分 | 只能從 reviewer 報告產生；env 項目需要先設 deploy target；「去申請 ElevenLabs key」這種一般待辦沒有入口 |
| 8 測試與花費 | `ledger.json` 記每個代理、每個模型的 token 成本；`test_slot` 失敗會記下 tree，之後同 tree 通過算 flaky | 部分 | 沒有「這份內容已通過、不用重跑」的持久紀錄（鎖 45 分鐘到期、reload 會清空）；不記 fal、Apify 等外部花費；token 成本是 API 牌價，不是你的訂閱實際花費 |

**和你規則的衝突**〔本機＋主筆複核〕（都是設定層面，不是致命問題，但要先講好）：

| 你的規則 | flow 的行為 | 影響 |
|---|---|---|
| 刪本地分支只用小寫 `-d` | `clean` 用 `git branch -D`（在它自己確認已合併之後） | 只動 flow 開的分支，但和規則字面衝突 |
| 分支前綴不准用工具名稱 | worker 分支一律 `flow/<name>` | 和分支命名規則衝突 |
| 不准擅自合併隊友的 main | reviewer 會合併並 push `<base>` | 要先設 `merge_mode: confirm`、`push_mode: confirm` |
| 高風險操作要確認 | 其他 harness 的 worker 以關閉權限檢查的方式啟動 | 不要讓 flow 啟動 Codex worker，除非這變成可逐個選擇 |
| 兩個 repo（你的 fork＋隊友的 repo） | 假設一個 `origin`、一個 base branch | 從 2026-11-02 起 PR 直接開在隊友的 repo，影響可能變小，沒驗證 |

**給你朋友的建議**（依對你的回報排序〔推論〕；不是 flow 的既定路線圖）：

| 優先 | 建議 | 對應問題 | 現有基礎 |
|---|---|---|---|
| 1 | **以內容為 key 的測試帳本**：每次 `test_slot release` 寫一列（指令、涵蓋檔案的 hash、結果、秒數、外部成本、證據路徑），存在 `.git/flow/`；提供「這份內容通過了嗎？」查詢，讓 hook 或 reviewer 建議跳過重跑 | 8 | `hooks/testfail.ts` 已經記下失敗的 tree |
| 2 | **`Ran:` 對帳**：`handover` 檢查每個 `Ran:` 指令在該 head sha 有沒有對應的帳本列，沒有就標出來 | 3 | 現有的 Verification 格式檢查 |
| 3 | **只用狀態、不派工的模式**：inbox、決策、check、`status`、`clean`、`resume` 給一般 session 用，不必啟動 manager | 1、2、7 | 你目前只碰得到守門層，完整流程的進入門檻是主要障礙 |
| 4 | **有取代關係的決策庫**：把 `fyi`／`standing` 擴充成「事實＋範圍＋日期＋`supersedes`＋到期日」，在每場 session 開場注入 | 2 | `fyi`、`standing` |
| 5 | **外部花費帳與預算**：記錄服務、估價、上限、實際花費；指令符合付費服務模式時先問，做法比照 `test_slot_commands` | 8 | token 成本帳 |
| 6 | **降低摩擦**：slot 空著時由 hook 自動 acquire，而不是擋下（109 次擋下，每次都多一輪重試）；分支前綴可設定；`clean` 能用 `-d` 時先用 `-d` | 4 | 守門 hook |
| 7 | **跨 session 與隊友動態**：列出其他 session 和隊友上次之後 push 了什麼；把 port／process 鎖放在 git common dir 的檔案裡，跨 session 生效 | 5 | `pkill` 守門已證明需求存在（108 次） |
| 8 | **可分享、不綁 Claude 的狀態**：把決策、未完成的 check、帳本摘要匯出成可 commit 的檔案，並給一個 Codex／OpenCode 能呼叫的小 CLI | 2、5、跨工具 | `.git/flow/` 已經是純 JSON 與 Markdown |

**推理〔推論〕：** flow 解決的是「怎麼讓很多 AI worker 安全地平行做事、再把 PR 合起來」，你最常出事的地方是「互動式、多半單代理的工作，怎麼跨 session 接得上，加上一個在另一個 repo 的隊友」。要為了記憶功能採用整條 manager/worker/reviewer 流程，代價是 token 開銷（每個 flow 代理都繼承這場 session 的 skills、plugins、MCP server，README 自己建議精簡）和「一切跑在一場 session 裡」的限制。所以現在的做法是：守門層照常開著（它已經擋掉 108 次大範圍 `pkill`）；帳本自己先做，欄位設計成將來 flow 讀得懂；等你朋友做了建議 1–3，再把帳本搬進 flow。在那之前，109 次「typecheck 要先取鎖」的重試，可以在專案 `CLAUDE.md`（`@AGENTS.md` 那一行下面）加一行 Claude 專屬說明來減少；這是推論，沒測過。

**弱點：** 研究員沒有執行 flow，所有行為描述都來自文件、原始碼開頭和對話紀錄裡實際觸發的部分；18k 行原始碼沒有全讀。`guard_tests` 那 15 次的回傳內容沒有抽出來（因為沒有 `.claude/flow.json`，很可能都是「不需要 guard tests」，但沒確認）。0.6.123 是 10-17 的版本，CHANGELOG 有 117 KB 沒讀，有些建議可能已經在新版裡，**轉給你朋友之前先看最新版**。這些建議在 Claude Code hook API 裡做不做得到，都沒有驗證。

## OpenCode 給的是單場待辦，不是跨場帳本

**結論：** OpenCode 你記得的那個待辦功能是 `todowrite`：它是「這一場 session 的工作計畫」，不跨 session，不放人類項目，也不記測試。它真正對你有用的是 `AGENTS.md` 優先、`CLAUDE.md` 當備援的讀取規則，以及 plugin 事件。

**證據**〔已核對，讀了 tagged release 的原始碼〕：在 v1.19.5（2026-10-28），`SessionTodo.update` 每次先刪掉該 session 的所有列再整批寫入；`todo` 資料表以 `session_id` 為外鍵，session 刪除時跟著刪 ([todo.ts @ v1.19.5](https://github.com/anomalyco/opencode/blob/v1.19.5/packages/core/src/session/todo.ts)、[sql.ts @ v1.19.5](https://github.com/anomalyco/opencode/blob/v1.19.5/packages/core/src/session/sql.ts))。到了 v2.2.5（2026-10-30），todo 工具要設 `experimental.todo === true` 才會出現，session SQL 裡也找不到 todo 資料表 ([todo.ts @ v2.2.5](https://github.com/anomalyco/opencode/blob/v2.2.5/packages/core/src/tool/plugin/todo.ts))；v2.2.0 的 release notes 寫 "Restored the Todo tool in desktop via opt-in" ([v2.2.0](https://github.com/anomalyco/opencode/releases/tag/v2.2.0))。兩個版本都找不到 `todoread`。session 存在本機 SQLite，可以 `--continue`、`--fork`、`opencode export` ([CLI docs](https://opencode.ai/docs/cli/))。compaction 預設自動進行，plugin 有 `experimental.session.compacting` hook 和 `todo.updated`、`tool.execute.after` 等事件 ([Plugins](https://opencode.ai/docs/plugins/))；v2.2.0 還新增了 plugin 可以寫入、而且能撐過 compaction 的 keyed session instructions ([v2.2.0](https://github.com/anomalyco/opencode/releases/tag/v2.2.0))。Plan agent 只能寫 `.opencode/plans/` 裡的 markdown ([Agents](https://opencode.ai/docs/agents/))。自訂指令可以用 !`cmd` 把 shell 輸出注入 prompt ([Commands](https://opencode.ai/docs/commands/))。讀取規則是：專案 `AGENTS.md` 優先，沒有才讀 `CLAUDE.md`；沒有 `~/.config/opencode/AGENTS.md` 時會讀 `~/.claude/CLAUDE.md`，並且預設讀 `.claude/skills` ([Rules](https://opencode.ai/docs/rules/))。記錄或跳過測試的 OpenCode plugin，搜尋結果是零；記憶 plugin 倒是不少，最大的是 opencode-supermemory（約 1,654★，需要帳號），本機檔案型的是 opencode-plugin-simple-memory（約 148★）〔星數已核對，功能僅摘要〕 ([opencode-supermemory](https://github.com/supermemoryai/opencode-supermemory)、[simple-memory](https://github.com/ApplauseLab/opencode-plugin-simple-memory))。

**推理：** 「OpenCode 會記測試」這段記憶，很可能來自某個 plugin、別的工具，或你自己寫的檔案。對你最實用的事實有兩個。第一，OpenCode 現在進 BuildClub 會讀到專案 `CLAUDE.md`，因為沒有 `AGENTS.md`，算是碰巧能用；Codex 只讀 `AGENTS.md`（[Codex AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md)），所以**現在完全看不到專案規則**。第二，OpenCode 用一個 `.opencode/commands/brief.md`，內容是 !`bin/session-brief.sh`，就能接上下面建議的同一支開場腳本。

**弱點：** 研究員沒有安裝或執行 OpenCode，2.x 的實際行為是從原始碼推出來的；官方文件寫 `todowrite`「預設開啟」，2.x 的程式碼卻是 opt-in，兩者不一致，要看你實際用哪一版。分享功能（`/share`）的文件頁全是 404。

## Reddit 與 X：大家用 markdown，抱怨的是流程太重

**結論：** 兩個平台都同意的只有「repo 裡的精簡 markdown（`AGENTS.md`、交接檔、計畫或 backlog 檔）勝過重型工具」，以及「規則要靠 hook，不能只寫成文字」。Beads 有人愛有人恨。記錄測試歷史這件事，社群沒有任何受歡迎的工具或慣例。

**證據**〔社群〕：同時出現在兩邊的觀點，包括精簡 markdown，Reddit 的「automated the process of making things complicated」**1189/204**，熱門留言「only build what you need」(147) ([1wxzlpg](https://www.reddit.com/comments/1wxzlpg))；X 上有 Addy Osmani 談 AGENTS.md ([2026-02-24](https://x.com/addyosmani/status/2026172457233829922))、Simon Willison 說他不再建立只有 `@AGENTS.md` 的 CLAUDE.md ([2026-09-18](https://x.com/simonw/status/2101025043098812807))。「流程太重」的抱怨：「drowning in markdown files」(42) ([1vw6iek](https://www.reddit.com/comments/1vw6iek))；713/168 的團隊設定文，熱門留言「if I've corrected the same thing twice, it becomes a hook」(59) ([1xbxoza](https://www.reddit.com/comments/1xbxoza))。Beads 正面的有「試了 3 週」56/26 ([1ov1z94](https://www.reddit.com/comments/1ov1z94))、Joe Devon 說它解決了 compaction 後失憶 ([X, 2025-11-27](https://x.com/joedevon/status/1994085664560968021))；負面的有「Am I an idiot for using Beads rather than PROJECT.md?」22/46，內容是 agent 繞過 `bd`、文件過期、第二個 worktree 破壞 git 流程 ([1r6uhgw](https://www.reddit.com/comments/1r6uhgw))，以及 banteg 的「how to uninstall the beads virus」 ([X, 2026-01-03](https://x.com/banteg/status/2007512038067908768))。claude-mem 的熱門貼文底下，高讚留言是「How is this different than the default memory feature」(29) 和「My limits are burned even faster」(19) ([1scz5kk](https://www.reddit.com/comments/1scz5kk))；另一串回報開場注入記憶後，agent 相信記憶多過相信程式碼 ([1xgqsts](https://www.reddit.com/comments/1xgqsts))。最接近測試記憶的只有幾則留言：「an unreadable check isn't a pass」(29) ([1x2os3k](https://www.reddit.com/comments/1x2os3k))、agent 寫「verified edge cases」卻沒跑 ([1w463pn](https://www.reddit.com/comments/1w463pn))、一個 ast-grep 規則停止掃描卻照樣回報綠燈 ([1v6aum2](https://www.reddit.com/comments/1v6aum2))。還有一則用 `just` 當確定性指令清單，讓 agent 跑固定指令、不用猜 (61/21) ([1pnfwtq](https://www.reddit.com/comments/1pnfwtq))。Task Master 在 2026 年的討論幾乎是零。

**推理：** 社群的答案是用 hook 和關卡去處理「agent 說它測過了」，沒有人在做測試歷史庫，所以帶成本和證據的測試帳本確實是空缺。「同樣的錯修正兩次就做成 hook」這條經驗，正好對應你的 fal 事件和 `| tail` 事件。「固定指令清單」對應下面建議的 `bin/test-registry.tsv`。第二版的 GitHub 盤點也得到同樣的訊號：Superpowers 最熱門的抱怨是儀式太多、回應變慢（第四節），所以要加的東西越少、越自動越好。

**弱點：** X 沒有互動數，「兩邊都有」只代表兩邊各找到一則獨立貼文，不代表份量相同。很多熱門 Reddit 貼文本身是 AI 寫的、業配或問卷誘餌；r/LocalLLaMA、r/programming 沒有搜。免費搜尋找不到，不等於這個東西不存在。

## 前三名：沿用已裝的工作流程層，補一本帳

**以下排名和取捨是〔推論〕**，依據是上面各節的事實，加上你的條件：一人開發加一位隊友、GitHub Issues 實際是 0 筆、主要用 Claude Code、偶爾用 Codex、平行開很多 session、要的是工具而不是改習慣、長期問題而不是 demo 衝刺。

| | 1. 沿用已裝的工作流程層＋`AGENTS.md`＋帳本（建議） | 2. 在一個任務上試 flow 完整流程＋請你朋友加帳本（條件式） | 3. Backlog.md 取代 `docs/todo.md`（條件式） |
|---|---|---|---|
| 內容 | Superpowers、flow 守門層、Orca 照舊；新增 `AGENTS.md`、`bin/tested.sh` 帳本、開場簡報 hook、付費測試守門 hook；STATUS 改成 ExecPlan 四段 | 一個互相依賴的多 PR 任務交給 flow 的 manager／worker／reviewer（含 `plan` 依賴圖）；第五節建議 1–3 交給你朋友 | 每個任務一個 md，有 CLI、看板、MCP |
| 蓋到的問題（對照第二節） | 1、2、3、6、7、8，部分 4、5 | 部分涵蓋 1、2、3、4、7、8（多數只在走 flow 的 PR 裡生效）；5、6 幾乎沒有；你朋友加帳本後 8 才算真的涵蓋 | 7，部分 1；測試帳本仍要靠方案 1 |
| 需要安裝 | 不用（bash、git、`gh`，三個工作流程工具都已安裝） | 不用（已安裝），但要新增 `.claude/flow.json`，至少設 `merge_mode: confirm`、`push_mode: confirm` | `npm i -g backlog.md` 或 brew（要你核准） |
| 你要改的習慣 | 幾乎沒有：開場自動印、付費測試自動擋、跳過與否由腳本判斷 | 要學 `/flow` inbox、approve、push 這套操作 | 待辦改用 CLI 或看板 |
| 跨 Claude Code／Codex／OpenCode／人 | 全部都是 shell 指令和 repo 檔案 | 只有 Claude Code；Codex 只能當沒有守門的 worker | CLI，可選 MCP |
| 隊友要做什麼 | 什麼都不用，`git pull` 就看得到 | 只看得到 PR；flow 的狀態在你這台機器的 `.git/flow/` | 想用 CLI 就要安裝 |
| 主要風險 | 腳本要自己維護；hook 不是強制邊界；路徑 hash 漏列依賴會錯誤跳過 | `-D`、`flow/` 前綴和你的規則衝突；一場 session 關掉就停；token 開銷；依賴你朋友的路線圖 | 又多一套工具；沒有原生「人類」概念 |
| 什麼時候做 | 現在 | 平行、互相依賴的 PR 工作每週都在發生，而且分支規則衝突已經談好 | 開著的待辦超過約 30 項，或隊友開始派工給 agent |

**和第一版相比改了什麼：** 第 1 名核心不變，但明確寫出「工作流程層已經裝了，不用再找」，並把 STATUS 改成 ExecPlan 四段（OpenAI 為 Codex 長時間工作寫的格式），開場簡報多列一行可清的 worktree。第 2 名從 Backlog.md 換成 flow 的完整流程，理由是：你平行開很多 session，而 flow 已經安裝，它的 `plan` 依賴圖、一個 worker 一個 worktree、reviewer 合併前跑完整檢查，正好是第一版把 Beads 放在第 3 名的那個觸發條件（「平行代理處理互相依賴的任務」），而且不用另外裝 Dolt。Backlog.md 降到第 3 名，因為它只解第 7 類，而 `docs/todo.md` 目前才 25 行。

**移出前三名或不建議**〔推論〕：**Beads** 移出前三，改列觀察：它要裝 `bd`＋Dolt、事實來源是二進位資料庫、1,600 多個未關 issue；只有在你需要「跨機器、跨 session 認領任務」（Dolt push/pull）時才比 flow 更合適。**worktree 管理器**（Worktrunk、Claude Squad、Herdr 等）不進榜：Orca 已經負責開 worktree，你的問題是收，不是開；而且 Claude Squad 是 AGPL-3.0、Worktrunk 授權要自己讀。**換一套儀式框架**（Trellis、GSD Core、Spec Kit、OpenSpec）不建議：形狀和你現在的檔案一樣，而且沒有一個補上 3、7、8；Trellis 還是 AGPL-3.0。其餘維持第一版：記憶伺服器（模糊、多數要付費 LLM、社群抱怨 token 和穩定性）、Task Master（4 月後停滯、需要 key、授權有疑義）、Claude Code Tasks 當事實來源（Claude 專屬、單機、新模型預設關閉）、Vibe Kanban（狀態不明，見第四節）、把 GitHub Issues 當主要待辦庫（0 筆，而且要網路）。GitHub Issues 唯一不可取代的是**通知隊友**，所以只放需要隊友動手的項目。

**弱點：** 方案 1 的「建置約 2–3 小時」是估計，沒有實測。方案 1 把一部分工作量轉成你要自己維護的腳本。方案 2 完全沒在這個專案上試過，第五節的涵蓋判斷都來自文件；它是否真的比 Beads 適合「互相依賴的平行任務」，要試過一個任務才知道。如果之後真的變成多人、多機器、多代理，Beads 的依賴圖和原子化 `--claim` 是自己寫腳本、也是 flow 的單一 session 模型很難追上的。

## 具體做法：一個新規則檔、一支腳本、兩個 hook，STATUS 換格式

以下是〔推論〕的設計，沒有在 repo 裡實作或測試過。其中改到 `CLAUDE.md`、`AGENTS.md`、memory 檔和 hook 設定的步驟，依你的全域規則 §4，要在你明確要求的那場 session 裡做；專案 `CLAUDE.md` 也規定，動到主要文件前要先確認。

**第一階段：零安裝，大約一場 session**

| 步驟 | 檔案 | 做什麼 | 解決第二節表格的第幾項 |
|---|---|---|---|
| 1 | 新增 `AGENTS.md`，`CLAUDE.md` 改成一行 `@AGENTS.md` | 把現有專案 `CLAUDE.md` 的內容搬過去，再加四段：**Read order**（STATUS 的 Current 段 → `docs/todo.md` → `bash bin/session-brief.sh`）；**Standing rules (dated)**，從 7 個常駐規則 memory 檔搬來，每條附 `since:`，被取代時寫 `superseded by:`，詳細原因指向 `docs/decision-log.md`；**Shared resources**（`origin` = veralynchong 是正式 repo、`fork` 是你的；開分支一律 `git fetch origin && git switch -c <b> origin/main`；port 只用 8871/8872；Figma 正式檔的網址）；**Claims rule**（PR、STATUS、交接檔裡只要寫「tested／實測／PASS」，就要附 `bin/tested.sh cite` 給的 run id；借自 Martin Loop 的「完成要綁到這次執行的證據」） | 2、4、5、3 |
| 2 | 精簡 memory 檔 | 7 條規則搬進 `AGENTS.md` 後，memory 檔只留一行「已移到 AGENTS.md」，避免兩邊各寫一份。fal 餘額這種會變動的數字，放到 STATUS 的 Current 段，附上日期 | 2 |
| 3 | 新增 `bin/test-registry.tsv` | 一行一個測試：`name  mode(mock|paid)  max_age_days  covered_paths  command`。代理只能用名稱呼叫，不准自己發明路徑。付費 smoke 腳本要放進 repo（例如 `bin/smoke/`），不能放 scratchpad | 8、3 |
| 4 | 新增 `bin/tested.sh`（約 60–80 行 bash），寫入 `docs/test-runs.jsonl` | `run <name>`：對每個 covered path 跑 `git rev-parse HEAD:<path>` 組成 inputs hash；如果有同名、同 mode、同 hash 的 PASS，而且 `dirty:false`、付費測試又沒過期，就印出 `SKIP … PASS at <hash> on <date>, cost, evidence` 後結束。否則就執行，把輸出 tee 到 `.test-evidence/<ts>-<name>.log`（加進 gitignore）並記下它的 sha256，從 `PIPESTATUS` 取真正的 exit code，從輸出最後的 `COST_USD=` 讀成本，最後追加一行 JSON。`status` 列出每個測試的狀態：新鮮 PASS／過期／從沒跑過／上次 FAIL。`cite <name>` 印出 run id。`--force` 強制重跑。在 Claude Code 裡，`run` 可以包在 flow 的 `test_slot` 鎖裡面跑，兩者不衝突 | 8、3 |
| 5 | `.gitattributes` 加一行 `docs/test-runs.jsonl merge=union` | 多個 worktree 同時追加紀錄時，合併不會衝突（union 是 git 內建的合併驅動，這條是主筆的常識，筆記裡沒有查證） | 5 |
| 6 | `docs/test-log.md` 標頭加一句 | 「2026-11-xx 起新紀錄寫在 `docs/test-runs.jsonl`，用 `bin/tested.sh status` 讀」。舊列保留（遵守 never delete rows） | 6 |
| 7 | 新增 `bin/session-brief.sh`，接到專案層 SessionStart | 只印四件事，總長不超過約 20 行：`docs/todo.md`「Tommy needs to do」裡還沒勾的項目、`bin/tested.sh status --short`、交接檔 baseline sha 到 HEAD 之間有幾個 commit、**已合併又乾淨、可以清的 worktree 有幾個**（只列，不刪；刪除照你的規則要你同意）。只跑本機指令，不 fetch，出錯時直接靜默結束（跟你 `report-git-hygiene.sh` 的設計一樣）。接法：Claude 用專案 `.claude/settings.json` 的 SessionStart（建議加 `compact` matcher，這是官方 hooks guide 建議的 compaction 後重新注入做法 ([hooks guide](https://code.claude.com/docs/en/hooks-guide))）；Codex 用 `.codex/hooks.json` 的 SessionStart（要先 trust 專案）；OpenCode 用 `.opencode/commands/brief.md` | 1、4、6、7、8 |
| 8 | `docs/STATUS.md` 的 Current 段改成 ExecPlan 四段 | **Progress**（附日期的勾選項）、**Surprises & Discoveries**（踩到的坑，取代「known problems」）、**Decision Log**（一行一個，詳細指向 `docs/decision-log.md`）、**Outcomes**（階段結束時寫）。目標是「只靠這份檔案就能接手」；這是 OpenAI 為 Codex 寫的格式，Claude 和 Codex 讀起來都只是普通 markdown。**這會改變你全域規則裡 STATUS 的格式**（一行狀態、最後驗證、進行中、已知問題、下一步），兩者大致對得上，但要你決定要不要改全域模板 | 1、6 |

JSONL 的一行長這樣，舉例用（欄位是推論設計；選 JSON 是參考 Anthropic 那篇「模型比較不會亂改 JSON」；欄位刻意和第五節給你朋友的建議 1 一致，將來 flow 若有帳本可以直接讀）：

```json
{"id":"r20261104-0912-polish-a","name":"e2e-polish-a","mode":"mock","inputs":"9c1e…","head":"373eebb","branch":"chore/demo-integrate-main-1104","dirty":false,"exit":0,"result":"PASS","cost_usd":0,"secs":212,"evidence":".test-evidence/20261104-0912-polish-a.log","log_sha256":"…","host":"mini"}
```

付費測試的 covered paths 至少要包含 `backend/gen_models.json`、`backend/requirements.txt`、`package-lock.json` 和測試腳本本身；`max_age_days` 預設 7；**只快取 PASS，不快取 FAIL**；mock 的 PASS 永遠不能抵付費的要求（mode 是 key 的一部分）。這些規則對應 test_run_memory 筆記裡列的錯誤跳過風險〔推論〕。

**第二階段：用了一兩週、確認第一階段有效之後**

`bin/whats-new.sh` 回答「其他 session 和隊友做了什麼」：先 `git fetch --all --prune`，再列出幾件事：`origin/main` 自上次看過之後的 commit（上次看到的 sha 存在 `$(git rev-parse --git-common-dir)/whats-new-last-seen`，所有 worktree 共用）、`gh pr list -R veralynchong/BuildClub --state all --limit 10`、`docs/test-runs.jsonl` 的新紀錄、各本地分支最近 24 小時的 commit（`git for-each-ref --sort=-committerdate refs/heads`）。它接在開場流程第 1 步的 `git pull` 之後，不放進 SessionStart，因為你的 hook 設計原則是開場不 fetch。另一個是專案層 PreToolUse(Bash) hook `bin/hooks/guard-paid.sh`（借自 cc-sessions「用 hook 擋，不用文字勸」的做法）：指令裡出現 registry 中 `paid` 測試的腳本路徑，卻不是透過 `bin/tested.sh` 呼叫時，就擋下來並提示正確用法；Claude 和 Codex 都用 `tool_input.command` 判斷。需要隊友動手的人類項目（例如 review PR #49），開 GitHub Issue 加上 label `human-action`，`docs/todo.md` 那一行附上 issue 編號，因為只有 Issues 會通知隊友。如果此時平行、互相依賴的 PR 工作已經每週都在發生，就在一個任務上試第 2 名的 flow 完整流程，先設好 `merge_mode: confirm`、`push_mode: confirm`，並先和你朋友談好分支前綴與 `-D` 的問題。

**第三階段（條件式）：** 開著的待辦超過約 30 項，或隊友開始派工時，用 Backlog.md 取代 `docs/todo.md`，它的 `decisions/` 先不用，繼續用 `docs/decision-log.md`。你朋友若做了帳本與「只用狀態」模式，就把 `bin/tested.sh` 的資料搬進 flow，腳本退休。真的需要跨機器、跨 session 認領任務時，再評估 Beads，並先用 `bd init --stealth` 在本機試，不提交進 repo ([Beads README](https://github.com/steveyegge/beads))。

**驗證方法：** 第一階段完成後，`bin/tested.sh run pytest` 連跑兩次，第二次應該印 `SKIP`；改一行 `backend/` 程式碼再跑，應該重跑；只改 `docs/STATUS.md` 再跑，應該還是 `SKIP`。開一場新的 Claude Code session，開場簡報應該列出可以清的 worktree 數。開一場新的 Codex session，問它「這個專案的常駐規則是什麼」，應該能答出不准合併隊友的 main。

**弱點：** hook 只是提醒，不是強制（Codex 文件明說），代理還是可能直接執行 `node e2e/...`，所以要靠 PreToolUse 擋，再加上 PR 的 Claims rule 雙重保險。路徑範圍的 hash 一旦漏列依賴，就會錯誤跳過，例如 fixture JSON、`seed-library.json`、`~/.hermes` 底下的 playwright-core 版本；這是這個設計最大的單點風險。`docs/test-runs.jsonl` 要 commit 才會跟到別台機器，跟專案 `CLAUDE.md` 的「不准擅自 commit」有張力，但你的 memory 規則已經允許 commit 驗證過的工作。ExecPlan 那份 cookbook 沒有日期、已標示封存，四段格式是借用，不代表 OpenAI 目前仍推薦。

## 結論

這次研究最重要的發現，不是哪個工具比較好，而是兩件事。第一，**工具不缺**：記憶、任務、工作流程、worktree 都有成熟工具，而工作流程層你已經裝了兩個，worktree 有 Orca；第一版說「沒有工具」，是因為搜尋漏了這一層。第二，**你的記憶已經分散在五個地方**（STATUS、test-log、todo、交接檔、Claude auto memory），**而且最權威的那份（常駐規則）放在唯一一個其他工具讀不到的地方**；已裝的工具也都沒接上 repo。所以下一步不是再加一個存放處，而是減少存放處、把規則接上 `AGENTS.md`，並且讓「已測」從一句話變成可以查詢的事實。帶成本與證據的測試帳本，GitHub、社群都找不到，連你朋友的 flow 也只記 token 成本。對一個常常花錢跑模型的 solo 專案來說，這支約 80 行的腳本，可能比任何 28k 星的追蹤器都更值得做。

另一個意涵是：「跨工具一致」目前還是假設，Codex 在 BuildClub 上的使用紀錄是零；反而「跨 session、跨機器、跨隊友」的一致性每天都在出事。所以 `AGENTS.md` 的價值不在於準備換工具，而在於它是唯一一份 Claude、Codex、OpenCode、另一台 Mac、隊友都會讀到的檔案。先把它補上，其他工具之後隨時能接上；順序反過來的話，任何工具都只是又一個會跟其他檔案漂移的存放處。flow 的路線也一樣：如果你朋友把帳本和「只用狀態」模式做出來，它可以接手這本帳；在那之前，先用一支誰都能跑的 shell 腳本，把格式定下來。
