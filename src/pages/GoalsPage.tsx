import { useState, useEffect } from 'react';
import { useBaseline } from '@/hooks/useBaseline';
import { useDeviations } from '@/hooks/useDeviations';
import { useGoals } from '@/hooks/useGoals';
import type { ClockFunction } from '@/hooks/useToday';
import { GoalForm } from '@/components/goals/GoalForm';
import { GoalList } from '@/components/goals/GoalList';
import type { GoalInput } from '@/engine';

interface GoalsPageProps {
  clock?: ClockFunction;
}

export function GoalsPage({ clock }: GoalsPageProps) {
  useEffect(() => {
    document.title = 'Resource Reduction Goals — Resource Footprint';
  }, []);

  const {
    loading: baselineLoading,
    error: baselineError,
    currentBaseline,
    currentFactors,
    reload: reloadBaseline,
  } = useBaseline();

  const {
    loading: deviationsLoading,
    error: deviationsError,
    reload: reloadDeviations,
  } = useDeviations();

  const {
    activeGoals,
    archivedGoals,
    isLoading: goalsLoading,
    error: goalsError,
    createGoal,
    archiveGoal,
    removeGoal,
    reload: reloadGoals,
  } = useGoals(clock);

  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateGoal = async (input: GoalInput) => {
    setFormError(null);
    if (!currentBaseline || !currentFactors) {
      setFormError('No active baseline profile or factors found.');
      return { ok: false, error: 'Missing baseline profile or factors' };
    }

    const res = await createGoal(input, currentBaseline, currentFactors);
    if (!res.ok) {
      if (res.error?.code === 'CONFLICT') {
        setFormError('You already have an active goal for this resource type. Archive or delete your existing active goal before creating a new one.');
      } else {
        setFormError(res.error?.message || 'An error occurred while saving your goal.');
      }
      return { ok: false, error: res.error };
    }
    return { ok: true };
  };

  const handleArchiveGoal = async (id: string) => {
    await archiveGoal(id);
  };

  const handleDeleteGoal = async (id: string) => {
    await removeGoal(id);
  };

  const loading = baselineLoading || deviationsLoading || goalsLoading;
  const errorMessage = baselineError || deviationsError || goalsError;
  const allGoals = [...activeGoals, ...archivedGoals];

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10" aria-label="Loading goals">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </main>
    );
  }

  if (errorMessage || !currentBaseline || !currentFactors) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200">
          <h2 className="text-lg font-bold mb-2">Unable to load goals</h2>
          <p className="text-sm mb-4">
            {errorMessage || 'Baseline profile data is unavailable.'}
          </p>
          <button
            onClick={() => {
              reloadBaseline();
              reloadDeviations();
              reloadGoals();
            }}
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-1">
          <span>🎯</span>
          <span>Target Setting</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Resource Reduction Goals
        </h1>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-400 max-w-2xl">
          Set ambitious yet achievable reduction targets for water and energy. Progress is measured against your active baseline profile and recorded daily deviations.
        </p>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3" role="alert">
          <span className="text-lg" aria-hidden="true">⚠️</span>
          <div>
            <p className="font-semibold">Goal Creation Notice</p>
            <p className="mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      {/* Goal Form Section */}
      <section aria-labelledby="create-goal-heading">
        <h2 id="create-goal-heading" className="sr-only">Create a Reduction Goal</h2>
        <GoalForm
          referenceProfile={currentBaseline}
          factors={currentFactors}
          onSave={handleCreateGoal}
          conflictError={formError}
        />
      </section>

      {/* Active & Archived Goals List */}
      <section aria-labelledby="goals-list-heading">
        <h2 id="goals-list-heading" className="sr-only">Your Goals</h2>
        <GoalList
          goals={allGoals}
          onArchive={handleArchiveGoal}
          onDelete={handleDeleteGoal}
        />
      </section>
    </main>
  );
}

export default GoalsPage;
