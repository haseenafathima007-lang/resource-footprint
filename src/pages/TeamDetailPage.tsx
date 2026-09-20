import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTeam } from '@/hooks/useTeam.ts';
import { useTeamSync } from '@/hooks/useTeamSync.ts';
import { useBaseline } from '@/hooks/useBaseline.ts';
import { useDeviations } from '@/hooks/useDeviations.ts';
import { TeamMembersList } from '@/components/teams/TeamMembersList.tsx';
import { LeaderboardTable } from '@/components/teams/LeaderboardTable.tsx';
import { OwnerToolsModal } from '@/components/teams/OwnerToolsModal.tsx';
import { ConsentDialog } from '@/components/teams/ConsentDialog.tsx';
import { formatNumber, formatPercent } from '@/lib/format.ts';
import {
  Users,
  Shield,
  ShieldAlert,
  Settings,
  ChevronLeft,
  Droplets,
  Zap,
  LogOut,
} from 'lucide-react';

export const TeamDetailPage: React.FC = () => {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const {
    team,
    summary,
    members,
    leaderboard,
    isLoading,
    error,
    reload,
    updateMembership,
    updateSettings,
    rotateCode,
    removeMember,
    leaveTeam,
    deleteTeam,
  } = useTeam(teamId);

  const { currentBaseline, history } = useBaseline();
  const { deviations } = useDeviations();

  const [isOwnerToolsOpen, setIsOwnerToolsOpen] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [isUpdatingSharing, setIsUpdatingSharing] = useState(false);
  const [aliasInput, setAliasInput] = useState<string | null>(null);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Synchronize contributions in background
  useTeamSync({
    teamId,
    sharing: team?.sharing ?? false,
    snapshot: currentBaseline,
    history,
    deviations,
    onSyncComplete: reload,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-ink-muted animate-pulse">Loading team details...</p>
      </div>
    );
  }

  if (error || !summary || !team) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
        <Link
          to="/teams"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Teams
        </Link>
        <div className="p-6 bg-surface-raised border border-border rounded-xl text-center space-y-3">
          <h1 className="text-lg font-bold text-ink">Team Not Found</h1>
          <p className="text-xs text-ink-muted">{error || 'Unable to access team details.'}</p>
        </div>
      </div>
    );
  }

  const isOwner = team.role === 'owner';
  const currentAlias = aliasInput !== null ? aliasInput : team.alias;

  const handleToggleSharingClick = () => {
    if (!team.sharing) {
      setIsConsentOpen(true);
    } else {
      handleConfirmSharingChange(false);
    }
  };

  const handleConfirmSharingChange = async (targetState: boolean) => {
    setIsUpdatingSharing(true);
    setActionError(null);
    const res = await updateMembership(currentAlias, targetState);
    setIsUpdatingSharing(false);
    setIsConsentOpen(false);

    if (!res.ok) {
      setActionError(res.error?.message || 'Failed to update sharing state');
    }
  };

  const handleSaveAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingAlias) return;

    setIsUpdatingSharing(true);
    setActionError(null);
    const res = await updateMembership(currentAlias, team.sharing);
    setIsUpdatingSharing(false);
    setIsEditingAlias(false);

    if (!res.ok) {
      setActionError(res.error?.message || 'Failed to update alias');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    setActionError(null);
    const res = await leaveTeam();
    if (res.ok) {
      navigate('/teams');
    } else {
      setActionError(res.error?.message || 'Failed to leave team');
    }
  };

  const hasTarget = summary.targetResource && summary.targetAmount && summary.targetAmount > 0;
  const targetProgress = summary.targetProgress !== null ? summary.targetProgress : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Header Breadcrumb & Actions */}
      <div className="space-y-4">
        <Link
          to="/teams"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4 text-primary" /> Back to Teams List
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                {team.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                  isOwner
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-surface-subtle text-ink-muted border border-border'
                }`}
              >
                {isOwner ? 'Owner' : 'Member'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsOwnerToolsOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                <Settings className="w-4 h-4" />
                <span>Owner Tools</span>
              </button>
            )}

            {!isOwner && (
              <button
                type="button"
                onClick={handleLeave}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg border border-border bg-surface-raised text-error hover:bg-error/10 transition-colors min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Team</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-xs text-error">
          {actionError}
        </div>
      )}

      {/* Aggregate Team Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Members & Privacy Card */}
        <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Sharing Members</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink">
              {summary.sharingCount} <span className="text-sm font-normal text-ink-muted">/ {summary.memberCount}</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Active sharing members.
            </p>
          </div>
        </div>

        {/* 30-Day Water Savings Card */}
        <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">30d Water Savings</span>
            <Droplets className="w-4 h-4 text-water" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-water">
              {formatNumber(summary.totalWaterSavedL || 0)}{' '}
              <span className="text-sm font-normal text-ink-muted">Liters</span>
            </div>
            {hasTarget && summary.targetResource === 'water' ? (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-ink-muted">
                  <span>Target: {formatNumber(summary.targetAmount || 0)} L</span>
                  <span>{formatPercent(targetProgress)}</span>
                </div>
                <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-water transition-all"
                    style={{ width: `${Math.min(100, targetProgress * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted mt-1">No target set for water.</p>
            )}
          </div>
        </div>

        {/* 30-Day Energy Savings Card */}
        <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">30d Energy Savings</span>
            <Zap className="w-4 h-4 text-energy" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-energy">
              {formatNumber(summary.totalEnergySavedKwh || 0)}{' '}
              <span className="text-sm font-normal text-ink-muted">kWh</span>
            </div>
            {hasTarget && summary.targetResource === 'energy' ? (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-ink-muted">
                  <span>Target: {formatNumber(summary.targetAmount || 0)} kWh</span>
                  <span>{formatPercent(targetProgress)}</span>
                </div>
                <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-energy transition-all"
                    style={{ width: `${Math.min(100, targetProgress * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted mt-1">No target set for energy.</p>
            )}
          </div>
        </div>
      </div>

      {/* Your Membership & Settings Controls */}
      <div className="bg-surface-raised border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-bold text-base text-ink">Your Team Settings & Participation</h2>
          <span className="text-xs text-ink-muted">Control your data flow</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Display Alias Settings */}
          <form onSubmit={handleSaveAlias} className="space-y-2">
            <label htmlFor="user-alias" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Your Display Alias
            </label>
            <div className="flex items-center gap-2">
              <input
                id="user-alias"
                type="text"
                disabled={!isEditingAlias}
                value={currentAlias}
                onChange={(e) => setAliasInput(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-75 min-h-[44px]"
              />
              {!isEditingAlias ? (
                <button
                  type="button"
                  onClick={() => setIsEditingAlias(true)}
                  className="px-3 py-2 text-xs font-semibold border border-border rounded-lg text-ink hover:bg-surface-subtle min-h-[44px]"
                >
                  Edit
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isUpdatingSharing}
                  className="px-3 py-2 text-xs font-semibold bg-primary text-on-primary rounded-lg hover:bg-primary-hover min-h-[44px]"
                >
                  Save
                </button>
              )}
            </div>
            <p className="text-[11px] text-ink-muted">
              This alias is displayed to team members. No email addresses or handles are ever exposed.
            </p>
          </form>

          {/* Data Sharing Opt-In Switch */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Data Sharing Status
            </label>
            <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
              <div className="flex items-center gap-2.5">
                {team.sharing ? (
                  <Shield className="w-5 h-5 text-success" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-warning" />
                )}
                <div>
                  <div className="text-xs font-bold text-ink">
                    {team.sharing ? 'Data Sharing Enabled' : 'Data Sharing Disabled'}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {team.sharing ? 'Your daily savings count toward team totals' : 'Not contributing to team totals'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSharingClick}
                disabled={isUpdatingSharing}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[44px] ${
                  team.sharing
                    ? 'bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20'
                    : 'bg-primary text-on-primary hover:bg-primary-hover'
                }`}
              >
                {team.sharing ? 'Disable Sharing' : 'Enable Sharing'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <LeaderboardTable
        entries={leaderboard}
        showLeaderboard={team.showLeaderboard}
        sharingMemberCount={summary.sharingCount}
      />

      {/* Team Members List */}
      <TeamMembersList
        members={members}
        currentUserIdRole={{ isOwner, currentMemberId: team.id }}
        onRemoveMember={async (memberId) => {
          if (!window.confirm('Remove this member from the team?')) return;
          setActionError(null);
          const res = await removeMember(memberId);
          if (!res.ok) {
            setActionError(res.error?.message || 'Failed to remove member');
          }
        }}
      />

      {/* Consent Dialog */}
      <ConsentDialog
        isOpen={isConsentOpen}
        teamName={team.name}
        isSubmitting={isUpdatingSharing}
        onCancel={() => setIsConsentOpen(false)}
        onConfirm={() => handleConfirmSharingChange(true)}
      />

      {/* Owner Tools Modal */}
      {isOwner && (
        <OwnerToolsModal
          isOpen={isOwnerToolsOpen}
          team={team}
          onClose={() => setIsOwnerToolsOpen(false)}
          onUpdateSettings={async (input) => {
            const res = await updateSettings(input);
            return res;
          }}
          onRotateCode={rotateCode}
          onDeleteTeam={async () => {
            const res = await deleteTeam();
            if (res.ok) {
              navigate('/teams');
            }
            return res;
          }}
        />
      )}
    </div>
  );
};

export default TeamDetailPage;
