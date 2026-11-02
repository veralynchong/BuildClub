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
import type { Step } from "../lib/steps.ts";
import type { Decision } from "../lib/memory";
import { useApp, useManagerName } from "../lib/appContext";
import { t, tp } from "../lib/i18n";
import { inTwoWeeks } from "../state";
import { createShareLink, revokeClientLinks } from "../lib/share";
import { postedThisMonth, stageOf } from "../lib/stage";
import { needsConfirm, patchFor, stepOf, targetsOf } from "../lib/steps.ts";
import { useProduction } from "../lib/production.ts";
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
  onFindMore: () => void;
  onReview: () => void;
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
// film, with the approved plans that are being filmed, edited or posted in a row below. Which column a plan is in is
// worked out from its data (lib/steps.ts), so a drag only does what the plan can really do: send it for approval,
// approve it (manager only), or take an approval back.
export function ShortlistBoard(p: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  // A plan dropped on Waiting without shots: it stays put and says why.
  // What the last move did, for screen readers.
  const [said, setSaid] = useState("");
  const focusAfter = useRef<string | null>(null);
  const canDecide = useApp().role === "manager";
  const manager = useManagerName();
  const [dueDate, setDueDate] = useState(inTwoWeeks);
  const [note, setNote] = useState("");
  // The approved plan waiting for "Continue?" before its approval is taken back.
  const [confirm, setConfirm] = useState<string | null>(null);
  // The approver's link for the client being shown: null url = turned off here.
  const [link, setLink] = useState<{ clientId: string; url: string | null } | null>(null);
  const [linkError, setLinkError] = useState("");
  const [copied, setCopied] = useState(false);

  const mine = p.ideas.filter((i) => i.clientId === p.client.id);
  const signalsById = useProduction(p.client.id);
  const formatOf = (i: SavedIdea) =>
    p.formatById.get(p.videoById.get(i.videoId)?.formatId ?? "");
  const nameOf = (i?: SavedIdea) => {
    const v = i && p.videoById.get(i.videoId);
    return v ? planName(v, formatOf(i)) : t("plan.board.thePlan");
  };
  // Everything a card needs, worked out once per render.
  const infoOf = (i: SavedIdea) => {
    const shots = shotsOf(i, formatOf(i));
    const sig = signalsById[i.id] ?? {};
    const step = stepOf(i, shots, sig);
    const targets = targetsOf(i, shots, sig, canDecide)
      .map((st) => COLUMNS.find((c) => stepOfColumn(c) === st))
      .filter((c): c is Column => !!c);
    return { step, column: columnOf(step, i.status === "waiting"), targets };
  };
  const infos = new Map(mine.map((i) => [i.id, infoOf(i)]));
  const byDue = (a: SavedIdea, b: SavedIdea) => a.dueDate.localeCompare(b.dueDate);
  const inColumn = (c: Column) => mine.filter((i) => infos.get(i.id)?.column === c);
  const lists: Record<Column, SavedIdea[]> = {
    planning: inColumn("planning").sort(byDue),
    waiting: inColumn("waiting").sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0) || byDue(a, b)),
    // Approved plans not yet in production; the rest are in the row below the board.
    approved: inColumn("approved").filter((i) => infos.get(i.id)?.step === "filming" && stageOf(i) === "approved").sort(byDue),
  };
  const inStep = (st: Step) => mine.filter((i) => infos.get(i.id)?.step === st).sort(byDue);
  const filming = inStep("filming").filter((i) => stageOf(i) !== "approved");
  const editing = inStep("editing");
  const postedNow = new Date();
  const postedRecent = inStep("posted")
    .filter((i) => !i.postedAt || postedThisMonth([i], postedNow) === 1)
    .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
  const postedEarlier = inStep("posted").length - postedRecent.length;
  const postedCount = postedThisMonth(mine, postedNow);
  const approvedCount = mine.filter((i) => i.status === "approved").length;
  const progress = Math.min(approvedCount / Math.max(p.client.monthlyTarget, 1), 1) * 100;
  const shownLink = link?.clientId === p.client.id ? link.url : null;
  // Plans still being written (saved or sent back) that can be sent now, and those with no shots at all.
  const shortlisted = mine.filter((i) => i.status === "saved" || i.status === "rejected");
  const ready = shortlisted.filter((i) => shotsOf(i, formatOf(i)).length > 0);
  const needShots = shortlisted.filter((i) => shotsOf(i, formatOf(i)).length === 0);
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

  // Send for approval (dragging a card into Waiting for approval, or the batch button).
  const send = (ids: Set<string>, extra?: Partial<SavedIdea>) => {
    const sentAt = Date.now();
    update(ids, (i) => ({
      status: "waiting",
      sentAt,
      rejectReason: undefined,
      rejectTags: undefined,
      ...extra,
      noteToApprover: extra?.noteToApprover || i.noteToApprover,
    }));
    // The approver opens this link, so it is made as soon as there is something for them to review.
    makeLink();
  };
  const sendReady = () => {
    send(new Set(ready.map((i) => i.id)), { dueDate, noteToApprover: note.trim() || undefined });
    setNote("");
  };

  // Copy each idea's reference shot list. Live videos have none, so they stay empty and editable in the plan.
  const generate = () =>
    update(new Set(needShots.map((i) => i.id)), (i) => ({
      shots: (formatOf(i)?.shotList ?? []).map((sh) => ({ ...sh })),
    }));

  const remove = (id: string) =>
    p.onChangeIdeas((prev) => prev.filter((i) => i.id !== id));

  // Every move (mouse, touch, keyboard drag or the Move to menu) comes through here. A move only does what the
  // plan can really do (send, approve, stage); the card then lands in the step its data says.
  const move = (idea: SavedIdea, to: Column) => {
    const step = stepOfColumn(to);
    if (!step || !infos.get(idea.id)?.targets.includes(to)) return;
    // Taking an approval back asks first; nothing changes until "Continue".
    if (needsConfirm(idea, step)) {
      setConfirm(idea.id);
      setSaid(t("plan.board.said.confirm", { name: nameOf(idea) }));
      return;
    }
    apply(idea, to);
  };
  const apply = (idea: SavedIdea, to: Column) => {
    const name = nameOf(idea);
    const step = stepOfColumn(to);
    const patch = step && patchFor(idea, step, signalsById[idea.id] ?? {}, canDecide);
    if (!step || !patch) return;
    if (step === "storyboard" && idea.status !== "approved") send(new Set([idea.id]));
    else if (step === "filming" && idea.status === "waiting")
      p.onDecide(idea.id, { kind: "approved" });
    else update(new Set([idea.id]), () => patch);
    focusAfter.current = idea.id;
    setSaid(t("plan.board.said.moved", { name, step: columnTitle(to) }));
  };

  // Take a plan back from waiting: it returns to the team's list with the shots written so far.
  const withdraw = (idea: SavedIdea) => {
    update(new Set([idea.id]), () => ({
      status: "saved",
      sentAt: undefined,
      rejectReason: undefined,
      shots: shotsOf(idea, formatOf(idea)),
    }));
    focusAfter.current = idea.id;
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
    const v = p.videoById.get(idea.videoId);
    if (!v) return null;
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
          actions={
            <>
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
    planning: shortlisted.length > 0 && (
      <div className="board-batch">
        <div className="board-batch-row">
          <span className="small muted">
            {needShots.length
              ? tp("plan.board.needShots", needShots.length)
              : t("plan.board.allHaveShots")}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={!needShots.length} onClick={generate}>
            {t("plan.board.addSuggested")}
          </button>
        </div>
        <label className="field">
          <span className="field-label">{t("plan.board.dueDate")}</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value || inTwoWeeks())} />
        </label>
        <label className="field">
          <span className="field-label">{t("plan.board.noteTo", { manager })}</span>
          <textarea
            rows={2}
            value={note}
            placeholder={t("plan.board.notePlaceholder", { client: p.client.name })}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" disabled={!ready.length} onClick={sendReady}>
          {ready.length ? t("plan.board.sendN", { n: ready.length }) : t("plan.common.sendForApproval")}
        </button>
        {ready.length > 0 && needShots.length > 0 && (
          <span className="small muted">{t("plan.board.staysHere")}</span>
        )}
      </div>
    ),
    waiting: lists.waiting.length > 0 && (
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
        <button className="btn btn-ghost btn-sm board-review" onClick={p.onReview}>
          {canDecide ? t("plan.board.review", { n: lists.waiting.length }) : t("plan.board.preview", { manager })}
        </button>
      </div>
    ),
  };
  const confirmIdea = mine.find((i) => i.id === confirm && i.status === "approved");
  const productionCol = (title: string, list: SavedIdea[], emptyText: string, tone: string, more?: React.ReactNode) => (
    <section className={`board-col board-col-${tone}`} aria-label={title}>
      <header className="board-col-head">
        <h2>{title}</h2>
        <span className="board-count">{list.length}</span>
      </header>
      {more}
      {list.length ? <ul className="board-list">{list.map((i) => card(i))}</ul> : <p className="board-empty small muted">{emptyText}</p>}
    </section>
  );
  const dragVideo = dragging && p.videoById.get(dragging.videoId);
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

      {mine.length === 0 ? (
        <div className="empty">
          <h2>{t("plan.board.noIdeas")}</h2>
          <p>{t("plan.board.noIdeasBody")}</p>
          <button className="btn btn-primary" onClick={p.onFindMore}>
            {t("plan.board.findIdeas", { client: p.client.name })}
          </button>
        </div>
      ) : (
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
          {approvedCount > 0 ? (
            <>
              <h2 className="board-row-title">{t("plan.board.inProduction")}</h2>
              <div className="board-cols board-cols-production">
                {productionCol(t("plan.board.filming"), filming, t("plan.board.empty.filming"), "filming")}
                {productionCol(t("plan.board.editing"), editing, t("plan.board.empty.editing"), "editing")}
                {productionCol(
                  t("plan.board.postedMonth"),
                  postedRecent,
                  t("plan.board.empty.posted"),
                  "posted",
                  postedEarlier > 0 && <span className="small muted">{tp("plan.board.postedEarlier", postedEarlier)}</span>,
                )}
              </div>
            </>
          ) : null}
          {confirmIdea && (
            <div className="plan-bar pb-confirm" role="alertdialog" aria-label={t("plan.board.confirmAria")}>
              <span className="pb-confirm-text">
                {t("plan.board.confirmText", { name: nameOf(confirmIdea) })}
              </span>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
                {t("plan.common.cancel")}
              </button>
              <button
                className="btn btn-primary"
                autoFocus
                onClick={() => {
                  setConfirm(null);
                  apply(confirmIdea, "waiting");
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
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      )}
    </section>
  );
}
