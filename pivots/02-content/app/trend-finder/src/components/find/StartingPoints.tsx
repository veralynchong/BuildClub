import type { ChipGroup } from '../../lib/clientChips'
import type { PulseInfo } from '../ClientChips'
import { checkedWhen } from './checked'
import { t } from '../../lib/i18n'
import { DeskBlock } from './DeskBlock'

interface Props {
  clientName: string
  groups: ChipGroup[]
  // Used when there is nothing else to suggest yet.
  clientExamples: string[]
  pulse: PulseInfo
  onPick: (value: string) => void
  onRefresh: () => void
  // "Other ways in": a question written from the client's topic, the link box, the screenshot upload.
  askExample?: string
  onFocusSearch?: () => void
  onUpload?: () => void
}

interface Line {
  key: string
  group?: string
  label: string
  why?: string
  go: string
  onGo: () => void
}

const two = (n: number) => String(n).padStart(2, '0')

// Find ideas, before searching: a few searches worth trying for this client as one numbered ledger, grouped
// (from the brief, catching on now, other ways in), each with one plain sentence saying why. Picking one runs it.
export function StartingPoints({ clientName, groups, clientExamples, pulse, onPick, onRefresh, askExample, onFocusSearch, onUpload }: Props) {
  const shown: ChipGroup[] = groups.length
    ? groups
    : clientExamples.length
      ? [
          {
            id: 'starter',
            title: t('find.starter.title', { client: clientName }),
            chips: clientExamples.slice(0, 5).map((e) => ({ label: e, value: e, hint: t('find.start.hint', { client: clientName }) })),
          },
        ]
      : []
  const waitingForTrends = pulse.live && pulse.loading && !groups.some((g) => g.id === 'trending')

  const lines: Line[] = shown.flatMap((g) =>
    g.chips.map((c, i) => ({
      key: `${g.id}-${c.label}`,
      group: i === 0 ? g.title : undefined,
      label: c.label,
      why: c.hint,
      go: t('find.desk.go'),
      onGo: () => onPick(c.value),
    })),
  )
  const ways: Line[] = [
    ...(askExample
      ? [{ key: 'ask', label: t('find.desk.ways.ask'), why: `"${askExample}"`, go: t('find.desk.go'), onGo: () => onPick(askExample) }]
      : []),
    ...(onFocusSearch
      ? [{ key: 'link', label: t('find.desk.ways.link'), why: t('find.desk.ways.linkWhy'), go: t('find.desk.goLink'), onGo: onFocusSearch }]
      : []),
    ...(onUpload ? [{ key: 'shot', label: t('find.desk.ways.shot'), why: t('find.desk.ways.shotWhy'), go: t('find.desk.goShot'), onGo: onUpload }] : []),
  ].map((l, i) => ({ ...l, group: i === 0 ? t('find.desk.ways.title') : undefined }))
  const all = [...lines, ...ways]

  return (
    <DeskBlock tab={t('find.desk.start.tab')} id="find-start-title" className="find-start">
      <div className="fd-ledger">
        <div className="fd-cell">
          <h3>{t('find.start.title', { client: clientName })}</h3>
          <p>{t('find.start.sub')}</p>
          {pulse.live && (
            <p className="find-start-pulse" role="status">
              {pulse.loading ? (
                <>{t('find.start.checking', { client: clientName })}</>
              ) : pulse.error ? (
                <>{t('find.start.error', { error: pulse.error })}</>
              ) : pulse.fetchedAt ? (
                <>{t('find.start.checked', { topic: pulse.topic ?? '', when: checkedWhen(pulse.fetchedAt) })}</>
              ) : (
                <>{t('find.start.notChecked', { client: clientName })}</>
              )}
              {!pulse.loading && (
                <button type="button" className="link-btn" onClick={onRefresh}>
                  {t('find.start.again')}
                </button>
              )}
            </p>
          )}
        </div>
        <ul className="fd-rows fd-start-list">
          {waitingForTrends && (
            <li className="fd-start-row fd-start-wait" aria-hidden="true">
              <span className="fd-gl" />
            </li>
          )}
          {all.map((l, i) => (
            <li key={l.key} className={`fd-start-row ${l.group && i > 0 ? 'is-group' : ''}`}>
              <button type="button" className="fd-start-item" onClick={l.onGo}>
                <span className="fd-n" aria-hidden="true">
                  {two(i + 1)}
                </span>
                <span className="fd-grp">{l.group}</span>
                <span className="fd-q">
                  <span className="fd-start-label">{l.label}</span>
                  {l.why && <small>{l.why}</small>}
                </span>
                <span className="fd-go" aria-hidden="true">
                  {l.go} <span className="fd-arrow">→</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </DeskBlock>
  )
}
