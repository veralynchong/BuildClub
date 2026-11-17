import type { ReactNode } from "react";
import type { Client, Format, IdeaStatus, SavedIdea, Video } from "../types";
import type { Pulse } from "../lib/clientChips";
import { t } from "../lib/i18n";
import { useManagerName } from "../lib/appContext";
import {
  dueText,
  planName,
} from "../lib/clientHome";
import { ProgressRing } from "./ProgressRing";
import type { Named } from "./home/HomeCards";

interface Props {
  client: Client;
  // Ideas shown in this mode (sample or live); allIdeas names plans in client memory.
  ideas: SavedIdea[];
  allIdeas: SavedIdea[];
  videoById: Map<string, Video>;
  formatById: Map<string, Format>;
  live: boolean;
  pulse: Pulse | undefined;
  pulseLoading: boolean;
  pulseError?: string | null;
  onRefreshPulse: () => void;
  // Not shown any more: Home has no search bar (searching lives in Find ideas). Kept optional so App
  // still compiles; App can stop passing search and onSearch.
  search?: ReactNode;
  onSearch?: (text: string) => void;
  onFindIdeas: () => void;
  // Videos this client saved to Research. Kept so App compiles; the film-next card came off this page.
  researched?: Set<string>;
  onSave: (videoId: string, onSaved?: () => void) => void;
  onUndoSave: (videoId: string) => void;
  onPlanShots: (videoId: string) => void;
  onOpenPlan: (ideaId: string) => void;
  onOpenPlans: (stage?: IdeaStatus) => void;
  onApprove?: (ideaId: string) => void;
  onReview: () => void;
  onEditBrief?: () => void;
}

// "Sent today", "Sent yesterday", "Sent 3 days ago"; a plan with no sent time shows its film date instead.
function sentText(sentAt: number | undefined, dueDate: string): string {
  if (!sentAt) return t("home.cards.filmDue", { due: dueText(dueDate) });
  const day = (ms: number) => new Date(new Date(ms).toDateString()).getTime();
  const days = Math.round((day(Date.now()) - day(sentAt)) / 86_400_000);
  if (days <= 0) return t("home.client.sentToday");
  if (days === 1) return t("home.client.sentYesterday");
  return t("home.client.sentDaysAgo", { n: days });
}

function PlanRow({ plan, meta, right }: { plan: Named; meta: string; right: ReactNode }) {
  return (
    <li className="chm-row">
      <span className="chm-cover" aria-hidden="true">
        {plan.video?.thumbnail && <img src={plan.video.thumbnail} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />}
      </span>
      <span className="chm-row-text">
        <b>{plan.name}</b>
        <span className="small muted">{meta}</span>
      </span>
      <span className="chm-row-right">{right}</span>
    </li>
  );
}

// One client's Home (founder pick, 15 Nov 2026: concept A, top row only). Two cards: how this month is going
// against the target, in the same ring and counts as the All clients dashboard, and what is waiting for the
// manager, with what she sent back. Film-next suggestions, the ready-to-film list and the post-performance
// placeholders came off this page. Every number comes from existing app data.
export function ClientHome(p: Props) {
  const { client } = p;
  const manager = useManagerName();
  const mine = p.ideas.filter((i) => i.clientId === client.id);
  const named = (idea: SavedIdea): Named => ({
    idea,
    video: p.videoById.get(idea.videoId),
    ...planName(idea, p.videoById, p.formatById),
  });
  const by = (s: IdeaStatus) => mine.filter((i) => i.status === s);
  const waiting = by("waiting")
    .sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0) || a.dueDate.localeCompare(b.dueDate))
    .map(named);
  const sentBack = by("rejected").map(named);
  const approved = by("approved").length;
  const planning = by("saved").length;

  const target = Math.max(client.monthlyTarget, 0);
  const pct = (n: number) => (target > 0 ? Math.min(n / target, 1) * 100 : 0);


  const fixSentBack = () =>
    sentBack.length === 1 ? p.onOpenPlan(sentBack[0].idea.id) : p.onOpenPlans("rejected");

  return (
    <section className="ch ch-wide chm">
      <header className="ch-head">
        <div className="ch-id">
          <span className="eyebrow">{client.name} · {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date())}</span>
          <h1>{t("home.client.title")}</h1>
        </div>
        <button className="btn btn-primary" onClick={p.onFindIdeas}>
          {t("shell.side.findIdeas")} <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="chm-grid">
        <section className="chm-card" aria-labelledby="chm-month-title">
          <div className="chm-ch">
            <h2 id="chm-month-title">{t("home.client.monthTitle")}</h2>
          </div>
          <div className="chm-mid">
            <div className="ovc-ring chm-ring">
              <span className="ovc-ring-wait">
                <ProgressRing value={pct(approved + waiting.length)} size={160} stroke={14} />
              </span>
              <span className="ovc-ring-main">
                <ProgressRing value={pct(approved)} size={160} stroke={14} />
              </span>
              <div className="ovc-ring-text">
                <div>
                  <b>
                    {approved}
                    <small>/{target}</small>
                  </b>
                  <span>{t("home.overview.ringApproved")}<br />{t("home.dashboard.thisMonth")}</span>
                </div>
              </div>
            </div>
            <ul className="chm-stats">
              <li className="chm-stat chm-stat-plan">
                <span>{t("home.client.rowPlanning")}</span>
                <b className={planning ? undefined : "muted"}>{planning}</b>
              </li>
              <li className="chm-stat chm-stat-wait">
                <span>{t("home.client.rowWaiting", { manager })}</span>
                {waiting.length ? (
                  <button className="link-btn" onClick={p.onReview}>
                    {waiting.length}
                  </button>
                ) : (
                  <b className="muted">0</b>
                )}
              </li>
              <li className="chm-stat chm-stat-ok">
                <span>{t("home.client.rowApproved")}</span>
                <b className={approved ? undefined : "muted"}>{approved}</b>
              </li>
            </ul>
          </div>
          <div className="chm-legend">
            <span><i className="chm-legend-approved" />{t("home.client.rowApproved")}</span>
            <span><i className="chm-legend-waiting" />{t("home.dashboard.waitingLegend")}</span>
          </div>
        </section>

        <section className="chm-card" aria-labelledby="chm-wait-title">
          <div className="chm-ch">
            <h2 id="chm-wait-title">{t("home.client.waitingTitle", { manager })}</h2>
          </div>
          {waiting.length === 0 && sentBack.length === 0 ? (
            <p className="small muted chm-note">{t("home.client.waitingEmpty", { manager })}</p>
          ) : (
            <ul className="chm-rows">
              {waiting.map((plan) => (
                <PlanRow
                  key={plan.idea.id}
                  plan={plan}
                  meta={sentText(plan.idea.sentAt, plan.idea.dueDate)}
                  right={
                    <button
                      className="btn btn-sm"
                      onClick={() => p.onOpenPlan(plan.idea.id)}
                      aria-label={t("home.client.openAria", { name: plan.name })}
                    >
                      {t("home.client.open")} <span aria-hidden="true">↗</span>
                    </button>
                  }
                />
              ))}
              {sentBack.map((plan) => (
                <PlanRow
                  key={plan.idea.id}
                  plan={plan}
                  meta={t("home.client.sentBackReason", {
                    manager,
                    reason: plan.idea.rejectReason?.trim() || t("home.cards.noneGiven"),
                  })}
                  right={<span className="pill pill-bad">{t("home.client.sentBackPill")}</span>}
                />
              ))}
            </ul>
          )}
          {(waiting.length > 0 || sentBack.length > 0) && (
            <div className="chm-act">
              {waiting.length > 0 && <span className="small muted chm-review-summary">{t("home.dashboard.waitingSummary", { n: waiting.length })}</span>}
              {waiting.length > 0 && (
                <button className="btn btn-primary" onClick={p.onReview}>
                  {t("home.dashboard.reviewPlans")}
                </button>
              )}
              {sentBack.length > 0 && (
                <button className="btn" onClick={fixSentBack}>
                  {sentBack.length === 1 ? t("home.client.fixOne") : t("home.client.fixMany", { n: sentBack.length })}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
