import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Wizard } from '@/components/onboarding/Wizard.tsx';
import { baselineRepository } from '@/services/supabase/baselineRepository.ts';
import type { BaselineProfile } from '@/engine';
import { validateProfile } from '@/engine';

export function OnboardingPage() {
  const location = useLocation();
  const state = location.state as { baseline?: BaselineProfile; proposed?: BaselineProfile } | null;
  const proposed = state?.proposed;
  const proposedBaseline =
    proposed && validateProfile(proposed as unknown as Record<string, unknown>) === null ? proposed : null;
  const locationBaseline = state?.baseline || proposedBaseline;

  const [existingBaseline, setExistingBaseline] = useState<BaselineProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = proposedBaseline ? 'Adopt Proposed Routine — Resource Footprint' : 'Onboarding — Resource Footprint';

    async function checkExistingBaseline() {
      setLoading(true);
      const res = await baselineRepository.getCurrentBaseline();
      if (res.ok && res.data) {
        setExistingBaseline(res.data);
        if (!proposedBaseline) {
          document.title = 'Update Baseline — Resource Footprint';
        }
      }
      setLoading(false);
    }

    checkExistingBaseline();
  }, [proposedBaseline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-ink-muted animate-pulse">Loading baseline...</p>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-4">
      {proposedBaseline && (
        <div className="max-w-xl mx-auto p-4 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-sm flex items-center gap-3">
          <span className="text-xl" aria-hidden="true">💡</span>
          <div>
            <p className="font-bold">Adopting Suggested Improvement</p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              Your baseline profile has been pre-filled with the suggested changes. Review your updated daily routine below and click &ldquo;Save Baseline&rdquo; to apply.
            </p>
          </div>
        </div>
      )}

      <Wizard
        existingBaseline={proposedBaseline ? null : existingBaseline}
        locationBaseline={locationBaseline}
      />
    </div>
  );
}

export default OnboardingPage;
