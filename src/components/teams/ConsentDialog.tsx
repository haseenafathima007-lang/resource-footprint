import React from 'react';

interface ConsentDialogProps {
  isOpen: boolean;
  teamName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ConsentDialog: React.FC<ConsentDialogProps> = ({
  isOpen,
  teamName,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in"
      aria-labelledby="consent-dialog-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface-raised border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 text-ink">
        <div className="flex items-center gap-3 text-warning">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-warning"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 id="consent-dialog-title" className="text-lg font-bold text-ink">
            Enable Data Sharing for "{teamName}"?
          </h2>
        </div>

        <div className="text-sm text-ink-muted space-y-2 leading-relaxed">
          <p>
            By opting into data sharing, your daily aggregated resource savings (liters of water and kWh of energy saved relative to your baseline) will be contributed to this team's totals.
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-ink-muted/90 pl-1">
            <li>Your exact answers, personal notes, and home setup are NEVER shared.</li>
            <li>Only your daily savings numbers and chosen team display alias will be visible.</li>
            <li>If the leaderboard is enabled and the team reaches at least 3 active members, your alias and reduction percentage will be listed.</li>
            <li>You can turn off sharing or leave the team at any time.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium border border-border rounded-lg text-ink hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
          >
            {isSubmitting ? 'Saving...' : 'I Consent & Enable Sharing'}
          </button>
        </div>
      </div>
    </div>
  );
};
