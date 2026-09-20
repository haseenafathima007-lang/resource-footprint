import React, { useState } from 'react';
import type { MyTeam, TargetResource } from '@/services/types.ts';
import { Copy, RefreshCw, Key, Trash2, Settings } from 'lucide-react';

interface OwnerToolsModalProps {
  isOpen: boolean;
  team: MyTeam;
  onClose: () => void;
  onUpdateSettings: (settings: {
    showLeaderboard: boolean;
    targetResource?: TargetResource | null;
    targetAmount?: number | null;
  }) => Promise<{ ok: boolean; error?: { message: string } }>;
  onRotateCode: () => Promise<{ ok: boolean; joinCode?: string; error?: { message: string } }>;
  onDeleteTeam: () => Promise<{ ok: boolean; error?: { message: string } }>;
}

export const OwnerToolsModal: React.FC<OwnerToolsModalProps> = ({
  isOpen,
  team,
  onClose,
  onUpdateSettings,
  onRotateCode,
  onDeleteTeam,
}) => {
  const [copied, setCopied] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(team.showLeaderboard);
  const [targetResource, setTargetResource] = useState<TargetResource | 'none'>(
    team.targetResource || 'none'
  );
  const [targetAmount, setTargetAmount] = useState(
    team.targetAmount !== null ? String(team.targetAmount) : ''
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const rawJoinCode = team.joinCode || '';
  const formattedJoinCode =
    rawJoinCode.length === 10
      ? `${rawJoinCode.slice(0, 5)}-${rawJoinCode.slice(5)}`
      : rawJoinCode;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(formattedJoinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ text: 'Failed to copy join code', type: 'error' });
    }
  };

  const handleRotateCode = async () => {
    setIsRotating(true);
    setMessage(null);
    const res = await onRotateCode();
    setIsRotating(false);
    setConfirmRotate(false);
    if (res.ok) {
      setMessage({ text: 'Join code rotated successfully!', type: 'success' });
    } else {
      setMessage({ text: res.error?.message || 'Failed to rotate code', type: 'error' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    const amountNum = targetAmount.trim() ? parseFloat(targetAmount) : null;
    if (targetResource !== 'none' && amountNum !== null && (isNaN(amountNum) || amountNum <= 0)) {
      setMessage({ text: 'Target amount must be a positive number', type: 'error' });
      setIsUpdating(false);
      return;
    }

    const res = await onUpdateSettings({
      showLeaderboard,
      targetResource: targetResource === 'none' ? null : targetResource,
      targetAmount: targetResource === 'none' ? null : amountNum,
    });

    setIsUpdating(false);
    if (res.ok) {
      setMessage({ text: 'Team settings updated successfully!', type: 'success' });
    } else {
      setMessage({ text: res.error?.message || 'Failed to update settings', type: 'error' });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setMessage(null);
    const res = await onDeleteTeam();
    setIsDeleting(false);
    if (!res.ok) {
      setMessage({ text: res.error?.message || 'Failed to delete team', type: 'error' });
    } else {
      onClose();
    }
  };

  return (
    <div
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in"
      aria-labelledby="owner-tools-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface-raised border border-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto text-ink">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 id="owner-tools-modal-title" className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> Owner Management Tools
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

        {message && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              message.type === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-error/10 border-error/30 text-error'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Join Code Box */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <Key className="w-4 h-4 text-primary" /> Team Join Code
            </label>
            <span className="text-[11px] text-ink-muted">Private Invite</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-surface-raised border border-border rounded-lg text-center font-mono font-bold text-lg tracking-widest text-primary">
              {formattedJoinCode}
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Copy join code"
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors min-h-[44px] flex items-center gap-1.5 shrink-0"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {!confirmRotate ? (
            <button
              type="button"
              onClick={() => setConfirmRotate(true)}
              className="text-xs text-ink-muted hover:text-ink underline inline-flex items-center gap-1 pt-1"
            >
              <RefreshCw className="w-3 h-3" /> Rotate Join Code
            </button>
          ) : (
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-xs space-y-2">
              <p className="text-ink font-medium">Rotate Join Code?</p>
              <p className="text-ink-muted">
                The current join code will immediately stop working. Existing members remain in the team.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRotateCode}
                  disabled={isRotating}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-warning text-ink hover:bg-warning/90 transition-colors"
                >
                  {isRotating ? 'Rotating...' : 'Yes, Rotate Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRotate(false)}
                  className="px-3 py-1.5 text-xs border border-border rounded-md text-ink hover:bg-surface-subtle"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSaveSettings} className="space-y-4 pt-2 border-t border-border">
          <h3 className="text-sm font-bold text-ink">Team Settings & Targets</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="owner-target-resource" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Shared Goal Type
              </label>
              <select
                id="owner-target-resource"
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
                <label htmlFor="owner-target-amount" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                  Target Amount ({targetResource === 'water' ? 'L' : 'kWh'})
                </label>
                <input
                  id="owner-target-amount"
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

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={showLeaderboard}
              onChange={(e) => setShowLeaderboard(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-xs text-ink leading-normal">
              <strong>Enable Leaderboard</strong> (Shows relative rankings once $k \ge 3$ members share data).
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
            >
              {isUpdating ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Delete Team Zone */}
        <div className="pt-4 border-t border-border space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-error">Danger Zone</h3>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 text-xs font-semibold border border-error/40 text-error hover:bg-error/10 rounded-lg transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete Team
            </button>
          ) : (
            <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-xs space-y-2">
              <p className="text-error font-medium">Permanently Delete Team?</p>
              <p className="text-ink-muted">
                This will remove all team memberships and team records. Member baseline data remains unchanged.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-error text-white hover:bg-error/90 transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs border border-border rounded-md text-ink hover:bg-surface-subtle"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
