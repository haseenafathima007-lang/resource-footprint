import React, { useState } from 'react';
import { Calendar, Trash2, AlertTriangle, X } from 'lucide-react';
import type { Deviation, DeviationField } from '@/types/deviation.ts';

interface DeviationListProps {
  deviations: Deviation[];
  onDeleteGroup: (groupId: string) => Promise<void>;
  onDeleteSingle: (id: string) => Promise<void>;
}

const FIELD_SHORT_LABELS: Record<DeviationField, string> = {
  showerMinutesPerDay: 'Shower',
  acHoursPerDay: 'AC',
  fanHoursPerDay: 'Fan',
  laptopHoursPerDay: 'Laptop',
  laundryLoadsPerWeek: 'Laundry',
};

const FIELD_UNITS: Record<DeviationField, string> = {
  showerMinutesPerDay: 'min/day',
  acHoursPerDay: 'hrs/day',
  fanHoursPerDay: 'hrs/day',
  laptopHoursPerDay: 'hrs/day',
  laundryLoadsPerWeek: 'loads/wk',
};

interface DeviationGroup {
  groupId: string;
  startDate: string;
  endDate: string;
  note?: string | null;
  createdAt?: string;
  items: Deviation[];
}

export const DeviationList: React.FC<DeviationListProps> = ({
  deviations,
  onDeleteGroup,
  onDeleteSingle,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<DeviationGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group deviations by groupId or by unique id
  const groupedList = React.useMemo(() => {
    const groupMap = new Map<string, DeviationGroup>();

    for (const dev of deviations) {
      const key = dev.groupId || dev.id;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          groupId: key,
          startDate: dev.startDate,
          endDate: dev.endDate,
          note: dev.note,
          createdAt: dev.createdAt,
          items: [dev],
        });
      } else {
        const group = groupMap.get(key)!;
        group.items.push(dev);
        if (!group.note && dev.note) group.note = dev.note;
      }
    }

    return Array.from(groupMap.values()).sort(
      (a, b) => b.startDate.localeCompare(a.startDate) || (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }, [deviations]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.items.length === 1 && deleteTarget.items[0].id === deleteTarget.groupId) {
        await onDeleteSingle(deleteTarget.items[0].id);
      } else {
        await onDeleteGroup(deleteTarget.groupId);
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (groupedList.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-border bg-surface-raised text-center">
        <Calendar className="w-8 h-8 text-ink-muted mx-auto mb-2 opacity-60" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-ink">No Logged Changes</h3>
        <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
          You have not logged any temporary activity changes yet. Use the form above to log vacations, heatwaves, or house guests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupedList.map((group) => (
        <div
          key={group.groupId}
          className="p-4 rounded-xl border border-border bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-strong transition-colors"
        >
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink text-sm">
                {group.startDate === group.endDate
                  ? group.startDate
                  : `${group.startDate} to ${group.endDate}`}
              </span>
              {group.note && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-ink-muted">
                  {group.note}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {group.items.map((item) => {
                const label = FIELD_SHORT_LABELS[item.field] || item.field;
                const unit = FIELD_UNITS[item.field] || '';
                const sign = item.mode === 'delta' && item.value > 0 ? '+' : '';
                const displayVal = item.mode === 'override' ? `= ${item.value}` : `${sign}${item.value}`;
                return (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
                  >
                    <span>{label}:</span>
                    <span>{displayVal} {unit}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              aria-label={`Delete change for ${group.startDate}`}
              onClick={() => setDeleteTarget(group)}
              className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-ink-muted hover:text-rose-600 hover:bg-surface-subtle rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}

      {/* Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-surface-raised border border-border rounded-xl max-w-md w-full p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 id="delete-dialog-title" className="font-semibold text-ink text-base">
                  Delete Logged Change?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close dialog"
                className="p-1 text-ink-muted hover:text-ink rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-ink-muted">
              Are you sure you want to delete the logged change for{' '}
              <strong className="text-ink">
                {deleteTarget.startDate === deleteTarget.endDate
                  ? deleteTarget.startDate
                  : `${deleteTarget.startDate} to ${deleteTarget.endDate}`}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 min-h-[44px] text-xs font-semibold text-ink hover:bg-surface-subtle rounded-lg border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 min-h-[44px] text-xs font-semibold text-on-primary bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
