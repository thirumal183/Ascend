import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  RotateCcw,
  Server,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { FASTAPI_ENDPOINTS_SPEC } from '../../services/ascendApiService';
import {
  OnboardingPathway,
  UnitSystem,
  UserAccount,
  UserProfile,
} from '../../types/ascend';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface SettingsViewProps {
  userAccount: UserAccount;
  userProfile: UserProfile;
  usingDemoData: boolean;
  onChangePathway: (pathway: OnboardingPathway) => void;
  onVerifyPassword?: (password: string) => Promise<void>;
  onChangePathwayWithPassword?: (
    pathway: OnboardingPathway,
    currentPassword: string
  ) => Promise<void>;
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
  onVerifyPassword,
  onChangePathwayWithPassword,
  onChangeUnitSystem,
  onToggleDemoData,
  onResetSampleData,
  onSignOut,
}) => {
  const isDemoMode = usingDemoData || Boolean(userAccount.isDemoAccount);

  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetConfirmedBanner, setResetConfirmedBanner] = useState(false);
  const [pathwayNotice, setPathwayNotice] = useState<string | null>(null);
  const [showApiBoundary, setShowApiBoundary] = useState(false);

  // Authenticated 2-step Password-Confirmed Pathway Change Modal State
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwStep, setPwStep] = useState<'verify-password' | 'select-pathway' | 'confirm'>('verify-password');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState('');
  const [pendingPathway, setPendingPathway] = useState<OnboardingPathway>(userProfile.pathway);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const handleConfirmReset = () => {
    onResetSampleData();
    setConfirmingReset(false);
    setResetConfirmedBanner(true);
    setTimeout(() => setResetConfirmedBanner(false), 4000);
  };

  const handleDemoSwitchPathway = (pathway: OnboardingPathway) => {
    if (pathway === userProfile.pathway) return;
    onChangePathway(pathway);
    setPathwayNotice(
      `Switched demo pathway to ${pathway}. Sample workspace updated.`
    );
    setTimeout(() => setPathwayNotice(null), 4000);
  };

  const openAuthenticatedPathwayDialog = () => {
    setPwStep('verify-password');
    setPasswordInput('');
    setVerifiedPassword('');
    setShowPassword(false);
    setPendingPathway(userProfile.pathway);
    setPwError(null);
    setPwLoading(false);
    setPwDialogOpen(true);
  };

  const closeAuthenticatedPathwayDialog = () => {
    setPwDialogOpen(false);
    setPasswordInput('');
    setVerifiedPassword('');
    setPwError(null);
    setPwLoading(false);
  };

  const handleVerifyPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!passwordInput.trim()) {
      setPwError('Enter your current account password to continue.');
      return;
    }

    setPwLoading(true);
    try {
      if (onVerifyPassword) {
        await onVerifyPassword(passwordInput);
      }
      setVerifiedPassword(passwordInput);
      setPasswordInput('');
      setPwStep('select-pathway');
    } catch (err: any) {
      setPwError(
        err?.message || 'Incorrect password. Verify your credentials and try again.'
      );
    } finally {
      setPwLoading(false);
    }
  };

  const handleConfirmAuthenticatedPathwayChange = async () => {
    if (pendingPathway === userProfile.pathway) {
      setPwError('Select a different pathway before confirming.');
      return;
    }
    setPwError(null);
    setPwLoading(true);
    try {
      if (onChangePathwayWithPassword) {
        await onChangePathwayWithPassword(pendingPathway, verifiedPassword);
      } else {
        onChangePathway(pendingPathway);
      }
      closeAuthenticatedPathwayDialog();
      setPathwayNotice(
        `Account pathway updated to ${pendingPathway}. All logged meals, workouts, hydration, and progress records remain preserved.`
      );
      setTimeout(() => setPathwayNotice(null), 5000);
    } catch (err: any) {
      setPwError(err?.message || 'Unable to update pathway. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="animate-page-enter space-y-8 pb-20 lg:pb-12">
      {/* Header */}
      <div>
        <Badge variant="slate" size="sm" className="mb-2 border-blue-200 bg-blue-50 text-blue-700">
          Account Security & Preferences
        </Badge>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-[#0A1628] tracking-tight">
          Account & Application Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your profile session, account-level pathway, measurement units, and workspace preferences.
        </p>
      </div>

      {resetConfirmedBanner && (
        <div className="animate-fade-in p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Demo data has been reset to the default baseline state.</span>
        </div>
      )}

      {pathwayNotice && (
        <div className="animate-fade-in p-4 rounded-xl bg-blue-50 border border-blue-200 text-[#0A1628] text-sm font-medium flex items-center gap-2">
          <Check className="h-4 w-4 text-[#2563EB] shrink-0" />
          <span>{pathwayNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Account & Session Card (6 cols) */}
        <Card variant="elevated" className="lg:col-span-6 p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-[#0A1628] truncate">
                  {userAccount.name || 'Member Account'}
                </h2>
                <p className="text-xs text-slate-500 truncate">{userAccount.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
            >
              Sign Out
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Primary Goal</span>
              <span className="font-semibold text-[#0A1628]">
                {userProfile.goalType}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Session Mode</span>
              <span className="text-xs font-mono text-[#2563EB] font-semibold">
                {isDemoMode ? 'Interactive Demo Mode' : 'Authenticated Live Account'}
              </span>
            </div>
          </div>

          {/* Pathway Management: Instant in Demo Mode, Password-Protected in Live Account Mode */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="text-xs font-semibold text-[#0A1628]">
                Active Focus Pathway
              </label>
              {!isDemoMode && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2563EB]">
                  <Lock className="h-3 w-3" />
                  Password Protected
                </span>
              )}
            </div>

            {isDemoMode ? (
              <>
                <p className="text-xs text-slate-500 mb-2.5">
                  Demo Mode lets you switch among all three pathways freely to explore layouts.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(OnboardingPathway).map((pathway) => {
                    const active = userProfile.pathway === pathway;
                    return (
                      <button
                        key={pathway}
                        type="button"
                        onClick={() => handleDemoSwitchPathway(pathway)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                          active
                            ? 'bg-blue-50 border-[#2563EB] text-[#0A1628] ring-1 ring-[#2563EB]'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{pathway}</span>
                        {active && <Check className="h-4 w-4 text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mt-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-[#0A1628]">
                      {userProfile.pathway}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Changing pathways recalculates daily targets while preserving all logged meals, hydration, workouts, and history.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={openAuthenticatedPathwayDialog}
                  leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-blue-300" />}
                >
                  Change Pathway...
                </Button>
              </div>
            )}
          </div>

          {/* Unit System Preference */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-semibold text-[#0A1628] mb-2">
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
                      ? 'bg-blue-50 border-[#2563EB] text-[#0A1628]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{u}</span>
                  {userProfile.unitSystem === u && (
                    <Check className="h-4 w-4 text-[#2563EB]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Workspace Controls (Demo Mode vs Live Account) (6 cols) */}
        <Card variant="elevated" className="lg:col-span-6 p-6 space-y-5">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="font-display text-lg font-bold text-[#0A1628]">
              {isDemoMode ? 'Demo Workspace & Reset Controls' : 'Account Data & Integrity'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isDemoMode
                ? 'Switch between a clean personal demo or preloaded sample records'
                : 'Your authenticated records are persisted securely in PostgreSQL'}
            </p>
          </div>

          {isDemoMode ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onToggleDemoData(false)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    !usingDemoData
                      ? 'bg-blue-50/75 border-[#2563EB] ring-1 ring-[#2563EB]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-sm font-bold text-[#0A1628]">
                    Clean Demo Log
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Show only meals and progress entries added in this session.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleDemoData(true)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    usingDemoData
                      ? 'bg-blue-50/75 border-[#2563EB] ring-1 ring-[#2563EB]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-sm font-bold text-[#0A1628]">
                    Sample Demo Data
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Include labeled sample meals and baseline weight checkpoints.
                  </p>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-sm font-bold text-[#0A1628]">
                  Reset Demo Workspace
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Restore sample meals, workouts, water intake, and chat messages to baseline values.
                </p>

                {!confirmingReset ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmingReset(true)}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  >
                    Reset Demo Data...
                  </Button>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                    <div className="flex items-start gap-2.5 text-xs text-amber-950">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Reset demo workspace data to initial baseline?
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleConfirmReset}
                      >
                        Confirm Reset
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingReset(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-[#0A1628] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
                  <span>HttpOnly Cookie & Memory Session Active</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Access tokens stay strictly in memory while session renewal uses rotating HttpOnly cookies. Historical nutrition, water, workout, and progress records stay isolated to your account.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Expandable Backend API Contract Reference */}
      <Card variant="default" className="p-6">
        <button
          type="button"
          onClick={() => setShowApiBoundary(!showApiBoundary)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 text-[#0A1628] flex items-center justify-center">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#0A1628]">
                Platform API Architecture Reference
              </h2>
              <p className="text-xs text-slate-500">
                Inspect REST endpoint bindings connecting the React workspace and FastAPI backend
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
                  <strong className="text-[#2563EB] mr-2">{ep.method}</strong>
                  <span className="text-[#0A1628]">{ep.path}</span>
                </div>
                <span className="text-slate-500">{ep.description}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* PASSWORD-CONFIRMED PATHWAY CHANGE DIALOG (REAL ACCOUNTS)  */}
      {/* ========================================================= */}
      {pwDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pathway-change-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1628]/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                  {pwStep === 'verify-password'
                    ? 'Step 1 of 3 · Verify Identity'
                    : pwStep === 'select-pathway'
                    ? 'Step 2 of 3 · Choose New Pathway'
                    : 'Step 3 of 3 · Confirm Change'}
                </span>
                <h2
                  id="pathway-change-dialog-title"
                  className="font-display text-lg font-bold text-[#0A1628] mt-0.5"
                >
                  Change Account Pathway
                </h2>
              </div>
              <button
                type="button"
                onClick={closeAuthenticatedPathwayDialog}
                aria-label="Close pathway change dialog"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#0A1628]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pwError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
                {pwError}
              </div>
            )}

            {pwStep === 'verify-password' && (
              <form onSubmit={handleVerifyPasswordSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  For account security, enter your current password before switching pathways. Your historical meals, workouts, hydration, and progress records will remain preserved.
                </p>

                <div>
                  <label
                    htmlFor="confirm-pathway-password"
                    className="block text-xs font-semibold text-[#0A1628] mb-1.5"
                  >
                    Current Account Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-pathway-password"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter your current password"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-[#0A1628]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeAuthenticatedPathwayDialog}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={pwLoading}
                  >
                    {pwLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Password'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {pwStep === 'select-pathway' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#0A1628] flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <span>Password verified. Choose your new focus pathway:</span>
                </div>

                <div className="space-y-2">
                  {Object.values(OnboardingPathway).map((pathway) => {
                    const selected = pendingPathway === pathway;
                    const isCurrent = userProfile.pathway === pathway;
                    return (
                      <button
                        key={pathway}
                        type="button"
                        onClick={() => {
                          setPendingPathway(pathway);
                          setPwError(null);
                        }}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                          selected
                            ? 'bg-blue-50 border-[#2563EB] text-[#0A1628] ring-1 ring-[#2563EB]'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div>{pathway}</div>
                          {isCurrent && (
                            <span className="text-[10px] font-normal text-slate-500">
                              Currently Active
                            </span>
                          )}
                        </div>
                        {selected && <Check className="h-4 w-4 text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeAuthenticatedPathwayDialog}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={pendingPathway === userProfile.pathway}
                    onClick={() => setPwStep('confirm')}
                  >
                    Review Change
                  </Button>
                </div>
              </div>
            )}

            {pwStep === 'confirm' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Pathway:</span>
                    <strong className="text-[#0A1628]">{userProfile.pathway}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">New Pathway:</span>
                    <strong className="text-[#2563EB]">{pendingPathway}</strong>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Daily calorie and macronutrient targets will recalculate automatically for <strong>{pendingPathway}</strong>. All logged meals, water intake, workouts, progress records, and coach conversations stay intact.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPwStep('select-pathway')}
                    disabled={pwLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmAuthenticatedPathwayChange}
                    disabled={pwLoading}
                  >
                    {pwLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Saving Pathway...
                      </>
                    ) : (
                      'Confirm Pathway Change'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
