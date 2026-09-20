import React, { useState } from 'react';
import { ArrowLeft, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { BaselineProfile, FactorSetPayload } from '@/engine';
import type { Deviation, DeviationField, DeviationMode } from '@/types/deviation.ts';
import { validateDeviation } from '@/engine';
import { PresetCards, type PresetOption } from './PresetCards.tsx';
import { ImpactPreview } from './ImpactPreview.tsx';

interface DeviationFormProps {
  baseline: BaselineProfile;
  factors: FactorSetPayload;
  today: string;
  onSave: (items: Omit<Deviation, 'id' | 'createdAt'>[]) => Promise<boolean>;
}

const FIELD_LABELS: Record<DeviationField, string> = {
  showerMinutesPerDay: 'Shower time (min/day)',
  acHoursPerDay: 'Air Conditioner (hrs/day)',
  fanHoursPerDay: 'Fan (hrs/day)',
  laptopHoursPerDay: 'Laptop (hrs/day)',
  laundryLoadsPerWeek: 'Laundry (loads/week)',
};

interface FormItem {
  field: DeviationField;
  mode: DeviationMode;
  value: number;
}

export const DeviationForm: React.FC<DeviationFormProps> = ({
  baseline,
  factors,
  today,
  onSave,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<FormItem[]>([
    { field: 'acHoursPerDay', mode: 'delta', value: 3 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSelectPreset = (preset: PresetOption) => {
    setSelectedPresetId(preset.id);
    setNote(preset.defaultNote);
    setItems(preset.items.map((it) => ({ ...it })));
    setStep(2);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { field: 'laptopHoursPerDay', mode: 'delta', value: 2 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    updates: Partial<FormItem>
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!startDate || !endDate) {
      setValidationError('Please specify both a start date and an end date.');
      return;
    }

    if (startDate > endDate) {
      setValidationError('Start date cannot be after end date.');
      return;
    }

    if (items.length === 0) {
      setValidationError('Please add at least one activity change.');
      return;
    }

    // Validate each item via engine
    const groupId = crypto.randomUUID();
    const preparedDeviations: Omit<Deviation, 'id' | 'createdAt'>[] = [];

    for (const it of items) {
      const devCandidate: Omit<Deviation, 'id' | 'createdAt'> = {
        startDate,
        endDate,
        field: it.field,
        mode: it.mode,
        value: it.value,
        note: note.trim() || undefined,
        groupId,
      };

      const valErrors = validateDeviation(devCandidate, today);
      if (valErrors !== null) {
        setValidationError(Object.values(valErrors).join('. '));
        return;
      }

      preparedDeviations.push(devCandidate);
    }

    setIsSubmitting(true);
    const success = await onSave(preparedDeviations);
    setIsSubmitting(false);

    if (success) {
      // Reset to initial state
      setStep(1);
      setSelectedPresetId(null);
      setStartDate(today);
      setEndDate(today);
      setNote('');
    }
  };

  // Prepare deviations for live preview
  const previewDeviations: Omit<Deviation, 'id' | 'createdAt'>[] = items.map((it) => ({
    startDate,
    endDate,
    field: it.field,
    mode: it.mode,
    value: it.value,
    note: note.trim() || undefined,
  }));

  return (
    <div className="space-y-6">
      {step === 1 && (
        <section aria-labelledby="choose-template-heading">
          <div className="mb-4">
            <h2 id="choose-template-heading" className="text-lg font-bold text-ink">
              Choose a Change Template
            </h2>
            <p className="text-sm text-ink-muted">
              Select a common event or customize your own temporary activity adjustment.
            </p>
          </div>

          <PresetCards
            selectedPresetId={selectedPresetId}
            onSelectPreset={handleSelectPreset}
          />
        </section>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-raised rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back to templates</span>
            </button>
            <span className="text-xs text-ink-muted font-medium">
              Step 2 of 2: Configure Dates & Details
            </span>
          </div>

          {validationError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs sm:text-sm"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Fields Card */}
            <div className="space-y-4 rounded-xl border border-border bg-surface-raised p-4 sm:p-5">
              <h3 className="font-semibold text-ink text-sm sm:text-base">
                Dates & Adjustment Rules
              </h3>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="start-date-input"
                    className="block text-xs font-medium text-ink mb-1"
                  >
                    Start Date
                  </label>
                  <input
                    id="start-date-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-border bg-surface text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="end-date-input"
                    className="block text-xs font-medium text-ink mb-1"
                  >
                    End Date
                  </label>
                  <input
                    id="end-date-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-border bg-surface text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Activity adjustments */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Adjusted Activities
                  </label>
                  {selectedPresetId === 'custom' && (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Add activity</span>
                    </button>
                  )}
                </div>

                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-border bg-surface space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <select
                        aria-label={`Activity for item ${index + 1}`}
                        value={item.field}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            field: e.target.value as DeviationField,
                          })
                        }
                        className="flex-1 px-2.5 py-1.5 min-h-[40px] rounded-lg border border-border bg-surface-raised text-ink text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {Object.entries(FIELD_LABELS).map(([fieldKey, label]) => (
                          <option key={fieldKey} value={fieldKey}>
                            {label}
                          </option>
                        ))}
                      </select>

                      {items.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove adjustment ${index + 1}`}
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-ink-muted hover:text-rose-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor={`mode-select-${index}`}
                          className="block text-[11px] text-ink-muted mb-0.5"
                        >
                          Type
                        </label>
                        <select
                          id={`mode-select-${index}`}
                          value={item.mode}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              mode: e.target.value as DeviationMode,
                            })
                          }
                          className="w-full px-2.5 py-1.5 min-h-[40px] rounded-lg border border-border bg-surface-raised text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <option value="delta">Delta (+ / - relative)</option>
                          <option value="override">Override (= exact value)</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`value-input-${index}`}
                          className="block text-[11px] text-ink-muted mb-0.5"
                        >
                          {item.mode === 'delta' ? 'Delta Value' : 'Exact Value'}
                        </label>
                        <input
                          id={`value-input-${index}`}
                          type="number"
                          step="any"
                          value={item.value}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              value: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2.5 py-1.5 min-h-[40px] rounded-lg border border-border bg-surface-raised text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note Input */}
              <div className="pt-2">
                <label
                  htmlFor="note-input"
                  className="block text-xs font-medium text-ink mb-1"
                >
                  Note (Optional)
                </label>
                <input
                  id="note-input"
                  type="text"
                  maxLength={200}
                  placeholder="e.g., Summer heatwave, weekend visitors"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Impact Preview & Submit */}
            <div className="space-y-4">
              <ImpactPreview
                baseline={baseline}
                factors={factors}
                deviations={previewDeviations}
                startDate={startDate}
                endDate={endDate}
              />

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] font-semibold text-sm rounded-xl bg-primary text-on-primary hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{isSubmitting ? 'Saving...' : 'Log Change'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
