import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard } from '@/hooks/useWizard.ts';
import { ProgressIndicator } from './ProgressIndicator.tsx';
import { StepShowers } from './StepShowers.tsx';
import { StepCooling } from './StepCooling.tsx';
import { StepLaundry } from './StepLaundry.tsx';
import { StepReview } from './StepReview.tsx';
import { baselineRepository } from '@/services/supabase/baselineRepository.ts';
import { clearPendingBaseline } from '@/lib/pendingBaseline.ts';
import factorsData from '@/data/factors.v1.json';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { BaselineProfile } from '@/engine';

interface WizardProps {
  existingBaseline?: BaselineProfile | null;
  locationBaseline?: BaselineProfile | null;
}

const STEP_NAMES = [
  'Showers & Heating',
  'Cooling & Electronic Devices',
  'Laundry & Household Size',
  'Review & Confirm Baseline',
];

export const Wizard: React.FC<WizardProps> = ({
  existingBaseline,
  locationBaseline,
}) => {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
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
  } = useWizard({ existingBaseline, locationBaseline });

  const [saving, setSaving] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Accessible focus management: focus step heading on step transition
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const canAdvanceStep = (): boolean => {
    // Check if any DOM control in the active step has aria-invalid="true"
    if (formRef.current) {
      const invalidEl = formRef.current.querySelector('[aria-invalid="true"]');
      if (invalidEl) {
        return false;
      }
    }
    return validateStep(step);
  };

  const handleNext = () => {
    if (canAdvanceStep()) {
      nextStep();
    }
  };

  const handleSave = async () => {
    if (formRef.current?.querySelector('[aria-invalid="true"]')) {
      return;
    }

    // Validate entire profile through step validations before submission
    if (!validateStep(1)) {
      goToStep(1);
      return;
    }
    if (!validateStep(2)) {
      goToStep(2);
      return;
    }
    if (!validateStep(3)) {
      goToStep(3);
      return;
    }

    setSaving(true);
    setNetworkError(null);

    const profileToSave: BaselineProfile = {
      ...profile,
      factorsVersion: factorsData.version,
      effectiveFrom: profile.effectiveFrom || new Date().toISOString().split('T')[0],
    };

    const res = await baselineRepository.saveBaseline(profileToSave);

    setSaving(false);

    if (res.ok) {
      // Clear pending guest baseline on successful save
      clearPendingBaseline();
      navigate('/dashboard', {
        replace: true,
        state: { confirmation: 'Baseline saved successfully.' },
      });
      return;
    }

    if (res.error.code === 'UNAUTHENTICATED') {
      navigate('/auth', {
        replace: true,
        state: { from: { pathname: '/onboarding' } },
      });
      return;
    }

    if (res.error.code === 'VALIDATION') {
      const details = (res.error.details as Record<string, string>) || {};
      setErrors(details);
      // Route user to the step containing the first invalid field
      if (details.showerMinutesPerDay || details.showerHeater) {
        goToStep(1);
      } else if (details.acHoursPerDay || details.fanHoursPerDay || details.laptopHoursPerDay) {
        goToStep(2);
      } else if (details.laundryLoadsPerWeek || details.laundryMachine || details.householdSize) {
        goToStep(3);
      }
      return;
    }

    // NETWORK or other unexpected service error
    setNetworkError(res.error.message || 'A network error occurred while saving your baseline.');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
    } else {
      handleSave();
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 px-4 sm:px-6">
      <div className="bg-surface-raised border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-ink">
        {/* Step announcement live region for screen readers */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          Step {step} of 4: {STEP_NAMES[step - 1]}
        </div>

        {/* Guest Handoff Banner */}
        {isFromPending && !isEditMode && (
          <div
            role="status"
            className="mb-6 p-3.5 bg-primary/10 border border-primary/20 text-ink rounded-xl text-xs sm:text-sm flex items-start gap-3"
          >
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-primary">Simulator habits loaded</p>
              <p className="text-ink-muted mt-0.5">
                We kept the habits you tried in the simulator. Check them and save to complete your profile.
              </p>
            </div>
          </div>
        )}

        {/* Header with Edit / Create mode title */}
        <div className="mb-6">
          <h1 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            {isEditMode ? 'Baseline Configuration' : 'Onboarding Profile'}
          </h1>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold text-ink outline-none"
          >
            {isEditMode ? 'Update your baseline' : 'Set up your baseline'}
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            {isEditMode
              ? 'Adjust your everyday habits. Changes will establish a new baseline entry in your personal history.'
              : 'Describe your typical day once. We use this to calculate your personal water and energy baseline.'}
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={step} />

        {/* Network Error with Retry */}
        {networkError && (
          <div
            role="alert"
            className="mb-6 p-4 bg-negative/10 border border-negative/20 text-negative rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{networkError}</span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] bg-negative text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shrink-0"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : null}
              <span>Retry Save</span>
            </button>
          </div>
        )}

        {/* Step Form Container */}
        <form ref={formRef} onSubmit={handleFormSubmit} noValidate>
          <div className="min-h-[300px]">
            {step === 1 && (
              <StepShowers
                profile={profile}
                errors={errors}
                onUpdate={updateField}
              />
            )}

            {step === 2 && (
              <StepCooling
                profile={profile}
                errors={errors}
                onUpdate={updateField}
              />
            )}

            {step === 3 && (
              <StepLaundry
                profile={profile}
                errors={errors}
                onUpdate={updateField}
              />
            )}

            {step === 4 && (
              <StepReview
                profile={profile}
                onGoToStep={goToStep}
              />
            )}
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-border bg-surface hover:bg-surface-subtle text-ink text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-primary text-on-primary hover:bg-primary-hover text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4 text-on-primary" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-primary text-on-primary hover:bg-primary-hover text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-on-primary" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-on-primary" aria-hidden="true" />
                    <span>{isEditMode ? 'Update Baseline' : 'Save Baseline'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
