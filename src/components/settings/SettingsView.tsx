import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  LogOut,
  RotateCcw,
  Server,
  UserCheck,
} from 'lucide-react';
import { FASTAPI_ENDPOINTS_SPEC } from '../../services/ascendApiService';
import {
  OnboardingPathway,
  UnitSystem,
  UserAccount,
  UserProfile,
} from '../../types/ascend';

interface SettingsViewProps {
  userAccount: UserAccount;
  userProfile: UserProfile;
  usingDemoData: boolean;
  onChangePathway: (pathway: OnboardingPathway) => void;
  onChangeUnitSystem: (unitSystem: UnitSystem) => void;
  onToggleDemoData: (loadDemo: boolean) => void;
  onResetSampleData: () => void;
  onSignOut: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userAccount,
  userProfile,
  usingDemoData,
  onChangePathway,
  onChangeUnitSystem,
  onToggleDemoData,
  onResetSampleData,
  onSignOut,
}) => {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetConfirmedBanner, setResetConfirmedBanner] = useState(false);
  const [pathwayNotice, setPathwayNotice] = useState<string | null>(null);
  const [showApiBoundary, setShowApiBoundary] = useState(false);

  const handleConfirmReset = () => {
    onResetSampleData();
    setConfirmingReset(false);
    setResetConfirmedBanner(true);
    setTimeout(() => setResetConfirmedBanner(false), 4000);
  };

  const handleSwitchPathway = (pathway: OnboardingPathway) => {
    if (pathway === userProfile.pathway) return;
    onChangePathway(pathway);
    setPathwayNotice(
      `Switched active pathway to ${pathway}. All logged meals and progress history are preserved.`
    );
    setTimeout(() => setPathwayNotice(null), 4000);
  };

  return (
    <div className="animate-page-enter space-y-8 pb-20 lg:pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Account & Application Settings
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Manage your profile session, focus pathway, measurement units, and prototype demonstration data.
        </p>
      </div>

      {resetConfirmedBanner && (
        <div className="animate-fade-in p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Prototype data has been reset to the default baseline state.
          </span>
        </div>
      )}

      {pathwayNotice && (
        <div className="animate-fade-in p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-sm font-medium flex items-center gap-2">
          <Check className="h-4 w-4 text-sky-600 shrink-0" />
          <span>{pathwayNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Account & Session Card (6 cols) */}
        <section className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {userAccount.name}
                </h2>
                <p className="text-xs text-slate-500">{userAccount.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] rounded-xl transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Primary Goal</span>
              <span className="font-semibold text-slate-900">
                {userProfile.goalType}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Session Storage</span>
              <span className="text-xs text-slate-600">
                Local Prototype Session (No passwords stored)
              </span>
            </div>
          </div>

          {/* Pathway Switcher (Preserves historical records) */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Active Focus Pathway
            </label>
            <p className="text-xs text-slate-500 mb-2.5">
              Switch pathways anytime without losing your logged meals or progress history.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(OnboardingPathway).map((pathway) => {
                const active = userProfile.pathway === pathway;
                return (
                  <button
                    key={pathway}
                    type="button"
                    onClick={() => handleSwitchPathway(pathway)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      active
                        ? 'bg-sky-50 border-sky-600 text-sky-950 ring-1 ring-sky-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{pathway}</span>
                    {active && <Check className="h-4 w-4 text-sky-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit System Preference */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Preferred Measurement Units
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(UnitSystem).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onChangeUnitSystem(u)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    userProfile.unitSystem === u
                      ? 'bg-sky-50 border-sky-600 text-sky-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{u}</span>
                  {userProfile.unitSystem === u && (
                    <Check className="h-4 w-4 text-sky-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Data Controls & Confirmation Reset (6 cols) */}
        <section className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Demonstration Data & Reset Controls
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Switch between a clean personal log or preloaded demonstration records
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onToggleDemoData(false)}
              className={`p-4 rounded-xl border text-left transition-all ${
                !usingDemoData
                  ? 'bg-sky-50/70 border-sky-600 ring-1 ring-sky-600'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-sm font-bold text-slate-900">
                Clean Personal Log
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Show only meals and progress entries that you log yourself.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onToggleDemoData(true)}
              className={`p-4 rounded-xl border text-left transition-all ${
                usingDemoData
                  ? 'bg-sky-50/70 border-sky-600 ring-1 ring-sky-600'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-sm font-bold text-slate-900">
                Sample Demonstration Data
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Include labeled sample meals and baseline weight checkpoints.
              </p>
            </button>
          </div>

          {/* Reset with Confirmation Step */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Reset Prototype Data
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Restore all meals, workouts, water intake, and chat history to their initial baseline state.
            </p>

            {!confirmingReset ? (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Prototype Data...</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Are you sure you want to reset your session data? Any custom meals or weight entries logged in this session will be replaced.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(false)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-amber-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Expandable FastAPI + PostgreSQL Architecture Reference */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6">
        <button
          type="button"
          onClick={() => setShowApiBoundary(!showApiBoundary)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Backend Integration Contract (FastAPI & PostgreSQL)
              </h2>
              <p className="text-xs text-slate-500">
                View planned REST API endpoints for the academic DBMS backend
              </p>
            </div>
          </div>
          {showApiBoundary ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {showApiBoundary && (
          <div className="mt-5 pt-4 border-t border-slate-100 divide-y divide-slate-100">
            {FASTAPI_ENDPOINTS_SPEC.endpoints.map((ep) => (
              <div
                key={ep.path}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="font-mono">
                  <strong className="text-sky-700 mr-2">{ep.method}</strong>
                  <span className="text-slate-900">{ep.path}</span>
                </div>
                <span className="text-slate-500">{ep.description}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
