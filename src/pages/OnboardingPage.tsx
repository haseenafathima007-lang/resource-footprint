import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Wizard } from '@/components/onboarding/Wizard.tsx';
import { baselineRepository } from '@/services/supabase/baselineRepository.ts';
import type { BaselineProfile } from '@/engine';

export function OnboardingPage() {
  const location = useLocation();
  const locationBaseline = (location.state as { baseline?: BaselineProfile })?.baseline;

  const [existingBaseline, setExistingBaseline] = useState<BaselineProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Onboarding — Resource Footprint';

    async function checkExistingBaseline() {
      setLoading(true);
      const res = await baselineRepository.getCurrentBaseline();
      if (res.ok && res.data) {
        setExistingBaseline(res.data);
        document.title = 'Update Baseline — Resource Footprint';
      }
      setLoading(false);
    }

    checkExistingBaseline();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-ink-muted animate-pulse">Loading baseline...</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <Wizard
        existingBaseline={existingBaseline}
        locationBaseline={locationBaseline}
      />
    </div>
  );
}

export default OnboardingPage;
