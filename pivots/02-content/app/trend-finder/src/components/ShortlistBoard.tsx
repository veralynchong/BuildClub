import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Announcements,
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import type { Client, Format, IdeaStatus, SavedIdea, Video } from "../types";
import type { Decision } from "../lib/memory";
import { useApp, useManagerName } from "../lib/appContext";
import { t } from "../lib/i18n";
import { createShareLink, revokeClientLinks } from "../lib/share";
import { postedThisMonth } from "../lib/stage";
import { needsConfirm, patchFor, stepOf, targetsOf } from "../lib/steps.ts";
import { useProduction } from "../lib/production.ts";
import { videoOf } from "../lib/missingVideo.ts";
import { ProgressRing } from "./ProgressRing";
import { StageSelect } from "./StageSelect";
import { PlanCard, PlanCardBody } from "./plans/PlanCard";
import { PlanColumn } from "./plans/PlanColumn";
import {
  COLUMNS,
  columnKeys,
  columnOf,
  columnTitle,
  planName,
  shotsOf,
  stepOfColumn,
} from "./plans/moves";
import type { Column } from "./plans/moves";

// A Home pipeline chip names an idea status; the board's columns group the steps.
const columnForStatus: Record<IdeaStatus, Column> = {
  saved: "planning",
  waiting: "waiting",
  approved: "approved",
  rejected: "planning",
};

interface Props {
  client: Client;
  // Ideas for every client; the board shows this client's.
  ideas: SavedIdea[];
  videoById: Map<string, Video>;
  formatById: Map<string, Format>;
  onChangeIdeas: Dispatch<SetStateAction<SavedIdea[]>>;
  // The manager's decision (approve / send back), saved to client memory like Review does.
  onDecide: (ideaId: string, d: Decision) => void;
  onOpenPlan: (ideaId: string) => void;
  // Opens an approved plan's canvas with the editor showing.
  onMakeVideo: (ideaId: string) => void;
  onFindMore: () => void;
  onReview: () => void;
  // Videos in this client's Research sheet: their cards get a "From research" link to the Research tab.
  inResearch?: Set<string>;
  onOpenResearch?: () => void;
  // Stage to scroll to when opened from a Home pipeline chip; cleared once done.
  focus?: IdeaStatus | null;
  onFocusDone?: () => void;
}

// Mouse and touch: the column under the pointer. Keyboard drags have no pointer, so use overlap instead.
const collision: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// One client's plans as a Kanban board (the Plans tab): Still planning → Waiting for approval → Approved, ready to
// film. Approved plans stay in that column while they are filmed, edited and posted (the stage menu on the card
// shows where each one is). Which column a plan is in is
// worked out from its data (lib/steps.ts). Any card can move to any column, both ways, with or without shots: Waiting
// sends it, Approved approves it (manager only), and Still planning takes the send or the approval back.
export function ShortlistBoard(p: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  // A plan dropped on Waiting without shots: it stays put and says why.
  // What the last move did, for screen readers.
  const [said, setSaid] = useState("");
  const focusAfter = useRef<string | null>(null);
  const canDecide = useApp().role === "manager";
  const manager = useManagerName();
  // The approved plan (and where it is going) waiting for "Continue?" before its approval is taken back.
  const [confirm, setConfirm] = useState<{ id: string; to: Column } | null>(null);
  // The approver's link for the client being shown: null url = turned off here.
  const [link, setLink] = useState<{ clientId: string; url: string | null } | null>(null);
  const [linkError, setLinkError] = useState("");
  const [copied, setCopied] = useState(false);

  const mine = p.ideas.filter((i) => i.clientId === p.client.id);
  const signalsById = useProduction(p.client.id);
  const formatOf = (i: SavedIdea) => p.formatById.get(videoOf(i, p.videoById).formatId);
  const nameOf = (i?: SavedIdea) => (i ? planName(videoOf(i, p.videoById), formatOf(i)) : t("plan.board.thePlan"));
  // Everything a card needs, worked out once per render.
  const infoOf = (i: SavedIdea) => {
    const shots = shotsOf(i, formatOf(i));
    const sig = signalsById[i.id] ?? {};
    const step = stepOf(i, shots, sig);
    const column = columnOf(step, i.status === "waiting");
    const targets = targetsOf(i, shots, sig, canDecide)
      .map((st) => COLUMNS.find((c) => stepOfColumn(c) === st))
      .filter((c): c is Column => !!c);
    // Cards move freely: a plan with no shots can still be sent (it reads "No shots yet"), and any plan that is
    // sent or approved can go back to Still planning, unless it has already been posted.
    if (column === "planning" && i.status !== "approved" && !targets.includes("waiting")) targets.push("waiting");
    // The manager can approve a plan straight from Still planning.
    if (column === "planning" && canDecide && i.status !== "approved" && !targets.includes("approved")) targets.push("approved");
    if (column !== "planning" && !sig.published && step !== "posted") targets.push("planning");
    return { step, column, targets };
  };
  const infos = new Map(mine.map((i) => [i.id, infoOf(i)]));
  const byDue = (a: SavedIdea, b: SavedIdea) => a.dueDate.localeCompare(b.dueDate);
  const inColumn = (c: Column) => mine.filter((i) => infos.get(i.id)?.column === c);
  const lists: Record<Column, SavedIdea[]> = {
    planning: inColumn("planning").sort(byDue),
    waiting: inColumn("waiting").sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0) || byDue(a, b)),
    // Every approved plan, whatever its production stage.
    approved: inColumn("approved").sort(byDue),
  };
  const postedCount = postedThisMonth(mine, new Date());
  const approvedCount = mine.filter((i) => i.status === "approved").length;
  const progress = Math.min(approvedCount / Math.max(p.client.monthlyTarget, 1), 1) * 100;
  const shownLink = link?.clientId === p.client.id ? link.url : null;
  const dragging = mine.find((i) => i.id === dragId);
  const dragTargets = dragging ? (infos.get(dragging.id)?.targets ?? null) : null;

  // Opened from a pipeline chip: bring that stage into view (after App's scroll-to-top on screen change).
  const { focus, onFocusDone } = p;
  useEffect(() => {
    if (!focus) return;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`board-${columnForStatus[focus]}`)
        ?.scrollIntoView({ block: "start", inline: "start" });
      onFocusDone?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, onFocusDone]);

  // After a move the card re-renders in its new column: keep keyboard focus on it.
  useEffect(() => {
    const id = focusAfter.current;
    if (!id) return;
    focusAfter.current = null;
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-plan="${id}"]`)?.focus(),
    );
  });

  const sensors = useSensors(
    // A small distance (mouse) or a short hold (touch) so clicks on "Open plan" and scrolling still work.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeys }),
  );

  const update = (
    ids: Set<string>,
    patch: (i: SavedIdea) => Partial<SavedIdea>,
  ) =>
    p.onChangeIdeas((prev) =>
      prev.map((i) => (ids.has(i.id) ? { ...i, ...patch(i) } : i)),
    );

  // Making the link again returns the client's existing one, so this is safe to call more than once.
  const makeLink = () => {
    setLinkError("");
    createShareLink(p.client.id)
      .then((l) => setLink({ clientId: p.client.id, url: l.url }))
      .catch((e: Error) => setLinkError(e.message));
  };
  const turnOff = () => {
    setLinkError("");
    revokeClientLinks(p.client.id)
      .then(() => setLink({ clientId: p.client.id, url: null }))
      .catch((e: Error) => setLinkError(e.message));
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shownLink ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setLinkError(t("plan.board.copyFailed"));
    }
  };

  // Send for approval (dragging a card into Waiting for approval). The due date and the note to the approver are
  // set on the plan page. A plan with no shots of its own keeps the ones it shows now (none for a saved idea), so it
  // still reads "No shots yet" instead of borrowing the original video's shots.
  const send = (ids: Set<string>) => {
    const sentAt = Date.now();
    update(ids, (i) => ({
      status: "waiting",
      sentAt,
      rejectReason: undefined,
      rejectTags: undefined,
      ...(i.shots ? {} : { shots: shotsOf(i, formatOf(i)) }),
    }));
  };

  const remove = (id: string) =>
    p.onChangeIdeas((prev) => prev.filter((i) => i.id !== id));

  // Every move (mouse, touch, keyboard drag or the Move to menu) comes through here. A move only does what the
  // plan can really do (send, approve, stage); the card then lands in the step its data says.
  const move = (idea: SavedIdea, to: Column) => {
    const step = stepOfColumn(to);
    if (!infos.get(idea.id)?.targets.includes(to)) return;
    // Taking an approval back asks first; nothing changes until "Continue".
    if (to === "planning" ? idea.status === "approved" : !!step && needsConfirm(idea, step)) {
      setConfirm({ id: idea.id, to });
      setSaid(t(to === "planning" ? "plan.board.said.confirmPlanning" : "plan.board.said.confirm", { name: nameOf(idea) }));
      return;
    }
    apply(idea, to);
  };
  const apply = (idea: SavedIdea, to: Column) => {
    const name = nameOf(idea);
    if (to === "planning") {
      backToPlanning(idea);
      setSaid(t("plan.board.said.moved", { name, step: columnTitle(to) }));
      return;
    }
    const step = stepOfColumn(to);
    if (step === "filming" && idea.status !== "approved") {
      // Approve (manager only; targets already checked). From Still planning too, so it skips patchFor, which
      // only approves waiting plans. Keep the shots it shows now, so a plan approved with none reads "No shots yet".
      if (!canDecide) return;
      if (!idea.shots) update(new Set([idea.id]), () => ({ shots: shotsOf(idea, formatOf(idea)) }));
      p.onDecide(idea.id, { kind: "approved" });
    } else {
      const patch = step && patchFor(idea, step, signalsById[idea.id] ?? {}, canDecide);
      if (!step || !patch) return;
      if (step === "storyboard" && idea.status !== "approved") send(new Set([idea.id]));
      else update(new Set([idea.id]), () => patch);
    }
    focusAfter.current = idea.id;
    setSaid(t("plan.board.said.moved", { name, step: columnTitle(to) }));
  };

  // Back to Still planning (from waiting or approved): it returns to the team's list with the shots written so far,
  // ready to send again. Moving out of Approved undoes the approval and the production stage.
  const backToPlanning = (idea: SavedIdea) => {
    update(new Set([idea.id]), () => ({
      status: "saved",
      sentAt: undefined,
      rejectReason: undefined,
      rejectTags: undefined,
      approvedAt: undefined,
      managerNote: undefined,
      shotComments: undefined,
      stage: undefined,
      postedAt: undefined,
      shots: shotsOf(idea, formatOf(idea)),
    }));
    focusAfter.current = idea.id;
  };
  // "Take back" on a waiting card.
  const withdraw = (idea: SavedIdea) => {
    backToPlanning(idea);
    setSaid(t("plan.board.said.tookBack", { name: nameOf(idea) }));
  };

  const ideaOf = (id: string | number) => mine.find((i) => i.id === id);
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("plan.board.ann.pickedUp", { name: nameOf(ideaOf(active.id)) }),
    onDragOver: ({ active, over }) =>
      over
        ? t("plan.board.ann.over", { name: nameOf(ideaOf(active.id)), step: columnTitle(over.id as Column) })
        : t("plan.board.ann.notOver", { name: nameOf(ideaOf(active.id)) }),
    // The board's own status line says what the drop did.
    onDragEnd: () => undefined,
    onDragCancel: ({ active }) =>
      t("plan.board.ann.cancel", { name: nameOf(ideaOf(active.id)) }),
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setDragId(String(active.id));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    const idea = ideaOf(active.id);
    if (!idea) return;
    const here = infos.get(idea.id)?.column ?? "planning";
    if (over && over.id !== here) move(idea, over.id as Column);
    else setSaid(t("plan.board.said.stayed", { name: nameOf(idea), step: columnTitle(here) }));
  };

  const card = (idea: SavedIdea) => {
    const v = videoOf(idea, p.videoById);
    const info = infos.get(idea.id);
    if (!info) return null;
    return (
      <li key={idea.id}>
        <PlanCard
          idea={idea}
          video={v}
          format={p.formatById.get(v.formatId)}
          column={info.column}
          targets={info.targets}
          onOpenPlan={() => p.onOpenPlan(idea.id)}
          onRemove={() => remove(idea.id)}
          cutSentBack={signalsById[idea.id]?.cutSentBack}
          onFromResearch={p.onOpenResearch && p.inResearch?.has(idea.videoId) ? p.onOpenResearch : undefined}
          actions={
            <>
              {idea.status === "approved" && (
                <button className="btn btn-primary btn-sm" onClick={() => p.onMakeVideo(idea.id)}>
                  {t("canvas.makeVideo")}
                </button>
              )}
              {idea.status === "approved" && (
                <StageSelect
                  idea={idea}
                  name={planName(v, formatOf(idea))}
                  onChange={(patch) => update(new Set([idea.id]), () => patch)}
                />
              )}
              {idea.status === "waiting" && (
                <button className="link-btn" onClick={() => withdraw(idea)}>
                  {t("plan.board.takeBack")}
                </button>
              )}
            </>
          }
        />
      </li>
    );
  };

  const empty: Record<Column, string> = {
    planning: t("plan.board.empty.idea"),
    waiting: canDecide ? t("plan.board.empty.storyboardManager") : t("plan.board.empty.storyboardTeam", { manager }),
    approved: canDecide ? t("plan.board.empty.filmingManager") : t("plan.board.empty.filmingTeam", { manager }),
  };

  const extra: Partial<Record<Column, React.ReactNode>> = {
    // The approver's link is needed for finished videos too, so it shows even when no plan is waiting.
    waiting: (
      <div className="board-link">
        {shownLink ? (
          <>
            <label className="field">
              <span className="field-label">{t("plan.board.linkFor", { manager })}</span>
              <input readOnly value={shownLink} onFocus={(e) => e.currentTarget.select()} />
            </label>
            <div className="board-link-row">
              <button className="btn btn-primary btn-sm" onClick={copyLink}>
                {copied ? t("plan.common.copied") : t("plan.board.copyLink")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={turnOff}>
                {t("plan.board.turnOff")}
              </button>
            </div>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={makeLink}>
            {link?.clientId === p.client.id ? t("plan.board.newLink") : t("plan.board.getLink")}
          </button>
        )}
        {linkError && (
          <p className="error" role="alert">
            {linkError}
          </p>
        )}
        {lists.waiting.length > 0 && (
          <button className="btn btn-ghost btn-sm board-review" onClick={p.onReview}>
            {canDecide ? t("plan.board.review", { n: lists.waiting.length }) : t("plan.board.preview", { manager })}
          </button>
        )}
      </div>
    ),
  };
  const confirmIdea = mine.find((i) => i.id === confirm?.id && i.status === "approved");
  const confirmTo = confirm?.to ?? "waiting";
  const dragVideo = dragging && videoOf(dragging, p.videoById);
  const motion = !reducedMotion();

  return (
    <section className="client board">
      <header className="client-head">
        <div>
          <span className="eyebrow">{t("plan.board.eyebrow", { client: p.client.name })}</span>
          <h1>{t("plan.board.title")}</h1>
          <p className="muted">{t("plan.board.intro")}</p>
        </div>
        <div className="target">
          <ProgressRing value={progress} size={56} stroke={6} />
          <div className="target-text">
            <span className="target-num">
              {approvedCount} <span className="muted">{t("plan.board.ofTarget", { target: p.client.monthlyTarget })}</span>
            </span>
            <span className="small muted">{t("plan.board.approvedThisMonth")}</span>
            <span className="small muted">{t("plan.board.postedThisMonth", { n: postedCount })}</span>
          </div>
        </div>
      </header>

      {/* The three columns always show, even with no plans yet: each empty column says what goes there. */}
      <DndContext
          sensors={sensors}
          collisionDetection={collision}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: t("plan.board.instructions") },
          }}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragId(null)}
        >
          <div className={`plans-board pb-board${dragging ? " is-dragging" : ""}`}>
            {COLUMNS.map((c) => (
              <PlanColumn
                key={c}
                column={c}
                count={lists[c].length}
                canDrop={dragTargets ? dragTargets.includes(c) : null}
                empty={empty[c]}
                extra={extra[c]}
              >
                {lists[c].length ? <ul className="board-list">{lists[c].map((i) => card(i))}</ul> : undefined}
              </PlanColumn>
            ))}
          </div>
          {confirmIdea && (
            <div className="plan-bar pb-confirm" role="alertdialog" aria-label={t("plan.board.confirmAria")}>
              <span className="pb-confirm-text">
                {t(confirmTo === "planning" ? "plan.board.confirmTextPlanning" : "plan.board.confirmText", { name: nameOf(confirmIdea) })}
              </span>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
                {t("plan.common.cancel")}
              </button>
              <button
                className="btn btn-primary"
                autoFocus
                onClick={() => {
                  setConfirm(null);
                  apply(confirmIdea, confirmTo);
                }}
              >
                {t("plan.common.continue")}
              </button>
            </div>
          )}
          <p className="sr-only" role="status" aria-live="polite">
            {said}
          </p>
          {createPortal(
            <DragOverlay
              dropAnimation={
                motion
                  ? { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
                  : null
              }
            >
              {dragging && dragVideo ? (
                <div className="board-card plans-card plans-card-lifted">
                  <PlanCardBody
                    idea={dragging}
                    video={dragVideo}
                    format={formatOf(dragging)}
                    cutSentBack={signalsById[dragging.id]?.cutSentBack}
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
    </section>
  );
}
