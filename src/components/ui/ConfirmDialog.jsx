import { useEffect } from 'react';

export default function ConfirmDialog({ open, title, message, confirmLabel = '삭제', onConfirm, onCancel, busy = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="presentation">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl px-5 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 shadow-[0_4px_20px_-2px_rgba(18,63,50,0.08)]"
      >
        <h2 id="confirm-title" className="text-[17px] font-semibold text-ink tracking-tight">
          {title}
        </h2>
        {message && <p className="text-[14px] text-muted mt-1.5 leading-relaxed">{message}</p>}
        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="h-[50px] rounded-xl bg-fill border border-hairline text-ink text-[15px] font-semibold"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-[50px] rounded-xl bg-danger text-white text-[15px] font-semibold disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
