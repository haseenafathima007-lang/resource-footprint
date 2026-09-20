import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type {
  BaselineProfile,
  Period,
  ActivityResult,
} from "@/engine";
import {
  calculateProfile,
  compareProfiles,
  scaleToPeriod,
  toFactorsMap,
  validateProfile,
} from "@/engine";
import type { ScenarioHabits } from "@/lib/summary.ts";
import { generateSummary } from "@/lib/summary.ts";
import { parseStateFromQuery, serializeStateToQuery } from "@/lib/urlState.ts";
import factorsData from "@/data/factors.v1.json";
import { baselineRepository } from "@/services/supabase/baselineRepository.ts";
import { useAuth } from "./useAuth.tsx";

export const DEFAULT_BASELINE: BaselineProfile = {
  effectiveFrom: "2026-01-01",
  factorsVersion: factorsData.version,
  householdSize: 1,
  showerMinutesPerDay: 10,
  showerHeater: "electric",
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
  laundryMachine: "topLoad",
};

export const DEFAULT_SCENARIO: ScenarioHabits = {
  showerMinutesPerDay: 10,
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
};

export function checkAnyFactorUnverified(
  factors: Array<{ verified?: boolean; [key: string]: unknown }>
): boolean {
  return factors.some((f) => f.verified !== true);
}

export function useSimulatorState() {
  const initialSearchHadParamsRef = useRef(
    typeof window !== "undefined" && window.location.search.length > 1
  );
  // Track whether user has explicitly changed anything in the session
  const hasUserInteractedRef = useRef(false);
  const { user } = useAuth();

  // Load factors once offline via engine loader
  const factors = useMemo(() => toFactorsMap(factorsData), []);

  // Derive unverified trust banner state directly from factors
  const isAnyFactorUnverified = useMemo(() => {
    return checkAnyFactorUnverified(factorsData.factors);
  }, []);

  // Parse initial state from URL search params if present
  const initialState = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        baseline: DEFAULT_BASELINE,
        scenario: DEFAULT_SCENARIO,
        period: "month" as Period,
      };
    }
    return parseStateFromQuery(window.location.search, DEFAULT_BASELINE);
  }, []);

  const [baseline, setBaseline] = useState<BaselineProfile>(initialState.baseline);
  const [scenario, setScenario] = useState<ScenarioHabits>(initialState.scenario);
  const [period, setPeriodState] = useState<Period>(initialState.period);
  const [baselineErrors, setBaselineErrors] = useState<Record<string, string>>({});
  const [scenarioErrors, setScenarioErrors] = useState<Record<string, string>>({});
  const [debouncedAriaAnnouncement, setDebouncedAriaAnnouncement] = useState<string>("");

  // Prefill baseline if user is signed in and has a baseline
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    async function loadUserBaseline() {
      try {
        const res = await baselineRepository.getCurrentBaseline();
        if (isMounted && res.ok && res.data) {
          const userBaseline = res.data;
          // Only update if URL did not have explicit parameters and user has not manually changed state
          if (!initialSearchHadParamsRef.current && !hasUserInteractedRef.current) {
            setBaseline(userBaseline);
            setScenario({
              showerMinutesPerDay: userBaseline.showerMinutesPerDay,
              acHoursPerDay: userBaseline.acHoursPerDay,
              fanHoursPerDay: userBaseline.fanHoursPerDay,
              laptopHoursPerDay: userBaseline.laptopHoursPerDay,
              laundryLoadsPerWeek: userBaseline.laundryLoadsPerWeek,
            });
          }
        }
      } catch {
        // Silently fall back to defaults per specification
      }
    }

    loadUserBaseline();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Sync state to URL search params ONLY after the user has changed something
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only write URL params if user changed something or initial URL already had params
    if (!hasUserInteractedRef.current && !initialSearchHadParamsRef.current) {
      return;
    }
    const query = serializeStateToQuery(baseline, scenario, period);
    const newUrl = query ? `?${query}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [baseline, scenario, period]);

  // Full scenario profile combined with baseline non-scenario levers
  const scenarioProfile: BaselineProfile = useMemo(() => {
    return {
      ...baseline,
      showerMinutesPerDay: scenario.showerMinutesPerDay,
      acHoursPerDay: scenario.acHoursPerDay,
      fanHoursPerDay: scenario.fanHoursPerDay,
      laptopHoursPerDay: scenario.laptopHoursPerDay,
      laundryLoadsPerWeek: scenario.laundryLoadsPerWeek,
    };
  }, [baseline, scenario]);

  // Calculations via pure engine functions
  const baselineResult: ActivityResult = useMemo(() => {
    return calculateProfile(baseline, factors);
  }, [baseline, factors]);

  const scenarioResult: ActivityResult = useMemo(() => {
    return calculateProfile(scenarioProfile, factors);
  }, [scenarioProfile, factors]);

  const comparisonResult: ActivityResult = useMemo(() => {
    return compareProfiles(baseline, scenarioProfile, factors);
  }, [baseline, scenarioProfile, factors]);

  // Scaled results by selected period
  const scaledBaseline = useMemo(() => scaleToPeriod(baselineResult, period), [baselineResult, period]);
  const scaledScenario = useMemo(() => scaleToPeriod(scenarioResult, period), [scenarioResult, period]);
  const scaledComparison = useMemo(() => scaleToPeriod(comparisonResult, period), [comparisonResult, period]);

  // Shareable summary sentence
  const summarySentence = useMemo(() => {
    return generateSummary(baseline, scenario, factors, period);
  }, [baseline, scenario, factors, period]);

  // Debounced announcement for screen readers (~500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAriaAnnouncement(summarySentence);
    }, 500);

    return () => clearTimeout(timer);
  }, [summarySentence]);

  // Baseline updater: StrictMode safe (setScenario moved out of setBaseline updater)
  const updateBaselineField = useCallback(
    <K extends keyof BaselineProfile>(field: K, val: BaselineProfile[K]) => {
      hasUserInteractedRef.current = true;
      const errorMap = validateProfile({ [field]: val });
      if (errorMap && errorMap[field]) {
        setBaselineErrors((prev) => ({ ...prev, [field]: errorMap[field] }));
        return;
      }

      setBaselineErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });

      setBaseline((prev) => ({ ...prev, [field]: val }));

      const sKey = field as keyof ScenarioHabits;
      // If scenario was matching this habit before, keep it in sync outside the state updater
      if (sKey in scenario && scenario[sKey] === baseline[sKey]) {
        setScenario((s) => ({ ...s, [sKey]: val as number }));
      }
    },
    [baseline, scenario]
  );

  // Scenario updater
  const updateScenarioField = useCallback((field: keyof ScenarioHabits, val: number) => {
    hasUserInteractedRef.current = true;
    const errorMap = validateProfile({ [field]: val });
    if (errorMap && errorMap[field]) {
      setScenarioErrors((prev) => ({ ...prev, [field]: errorMap[field] }));
      return;
    }

    setScenarioErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    setScenario((prev) => ({ ...prev, [field]: val }));
  }, []);

  // Reset scenario changes back to baseline
  const resetScenario = useCallback(() => {
    hasUserInteractedRef.current = true;
    setScenario({
      showerMinutesPerDay: baseline.showerMinutesPerDay,
      acHoursPerDay: baseline.acHoursPerDay,
      fanHoursPerDay: baseline.fanHoursPerDay,
      laptopHoursPerDay: baseline.laptopHoursPerDay,
      laundryLoadsPerWeek: baseline.laundryLoadsPerWeek,
    });
    setScenarioErrors({});
  }, [baseline]);

  // Period switcher
  const setPeriod = useCallback((p: Period) => {
    hasUserInteractedRef.current = true;
    setPeriodState(p);
  }, []);

  return {
    baseline,
    scenario,
    scenarioProfile,
    period,
    baselineErrors,
    scenarioErrors,
    isAnyFactorUnverified,
    scaledBaseline,
    scaledScenario,
    scaledComparison,
    summarySentence,
    debouncedAriaAnnouncement,
    updateBaselineField,
    updateScenarioField,
    resetScenario,
    setPeriod,
  };
}
