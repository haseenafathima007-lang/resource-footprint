import React, { useState } from 'react';
import type { BaselineProfile } from '@/types/profile.ts';
import type { TargetResource } from '@/services/types.ts';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    alias: string;
    referenceProfile: BaselineProfile;
    baselineWaterLDay: number;
    baselineEnergyKwhDay: number;
    targetResource?: TargetResource | null;
    targetAmount?: number | null;
  }) => Promise<{ ok: boolean; error?: { message: string } }>;
  referenceProfile: BaselineProfile | null;
  baselineWaterLDay: number;
  baselineEnergyKwhDay: number;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  referenceProfile,
  baselineWaterLDay,
  baselineEnergyKwhDay,
}) => {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [targetResource, setTargetResource] = useState<TargetResource | 'none'>('none');
  const [targetAmount, setTargetAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Team name is required');
      return;
    }

    if (!referenceProfile) {
      setErrorMessage('Baseline profile is required before creating a team');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const amountNum = targetAmount.trim() ? parseFloat(targetAmount) : null;
    if (targetResource !== 'none' && amountNum !== null && (isNaN(amountNum) || amountNum <= 0)) {
      setErrorMessage('Target amount must be a positive number');
      setIsSubmitting(false);
      return;
    }

    const res = await onSubmit({
      name: name.trim(),
      alias: alias.trim(),
      referenceProfile,
      baselineWaterLDay,
      baselineEnergyKwhDay,
      targetResource: targetResource === 'none' ? null : targetResource,
      targetAmount: targetResource === 'none' ? null : amountNum,
    });

    setIsSubmitting(false);
    if (!res.ok) {
      setErrorMessage(res.error?.message || 'Failed to create team');
    } else {
      onClose();
    }
  };

  return (
    <div
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in"
      aria-labelledby="create-team-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface-raised border border-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-ink">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 id="create-team-modal-title" className="text-xl font-bold">
            Create a New Team
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
            <label htmlFor="team-name" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Team Name <span className="text-error">*</span>
            </label>
            <input
              id="team-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eco Warriors"
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="member-alias" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Your Display Alias (Optional)
            </label>
            <input
              id="member-alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Defaults to auto-generated alias (no email/username)"
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              No emails or handles are ever shown to other members.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="target-resource" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Shared Goal Type
              </label>
              <select
                id="target-resource"
                value={targetResource}
                onChange={(e) => setTargetResource(e.target.value as TargetResource | 'none')}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              >
                <option value="none">None</option>
                <option value="water">30-Day Water Goal (Liters)</option>
                <option value="energy">30-Day Energy Goal (kWh)</option>
              </select>
            </div>

            {targetResource !== 'none' && (
              <div>
                <label htmlFor="target-amount" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                  Target Amount ({targetResource === 'water' ? 'L' : 'kWh'})
                </label>
                <input
                  id="target-amount"
                  type="number"
                  min="0"
                  step="any"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>
            )}
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
              {isSubmitting ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
