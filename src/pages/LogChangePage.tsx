import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, AlertCircle, ArrowRight } from 'lucide-react';
import { useBaseline } from '@/hooks/useBaseline.ts';
import { useDeviations } from '@/hooks/useDeviations.ts';
import { useToday } from '@/hooks/useToday.ts';
import type { Deviation } from '@/types/deviation.ts';
import { DeviationForm } from '@/components/deviations/DeviationForm.tsx';
import { DeviationList } from '@/components/deviations/DeviationList.tsx';
import { UndoToast } from '@/components/deviations/UndoToast.tsx';

interface UndoState {
  groupId: string;
  message: string;
}

export const LogChangePage: React.FC = () => {
  const { currentBaseline, currentFactors, loading: baselineLoading, error: baselineError } = useBaseline();
  const {
    deviations,
    loading: deviationsLoading,
    error: deviationsError,
    addDeviations,
    removeDeviation,
    removeGroup,
  } = useDeviations();
  const { today } = useToday();

  const [undoState, setUndoState] = useState<UndoState | null>(null);

  const handleSaveDeviations = async (
    items: Omit<Deviation, 'id' | 'createdAt'>[]
  ): Promise<boolean> => {
    const res = await addDeviations(items);
    if (res.ok) {
      const groupId = items[0]?.groupId || res.data[0]?.id;
      if (groupId) {
        setUndoState({
          groupId,
          message: 'Change logged successfully.',
        });
      }
      return true;
    }
    return false;
  };

  const handleUndo = async () => {
    if (!undoState) return;
    const { groupId } = undoState;
    setUndoState(null);
    await removeGroup(groupId);
  };

  if (baselineLoading || deviationsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-ink-muted">Loading change logger...</p>
      </div>
    );
  }

  if (baselineError || deviationsError) {
    return (
      <div
        role="alert"
        className="p-5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 space-y-2"
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Error Loading Data</span>
        </div>
        <p className="text-xs">{baselineError || deviationsError}</p>
      </div>
    );
  }

  if (!currentBaseline || !currentFactors) {
    return (
      <div className="p-8 rounded-xl border border-border bg-surface-raised text-center max-w-lg mx-auto space-y-4">
        <CalendarPlus className="w-10 h-10 text-primary mx-auto" aria-hidden="true" />
        <h2 className="text-lg font-bold text-ink">Baseline Required</h2>
        <p className="text-sm text-ink-muted">
          You need to establish your typical daily baseline before you can log temporary activity changes.
        </p>
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>Complete Onboarding</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
          <CalendarPlus className="w-4 h-4" aria-hidden="true" />
          <span>Activity Log</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          Log a Temporary Change
        </h1>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl">
          Record short-term events such as heatwaves, house guests, work-from-home days, or vacations to keep your actual footprint accurate.
        </p>
      </div>

      {/* Main Logging Form */}
      <DeviationForm
        baseline={currentBaseline}
        factors={currentFactors}
        today={today}
        onSave={handleSaveDeviations}
      />

      {/* History of logged deviations */}
      <section aria-labelledby="history-heading" className="space-y-4 pt-6 border-t border-border">
        <div>
          <h2 id="history-heading" className="text-lg font-bold text-ink">
            Logged Changes History
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted">
            All temporary activity adjustments recorded for your profile.
          </p>
        </div>

        <DeviationList
          deviations={deviations}
          onDeleteGroup={async (groupId) => {
            await removeGroup(groupId);
          }}
          onDeleteSingle={async (id) => {
            await removeDeviation(id);
          }}
        />
      </section>

      {/* Floating Undo Toast */}
      {undoState && (
        <UndoToast
          message={undoState.message}
          onUndo={handleUndo}
          onDismiss={() => setUndoState(null)}
        />
      )}
    </div>
  );
};

export default LogChangePage;
