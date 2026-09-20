import React from 'react';
import type { TeamMember } from '@/services/types.ts';
import { Shield, ShieldAlert, Trash2 } from 'lucide-react';

interface TeamMembersListProps {
  members: TeamMember[];
  currentUserIdRole?: { isOwner: boolean; currentMemberId?: string };
  onRemoveMember?: (memberId: string) => void;
}

export const TeamMembersList: React.FC<TeamMembersListProps> = ({
  members,
  currentUserIdRole,
  onRemoveMember,
}) => {
  return (
    <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-bold text-base text-ink">
          Team Members ({members.length})
        </h3>
        <span className="text-xs text-ink-muted">Privacy First (No emails/handles)</span>
      </div>

      <div className="divide-y divide-border/60">
        {members.map((m) => (
          <div key={m.memberId} className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {m.alias.substring(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{m.alias}</span>
                  {m.role === 'owner' && (
                    <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-primary/10 text-primary border border-primary/20">
                      Owner
                    </span>
                  )}
                  {m.memberId === currentUserIdRole?.currentMemberId && (
                    <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-surface-subtle text-ink-muted border border-border">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-ink-muted mt-0.5">
                  {m.sharing ? (
                    <span className="flex items-center gap-1 text-success">
                      <Shield className="w-3 h-3" /> Data Sharing Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-ink-muted">
                      <ShieldAlert className="w-3 h-3 text-warning" /> Sharing Off
                    </span>
                  )}
                </div>
              </div>
            </div>

            {currentUserIdRole?.isOwner && m.role !== 'owner' && m.memberId !== currentUserIdRole?.currentMemberId && onRemoveMember && (
              <button
                type="button"
                onClick={() => onRemoveMember(m.memberId)}
                aria-label={`Remove ${m.alias}`}
                className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
