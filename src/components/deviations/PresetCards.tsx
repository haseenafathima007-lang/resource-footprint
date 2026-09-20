import React from 'react';
import { Sun, Users, Plane, Laptop, Sliders } from 'lucide-react';
import type { DeviationField, DeviationMode } from '@/types/deviation.ts';

export interface PresetItem {
  field: DeviationField;
  mode: DeviationMode;
  value: number;
}

export interface PresetOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  defaultNote: string;
  items: PresetItem[];
}

export const PRESET_OPTIONS: PresetOption[] = [
  {
    id: 'heatwave',
    title: 'Summer heatwave',
    description: 'Running air conditioning more often during hot weather (+3 hrs/day AC).',
    icon: Sun,
    defaultNote: 'Summer heatwave',
    items: [{ field: 'acHoursPerDay', mode: 'delta', value: 3 }],
  },
  {
    id: 'guests',
    title: 'House guests',
    description: 'Hosting visitors with additional showers (+15 min/day) and laundry (+2 loads/wk).',
    icon: Users,
    defaultNote: 'House guests',
    items: [
      { field: 'showerMinutesPerDay', mode: 'delta', value: 15 },
      { field: 'laundryLoadsPerWeek', mode: 'delta', value: 2 },
    ],
  },
  {
    id: 'away',
    title: 'Away / Vacation',
    description: 'Out of town with zero home shower, AC, fan, laptop, or laundry usage.',
    icon: Plane,
    defaultNote: 'Away on vacation',
    items: [
      { field: 'showerMinutesPerDay', mode: 'override', value: 0 },
      { field: 'acHoursPerDay', mode: 'override', value: 0 },
      { field: 'fanHoursPerDay', mode: 'override', value: 0 },
      { field: 'laptopHoursPerDay', mode: 'override', value: 0 },
      { field: 'laundryLoadsPerWeek', mode: 'override', value: 0 },
    ],
  },
  {
    id: 'wfh',
    title: 'WFH / Sick day',
    description: 'Extra daytime laptop usage (+4 hrs/day) and fan runtime (+4 hrs/day).',
    icon: Laptop,
    defaultNote: 'Work from home / Sick leave',
    items: [
      { field: 'laptopHoursPerDay', mode: 'delta', value: 4 },
      { field: 'fanHoursPerDay', mode: 'delta', value: 4 },
    ],
  },
  {
    id: 'custom',
    title: 'Custom adjustment',
    description: 'Specify an exact change or temporary override for any activity.',
    icon: Sliders,
    defaultNote: '',
    items: [{ field: 'acHoursPerDay', mode: 'delta', value: 2 }],
  },
];

interface PresetCardsProps {
  selectedPresetId: string | null;
  onSelectPreset: (preset: PresetOption) => void;
}

export const PresetCards: React.FC<PresetCardsProps> = ({
  selectedPresetId,
  onSelectPreset,
}) => {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
      role="radiogroup"
      aria-label="Preset options"
    >
      {PRESET_OPTIONS.map((preset) => {
        const Icon = preset.icon;
        const isSelected = selectedPresetId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectPreset(preset)}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all min-h-[110px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                : 'border-border bg-surface-raised hover:border-border-strong hover:bg-surface-subtle'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className={`p-2 rounded-lg flex items-center justify-center ${
                  isSelected
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-subtle text-ink-muted'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="font-semibold text-ink text-sm sm:text-base">
                {preset.title}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {preset.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
