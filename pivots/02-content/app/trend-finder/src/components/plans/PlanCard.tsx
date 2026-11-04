import { useDraggable } from "@dnd-kit/core";
import type { Format, SavedIdea, Video } from "../../types";
import { byFollowers, compact, scoreBase } from "../../lib/metrics";
import { Thumb } from "../Thumb";
import { useManagerName } from "../../lib/appContext";
import { lastSentBack } from "../../lib/memory";
import { t } from "../../lib/i18n";
import type { Column, DragData } from "./moves";

const truncate = (s: string, max = 80) => (s.length > max ? `${s.slice(0, max).trimEnd()}…` : s);

// What a plan card shows: the same as a Find ideas tile (cover, the video's topic, the account, followers → views),
// plus the manager's sent-back reason for the plan or the finished video. Shared by the card and its drag copy.
export function PlanCardBody({
  idea,
  video: v,
  cutSentBack,
  videoNo,
}: {
  idea: SavedIdea;
  video: Video;
  // Kept so callers can pass it; the card no longer shows anything from the format.
  format?: Format;
  // The approver sent the finished video back and it has not been re-sent yet.
  cutSentBack?: { reason: string };
  // Which of the client's videos (1 to 12) this plan is for, from Research.
  videoNo?: number;
}) {
  const manager = useManagerName();
  const last = idea.status !== "rejected" ? lastSentBack(idea) : undefined;
  const followers = byFollowers(v);
  const base = followers ? v.followers : scoreBase(v);
  const fromNum = base > 0 ? compact(base) : "–";
  const fromCap = followers ? t("find.res.cmpFollowers") : t("find.res.cmpUsual");
  return (
    <>
      <Thumb video={v} />
      <div className="board-card-body">
        {videoNo !== undefined && <span className="plans-card-videono">{t("plan.card.videoNo", { n: videoNo })}</span>}
        <strong className="plans-card-hook">{v.hook}</strong>
        <span className="small muted plans-card-handle">{v.handle}</span>
        <span className="best-compare tile-cmp">
          <span className="cmp-num cmp-from">{fromNum}</span>
          <span className="cmp-arrow" aria-hidden="true">→</span>
          <span className="cmp-num cmp-to">{compact(v.views)}</span>
          <span className="cmp-cap">{fromCap}</span>
          <span />
          <span className="cmp-cap">{t("find.tile.cmpViews")}</span>
        </span>
        {idea.status === "rejected" && (
          <span className="board-reason small">
            {t("plan.card.sentBack", { manager })}{" "}
            {idea.rejectTags?.length ? `${idea.rejectTags.join(" · ")}. ` : ""}
            {idea.rejectReason || (idea.rejectTags?.length ? "" : t("plan.card.noReason"))}
          </span>
        )}
        {cutSentBack && idea.status === "approved" && (
          <span className="board-reason small">
            {t("plan.card.cutSentBack", {
              manager,
              reason: truncate(cutSentBack.reason.trim() || t("plan.card.noReason")),
            })}
          </span>
        )}
        {last && (
          <span className="board-reason small">
            {t("plan.card.lastSentBack", { manager })}{" "}
            {last.tags?.length ? `${last.tags.join(" · ")}. ` : ""}
            {last.reason ?? ""}
          </span>
        )}
      </div>
    </>
  );
}

interface Props {
  idea: SavedIdea;
  video: Video;
  format?: Format;
  // The column it shows in, and the columns it can be dropped on (empty: it cannot be dragged).
  column: Column;
  targets: Column[];
  onOpenPlan: () => void;
  onRemove: () => void;
  // Extra controls on the card, e.g. the production stage of an approved plan.
  actions?: React.ReactNode;
  cutSentBack?: { reason: string };
  videoNo?: number;
}

// Clicks and taps on the card's own controls never start a drag.
const stop = (e: React.SyntheticEvent) => e.stopPropagation();
const keep = { onMouseDown: stop, onTouchStart: stop, onKeyDown: stop };

export function PlanCard(p: Props) {
  const data: DragData = { column: p.column, targets: p.targets };
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({
      id: p.idea.id,
      data,
      disabled: p.targets.length === 0,
    });
  // The card's title is the video's topic, so screen readers hear the same name.
  const name = p.video.hook;

  const setRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    setActivatorNodeRef(el);
  };

  return (
    <div
      ref={setRef}
      data-plan={p.idea.id}
      className={`board-card plans-card${isDragging ? " is-placeholder" : ""}${p.targets.length === 0 ? " is-locked" : ""}`}
      {...attributes}
      {...listeners}
      // dnd-kit sets aria-disabled on a card that cannot be dragged. On a group it is inherited by the
      // buttons inside, so Open plan and Remove read as unavailable to screen readers (and to Playwright).
      aria-disabled={undefined}
      role="group"
      aria-roledescription={t("plan.card.roleDescription")}
      aria-label={name}
    >
      <PlanCardBody idea={p.idea} video={p.video} format={p.format} cutSentBack={p.cutSentBack} videoNo={p.videoNo} />

      <div className="board-card-actions" {...keep}>
        <button className="btn btn-ghost btn-sm" onClick={p.onOpenPlan}>
          {t("plan.card.openPlan")}
        </button>
        {p.actions}
      </div>

      {/* Discard: a bin in the card's top-right corner. */}
      <button
        type="button"
        className="plans-card-discard"
        onClick={p.onRemove}
        aria-label={t("plan.card.removeAria", { name })}
        title={t("plan.card.remove")}
        {...keep}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </svg>
      </button>
    </div>
  );
}
