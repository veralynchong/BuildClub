# P2.5 一致性套組 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每個客戶存一組有名字的參考圖（套組）。畫布上的套組節點自動接到每個分鏡圖，生成時帶 N 張參考圖和固定格式的英文 prompt 前綴，讓 6 鏡分鏡圖都是同一個人、同一個產品。

**Architecture:**
- 後端：新模組 `backend/kit.py` 管客戶層的套組資料和圖片，形狀照 `brand.py`；裡面也放純函式 `kit_prefix()`。`generations.py` 的單一 `reference` 改成 `references` 清單，生成開始時把套組圖複製進 plan 的 gen 資料夾。
- 前端：純函式放在 `src/lib/canvas/kit.ts`，負責組參考圖清單、自動接線、判斷過期。畫面有 `KitNode` 和 `KitPanel`。CanvasScreen 只負責把這些接起來。

**Tech Stack:** FastAPI + Pydantic + SQLite，React 19 + TS + `@xyflow/react`，測試用 pytest 和 `node --test`。

**Spec:** `pivots/02-content/docs/specs/2026-11-03-consistency-kit-design.md`（下稱「規格」）。規格的 §9.5 優先於前面章節。

路徑相對於 `pivots/02-content/app/trend-finder/`，除非另外寫明。分支是 `feat/canvas-p2-5-kit`，接在 `fix/replace-veo-with-omni-flash`（PR #39）後面。

## Global Constraints

- 不新增任何 npm 或 pip 依賴。
- 介面文字一律走 `t()`，`src/lib/strings/` 裡英文和繁中都要加。prompt 前綴固定是英文。
- 套組項目 `kind` ∈ `character | product | place | style`，每個客戶最多 20 項；`name` 1–40 字，同一個客戶內不分大小寫不能重複；`note` ≤ 200 字。每項 0–4 張圖，PNG / JPG / WebP，單張 ≤ 10 MB。
- 圖片檔放在 `media/kit/<clientId>/`，檔名 `ka_<token>.<ext>`；項目 id 是 `k_<token>`。
- 參考圖排序：先放手動接的 `in:ref`，再放套組，套組依 角色 → 產品 → 場景 → 風格 排。超過上限時從尾端砍，手動接的圖最後才砍。
- 模型沒寫 `maxRefs` 時當作 1。`perRefUsd` 不存在時，參考圖費用當 0。
- `startFrame` 維持單一一張。
- 套組變動只把分鏡圖標 `stale`，不自動重跑。
- 只有 `storyboard` 有 `in:kit` 埠。每張畫布最多一個 `kit` 節點。
- 寫入套組的路由和品牌一樣，只給登入的員工用，並共用 `brand.lock`（`PUT /api/clients` 也用這把鎖保住品牌）。
- 不做手機版（不檢查 390 寬）。
- 每個任務結束都要跑 `bash bin/verify.sh`，結果要是 GREEN。前端任務還要跑 `npx tsc --noEmit`（先取得 `mcp__flow__test_slot`）。

## Review Focus

1. **生成時套組圖已經從硬碟上刪掉**（另一個分頁刪了項目）：應該回 422「An input image is missing.」，不能 500，也不能扣錢。→ Task 2 `test_kit_ref_deleted_file_422`
2. **舊的客戶清單存檔把套組洗掉**：`PUT /api/clients` 帶舊資料或不帶 `kit` 時，伺服器要保留原本的套組。→ Task 1 `test_put_clients_keeps_kit`
3. **換成上限比較小的模型**：已經手動接了 3 張 `in:ref`，又換成 `maxRefs: 1` 的模型，要砍到剩 1 張並列出沒帶的圖，不能送出去被 422 擋回。→ Task 4 `kitRefs trims manual refs last`
4. **plan 的客戶不存在，或客戶沒有套組**：套組節點顯示空的，分鏡圖照常生成，不帶任何套組參考。→ Task 4 `kitRefs with null kit` 和 Task 2 `test_kit_ref_other_client_422`
5. **偽裝的圖片**（副檔名是 png，內容不是）：回 415，硬碟上不留檔案。→ Task 1 `test_kit_image_rejects_fake_png`

---

### Task 1: 後端套組資料和路由

**Files:**
- Create: `backend/kit.py`
- Modify: `backend/models.py`（`Client` 加 `kit`）、`backend/server.py:797-801`（保住 `kit`，做法同 `brand`）、`backend/server.py:961`（掛 router）
- Test: `backend/tests/test_kit.py`

**Interfaces:**
- Produces:
  - `models.KitItem(id: str, kind: Literal["character","product","place","style"], name: str, note: str = "", images: list[str] = [], updatedAt: int)`
  - `models.Kit(items: list[KitItem] = [])`
  - `Client.kit: Optional[Kit] = None`
  - `kit.kit_folder(media: Path, client_id: str) -> Optional[Path]`：`<media>/kit/<id>`；`ID_RE` 不合法時回 None
  - `kit.find_item(load, client_id: str, item_id: str) -> Optional[KitItem]`
  - `kit.make_router(load, save, media_dir) -> APIRouter`
- 路由（錯誤一律回 `{"error": <英文句子>}`）：
  - `GET /api/clients/{cid}/kit` → `Kit`
  - `POST /api/clients/{cid}/kit/items`，body `{kind, name, note?}` → 201 + `KitItem`
  - `PATCH /api/clients/{cid}/kit/items/{iid}`，body 是 `{kind?, name?, note?}` 的任意組合 → `KitItem`（`updatedAt` 更新）
  - `DELETE /api/clients/{cid}/kit/items/{iid}` → `Kit`（連同圖片檔一起刪）
  - `PUT /api/clients/{cid}/kit/items/{iid}/images`，原始 body 加 content-type → `KitItem`（加一張，`updatedAt` 更新）
  - `DELETE /api/clients/{cid}/kit/items/{iid}/images/{name}` → `KitItem`（`updatedAt` 更新）
  - `GET /api/clients/{cid}/kit/files/{name}` → 圖片檔（只回這個客戶套組裡登記過的檔名）

- [ ] **Step 1: 寫失敗的測試** `backend/tests/test_kit.py`。fixture 沿用 `test_brand.py` 的 `from test_takes import A, setup`，`PNG` / `JPG` / `SVG` 常數照抄。

```python
def test_create_item_and_list(client, setup):
    r = client.post("/api/clients/a/kit/items", json={"kind": "character", "name": "Mia", "note": "short black bob"})
    assert r.status_code == 201 and r.json()["id"].startswith("k_") and r.json()["images"] == []
    assert [i["name"] for i in client.get("/api/clients/a/kit").json()["items"]] == ["Mia"]

def test_name_rules(client, setup):  # duplicate (case-insensitive), empty, >40 chars, unknown kind -> 422
def test_item_limit_20(client, setup):  # the 21st POST -> 422
def test_note_over_200_422(client, setup):
def test_image_upload_and_limit_4(client, setup):  # 4 x PNG ok; 5th -> 422; updatedAt grows after each
def test_kit_image_rejects_fake_png(client, setup):  # SVG bytes with image/png -> 415, folder has no file
def test_image_over_10mb_413(client, setup):
def test_delete_image_and_item_removes_files(client, setup):
def test_file_route_only_serves_registered_names(client, setup):  # unknown name / "../x" -> 404
def test_put_clients_keeps_kit(client, setup):  # create item; client.put("/api/clients", json=[A]) -> kit kept
def test_unknown_client_404(client, setup):
```

- [ ] **Step 2: 跑測試，確認失敗**
Run: `backend/.venv/bin/python -m pytest -q backend/tests/test_kit.py`
Expected: FAIL（404 或 import error）

- [ ] **Step 3: 實作** `models.py`、`kit.py`、`server.py`
- 上傳的串流、檢查檔頭（`generations.image_header_ok`）、`.part` 暫存檔和換名，都照 `brand.put_logo` 的做法。
- 所有寫入都包在 `with brand.lock:` 裡。
- `server.py` 存客戶時，在保住 `brand` 的同一段把 `kit` 也保住。

- [ ] **Step 4: 跑測試，確認通過**
Run: `backend/.venv/bin/python -m pytest -q backend/tests/test_kit.py backend/tests/test_brand.py`
Expected: PASS

- [ ] **Step 5: Commit** `feat(trend-finder): per-client consistency kit storage and routes`

---

### Task 2: 生成請求改成多張參考圖＋prompt 前綴

**Files:**
- Modify: `backend/gen_models.json`（圖片模型加 `maxRefs`）
- Modify: `backend/generations.py`：`input_hash`、`check`、`create`，`_run` 約第 329 行解析參考圖的地方，以及 `to_json`
- Modify: `backend/kit.py`（加 `kit_prefix`）
- Modify: `backend/gen_providers.py`（mock 圖片印出參考圖張數）
- Test: `backend/tests/test_generations.py`、`backend/tests/test_kit.py`

**Interfaces:**
- Consumes: Task 1 的 `kit.find_item`、`kit.kit_folder`
- Produces:
  - 請求 body 的 `references: list[GenRef]`，`GenRef` 是下面兩種之一：
    - `{"source": "gen", "genId": str}`
    - `{"source": "kit", "itemId": str, "image": str}`
  - body 裡的舊欄位 `reference: str` 仍然接受，視為 `[{"source":"gen","genId":...}]`。
  - 生成紀錄的 `inputs`：
    ```
    {prompt, startFrame, duration,
     references: [GenRef + {"name"?: str, "kind"?: str, "file"?: str}],
     kitStamp: {itemId: updatedAt},
     sentPrompt: str}
    ```
    `file` 是複製進 gen 資料夾後的檔名。讀到只有舊 `reference` 的紀錄時，`to_json` 回 `references: [{"source":"gen","genId":reference}]`。
  - `kit.kit_prefix(items: list[tuple[KitItem, list[int]]]) -> str`：參數是每個套組項目，以及它的圖在整份清單裡的編號（從 1 開始）。
  - `input_hash(model, prompt, start, refs: list, duration)`：`refs` 排序後算進雜湊。
  - `gen_models.json` 加 `maxRefs`：`mock-image` 14、`seedream-4.5` 10、`nano-banana-2` 14、`nano-banana-pro` 14。實作時上官方頁面核對，數字不同就以官方為準，並更新 `priceCheckedAt`。

- [ ] **Step 1: 寫失敗的測試**

```python
# test_kit.py
def test_kit_prefix_format():
    mia = KitItem(id="k_1", kind="character", name="Mia", note="early 20s, short black bob", images=["a.png", "b.png"], updatedAt=1)
    cup = KitItem(id="k_2", kind="product", name="Matcha cup", note="white cup", images=["c.png"], updatedAt=1)
    look = KitItem(id="k_3", kind="style", name="Warm film", note="35mm, warm tones", images=[], updatedAt=1)
    assert kit_prefix([(mia, [1, 2]), (cup, [3]), (look, [])]) == (
        'Reference images: image 1–2 are the character "Mia" (early 20s, short black bob) — keep their face, hair and outfit the same.\n'
        'Image 3 is the product "Matcha cup" (white cup) — keep its shape, colour and logo the same.\n'
        'Style: Warm film — 35mm, warm tones.\n')
# place: 'Image N is the place "X" (note) — keep its layout and look the same.'
# A note that is "" drops its brackets. A single image says "image N is", a run says "image N–M are".
```

角色那句用 "their"，不用規格範例裡的 "her"〔我的決定：前綴不能猜性別〕。

```python
# test_generations.py
def test_refs_kit_item_ok_and_copied(...):     # kit ref -> 201; inputs.references[0].file exists in media/<idea>/gen/; sentPrompt starts with "Reference images:"
def test_kit_ref_other_client_422(...):        # an item from client "b" on client "a"'s plan -> 422
def test_kit_ref_deleted_file_422(...):        # registered name but the file is gone -> 422 "An input image is missing.", budget unchanged
def test_refs_over_max_422(...):               # 15 refs on mock-image (maxRefs 14) -> 422
def test_refs_on_none_model_422(...):          # references on a model with reference "none" -> 422
def test_missing_maxrefs_means_one(...):       # model without maxRefs: 2 refs -> 422
def test_legacy_reference_field_still_works(...)
def test_legacy_row_reads_as_references(...)   # a stored row with inputs.reference -> to_json references list
def test_input_hash_order_independent(...)
def test_prefix_too_long_shortens_notes(...)   # prompt 3900 chars + long notes -> notes cut to 60 chars, then dropped; still > MAX_PROMPT -> 422
def test_mock_image_shows_ref_count(...)       # the mock SVG contains "3 refs"
```

- [ ] **Step 2: 跑測試，確認失敗**
Run: `backend/.venv/bin/python -m pytest -q backend/tests/test_generations.py backend/tests/test_kit.py`

- [ ] **Step 3: 實作**
- `check()` 的 `ref` 參數改成 `refs: list`。`gen` 來源沿用 `one()` 的規則；`kit` 來源用 plan 的 `clientId` 跑 `find_item`，而且 `image` 必須在 `item.images` 裡、檔案要存在。總數上限是 `maxRefs`，沒寫就當 1。
- `create()` 依序做：檢查 → 組前綴 → 前綴加上 prompt 超過 `MAX_PROMPT` 就照「note 截到 60 字 → 拿掉 note → 回 422」縮短 → 把套組圖複製成 `media/<idea>/gen/kit-<name>` → 存 `inputs`。
- `_run` 把每個 ref 解析成路徑：`gen` 走 `_input_path`，`kit` 用 `folder / file`。送出時用 `sentPrompt`，沒有的話退回 `prompt`。
- mock：圖片的佔位文字後面加 ` · {n} refs`。

- [ ] **Step 4: 跑測試，確認通過**
Run: `bash bin/verify.sh`（在 repo 根目錄）
Expected: `verify: GREEN`

- [ ] **Step 5: Commit** `feat(trend-finder): generations take N references with a kit prompt prefix`

---

### Task 3: 「整條跑完」帶參考圖

**Files:**
- Modify: `backend/generations.py:517-590`（`chain`）
- Test: `backend/tests/test_generations.py`

**Interfaces:**
- Consumes: Task 2 的 `check(refs=...)`、前綴和複製檔案的流程（抽成 `_prepare_refs(idea, model, prompt, refs) -> (inputs_part, error)`，讓 `create` 和 `chain` 共用）
- Produces: chain body 多一個 `references: list[GenRef]`，只用在分鏡圖那一步。`videoReference` 照舊回 422。

- [ ] **Step 1: 寫失敗的測試**
  - `test_chain_with_kit_refs`：分鏡圖那一列的 `inputs.references` 有 kit ref，影片那一列是 `references == []`。
  - `test_chain_quote_unchanged_by_refs`：帶不帶參考圖，報價的 `total` 都一樣。
- [ ] **Step 2: 跑測試，確認失敗**
- [ ] **Step 3: 實作** 拿掉 `generations.py:531` 對 `reference` 的拒絕，改成走 `_prepare_refs`。
- [ ] **Step 4:** `bash bin/verify.sh`，Expected: GREEN
- [ ] **Step 5: Commit** `feat(trend-finder): run-the-whole-shot sends kit references`

---

### Task 4: 前端型別、埠和套組純函式

**Files:**
- Modify: `src/types.ts`（`Kit`、`KitItem`、`Client.kit?`）
- Modify: `src/lib/canvas/types.ts`：`NodeKind` 加 `'kit'`；`Media` 加 `'kit'`；`NodeData` 加 `kitItems?: string[]`、`kitOff?: string[]`、`kitCut?: boolean`；`GenModel.maxRefs?: number`；`Generation.inputs` 加 `references`、`kitStamp`、`sentPrompt`；`ChainBody.references?`
- Modify: `src/lib/canvas/ports.ts`
- Modify: `src/lib/canvas/graph.ts`：`GenRequest.reference` 換成 `references: GenRef[]`；`genRequest` 的簽名見下面
- Modify: `backend/canvas.py:25-26`（`NODE_TYPES` 加 `"kit"`；`check_doc` 拒絕第二個 kit 節點，訊息 "A canvas can have one kit node."）
- Create: `src/lib/canvas/kit.ts`
- Test: `unit/kit.test.mjs`、`unit/canvas.test.mjs`、`backend/tests/test_canvas.py`

**Interfaces:**
- Consumes: Task 2 的 `GenRef` 形狀
- Produces（`src/lib/canvas/kit.ts`）：
  ```ts
  export type GenRef = { source: 'gen'; genId: string } | { source: 'kit'; itemId: string; image: string }
  export interface KitRefs { references: GenRef[]; dropped: string[]; unused: boolean }
  // dropped: names of kit items (or 'image N' for manual refs) not sent; unused: the model takes no references
  export function kitRefs(doc: CanvasDoc, nodeId: string, kit: Kit | null, gens: Generation[], model: GenModel | undefined): KitRefs
  export function wireKit(doc: CanvasDoc): CanvasDoc   // adds kit→storyboard 'in:kit' edges where missing and !data.kitCut
  export function pruneKit(doc: CanvasDoc, kit: Kit | null): CanvasDoc  // drops deleted item ids from kitItems / kitOff
  export interface KitStale { nodeId: string; removed: string[] }  // removed: names of deleted items it used
  export function kitStale(doc: CanvasDoc, gens: Generation[], kit: Kit | null): KitStale[]
  // storyboards whose selected version has a kitStamp entry newer than the item's updatedAt, or for an item now gone
  ```
  - `genRequest(doc, nodeId, shots, gens, kit: Kit | null = null, model?: GenModel): GenRequest`：`references` 用 `kitRefs(...).references`。
  - `ports.ts`：
    - `KIT: Port = { id: 'in:kit', media: 'kit' }`；`PORTS.kit = { inputs: [] }`；`PORTS.storyboard = { inputs: [TEXT, REF, KIT] }`；`outMedia(kit) = 'kit'`。
    - `in:ref` 不再用 `taken` 擋，改成數量達到 `maxRefs`（沒有就是 1）時回 `{ ok:false, reason:'canvas.conn.full', vars:{ max } }`。其他埠照舊用 `taken`。

- [ ] **Step 1: 寫失敗的測試** `unit/kit.test.mjs`（import 方式照 `unit/canvas.test.mjs`）

```js
test('kitRefs orders manual refs, then character, product, place, style', ...)
test('kitRefs skips items in kitOff and items not in kitItems', ...)
test('kitRefs trims from the end', ...)   // maxRefs 3: 1 manual + Mia(2 images) + Warm film(1 image) -> sends manual + Mia x2, dropped ['Warm film']
test('kitRefs lists a partly cut item as dropped', ...)   // maxRefs 2: 1 manual + Mia(2 images) -> sends manual + Mia image 1, dropped ['Mia']
test('kitRefs trims manual refs last', ...)                 // maxRefs 1, 3 manual refs -> 1 sent, dropped ['image 2','image 3']
test('kitRefs with null kit', ...)                          // only manual refs, dropped []
test('kitRefs on a model with reference none', ...)         // references [], unused true
test('kitRefs without an in:kit edge sends no kit refs', ...)
test('wireKit connects every storyboard once and respects kitCut', ...)
test('wireKit with no kit node is a no-op', ...)
test('pruneKit removes deleted ids', ...)
test('kitStale flags a newer updatedAt and a removed item', ...)
test('kitStale ignores storyboards with no done version', ...)
```

`unit/canvas.test.mjs` 加：
- `canConnect in:ref allows up to maxRefs`
- `canConnect kit only to in:kit`
- `genRequest returns references`

把既有對 `reference` 的斷言一起改掉。`test_canvas.py` 加 `test_one_kit_node_only`。

一個項目只被砍掉一部分圖片時，也列進 `dropped`〔我的決定：寫「沒帶完整」比不寫好〕。

- [ ] **Step 2: 跑測試，確認失敗** Run: `node --test unit/kit.test.mjs unit/canvas.test.mjs`
- [ ] **Step 3: 實作** `kit.ts`、`ports.ts`、`graph.ts`、`types.ts`、`canvas.py`
- [ ] **Step 4:** `bash bin/verify.sh` GREEN；取得 typecheck slot 後跑 `npx tsc --noEmit`，結果要乾淨。CanvasScreen 對 `genRequest` 的呼叫在這個任務先傳 `null`，讓型別檢查通過。
- [ ] **Step 5: Commit** `feat(trend-finder): kit node type, multi-line references and kit graph rules`

---

### Task 5: 套組 API client 和套組面板

**Files:**
- Modify: `src/lib/canvas/api.ts`（加套組的函式）
- Create: `src/components/canvas/KitPanel.tsx`
- Modify: `src/lib/strings/canvas.ts`（如果畫布的字串不在這裡，就加在現有畫布字串所在的檔案）
- Test: `unit/kit.test.mjs`（api 部分用 fetch stub，照 `canvas.test.mjs` 測 `putCanvas` 的方式）

**Interfaces:**
- Consumes: Task 1 的路由
- Produces：
  ```ts
  getKit(clientId: string): Promise<Kit>
  createKitItem(clientId: string, body: { kind: KitKind; name: string; note?: string }): Promise<KitItem>
  updateKitItem(clientId: string, itemId: string, body: Partial<{ kind: KitKind; name: string; note: string }>): Promise<KitItem>
  deleteKitItem(clientId: string, itemId: string): Promise<Kit>
  addKitImage(clientId: string, itemId: string, file: File): Promise<KitItem>
  deleteKitImage(clientId: string, itemId: string, name: string): Promise<KitItem>
  kitFileUrl(clientId: string, name: string): string
  ```
  - 錯誤時丟 `Error`，訊息是後端回的 `error`。
  - `<KitPanel clientId kit selected={string[]} onKit={(k: Kit) => void} onSelected={(ids: string[]) => void} onClose />`：上半部「這個客戶的套組」，可以新增、改名、改類型、改 note、上傳或刪除圖片、刪除項目；下半部「這支片要用」是勾選框。刪除項目和刪除圖片前，用頁面內的確認列，不用瀏覽器的 `confirm()`。
- 版面沿用現有的抽屜和設計系統元件〔交給實作者〕。

- [ ] **Step 1: 寫失敗的測試**：每個 api 函式打的 method 和 URL 都對；錯誤時丟出後端的 `error` 訊息。
- [ ] **Step 2: 跑測試，確認失敗**
- [ ] **Step 3: 實作** api 函式、`KitPanel`、英文和繁中字串
- [ ] **Step 4:** verify GREEN；`npx tsc --noEmit` 乾淨；`unit/i18n.test.mjs` 通過（它會檢查兩種語言的 key 一致）
- [ ] **Step 5: Commit** `feat(trend-finder): kit panel and kit api client`

---

### Task 6: 套組節點、分鏡圖勾選框，接進 CanvasScreen

**Files:**
- Create: `src/components/canvas/nodes/KitNode.tsx`
- Modify: `src/components/canvas/nodes/index.ts`、`nodes/GenNode.tsx`、`nodes/Ports.tsx`、`src/components/canvas/AddNodeMenu.tsx`、`src/components/canvas/CanvasScreen.tsx`
- Test: 純邏輯已經在 Task 4 測過；這個任務只靠 tsc 和 Task 7 的 E2E 驗證

**Interfaces:**
- Consumes: Task 4 的 `kitRefs`、`wireKit`、`pruneKit`、`kitStale`；Task 5 的 api 和 `KitPanel`
- 要接起來的行為：
  1. 載入畫布時，用 `idea.clientId` 呼叫 `getKit`，失敗或沒有 clientId 時當 `null`。然後依序套用 `pruneKit` → `wireKit`，再用 `kitStale` 的結果把節點標 `stale`，下游影片也用 `staleIds` 一起標。有變動就存檔。
  2. `KitPanel` 的 `onKit` 觸發時，重跑第 1 步的三個函式。
  3. `AddNodeMenu` 加「套組」；畫布上已經有套組節點時，這個選項變成不能按。新增後立刻跑 `wireKit`。
  4. `kitItems` 改了：每個接了 `in:kit` 的分鏡圖都跑 `staleIds(self=true)`。`kitOff` 改了：只標那一鏡。
  5. 刪掉一條 `in:kit` 線：目標分鏡圖設 `kitCut: true`，並標過期。手動接回時清掉 `kitCut`，也標過期。
  6. GenNode（分鏡圖）：
     - 每個套組項目一個勾選框，對應 `kitOff`。
     - `dropped` 不是空的時，顯示一行 `canvas.kit.dropped`，例如「這個模型最多 {max} 張，這次沒帶：{names}」。
     - `unused` 時顯示 `canvas.kit.unused`。
     - `kitStale` 的 `removed` 不是空的時，顯示 `canvas.kit.removed`，例如「{names} 已從套組刪除」。
     - 可以展開看選中版本的 `inputs.sentPrompt`。
  7. 生成和整條跑完時，`genRequest(..., kit, model)`，以及 chain body 的 `references`，都用 `kitRefs`。
  8. KitNode 顯示這支片的卡司：縮圖用 `kitFileUrl`，加名字和類型標籤，再一顆「編輯套組」按鈕打開 `KitPanel`。只有一個 `out` handle。
  9. 套組的線樣式是淡色細線，套組節點被選中時才加強〔交給實作者〕。

- [ ] **Step 1: 實作** 上面 1–9
- [ ] **Step 2:** verify GREEN；`npx tsc --noEmit`、`npm run build`、`npm run lint` 都沒有錯誤
- [ ] **Step 3: Commit** `feat(trend-finder): kit node on the canvas with auto-wiring and per-shot picks`

---

### Task 7: 瀏覽器 E2E（mock）和真實測試

**Files:**
- Create: `.superpowers/sdd/2026-11-03-canvas-p2-5-kit-plan/task-7-report.md`（照 P3 的報告格式）
- Modify: `docs/STATUS.md`（repo 根目錄）

- [ ] **Step 1: mock E2E**，1440 寬，用 Playwright MCP，只用 mock 模型。照規格 §8 第 3 項的步驟：
  1. 建 1 個角色、1 個產品；
  2. 加套組節點，6 個分鏡圖都自動接上；
  3. 取消第 3 鏡的產品；
  4. 生成一鏡，佔位圖上顯示 `2 refs`（角色 1 張＋產品 1 張）；第 3 鏡顯示 `1 refs`；
  5. 改角色的 note，重新整理後，生成過的鏡頭標過期；
  6. 刪掉角色，節點顯示「Mia 已從套組刪除」；
  7. 整條跑完一鏡成功；
  8. 開同一個客戶的第二個 plan，套組已經在。
  每一步截圖存進報告。結束時關掉自己開的分頁。
- [ ] **Step 2: 真實測試要先報價，等使用者同意才跑。** 估計約 US$1.28（Seedream 4.5 12 張＋Omni Flash 2 × 4 秒），超過 US$1。要寫明用哪個 key（`FAL_KEY`）、做什麼、上限 US$1.50。通過標準：兩個 plan、12 張分鏡圖，人和杯子一眼看得出是同一個；2 段影片沒有走樣。
- [ ] **Step 3:** 把結果寫進 `docs/STATUS.md`（狀態、驗證日期、已知問題）
- [ ] **Step 4: Commit** `docs(status): P2.5 consistency kit E2E`
