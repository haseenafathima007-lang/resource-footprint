import React from 'react';
import type { WizardStep } from '@/hooks/useWizard.ts';

interface ProgressIndicatorProps {
  currentStep: WizardStep;
  totalSteps?: number;
}

const STEP_TITLES = [
  'Showers',
  'Cooling & Devices',
  'Laundry & Household',
  'Review & Save',
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps = 4,
}) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs font-medium text-ink-muted">
          {STEP_TITLES[currentStep - 1]}
        </span>
      </div>

      {/* Progress Track with accessible name */}
      <div
        className="w-full h-2 bg-surface-subtle border border-border rounded-full overflow-hidden"
        role="progressbar"
        aria-label={`Onboarding progress: Step ${currentStep} of ${totalSteps}, ${STEP_TITLES[currentStep - 1]}`}
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 mt-3 text-center">
        {STEP_TITLES.map((title, idx) => {
          const stepNum = (idx + 1) as WizardStep;
          const isCurrent = stepNum === currentStep;
          const isPast = stepNum < currentStep;

          return (
            <div key={title} className="flex flex-col items-center">
              <span
                className={`text-[11px] truncate max-w-full font-medium ${
                  isCurrent ? 'text-primary font-bold' : isPast ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
