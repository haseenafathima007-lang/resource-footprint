import { useMemo } from 'react';
import type { BaselineProfile } from '@/types/profile.ts';
import type { FactorSetPayload } from '@/types/factor.ts';
import { suggest, type Suggestion } from '@/engine';

export function useSuggestions(
  baseline: BaselineProfile | null,
  factors: FactorSetPayload | null,
  limit: number = 3
): { suggestions: Suggestion[]; topOpportunity: Suggestion | null } {
  return useMemo(() => {
    if (!baseline || !factors) {
      return { suggestions: [], topOpportunity: null };
    }

    try {
      const allSuggestions = suggest(baseline, factors, undefined, { limit });
      const topOpportunity = allSuggestions.length > 0 ? allSuggestions[0] : null;
      return {
        suggestions: allSuggestions,
        topOpportunity,
      };
    } catch {
      return { suggestions: [], topOpportunity: null };
    }
  }, [baseline, factors, limit]);
}
