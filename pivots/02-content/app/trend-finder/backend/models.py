"""API contract between this backend and the front end. Field names match src/types.ts
(camelCase), so the front end can use the JSON as is. /docs shows these models."""

import math
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator


class WorkspaceMetadata(BaseModel):
    """An independent canvas belongs to an existing client, without an idea or shot list."""
    id: str
    kind: Literal['workspace'] = 'workspace'
    clientId: str
    title: str
    createdAt: int
    updatedAt: int


class SearchVideo(BaseModel):
    """One video in a search result, as trimmed from the Apify item."""
    id: str
    text: str
    url: str
    createTime: Optional[str] = None
    # Null on Reddit, which shows no views: upvotes stand in for them.
    plays: Optional[int] = None
    likes: int
    comments: int
    shares: int
    saves: Optional[int] = None
    duration: float
    cover: str
    author: str
    # Null on Instagram: its search results carry no follower counts.
    followers: Optional[int] = None
    music: str
    musicOriginal: bool
    hashtags: list[str]
    # Views ÷ followers, the TikTok sort order (Daphne's rule). Null when followers is.
    ratio: Optional[float] = None
    # The account's usual views (median of its latest videos) and views ÷ that.
    # Null when the account has too few videos, or for searches saved before this existed.
    medianViews: Optional[float] = None
    outlier: Optional[float] = None
    # How many videos the median covers (null on searches saved before baselines were kept).
    medianN: Optional[int] = None
    # Dates (YYYY-MM-DD) of the oldest and newest video in the median.
    baselineFrom: Optional[str] = None
    baselineTo: Optional[str] = None
    # When the median was fetched, in ms since the epoch.
    medianFetchedAt: Optional[int] = None
    # What outlier is measured against: the account's median, or followers when there is no median.
    denominator: Optional[Literal["median", "followers"]] = None
    # YouTube only: the channel, which the usual views are looked up by. Not shown in the app.
    channelId: Optional[str] = None
    # Reddit only: upvotes, the subreddit (without "r/"), and the subreddit's median upvotes over its
    # top posts of the month. outlier is upvotes ÷ medianUpvotes.
    upvotes: Optional[int] = None
    community: Optional[str] = None
    medianUpvotes: Optional[float] = None


class SearchResult(BaseModel):
    query: str
    platform: Literal["tiktok", "instagram", "youtube", "reddit", "x"]
    fetchedAt: int
    videos: list[SearchVideo]
    cached: bool
    # True while account (or subreddit) medians are still being fetched; search again (it's cached) for the scores.
    mediansPending: bool = False


Hex = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]


class Brand(BaseModel):
    # One font only: the export renders offline, so it can use only a font bundled in public/fonts/.
    # Adding a font means adding its file there and a value to this Literal.
    logo: Optional[str] = Field(None, pattern=r"^logo-[A-Za-z0-9_-]{6,40}\.(png|jpg|webp)$")
    font: Literal["Noto Sans TC"] = "Noto Sans TC"
    color: Optional[Hex] = None


class KitItem(BaseModel):
    id: str = Field(pattern=r"^k_[A-Za-z0-9_-]{6,40}$")
    kind: Literal["character", "product", "place", "style"]
    name: str = Field(min_length=1, max_length=40)
    note: str = Field("", max_length=200)
    images: list[str] = Field(default_factory=list, max_length=4)
    updatedAt: int  # epoch milliseconds; strictly increases on every change to the item


class Kit(BaseModel):
    items: list[KitItem] = Field(default_factory=list, max_length=20)


class Client(BaseModel):
    id: str
    name: str
    niche: str
    audience: str
    monthlyTarget: int
    examples: list[str]
    topics: Optional[list[str]] = None
    cannot: list[str]
    brand: Optional[Brand] = None
    kit: Optional[Kit] = None


Framing = Literal["wide", "medium", "close_up", "extreme_close_up", "overhead", "pov"]
Angle = Literal["eye_level", "high", "low", "top_down"]
Movement = Literal["static", "pan", "tilt", "push_in", "handheld", "tracking"]


class Footage(BaseModel):
    key: str
    kind: Literal["image", "video"]
    name: str
    src: Optional[str] = None
    deviceOnly: Optional[bool] = None


class BoardPos(BaseModel):
    x: float = Field(allow_inf_nan=False)
    y: float = Field(allow_inf_nan=False)


class ScriptLine(BaseModel):
    say: str
    onScreen: str


class PlanScript(BaseModel):
    lines: list[ScriptLine]
    basedOn: str
    edited: Optional[bool] = None
    writtenAt: int


class Shot(BaseModel):
    # Stable id the node canvas keys its rows on. Optional on the wire; SavedIdea fills it in (fill_shot_ids).
    id: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,40}$")
    time: str
    shot: str
    text: Optional[str] = None
    # Camera direction and a one-line filming tip. Optional so plans and breakdowns saved before they existed
    # still load; a new AI breakdown must carry the three camera fields (see ShotOut).
    framing: Optional[Framing] = None
    angle: Optional[Angle] = None
    movement: Optional[Movement] = None
    tip: Optional[str] = Field(default=None, max_length=300)
    # Per-shot script and storyboard (all optional, so plans saved before they existed still load).
    # line: what is said; options: up to 3 other lines; edited: the user changed the line, so a
    # regeneration must not overwrite it unless asked. frameImage: a URL from the frame endpoint.
    # palette: hex colours the client reads from the frame; the server only stores them.
    line: Optional[str] = Field(default=None, max_length=500)
    purpose: Optional[Literal["hook", "body", "cta"]] = None
    options: Optional[list[Annotated[str, StringConstraints(max_length=500)]]] = Field(default=None, max_length=3)
    edited: Optional[bool] = None
    frameImage: Optional[str] = Field(default=None, max_length=500, pattern=r"^(/|https?://)")
    palette: Optional[list[Hex]] = Field(default=None, max_length=8)
    # Planning-board metadata only; device-only files are not server-side takes.
    footage: Optional[Footage] = None


def fill_shot_ids(shots: list[Shot]) -> list[Shot]:
    """Give every shot a unique id. Same rule as fillShotIds in src/lib/storyboard.ts: keep the first use of
    an id; a shot without one, or repeating an earlier one, gets s{n} (n = position), then s{n}-2, -3, ..."""
    used = {s.id for s in shots if s.id}
    seen: set[str] = set()
    out = []
    for i, s in enumerate(shots):
        if s.id and s.id not in seen:
            seen.add(s.id)
            out.append(s)
            continue
        new = f"s{i + 1}"
        k = 2
        while new in used:
            new = f"s{i + 1}-{k}"
            k += 1
        used.add(new)
        seen.add(new)
        out.append(s.model_copy(update={"id": new}))
    return out


Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class Decision(BaseModel):
    """One answer from the approver. Kept in SavedIdea.history so a resend still shows why it was rejected."""
    decision: Literal["approved", "rejected"]
    reason: Optional[str] = None
    tags: Optional[list[Tag]] = Field(default=None, max_length=5)
    decidedAt: int


class SavedIdea(BaseModel):
    # Per-plan explicit save in live mode, not the reference video's source.
    savedInLive: Optional[bool] = None
    id: str
    videoId: str
    clientId: str
    status: Literal["saved", "waiting", "approved", "rejected"]
    dueDate: str
    notes: str
    shots: Optional[list[Shot]] = None
    boardLayout: Optional[list[BoardPos]] = None
    script: Optional[PlanScript] = None
    noteToApprover: Optional[str] = None
    sentAt: Optional[int] = None
    rejectReason: Optional[str] = None
    rejectTags: Optional[list[Tag]] = Field(default=None, max_length=5)
    decidedAt: Optional[int] = None
    # Daphne's production stage for an approved idea. No stage means "approved".
    stage: Optional[Literal["approved", "filming", "editing", "posted"]] = None
    postedAt: Optional[int] = None
    # Set by the team's tab: when the plan was first approved (kept when "Edit" reopens it), the manager's
    # "approve with changes" note and per-shot comments keyed by shot index.
    approvedAt: Optional[int] = None
    managerNote: Optional[str] = None
    shotComments: Optional[dict[int, str]] = None
    # Every approver answer so far, oldest first. Only the review link appends to it.
    history: Optional[list[Decision]] = None
    # When the idea last changed, set by the server on save (never by the client); the board's "Stuck" flag reads it.
    updatedAt: Optional[int] = None

    @model_validator(mode="after")
    def _fill_shot_ids(self):
        if self.shots:
            self.shots = fill_shot_ids(self.shots)
        return self


class NewComment(BaseModel):
    """A note pinned to a second of a plan's reference video."""
    videoId: str
    atSec: float = Field(ge=0, le=86400, allow_inf_nan=False)  # within a day
    text: str = Field(min_length=1, max_length=500)
    author: str = Field(min_length=1, max_length=60)

    @field_validator("atSec", mode="before")
    @classmethod
    def _finite(cls, v):
        # Swap NaN/Infinity for an out-of-range number: the 422 echoes the input, and JSON can't carry them.
        if isinstance(v, float) and not math.isfinite(v):
            return -1.0
        return v


class Comment(NewComment):
    id: str
    ideaId: str
    createdAt: int
    # Set by the server from the route used, never by the client. Older stored comments have none and
    # count as "review", so a typed name is never shown as staff.
    source: Literal["staff", "review"] = "review"


class Pattern(BaseModel):
    """A sound or hashtag shared by several accounts in a search (Pattern in src/lib/live.ts)."""
    kind: Literal["sound", "hashtag"]
    label: str
    accounts: int
    avgScore: float
    videoIds: list[str]


class Breakout(BaseModel):
    hook: str
    score: float


class Pulse(BaseModel):
    """One client's last "Trending now" check (Pulse in src/lib/clientChips.ts)."""
    topic: str
    fetchedAt: int
    patterns: list[Pattern]
    breakouts: list[Breakout]


class Library(BaseModel):
    """The real videos and formats (with their breakdowns) that saved ideas point to. The front
    end owns their shape (Video and Format in src/types.ts), so they are stored as given."""
    videos: list[dict]
    formats: list[dict]


HookType = Literal["visual", "question_or_text", "rage_bait", "informative", "challenge", "other"]
Emotion = Literal["curious", "excited", "craving", "funny", "angry_comment", "relatable"]


class Why(BaseModel):
    hook: str
    first3s: str
    length: str
    format: str
    sound: str
    # The five fields below are optional so breakdowns saved before they existed still load.
    # New AI answers must carry all five: see WhyFull.
    concept: Optional[str] = None
    hookType: Optional[HookType] = None
    scrollStopper: Optional[str] = None
    emotion: Optional[Emotion] = None
    saveReason: Optional[str] = None


class WhyFull(Why):
    """Why as the AI must answer it: the five newer fields are required."""
    concept: str
    hookType: HookType
    scrollStopper: str
    emotion: Emotion
    saveReason: str


class Line(BaseModel):
    """One spoken or on-screen line and the job it does in the video."""
    time: str
    text: str
    role: Literal["hook", "setup", "proof", "payoff", "cta"]


class ShotOut(Shot):
    """Shot as the AI must answer it in a breakdown: the camera fields are required."""
    framing: Framing
    angle: Angle
    movement: Movement


class Breakdown(BaseModel):
    """AI analysis of one video. The first four fields fill the matching Format fields."""
    shotList: list[Shot]
    why: Why
    props: list[str]
    editorNotes: str
    lines: list[Line]
    # What the client needs to film it, chosen from a fixed list. Empty on breakdowns saved before this existed.
    needs: list[str] = []


class BreakdownOut(Breakdown):
    """Breakdown as the AI must answer it (output_format for the analyze call)."""
    shotList: list[ShotOut]
    why: WhyFull


class AnalyzeRequest(BaseModel):
    url: str
    # The things a client may be unable to do; the breakdown picks its needs from this list only.
    needs: list[str] = []
    # Re-run the AI breakdown of a video that already has one (reusing its frames and transcript).
    force: bool = False


class NeedsRequest(BaseModel):
    url: str
    needs: list[str] = []


class NeedsResult(BaseModel):
    needs: list[str]


class LikeRequest(BaseModel):
    url: str


class LikeImageRequest(BaseModel):
    image: str  # base64 of the file, without a data: prefix
    mediaType: Literal["image/png", "image/jpeg", "image/webp"]


class LikeImageResult(BaseModel):
    keywords: list[str]
    formatName: str
    description: str


class AnswerVideo(BaseModel):
    id: str = Field(max_length=100)
    platform: str = Field(max_length=30)
    hook: str = Field(max_length=300)
    views: int
    outlier: Optional[float] = None
    hashtags: list[Annotated[str, StringConstraints(max_length=60)]] = Field(default=[], max_length=30)
    music: str = Field(default="", max_length=200)


class AnswerRequest(BaseModel):
    query: str = Field(max_length=200)
    videos: list[AnswerVideo] = Field(max_length=30)


class AnswerResult(BaseModel):  # same fields as the front end's Answer (src/lib/answer.ts)
    lines: list[str]
    basis: str


CONTENT_TYPES = ("street_interview", "recipe_cooking", "skit_comedy", "review_taste_test", "unboxing_product",
                 "day_in_life_vlog", "challenge", "tutorial_tips", "other")
ContentType = Literal["street_interview", "recipe_cooking", "skit_comedy", "review_taste_test", "unboxing_product",
                      "day_in_life_vlog", "challenge", "tutorial_tips", "other"]  # same list as src/types.ts


class ContentTypes(BaseModel):
    """What kind of video each result is, by the video's id in the search (ids with no type are left out)."""
    types: dict[str, ContentType]


class ClassifyAnswer(BaseModel):
    """The AI's answer: video number (as sent) -> type. A type outside the list becomes "other"."""
    types: dict[str, ContentType]

    @field_validator("types", mode="before")
    @classmethod
    def unknown_is_other(cls, value):
        if not isinstance(value, dict):
            raise ValueError("types must be an object")
        return {str(k): (v if v in CONTENT_TYPES else "other") for k, v in value.items()}


class LikeJob(BaseModel):
    status: Literal["queued", "running", "done", "failed"]
    step: str = ""
    error: Optional[str] = None
    breakdown: Optional[Breakdown] = None
    # 1-3 search keywords and a short format name, taken from the real video's breakdown.
    keywords: Optional[list[str]] = None
    formatName: Optional[str] = None


class AnalyzeStarted(BaseModel):
    job: str


class ChannelRequest(BaseModel):
    platform: Literal["youtube", "tiktok", "instagram"]
    # A handle ("@name") or a channel / profile link.
    handle: str
    # Newest N videos to decode. 50 by default; 100 only when asked for.
    maxVideos: int = 50


class ChannelStarted(BaseModel):
    job: str


class ChannelJob(BaseModel):
    job: str
    status: Literal["queued", "running", "done", "failed"]
    # What the job is doing now, e.g. "Transcribing speech".
    step: str = ""
    # All the steps this job goes through, in order, and the index of the current one.
    steps: list[str] = []
    stepIndex: int = 0
    # Videos finished in the current step (details and transcripts); 0 of 0 when the step is not counted.
    done: int = 0
    total: int = 0
    # channel-decoder's analysis.json: {summary, videos, formats}. Thumbnails point at this API.
    result: Optional[dict] = None
    error: Optional[str] = None


class AnalyzeJob(BaseModel):
    job: str
    status: Literal["queued", "running", "done", "failed"]
    # 0 to 1, for a progress bar.
    progress: float
    # What the job is doing now, e.g. "Reading the transcript".
    step: str = ""
    result: Optional[Breakdown] = None
    error: Optional[str] = None


class ShareRequest(BaseModel):
    clientId: str


class ShareLink(BaseModel):
    """What the store keeps under share:<token>."""
    clientId: str
    createdAt: int


class ShareCreated(BaseModel):
    token: str
    url: str


class ReviewClient(BaseModel):
    name: str


class ReviewIdea(BaseModel):
    """A SavedIdea as the approver sees it: without `notes`, Daphne's private note to her editor."""
    id: str
    videoId: str
    clientId: str
    status: Literal["saved", "waiting", "approved", "rejected"]
    dueDate: str
    shots: Optional[list[Shot]] = None
    noteToApprover: Optional[str] = None
    sentAt: Optional[int] = None
    rejectReason: Optional[str] = None
    rejectTags: Optional[list[Tag]] = Field(default=None, max_length=5)
    decidedAt: Optional[int] = None
    history: Optional[list[Decision]] = None


class ReviewItem(BaseModel):
    idea: ReviewIdea
    video: Optional[dict] = None
    format: Optional[dict] = None


class ReviewCut(BaseModel):
    url: str
    durationSec: Optional[float] = None
    version: str  # a decimal string: the version is a nanosecond timestamp, too big for a JS number
    sentAt: int


class ReviewCutItem(BaseModel):
    idea: ReviewIdea
    video: Optional[dict] = None
    format: Optional[dict] = None
    cut: ReviewCut


class ReviewWorkspace(BaseModel):
    id: str
    title: str


class ReviewWorkspaceCutItem(BaseModel):
    workspace: ReviewWorkspace
    cut: ReviewCut


class ReviewList(BaseModel):
    client: ReviewClient
    ideas: list[ReviewItem]
    cuts: list[ReviewCutItem | ReviewWorkspaceCutItem] = []


class DecideRequest(BaseModel):
    ideaId: str
    decision: Literal["approved", "rejected"]
    reason: Optional[str] = Field(default=None, max_length=1000)
    tags: Optional[list[Tag]] = Field(default=None, max_length=5)


class CutDecideRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    reason: Optional[str] = Field(default=None, max_length=1000)
    version: str = Field(max_length=32)


class LoginRequest(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(max_length=1024)


# ---- compare viral videos -----------------------------------------------------------------------

class CompareRequest(BaseModel):
    urls: list[str] = Field(min_length=2, max_length=5)


class CompareBeat(BaseModel):
    beat: str  # short name, e.g. "No, no, no"
    what: str  # what happens in this beat
    timing: str  # typical timing, e.g. "0-8s"


class CompareHook(BaseModel):
    pattern: str
    # The hookType values the videos share, from their breakdowns (empty when none was recorded).
    hookTypes: list[HookType]


class CompareOut(BaseModel):
    """The synthesis as the AI must answer it (output_format for the compare call)."""
    commonFormat: str
    structure: list[CompareBeat] = Field(min_length=1, max_length=8)
    typicalLength: str
    hookPattern: CompareHook
    emotionPattern: str
    whatToCopy: list[str] = Field(min_length=3, max_length=5)
    whatDiffers: list[str] = Field(max_length=6)
    confidence: str


class CompareVideo(BaseModel):
    """One video in a comparison and the state of its breakdown."""
    url: str
    job: str
    status: Literal["queued", "running", "done", "failed"]
    progress: float = 0
    step: str = ""
    error: Optional[str] = None
    concept: Optional[str] = None
    lengthSec: Optional[float] = None


class CompareStarted(BaseModel):
    job: str


class CompareJob(BaseModel):
    job: str
    status: Literal["queued", "running", "done", "failed"]
    progress: float
    step: str = ""
    videos: list[CompareVideo] = []
    result: Optional[CompareOut] = None
    error: Optional[str] = None
