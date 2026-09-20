import React, { useState } from 'react';
import { useTeams } from '@/hooks/useTeams.ts';
import { useBaseline } from '@/hooks/useBaseline.ts';
import { TeamCard } from '@/components/teams/TeamCard.tsx';
import { CreateTeamModal } from '@/components/teams/CreateTeamModal.tsx';
import { JoinTeamModal } from '@/components/teams/JoinTeamModal.tsx';
import { calculateProfile } from '@/engine';
import { Users, Plus, Key, Shield } from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const { teams, isLoading, error, createTeam, joinTeam } = useTeams();
  const { currentBaseline, currentFactors } = useBaseline();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const baselineFootprint =
    currentBaseline && currentFactors
      ? calculateProfile(currentBaseline, currentFactors)
      : null;

  const baselineWaterLDay = baselineFootprint ? baselineFootprint.water.typical : 0;
  const baselineEnergyKwhDay = baselineFootprint ? baselineFootprint.energy.typical : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              Privacy-First Teams
            </h1>
          </div>
          <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
            Track collective resource savings with friends or household members without sacrificing privacy. Your baseline parameters and personal details are never shared.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsJoinOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-border bg-surface-raised text-ink hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
          >
            <Key className="w-4 h-4 text-primary" />
            <span>Join Team</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        </div>
      </div>

      {/* Privacy Callout Banner */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-xs sm:text-sm text-ink flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="font-bold text-ink">Strict Privacy Commitments</h2>
          <p className="text-ink-muted leading-relaxed">
            Direct access to raw team data is strictly blocked at the database level. Sharing is always optional, and leaderboard features enforce a $k = 3$ minimum sharing threshold before individual ranks are shown.
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-sm text-error">
          {error}
        </div>
      )}

      {/* Loading & Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <p className="text-sm text-ink-muted animate-pulse">Loading your teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 px-4 bg-surface-raised border border-border rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-ink">No Teams Yet</h2>
            <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto">
              Join an existing team with a 10-character code or create your own team to start tracking shared footprint reductions.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsJoinOpen(true)}
              className="px-4 py-2 text-xs font-semibold border border-border rounded-lg text-ink hover:bg-surface-subtle min-h-[44px]"
            >
              Join with Code
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover min-h-[44px]"
            >
              Create New Team
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateTeamModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        referenceProfile={currentBaseline}
        baselineWaterLDay={baselineWaterLDay}
        baselineEnergyKwhDay={baselineEnergyKwhDay}
        onSubmit={async (input) => {
          const res = await createTeam(input);
          return res;
        }}
      />

      <JoinTeamModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        referenceProfile={currentBaseline}
        baselineWaterLDay={baselineWaterLDay}
        baselineEnergyKwhDay={baselineEnergyKwhDay}
        onSubmit={async (input) => {
          const res = await joinTeam(input);
          return res;
        }}
      />
    </div>
  );
};

export default TeamsPage;
