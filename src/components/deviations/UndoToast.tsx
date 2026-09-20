import React, { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  message,
  onUndo,
  onDismiss,
  durationMs = 6000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPct);
      if (remainingPct <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-surface-raised border border-border shadow-lg rounded-xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">{message}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1 px-3 min-h-[44px] min-w-[44px] text-xs font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-surface-subtle">
        <div
          className="h-full bg-primary transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
