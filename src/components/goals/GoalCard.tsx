import React, { useState } from 'react';
import type { GoalWithProgress } from '@/hooks/useGoals';
import { formatTypicalValue as formatNumber } from '@/lib/format';

interface GoalCardProps {
  goal: GoalWithProgress;
  onArchive: (goalId: string) => Promise<void>;
  onDelete: (goalId: string) => Promise<void>;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal: item, onArchive, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState<'archive' | 'delete' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goal = item.goal;
  const progress = item.progress;

  const resourceLabel = goal.resource === 'water' ? 'Water' : 'Energy';
  const unit = goal.resource === 'water' ? 'L' : 'kWh';
  const resourceIcon = goal.resource === 'water' ? '💧' : '⚡';

  const percentAchieved = Math.min(100, Math.max(0, Math.round(progress.ratioTypical * 100)));
  const isAchieved = progress.status === 'achieved';
  const status = goal.status;

  const handleAction = async (action: 'archive' | 'delete') => {
    setIsSubmitting(true);
    try {
      if (action === 'archive') {
        await onArchive(goal.id);
      } else {
        await onDelete(goal.id);
      }
    } finally {
      setIsSubmitting(false);
      setShowConfirm(null);
    }
  };

  const getStatusBadge = () => {
    if (status === 'archived') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Archived</span>;
    }
    if (isAchieved) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Achieved 🎉</span>;
    }
    if (progress.status === 'on_pace') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">On Pace</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Active</span>;
  };

  return (
    <div className={`p-6 rounded-2xl border transition-all ${
      isAchieved && status === 'active'
        ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
        : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">{resourceIcon}</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {resourceLabel} Goal: Reduce {formatNumber(goal.targetAmount)} {unit}/{goal.period}
            </h3>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Window: {progress.windowStart} to {progress.windowEnd} ({progress.daysCounted} days tracked)
          </p>
        </div>

        {/* Action Buttons */}
        {status !== 'archived' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirm('archive')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={`Archive ${resourceLabel} goal`}
            >
              Archive
            </button>
            <button
              onClick={() => setShowConfirm('delete')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              aria-label={`Delete ${resourceLabel} goal`}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Calm Celebration Banner */}
      {isAchieved && status === 'active' && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-100/70 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">🌿</span>
          <div>
            <p className="font-semibold">Reduction target achieved!</p>
            <p className="text-xs opacity-90">
              You&apos;ve saved an estimated {formatNumber(progress.saved.typical)} {unit} during this tracking period. Outstanding effort!
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          <span>Target Progress</span>
          <span className="font-semibold text-slate-900 dark:text-white">{percentAchieved}%</span>
        </div>
        <div 
          className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={percentAchieved}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${resourceLabel} goal progress: ${percentAchieved}%`}
        >
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isAchieved
                ? 'bg-emerald-500 dark:bg-emerald-400'
                : 'bg-indigo-600 dark:bg-indigo-500'
            }`}
            style={{ width: `${percentAchieved}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Reduction Target</span>
          <span className="font-bold text-slate-900 dark:text-white">{formatNumber(goal.targetAmount)} {unit}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Est. Saved</span>
          <span className="font-bold text-slate-900 dark:text-white">{formatNumber(progress.saved.typical)} {unit}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Current Pace</span>
          <span className={`font-bold ${
            isAchieved
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-slate-900 dark:text-white'
          }`}>
            {formatNumber(progress.pace.typical)} {unit}/{goal.period}
          </span>
        </div>
      </div>

      {/* Confirmation Modal Inline */}
      {showConfirm && (
        <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-bold mb-1">
            Confirm {showConfirm === 'archive' ? 'Archiving' : 'Deletion'}
          </p>
          <p className="mb-3">
            Are you sure you want to {showConfirm === 'archive' ? 'archive this goal? You can still view it in your goal history.' : 'permanently delete this goal? This action cannot be undone.'}
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowConfirm(null)}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction(showConfirm)}
              disabled={isSubmitting}
              className={`px-3 py-1.5 rounded-lg font-semibold text-white transition-colors ${
                showConfirm === 'archive'
                  ? 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : showConfirm === 'archive' ? 'Archive Goal' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
