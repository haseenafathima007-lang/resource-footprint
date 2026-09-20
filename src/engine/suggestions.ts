import type {
  BaselineProfile,
  Factor,
  FactorSetPayload,
  FactorsMap,
  ActivityResult,
} from './types.ts';
import { EngineError, PROFILE_BOUNDS } from './validation.ts';
import { toFactorsMap } from './factors.ts';
import { compareProfiles } from './profile.ts';
import { scaleToPeriod } from './periods.ts';
import bundledSuggestions from '../data/suggestions.v1.json';

export type SuggestionActivity = 'shower' | 'cooling' | 'laundry';
export type SuggestionKind = 'habit' | 'equipment';

export interface BaseSuggestionRule {
  id: string;
  activity: SuggestionActivity;
  kind: SuggestionKind;
  title?: string;
  description?: string;
}

export interface HabitSuggestionRule extends BaseSuggestionRule {
  kind: 'habit';
  field: 'showerMinutesPerDay' | 'acHoursPerDay' | 'fanHoursPerDay' | 'laptopHoursPerDay' | 'laundryLoadsPerWeek';
  step: number;
  floor: number;
}

export interface EquipmentSuggestionRule extends BaseSuggestionRule {
  kind: 'equipment';
  field: 'laundryMachine';
  targetValue: 'frontLoad';
  currentValue: 'topLoad';
}

export type SuggestionRule = HabitSuggestionRule | EquipmentSuggestionRule;

export interface SuggestionFilePayload {
  version: string;
  minImpact?: number;
  rules: SuggestionRule[];
}

export interface SuggestionPeriodSavings {
  day: ActivityResult;
  week: ActivityResult;
  month: ActivityResult;
  year: ActivityResult;
}

export interface Suggestion {
  ruleId: string;
  activity: SuggestionActivity;
  kind: SuggestionKind;
  field: string;
  from: number | string;
  to: number | string;
  savings: SuggestionPeriodSavings;
  impact: number;
  title?: string;
  description?: string;
}

export interface SuggestOptions {
  limit?: number;
}

const VALID_ACTIVITIES: SuggestionActivity[] = ['shower', 'cooling', 'laundry'];
const VALID_HABIT_FIELDS = [
  'showerMinutesPerDay',
  'acHoursPerDay',
  'fanHoursPerDay',
  'laptopHoursPerDay',
  'laundryLoadsPerWeek',
] as const;

/**
 * Validates a suggestions JSON file payload.
 * Throws EngineError if any rule or field is invalid.
 */
export function validateSuggestionRules(payload: unknown): SuggestionFilePayload {
  if (!payload || typeof payload !== 'object') {
    throw new EngineError('Invalid suggestions payload: must be an object', 'INVALID_INPUT');
  }

  const p = payload as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof p.version !== 'string' || !p.version.trim()) {
    errors.push('Missing or invalid "version"');
  }

  if (p.minImpact !== undefined && (typeof p.minImpact !== 'number' || !Number.isFinite(p.minImpact) || p.minImpact < 0)) {
    errors.push('minImpact must be a non-negative finite number');
  }

  if (!Array.isArray(p.rules)) {
    errors.push('"rules" must be an array');
    throw new EngineError(`Invalid suggestions file: ${errors.join(', ')}`, 'INVALID_INPUT');
  }

  const seenIds = new Set<string>();

  for (let i = 0; i < p.rules.length; i++) {
    const r = p.rules[i] as Record<string, unknown>;
    const prefix = `Rule #${i + 1}`;

    if (!r || typeof r !== 'object') {
      errors.push(`${prefix} is not an object`);
      continue;
    }

    if (typeof r.id !== 'string' || !r.id.trim()) {
      errors.push(`${prefix} missing "id"`);
    } else if (seenIds.has(r.id)) {
      errors.push(`${prefix} duplicate id "${r.id}"`);
    } else {
      seenIds.add(r.id);
    }

    if (!VALID_ACTIVITIES.includes(r.activity as SuggestionActivity)) {
      errors.push(`${prefix} invalid activity "${String(r.activity)}"`);
    }

    if (r.kind === 'habit') {
      if (!VALID_HABIT_FIELDS.includes(r.field as typeof VALID_HABIT_FIELDS[number])) {
        errors.push(`${prefix} invalid habit field "${String(r.field)}"`);
      } else {
        const bounds = PROFILE_BOUNDS[r.field as typeof VALID_HABIT_FIELDS[number]];
        if (typeof r.step !== 'number' || !Number.isFinite(r.step) || r.step <= 0) {
          errors.push(`${prefix} step must be a positive number`);
        }
        if (typeof r.floor !== 'number' || !Number.isFinite(r.floor) || r.floor < bounds.min || r.floor > bounds.max) {
          errors.push(`${prefix} floor must be between ${bounds.min} and ${bounds.max}`);
        }
      }
    } else if (r.kind === 'equipment') {
      if (r.field !== 'laundryMachine') {
        errors.push(`${prefix} invalid equipment field "${String(r.field)}"`);
      }
      if (r.currentValue !== 'topLoad' || r.targetValue !== 'frontLoad') {
        errors.push(`${prefix} invalid equipment values for laundryMachine`);
      }
    } else {
      errors.push(`${prefix} invalid kind "${String(r.kind)}"`);
    }
  }

  if (errors.length > 0) {
    throw new EngineError(`Suggestions validation failed: ${errors.join('; ')}`, 'INVALID_INPUT');
  }

  return payload as SuggestionFilePayload;
}

/**
 * Generates ranked, diverse suggestions for a given baseline profile.
 * - Filters by minImpact
 * - Applies diversity rule: at most 1 suggestion per activity (highest impact)
 * - Returns at most `limit` suggestions (default 3)
 */
export function suggest(
  profile: BaselineProfile,
  factorsInput: FactorsMap | FactorSetPayload | Factor[],
  rulesInput: unknown = bundledSuggestions,
  options: SuggestOptions = {}
): Suggestion[] {
  const limit = options.limit ?? 3;
  const factors = toFactorsMap(factorsInput);

  let rules: SuggestionRule[];
  let minImpact = 0.01;

  if (Array.isArray(rulesInput)) {
    rules = rulesInput;
  } else {
    const validated = validateSuggestionRules(rulesInput);
    rules = validated.rules;
    if (validated.minImpact !== undefined) {
      minImpact = validated.minImpact;
    }
  }

  const refWaterFactor = factors['reference.household.water'];
  const refEnergyFactor = factors['reference.household.energy'];

  if (!refWaterFactor || !refEnergyFactor || refWaterFactor.typical <= 0 || refEnergyFactor.typical <= 0) {
    throw new EngineError('Reference factors missing or invalid in factors map', 'MISSING_FACTOR');
  }

  const refWater = refWaterFactor.typical;
  const refEnergy = refEnergyFactor.typical;

  const candidateSuggestions: Suggestion[] = [];

  for (const rule of rules) {
    let proposedProfile: BaselineProfile | null = null;
    let fromVal: number | string = 0;
    let toVal: number | string = 0;

    if (rule.kind === 'habit') {
      const currentVal = profile[rule.field];
      const targetVal = Math.max(rule.floor, currentVal - rule.step);
      if (targetVal === currentVal) {
        // Already at or below floor
        continue;
      }
      fromVal = currentVal;
      toVal = targetVal;
      proposedProfile = {
        ...profile,
        [rule.field]: targetVal,
      };
    } else if (rule.kind === 'equipment') {
      const currentVal = profile[rule.field];
      if (currentVal !== rule.currentValue) {
        // Equipment condition does not match
        continue;
      }
      fromVal = currentVal;
      toVal = rule.targetValue;
      proposedProfile = {
        ...profile,
        [rule.field]: rule.targetValue,
      };
    }

    if (!proposedProfile) continue;

    // Compute savings: before - after
    const dailySavings = compareProfiles(profile, proposedProfile, factors);

    // Compute impact: (daily.water.typical / refWater) + (daily.energy.typical / refEnergy)
    const impact = (dailySavings.water.typical / refWater) + (dailySavings.energy.typical / refEnergy);

    if (impact < minImpact) {
      // Below impact threshold
      continue;
    }

    const weekSavings = scaleToPeriod(dailySavings, 'week');
    const monthSavings = scaleToPeriod(dailySavings, 'month');
    const yearSavings = scaleToPeriod(dailySavings, 'year');

    candidateSuggestions.push({
      ruleId: rule.id,
      activity: rule.activity,
      kind: rule.kind,
      field: rule.field,
      from: fromVal,
      to: toVal,
      savings: {
        day: dailySavings,
        week: weekSavings,
        month: monthSavings,
        year: yearSavings,
      },
      impact,
      title: rule.title,
      description: rule.description,
    });
  }

  // Sort candidate suggestions by impact descending, tie-break by ruleId ascending
  candidateSuggestions.sort((a, b) => b.impact - a.impact || a.ruleId.localeCompare(b.ruleId));

  // Diversity rule: at most 1 suggestion per activity
  const selectedByActivity = new Map<SuggestionActivity, Suggestion>();
  const diverseSuggestions: Suggestion[] = [];

  for (const s of candidateSuggestions) {
    if (!selectedByActivity.has(s.activity)) {
      selectedByActivity.set(s.activity, s);
      diverseSuggestions.push(s);
      if (diverseSuggestions.length >= limit) {
        break;
      }
    }
  }

  return diverseSuggestions;
}

/**
 * Computes coverage ratio of a suggestion relative to a goal target amount.
 * Returns raw ratio (e.g. 0.63 for 63%, may exceed 1).
 */
export function coverageOfGoal(
  suggestion: Suggestion,
  goal: {
    resource: 'water' | 'energy';
    period: 'week' | 'month';
    targetAmount: number;
  }
): number {
  if (goal.targetAmount <= 0) return 0;
  const savingsForPeriod = suggestion.savings[goal.period][goal.resource].typical;
  return savingsForPeriod / goal.targetAmount;
}
