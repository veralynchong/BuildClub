# Planning board: proposed API

Written 3 Nov 2026 on `feature/shot-board`. Status: **proposed, not built**. The front end already calls these
routes (`app/trend-finder/src/lib/boardAssist.ts`). Until they exist, or whenever a call fails or the app runs on
sample data, the board makes a deterministic "sample edit" in the browser and says so on screen. Nothing here is
saved by the routes: the board merges the answer into its shots and saves the plan through the normal
`PUT /api/ideas` path.

## Shared rules

- `{id}` is the saved idea's id, URL-encoded.
- `prompt`: 1 to 500 characters (the front end enforces `MAX_PROMPT = 500`). Any language; answer in the prompt's language.
- A shot uses the existing `Shot` model in `backend/models.py` (`time`, `shot`, optional `text`, `framing`, `angle`,
  `movement`, `tip`, `line`, `purpose`, …). The board strips its own `footage` field before sending; an uploaded
  file's shot arrives with `shot` set to its file name or label.
- Errors: any non-2xx status, or a body that does not match, makes the front end fall back to the sample edit. An
  `{"error": "..."}` body is welcome but not shown yet.
- Suggested errors: `404` unknown idea, `422` bad body, `503` AI turned off (the front end treats every one the same).

## `POST /api/ideas/{id}/board/rewrite`

"Change the shot list": rewrite the whole list from a prompt ("make it faster", "add a taste-test reaction").

Request:

```json
{
  "prompt": "make it faster",
  "shots": [
    { "time": "0-3s", "shot": "Pour the sauce", "framing": "close_up" },
    { "time": "3-8s", "shot": "Stir", "line": "Dinner in ten" }
  ]
}
```

Response `200`:

```json
{
  "source": "claude",
  "shots": [
    { "time": "0-2s", "shot": "Pour the sauce", "framing": "close_up", "angle": "top_down", "movement": "static" },
    { "time": "2-5s", "shot": "Stir", "line": "Dinner in ten" }
  ]
}
```

- `shots` is the full new list, in order. Every item needs a string `shot`; `time` should be a range like `"2-5s"`.
- Keep lines the user marked `edited: true` unless the prompt asks to change them.
- The front end keeps an uploaded file on the shot at the same index, so try to keep those shots in place.
- `source` is optional (the front end only checks `shots`).

## `POST /api/ideas/{id}/board/insert`

"Add a shot between two cards": write one new shot for the gap between `before` and `after`.

Request:

```json
{
  "prompt": "a close-up of the first bite",
  "before": { "time": "3-8s", "shot": "Stir" },
  "after": { "time": "8-12s", "shot": "Plate it" }
}
```

`before` or `after` may be `null` (at the start or the end).

Response `200`:

```json
{
  "source": "claude",
  "shot": { "time": "8-11s", "shot": "Close-up of the first bite", "framing": "close_up", "angle": "eye_level", "movement": "static" }
}
```

The front end re-times the list after inserting (each shot keeps its length, times run on), so `time` only needs
the right length.

## What the sample edit does (for parity)

`sampleRewrite` in `boardAssist.ts`: "remove X" drops shots that mention X; "add X" (or any other prompt) puts a
new shot about X before the last shot; "faster/shorter/快/短" makes each shot about 60% as long and keeps at most
5; "slower/longer/慢/長" makes each about 140% as long. `sampleInsert` writes the prompt's subject as a 3-second
shot with a framing guessed from its words.

## Fields the ideas save should keep (please add to `backend/models.py`)

The board saves three new optional fields. Pydantic currently ignores unknown fields, so in live mode they are
dropped on save: positions reset and uploaded pictures are lost after a reload. Nothing breaks.

```python
class Footage(BaseModel):
    key: str = Field(max_length=80)
    kind: Literal["image", "video"]
    name: str = Field(max_length=200)
    # A data URL, only for images up to ~300 KB. Bigger files stay on the uploader's device for now.
    src: Optional[str] = Field(default=None, max_length=420_000, pattern=r"^data:image/")
    deviceOnly: Optional[bool] = None

class BoardPos(BaseModel):
    x: float
    y: float

# Shot:      footage: Optional[Footage] = None
# SavedIdea: boardLayout: Optional[list[BoardPos]] = Field(default=None, max_length=200)
```

`boardLayout[i]` is where shot `i` sits on the canvas. It is only used when its length matches `shots`.

A later step would be an upload route (for example `POST /api/ideas/{id}/board/media` returning a URL) so big
clips are not limited to one device. Not needed for the demo.
