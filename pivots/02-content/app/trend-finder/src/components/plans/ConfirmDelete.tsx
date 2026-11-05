import { useEffect, useRef } from "react";
import { t } from "../../lib/i18n";

interface Props {
  // The plan's name, shown in the question.
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// The pop-up the bin on a plan card opens: nothing is deleted until "Delete" is clicked.
// A native <dialog> opened as a modal: it keeps focus inside, Esc cancels, and focus goes back to the bin on close.
export function ConfirmDelete({ name, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="plan-modal"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-text"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      // A click on the dimmed area outside the box cancels too.
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="plan-modal-box">
        <h2 id="confirm-delete-title">{t("plan.card.deleteTitle")}</h2>
        <p id="confirm-delete-text">{t("plan.card.deleteText", { name })}</p>
        <div className="plan-modal-actions">
          <button type="button" className="btn btn-ghost" autoFocus onClick={onCancel}>
            {t("plan.common.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {t("plan.card.deleteConfirm")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
