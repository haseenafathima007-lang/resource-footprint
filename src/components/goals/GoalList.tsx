import React, { useState } from 'react';
import type { GoalWithProgress } from '@/hooks/useGoals';
import { GoalCard } from './GoalCard';

interface GoalListProps {
  goals: GoalWithProgress[];
  onArchive: (goalId: string) => Promise<void>;
  onDelete: (goalId: string) => Promise<void>;
}

export const GoalList: React.FC<GoalListProps> = ({ goals, onArchive, onDelete }) => {
  const [showArchived, setShowArchived] = useState(false);

  const activeGoals = goals.filter(g => g.goal.status !== 'archived');
  const archivedGoals = goals.filter(g => g.goal.status === 'archived');

  return (
    <div className="space-y-8">
      {/* Active Goals Section */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Active Goals ({activeGoals.length})
        </h2>

        {activeGoals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center">
            <span className="text-3xl block mb-2" aria-hidden="true">🎯</span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              No active reduction goals
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Set a resource reduction target above to track your daily progress and compare against your baseline.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map(item => (
              <GoalCard
                key={item.goal.id}
                goal={item}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Archived Goals Section */}
      {archivedGoals.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <button
            onClick={() => setShowArchived(prev => !prev)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            aria-expanded={showArchived}
            aria-controls="archived-goals-section"
          >
            <span>{showArchived ? '▼' : '▶'}</span>
            <span>Archived Goals ({archivedGoals.length})</span>
          </button>

          {showArchived && (
            <div id="archived-goals-section" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {archivedGoals.map(item => (
                <GoalCard
                  key={item.goal.id}
                  goal={item}
                  onArchive={onArchive}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
