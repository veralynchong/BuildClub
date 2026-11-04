import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { TypeAheadItem } from "../lib/findDesk";
import type { Platform } from "../types";
import type { ChipGroup } from "../lib/clientChips";
import { PlatformToggles } from "./PlatformToggles";
import { ClientChips } from "./ClientChips";
import type { PulseInfo } from "./ClientChips";
import { VoiceButton } from "./VoiceButton";
import { usePastSearches } from "../lib/usePastSearches";
import { t } from "../lib/i18n";
import { useApp } from "../lib/appContext";

interface Props {
  inputId: string;
  value: string;
  onValueChange: (text: string) => void;
  onSearch: (text: string) => void;
  platforms: Platform[];
  onPlatformsChange: (platforms: Platform[]) => void;
  live: boolean;
  clientName: string;
  clientExamples: string[];
  chipGroups: ChipGroup[];
  pulse: PulseInfo;
  onRefreshPulse: () => void;
  autoFocus?: boolean;
  // Live mode: pick a screenshot to find videos like it.
  onImage?: (file: File) => void;
  // Home hides the trending chip row: its Trending card already shows the same data.
  hideChips?: boolean;
  // Find ideas: the drop-down of suggestions while typing (recent searches, common searches, brief, questions).
  // `past` is the server's past searches for what is typed (live mode). Without it, live mode keeps the datalist.
  suggestFor?: (text: string, past: string[]) => TypeAheadItem[];
}

const GROUP_KEY = {
  recent: "find.type.recent",
  search: "find.type.search",
  brief: "find.type.brief",
  ask: "find.type.ask",
} as const;

// The search card used on Find ideas (before and after searching) and on Home:
// platforms, the search bar (with voice), and optionally one row of search ideas for the client.
// Find ideas passes hideChips and shows its starting points below the card instead.
export function SearchBox(p: Props) {
  const [listening, setListening] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const listId = useId();
  const past = usePastSearches(p.value, p.live);
  // One search at a time: the button waits while another runs in the background.
  const busy = Boolean(useApp().searching);
  // The suggestions drop-down: open while the box has focus and something is typed; Escape or a pick closes it.
  const [focused, setFocused] = useState(false);
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const items = p.suggestFor && focused && closedFor !== p.value ? p.suggestFor(p.value, past) : [];
  const open = items.length > 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;
  const pickItem = (item: TypeAheadItem) => {
    setClosedFor(item.value);
    setActive(-1);
    p.onValueChange(item.value);
    p.onSearch(item.value);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      // -1 is the box itself: moving past either end goes back to what was typed.
      setActive((i) => {
        const next = i + step;
        return next >= items.length ? -1 : next < -1 ? items.length - 1 : next;
      });
    } else if (e.key === "Enter" && active >= 0 && active < items.length) {
      e.preventDefault();
      pickItem(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setClosedFor(p.value);
      setActive(-1);
    }
  };
  const trending = p.chipGroups.find((g) => g.id === "trending");
  const oneRow = trending
    ? [trending]
    : // No trend data yet: the client's starter searches fill the row, labelled as what they are.
      [
        {
          id: "starter" as const,
          title: t('find.starter.title', { client: p.clientName }),
          chips: p.clientExamples
            .slice(0, 5)
            .map((e) => ({ label: e, value: e })),
        },
      ];

  return (
    <form
      className="search-box"
      onSubmit={(e) => {
        e.preventDefault();
        p.onSearch(p.value);
      }}
    >
      <div className="search-on">
        <span className="field-label">{t('find.box.searchOn')}</span>
        <PlatformToggles selected={p.platforms} onChange={p.onPlatformsChange} />
      </div>

      <label htmlFor={p.inputId} className="sr-only">
        {t('find.box.label')}
      </label>
      <div className="search-row">
        <div className="search-input">
          <input
            id={p.inputId}
            value={p.value}
            onChange={(e) => {
              setActive(-1);
              p.onValueChange(e.target.value);
            }}
            onFocus={() => setFocused(true)}
            // A click on a suggestion lands before blur hides the list (mousedown keeps focus, see below).
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            role={p.suggestFor ? "combobox" : undefined}
            aria-expanded={p.suggestFor ? open : undefined}
            aria-controls={p.suggestFor ? `${listId}-list` : undefined}
            aria-autocomplete={p.suggestFor ? "list" : undefined}
            aria-activedescendant={open && active >= 0 && active < items.length ? optionId(active) : undefined}
            placeholder={
              listening
                ? t('find.box.listening')
                : p.live
                  ? t('find.box.eg', { example: p.clientExamples[0] ?? "tofu recipe" })
                  : t('find.box.egDemo')
            }
            autoFocus={p.autoFocus}
            list={p.live && !p.suggestFor ? listId : undefined}
            autoComplete="off"
          />
          {p.live && !p.suggestFor && (
            <datalist id={listId}>
              {past.map((q) => (
                <option key={q} value={q} />
              ))}
            </datalist>
          )}
          <VoiceButton
            onText={p.onValueChange}
            onDone={(text) => {
              p.onValueChange(text);
              p.onSearch(text);
            }}
            onListeningChange={setListening}
          />
          {open && (
            <ul className="fd-typeahead" id={`${listId}-list`} role="listbox" aria-label={t('find.type.label')}>
              {items.map((item, i) => (
                <li
                  key={`${item.group}-${item.value}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={`fd-ta-item ${i === active ? "is-active" : ""} ${i === 0 || items[i - 1].group !== item.group ? "is-first" : ""}`}
                  // Keep focus in the box so the list doesn't close before the click lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickItem(item)}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="fd-ta-group">{i === 0 || items[i - 1].group !== item.group ? t(GROUP_KEY[item.group]) : ""}</span>
                  <span className="fd-ta-text">
                    <span className="fd-ta-label">{item.label}</span>
                    {item.hint && <small>{item.hint}</small>}
                  </span>
                  {i === active && <span className="fd-ta-enter">{t('find.type.enter')}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!p.value.trim() || busy}
          title={busy ? t('find.bg.busy') : p.value.trim() ? undefined : t('find.box.typeFirst')}
        >
          {/https?:\/\//.test(p.value)
            ? t('find.box.findMore')
            : t('find.box.findTrending')}
        </button>
      </div>

      {busy && <p className="small muted" role="note">{t('find.bg.busy')}</p>}

      {p.onImage && (
        <div className="search-upload">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            id={`${p.inputId}-file`}
            aria-label={t('find.box.uploadAria')}
            // The visible "Upload screenshot" button opens this input, so it is not a second Tab stop.
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) p.onImage?.(file);
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
            {t('find.box.upload')}
          </button>
          <span className="small muted">{t('find.box.uploadHint')}</span>
        </div>
      )}

      {!p.hideChips && (
        <ClientChips
          clientName={p.clientName}
          groups={oneRow}
          pulse={p.pulse}
          onPick={(value) => {
            p.onValueChange(value);
            p.onSearch(value);
          }}
          onRefresh={p.onRefreshPulse}
        />
      )}
    </form>
  );
}
