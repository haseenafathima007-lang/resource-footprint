import React from 'react';
import type { LeaderboardEntry } from '@/services/types.ts';
import { Award, ShieldAlert, Trophy } from 'lucide-react';
import { formatPercent } from '@/lib/format.ts';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  showLeaderboard: boolean;
  sharingMemberCount: number;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  showLeaderboard,
  sharingMemberCount,
}) => {
  if (!showLeaderboard) {
    return (
      <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm space-y-2">
        <h3 className="font-bold text-base text-ink flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Optional Leaderboard
        </h3>
        <p className="text-xs text-ink-muted leading-relaxed">
          Leaderboard is disabled by the team owner. Shared team totals remain aggregated and privacy-first.
        </p>
      </div>
    );
  }

  if (sharingMemberCount < 3 || entries.length === 0) {
    return (
      <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-base text-ink flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Optional Leaderboard
        </h3>
        <div className="p-3 bg-surface-subtle border border-border rounded-lg text-xs text-ink-muted flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-ink">k-Anonymity Protection Active ($k = 3$)</p>
            <p className="mt-0.5 text-ink-muted">
              Individual relative reductions are hidden until at least 3 active members opt into data sharing. Currently: <strong>{sharingMemberCount} sharing member{sharingMemberCount !== 1 ? 's' : ''}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-bold text-base text-ink flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" /> 30-Day Leaderboard
        </h3>
        <span className="text-xs text-ink-muted">Relative % Reduction</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-border text-ink-muted uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Rank</th>
              <th className="py-2.5 px-3">Member</th>
              <th className="py-2.5 px-3 text-right">30d Reduction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {entries.map((e) => (
              <tr
                key={e.rank + e.alias}
                className={`transition-colors ${
                  e.isMe ? 'bg-primary/5 font-semibold text-primary' : 'hover:bg-surface-subtle/50 text-ink'
                }`}
              >
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                      e.rank === 1
                        ? 'bg-warning/20 text-warning'
                        : e.rank === 2
                        ? 'bg-ink-muted/20 text-ink'
                        : e.rank === 3
                        ? 'bg-amber-700/20 text-amber-700 dark:text-amber-400'
                        : 'text-ink-muted'
                    }`}
                  >
                    #{e.rank}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span>{e.alias}</span>
                    {e.isMe && (
                      <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-primary/20 text-primary">
                        You
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">
                  {e.pctOverall <= 0 ? '0% or less' : formatPercent(e.pctOverall / 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
