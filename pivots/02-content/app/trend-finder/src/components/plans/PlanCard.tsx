import { useDraggable } from "@dnd-kit/core";
import type { Format, SavedIdea, Video } from "../../types";
import { byFollowers, compact, scoreBase } from "../../lib/metrics";
import { Thumb } from "../Thumb";
import { useManagerName } from "../../lib/appContext";
import { lastSentBack } from "../../lib/memory";
import { t } from "../../lib/i18n";
import type { Column, DragData } from "./moves";

const truncate = (s: string, max = 80) => (s.length > max ? `${s.slice(0, max).trimEnd()}…` : s);

// What a plan card shows: the same as a Find ideas tile (cover, followers → views, the video's topic, the account),
// plus the manager's sent-back reason for the plan or the finished video. Shared by the card and its drag copy.
export function PlanCardBody({
  idea,
  video: v,
  cutSentBack,
  cutWaiting,
}: {
  idea: SavedIdea;
  video: Video;
  // Kept so callers can pass it; the card no longer shows anything from the format.
  format?: Format;
  // The approver sent the finished video back and it has not been re-sent yet.
  cutSentBack?: { reason: string };
  // The finished video was sent to the approver and has not been answered yet.
  cutWaiting?: boolean;
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
        <span className="best-compare tile-cmp">
          <span className="cmp-num cmp-from">{fromNum}</span>
          <span className="cmp-arrow" aria-hidden="true">→</span>
          <span className="cmp-num cmp-to">{compact(v.views)}</span>
          <span className="cmp-cap">{fromCap}</span>
          <span />
          <span className="cmp-cap">{t("find.tile.cmpViews")}</span>
        </span>
        <strong className="plans-card-hook">{v.hook}</strong>
        <span className="small muted plans-card-handle">{v.handle}</span>
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
        {cutWaiting && idea.status === "approved" && !cutSentBack && (
          <span className="small muted">{t("plan.card.cutWaiting", { manager })}</span>
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
  // Goes to the Research tab, for a plan whose video has a Research row.
  onFromResearch?: () => void;
  cutSentBack?: { reason: string };
  cutWaiting?: boolean;
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
      <PlanCardBody idea={p.idea} video={p.video} format={p.format} cutSentBack={p.cutSentBack} cutWaiting={p.cutWaiting} />

      <div className="board-card-actions" {...keep}>
        <button className="btn btn-ghost btn-sm" onClick={p.onOpenPlan}>
          {p.idea.status === "saved" ? t("plan.card.startPlanning") : t("plan.card.openPlan")}
        </button>
        {p.actions}
        {p.onFromResearch && (
          <button
            className="link-btn"
            onClick={p.onFromResearch}
            aria-label={t("plan.card.fromResearchAria", { name })}
          >
            {t("plan.card.fromResearch")}
          </button>
        )}
        <button
          className="link-btn"
          onClick={p.onRemove}
          aria-label={t("plan.card.removeAria", { name })}
        >
          {t("plan.card.remove")}
        </button>
      </div>
    </div>
  );
}
