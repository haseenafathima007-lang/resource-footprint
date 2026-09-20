import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, Award, ChevronRight } from 'lucide-react';
import type { MyTeam } from '@/services/types.ts';

interface TeamCardProps {
  team: MyTeam;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  return (
    <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base text-ink line-clamp-1">{team.name}</h3>
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full shrink-0 ${
              team.role === 'owner'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-surface-subtle text-ink-muted border border-border'
            }`}
          >
            {team.role === 'owner' ? 'Owner' : 'Member'}
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>
              {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Shield
              className={`w-3.5 h-3.5 ${team.sharing ? 'text-success' : 'text-ink-muted'}`}
            />
            <span className={team.sharing ? 'text-success font-medium' : ''}>
              {team.sharing ? 'Sharing Active' : 'Sharing Off'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="truncate">Alias: <strong>{team.alias}</strong></span>
          {team.showLeaderboard && (
            <span className="flex items-center gap-1 text-primary text-[11px] font-medium shrink-0">
              <Award className="w-3 h-3" /> Leaderboard
            </span>
          )}
        </div>

        <Link
          to={`/teams/${team.id}`}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-surface border border-border text-ink hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
        >
          <span>View Team</span>
          <ChevronRight className="w-3.5 h-3.5 text-primary" />
        </Link>
      </div>
    </div>
  );
};
