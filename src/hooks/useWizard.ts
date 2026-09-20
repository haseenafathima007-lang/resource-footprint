import { useState, useEffect, useCallback } from 'react';
import type { BaselineProfile } from '@/engine';
import { validateProfile } from '@/engine';
import { loadPendingBaseline } from '@/lib/pendingBaseline.ts';
import factorsData from '@/data/factors.v1.json';

export const DEFAULT_WIZARD_BASELINE: BaselineProfile = {
  effectiveFrom: new Date().toISOString().split('T')[0],
  factorsVersion: factorsData.version,
  householdSize: 1,
  showerMinutesPerDay: 10,
  showerHeater: 'electric',
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
  laundryMachine: 'topLoad',
};

export type WizardStep = 1 | 2 | 3 | 4;

export interface UseWizardOptions {
  existingBaseline?: BaselineProfile | null;
  locationBaseline?: BaselineProfile | null;
}

export function useWizard(options: UseWizardOptions = {}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFromPending, setIsFromPending] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialize profile with priority: existing saved baseline > location state > pending guest baseline > defaults
  const [profile, setProfile] = useState<BaselineProfile>(() => {
    if (options.existingBaseline) {
      return { ...options.existingBaseline };
    }
    if (options.locationBaseline) {
      return { ...options.locationBaseline };
    }
    const pending = loadPendingBaseline();
    if (pending) {
      return { ...pending };
    }
    return { ...DEFAULT_WIZARD_BASELINE };
  });

  // Re-sync if existing baseline arrives asynchronously
  useEffect(() => {
    if (options.existingBaseline) {
      setProfile({ ...options.existingBaseline });
      setIsEditMode(true);
      setIsFromPending(false);
    } else if (options.locationBaseline) {
      setProfile({ ...options.locationBaseline });
      setIsEditMode(false);
      setIsFromPending(true);
    } else {
      const pending = loadPendingBaseline();
      if (pending) {
        setIsFromPending(true);
      }
    }
  }, [options.existingBaseline, options.locationBaseline]);

  const updateField = useCallback(<K extends keyof BaselineProfile>(
    field: K,
    value: BaselineProfile[K]
  ) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateStep = useCallback((currentStep: WizardStep): boolean => {
    const fieldsToValidate: (keyof BaselineProfile)[] = [];
    if (currentStep === 1) {
      fieldsToValidate.push('showerMinutesPerDay', 'showerHeater');
    } else if (currentStep === 2) {
      fieldsToValidate.push('acHoursPerDay', 'fanHoursPerDay', 'laptopHoursPerDay');
    } else if (currentStep === 3) {
      fieldsToValidate.push('laundryLoadsPerWeek', 'laundryMachine', 'householdSize');
    }

    const partial: Record<string, unknown> = {};
    for (const f of fieldsToValidate) {
      partial[f] = profile[f];
    }

    const valErrors = validateProfile(partial);
    if (valErrors) {
      setErrors((prev) => ({ ...prev, ...valErrors }));
      return false;
    }

    // Clear any errors for this step
    setErrors((prev) => {
      const next = { ...prev };
      for (const f of fieldsToValidate) {
        delete next[f];
      }
      return next;
    });
    return true;
  }, [profile]);

  const nextStep = useCallback(() => {
    if (validateStep(step)) {
      if (step < 4) {
        setStep((s) => (s + 1) as WizardStep);
      }
    }
  }, [step, validateStep]);

  const prevStep = useCallback(() => {
    if (step > 1) {
      setStep((s) => (s - 1) as WizardStep);
    }
  }, [step]);

  const goToStep = useCallback((targetStep: WizardStep) => {
    setStep(targetStep);
  }, []);

  return {
    step,
    profile,
    errors,
    setErrors,
    isFromPending,
    isEditMode,
    updateField,
    validateStep,
    nextStep,
    prevStep,
    goToStep,
  };
}
