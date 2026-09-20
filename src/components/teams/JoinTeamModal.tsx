import React, { useState } from 'react';
import type { BaselineProfile } from '@/types/profile.ts';

interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: {
    code: string;
    alias: string;
    referenceProfile: BaselineProfile;
    baselineWaterLDay: number;
    baselineEnergyKwhDay: number;
  }) => Promise<{ ok: boolean; error?: { message: string } }>;
  referenceProfile: BaselineProfile | null;
  baselineWaterLDay: number;
  baselineEnergyKwhDay: number;
}

export const JoinTeamModal: React.FC<JoinTeamModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  referenceProfile,
  baselineWaterLDay,
  baselineEnergyKwhDay,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [alias, setAlias] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setErrorMessage('Join code is required');
      return;
    }

    if (!referenceProfile) {
      setErrorMessage('Baseline profile is required before joining a team');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onSubmit({
      code: joinCode.trim(),
      alias: alias.trim(),
      referenceProfile,
      baselineWaterLDay,
      baselineEnergyKwhDay,
    });

    setIsSubmitting(false);
    if (!res.ok) {
      setErrorMessage(res.error?.message || 'Failed to join team');
    } else {
      onClose();
    }
  };

  return (
    <div
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in"
      aria-labelledby="join-team-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface-raised border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 text-ink">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 id="join-team-modal-title" className="text-xl font-bold">
            Join a Team
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-ink-muted hover:text-ink transition-colors p-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-xs text-error">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="join-code" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Join Code <span className="text-error">*</span>
            </label>
            <input
              id="join-code"
              type="text"
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCDE-FG234 or ABCDEFG234"
              className="w-full px-3 py-2 text-sm uppercase tracking-wider font-mono bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="join-alias" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Your Display Alias (Optional)
            </label>
            <input
              id="join-alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Defaults to auto-generated alias (no email/username)"
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-ink hover:bg-surface-subtle transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
            >
              {isSubmitting ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
