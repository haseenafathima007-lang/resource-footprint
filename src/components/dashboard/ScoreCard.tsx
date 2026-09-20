import React, { useState } from 'react';
import type { ScoreDetails } from '@/lib/dashboardModel.ts';
import { Award, ChevronDown, ChevronUp, HelpCircle, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface ScoreCardProps {
  score: ScoreDetails;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ score }) => {
  const [disclosureOpen, setDisclosureOpen] = useState(false);

  // Band visuals
  let bandBadgeColor = 'bg-negative/10 text-negative border-negative/20';
  let BandIcon = AlertTriangle;

  if (score.band === 'great') {
    bandBadgeColor = 'bg-positive/10 text-positive border-positive/20';
    BandIcon = CheckCircle2;
  } else if (score.band === 'getting-there') {
    bandBadgeColor = 'bg-energy/10 text-energy border-energy/20';
    BandIcon = TrendingUp;
  }

  return (
    <div className="p-5 rounded-2xl border border-border bg-surface-raised shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Award className="w-4 h-4" aria-hidden="true" />
            Sustainability Score
          </span>
          <span className="text-xs text-ink-muted">Daily benchmark</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-ink tracking-tight">
              {Math.round(score.overall)}
            </span>
            <span className="text-sm font-semibold text-ink-muted">/ 100</span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${bandBadgeColor}`}
          >
            <BandIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{score.bandLabel}</span>
          </div>
        </div>

        {/* Subscore breakdown progress bars */}
        <div className="mt-4 space-y-2.5">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-ink-muted font-medium">Water subscore</span>
              <span className="text-ink font-semibold">{Math.round(score.waterScore)} / 100</span>
            </div>
            <div className="w-full h-1.5 bg-surface-subtle border border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-water transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, score.waterScore))}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-ink-muted font-medium">Energy subscore</span>
              <span className="text-ink font-semibold">{Math.round(score.energyScore)} / 100</span>
            </div>
            <div className="w-full h-1.5 bg-surface-subtle border border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-energy transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, score.energyScore))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* "How is this calculated?" Disclosure */}
      <div className="mt-5 pt-3 border-t border-border">
        <button
          type="button"
          onClick={() => setDisclosureOpen(!disclosureOpen)}
          aria-expanded={disclosureOpen}
          aria-controls="score-calculation-details"
          className="w-full flex items-center justify-between text-xs font-medium text-ink-muted hover:text-ink transition-colors min-h-[44px]"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>How is this calculated?</span>
          </span>
          {disclosureOpen ? (
            <ChevronUp className="w-4 h-4 text-ink-muted" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink-muted" aria-hidden="true" />
          )}
        </button>

        {disclosureOpen && (
          <div
            id="score-calculation-details"
            className="mt-2 p-3 bg-surface-subtle border border-border rounded-xl text-xs text-ink-muted space-y-1.5"
          >
            <p className="text-ink font-medium">Plain-English Scoring Formula:</p>
            <p>
              Your actual daily consumption is compared against standard urban reference benchmarks:
              <strong className="text-ink"> {score.referenceWater} L/day</strong> for water and
              <strong className="text-ink"> {score.referenceEnergy} kWh/day</strong> for energy.
            </p>
            <p>
              A consumption ratio of 0.5 (or lower) receives 100 points, 1.0 receives 50 points, and 1.5 (or higher) receives 0 points.
              Your overall sustainability score is the equal unweighted average of both resource scores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
