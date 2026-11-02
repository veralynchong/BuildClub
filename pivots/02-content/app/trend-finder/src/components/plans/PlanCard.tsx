import { useDraggable } from "@dnd-kit/core";
import type { Format, SavedIdea, Video } from "../../types";
import { compact } from "../../lib/metrics";
import { beatUsual } from "../find/words";
import { Thumb } from "../Thumb";
import { useManagerName } from "../../lib/appContext";
import { lastSentBack } from "../../lib/memory";
import { t, tp } from "../../lib/i18n";
import {
  dueLabel,
  planName,
  shotsOf,
  type Column,
  type DragData,
} from "./moves";

// What a plan card shows: the video, what it copies, the due date and shots. Shared by the card and its drag copy.
export function PlanCardBody({
  idea,
  video: v,
  format: f,
}: {
  idea: SavedIdea;
  video: Video;
  format?: Format;
}) {
  const shots = shotsOf(idea, f).length;
  const manager = useManagerName();
  const last = idea.status !== "rejected" ? lastSentBack(idea) : undefined;
  return (
    <>
      <Thumb video={v} />
      <div className="board-card-body">
        <strong>{planName(v, f)}</strong>
        <span className="small muted">
          {t("plan.card.copiesLine", {
            what: v.live
              ? t("plan.card.copiesLive", { handle: v.handle })
              : t("plan.card.copiesVideo", { hook: v.hook, handle: v.handle }),
            views: compact(v.views),
            beat: beatUsual(v).replace(/^\w/, (c) => c.toLowerCase()),
          })}
        </span>
        <span className="small">
          {t("plan.card.due", { date: dueLabel(idea.dueDate) })} ·{" "}
          {shots ? (
            tp("plan.card.shots", shots)
          ) : (
            <span className="muted">{t("plan.card.noShots")}</span>
          )}
        </span>
        {idea.status === "rejected" && (
          <span className="board-reason small">
            {t("plan.card.sentBack", { manager })}{" "}
            {idea.rejectTags?.length ? `${idea.rejectTags.join(" · ")}. ` : ""}
            {idea.rejectReason || (idea.rejectTags?.length ? "" : t("plan.card.noReason"))}
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
  // Goes to the Research tab, for a plan whose video has a Research row.
  onFromResearch?: () => void;
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
  const name = planName(p.video, p.format);

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
      role="group"
      aria-roledescription={t("plan.card.roleDescription")}
      aria-label={name}
    >
      <PlanCardBody idea={p.idea} video={p.video} format={p.format} />

      <div className="board-card-actions" {...keep}>
        <button className="btn btn-ghost btn-sm" onClick={p.onOpenPlan}>
          {t("plan.card.openPlan")}
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
