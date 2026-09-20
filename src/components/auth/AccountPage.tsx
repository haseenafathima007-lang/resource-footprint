import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { baselineRepository } from '../../services/supabase/baselineRepository.ts';
import type { BaselineProfile } from '../../types/profile.ts';

export function AccountPage() {
  const { user, profile, updateDisplayName, signOut } = useAuth();
  const [displayNameInput, setDisplayNameInput] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<BaselineProfile | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(true);

  const currentDisplayName = displayNameInput ?? (profile?.displayName ?? '');

  useEffect(() => {
    async function loadBaseline() {
      setLoadingBaseline(true);
      const res = await baselineRepository.getCurrentBaseline();
      if (res.ok) {
        setBaseline(res.data);
      }
      setLoadingBaseline(false);
    }
    loadBaseline();
  }, []);

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setUpdating(true);

    const res = await updateDisplayName(currentDisplayName);
    setUpdating(false);

    if (res.ok) {
      setStatusMessage('Display name updated successfully.');
      setDisplayNameInput(null);
    } else {
      setErrorMessage(res.error.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-6 bg-white border border-gray-200 rounded-lg shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
          <p className="text-sm text-gray-600">Proof-of-concept for authentication and RLS data layer</p>
        </div>
        <button
          onClick={() => signOut()}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded border"
        >
          Sign Out
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {errorMessage}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">User ID</label>
          <p className="font-mono text-sm text-gray-800 break-all">{user?.id}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
          <p className="text-sm text-gray-800">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleUpdateDisplayName} className="border-t pt-4 space-y-3">
        <label htmlFor="accountDisplayName" className="block text-sm font-medium text-gray-700">
          Display Name (stored in profiles table)
        </label>
        <div className="flex gap-2">
          <input
            id="accountDisplayName"
            type="text"
            maxLength={80}
            value={currentDisplayName}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            placeholder="Your name"
          />
          <button
            type="submit"
            disabled={updating}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm rounded-md"
          >
            {updating ? 'Saving...' : 'Update'}
          </button>
        </div>
      </form>

      <div className="border-t pt-4">
        <h3 className="text-md font-semibold text-gray-800 mb-2">Current Baseline Profile</h3>
        {loadingBaseline ? (
          <p className="text-sm text-gray-500 animate-pulse">Loading baseline data...</p>
        ) : baseline ? (
          <div className="bg-gray-50 p-3 rounded border text-xs font-mono space-y-1">
            <p>Effective From: {baseline.effectiveFrom}</p>
            <p>Household Size: {baseline.householdSize}</p>
            <p>Shower: {baseline.showerMinutesPerDay} min/day ({baseline.showerHeater} heater)</p>
            <p>Cooling: AC {baseline.acHoursPerDay}h, Fan {baseline.fanHoursPerDay}h, Laptop {baseline.laptopHoursPerDay}h</p>
            <p>Laundry: {baseline.laundryLoadsPerWeek} loads/wk ({baseline.laundryMachine})</p>
            <p>Factors Version: {baseline.factorsVersion}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No baseline profile logged yet for this account.</p>
        )}
      </div>
    </div>
  );
}
