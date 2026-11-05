import { useEffect, useRef } from "react";
import { t } from "../../lib/i18n";

interface Props {
  manager: string;
  // The link, or null while it is being made (or after it was turned off).
  url: string | null;
  error: string;
  copied: boolean;
  onCopy: () => void;
  onTurnOff: () => void;
  onClose: () => void;
}

// The pop-up "Get review link" on a waiting card opens: the approver's link, ready to copy.
// It is the client's one review link, so the approver sees every plan waiting for them, not only this one.
export function ReviewLinkDialog(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  // Select the link once it arrives, so Cmd/Ctrl+C works straight away.
  useEffect(() => {
    if (p.url) input.current?.select();
  }, [p.url]);
  return (
    <dialog
      ref={ref}
      className="plan-modal"
      aria-labelledby="review-link-title"
      onCancel={(e) => {
        e.preventDefault();
        p.onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) p.onClose();
      }}
    >
      <div className="plan-modal-box">
        <h2 id="review-link-title">{t("plan.board.getLink")}</h2>
        <p>{t("plan.board.linkDialogText", { manager: p.manager })}</p>
        <label className="field plan-modal-field">
          <span className="field-label">{t("plan.board.linkFor", { manager: p.manager })}</span>
          <input
            ref={input}
            readOnly
            value={p.url ?? ""}
            placeholder={p.error ? "" : t("plan.board.linkMaking")}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
        {p.error && (
          <p className="error" role="alert">
            {p.error}
          </p>
        )}
        <div className="plan-modal-actions">
          {p.url && (
            <button type="button" className="link-btn plan-modal-off" onClick={p.onTurnOff}>
              {t("plan.board.turnOff")}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={p.onClose}>
            {t("plan.board.linkClose")}
          </button>
          <button type="button" className="btn btn-primary" autoFocus disabled={!p.url} onClick={p.onCopy}>
            {p.copied ? t("plan.common.copied") : t("plan.board.copyLink")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
