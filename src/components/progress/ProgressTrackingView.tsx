import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Scale,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  NutritionGoals,
  ProgressRecord,
  UserProfile,
} from '../../types/ascend';
import { getDateWithOffset, getLocalDateIso } from '../../utils/dateUtils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SectionHeader } from '../ui/SectionHeader';
import { Modal } from '../ui/Modal';

interface ProgressTrackingViewProps {
  progressHistory: ProgressRecord[];
  goals: NutritionGoals;
  userProfile: UserProfile;
  onAddProgressRecord: (record: Omit<ProgressRecord, 'id'>) => void;
  onLoadDemoProgress: () => void;
}

export const ProgressTrackingView: React.FC<ProgressTrackingViewProps> = ({
  progressHistory,
  goals,
  userProfile,
  onAddProgressRecord,
  onLoadDemoProgress,
}) => {
  const [dateRange, setDateRange] = useState<'4w' | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'logged' | 'sample'>(
    'all'
  );
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDetailedHistory, setShowDetailedHistory] = useState(false);

  const latest = progressHistory[progressHistory.length - 1];
  const first = progressHistory[0];

  const [weightInput, setWeightInput] = useState<string>(
    String(latest?.weightKg ?? userProfile.currentWeightKg)
  );
  const [bodyFatInput, setBodyFatInput] = useState<string>(
    String(latest?.bodyFatPct ?? 14.0)
  );
  const [waistInput, setWaistInput] = useState<string>(
    String(latest?.waistCm ?? 79.5)
  );
  const [chestInput, setChestInput] = useState<string>(
    String(latest?.chestCm ?? 102.5)
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const filteredBySource = progressHistory.filter((r) => {
    if (sourceFilter === 'all') return true;
    return r.source === sourceFilter;
  });

  const fourWeeksCutoffIso = getDateWithOffset(-28).dateIso;
  const displayedRecords =
    dateRange === '4w'
      ? filteredBySource.filter((r) => r.dateIso >= fourWeeksCutoffIso)
      : filteredBySource;

  const weightChange =
    latest && first ? (latest.weightKg - first.weightKg).toFixed(1) : '0.0';

  const loggedCount = progressHistory.filter((r) => r.source === 'logged').length;
  const sampleCount = progressHistory.filter((r) => r.source === 'sample').length;

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput) || userProfile.currentWeightKg;
    const bf = parseFloat(bodyFatInput) || 14.0;
    const waist = parseFloat(waistInput) || 79.5;
    const chest = parseFloat(chestInput) || 102.5;
    const leanMass = Math.round(w * (1 - bf / 100) * 10) / 10;

    const todayDateIso = getLocalDateIso();
    const todayLabel = `Logged (${new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })})`;

    onAddProgressRecord({
      dateIso: todayDateIso,
      label: todayLabel,
      weightKg: w,
      bodyFatPct: bf,
      leanMassKg: leanMass,
      waistCm: waist,
      chestCm: chest,
      armCm: 38.2,
      thighCm: 58.5,
      caloriesConsumed: goals.dailyCalories,
      proteinConsumedG: goals.proteinG,
      carbsConsumedG: goals.carbsG,
      fatConsumedG: goals.fatG,
      workoutCompleted: true,
      activityMinutes: 45,
      stepsCount: goals.dailySteps,
      source: 'logged',
    });

    setShowLogModal(false);
    setSavedNotice(
      `Saved new progress entry (${w} kg) marked as User-Entered Record.`
    );
    setTimeout(() => setSavedNotice(null), 4000);
  };

  return (
    <div className="animate-page-enter space-y-8 pb-20 lg:pb-12">
      {/* Header & Log Progress Action */}
      <SectionHeader
        title="Progress & Body Measurements"
        subtitle="Track your weight trend, key body measurements, and weekly consistency."
        badge={<Badge variant="sky" size="sm">Biometrics</Badge>}
        action={
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowLogModal(!showLogModal)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            <span>Log Check-In</span>
          </Button>
        }
      />

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Checkpoint Log Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Log New Progress Check-In"
        subtitle="Saved entries are labeled as your personal user-logged records."
        maxWidth="2xl"
      >
        <form onSubmit={handleLogSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="prog-weight-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Current Weight (kg)
              </label>
              <input
                id="prog-weight-input"
                type="number"
                step="0.1"
                required
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="prog-waist-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Waist (cm, optional)
              </label>
              <input
                id="prog-waist-input"
                type="number"
                step="0.1"
                value={waistInput}
                onChange={(e) => setWaistInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="prog-bodyfat-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Body Fat (%, optional)
              </label>
              <input
                id="prog-bodyfat-input"
                type="number"
                step="0.1"
                value={bodyFatInput}
                onChange={(e) => setBodyFatInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="prog-chest-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Chest (cm, optional)
              </label>
              <input
                id="prog-chest-input"
                type="number"
                step="0.1"
                value={chestInput}
                onChange={(e) => setChestInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLogModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Save Check-In
            </Button>
          </div>
        </form>
      </Modal>

      {/* Top Summary Cards: Current Weight, Target Weight, Key Measurements & Weekly Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ascend-card-v2 p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Current Weight
          </span>
          <div className="mt-1 font-mono text-3xl font-black text-slate-900 tabular-nums">
            {latest?.weightKg ?? userProfile.currentWeightKg} <span className="text-sm font-normal text-slate-500">kg</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            {Number(weightChange) > 0 ? `+${weightChange}` : weightChange} kg total change
          </p>
        </div>

        <div className="ascend-card-v2 p-5">
          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider block">
            Target Weight
          </span>
          <div className="mt-1 font-mono text-3xl font-black text-sky-800 tabular-nums">
            {userProfile.targetWeightKg} <span className="text-sm font-normal text-sky-600">kg</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">
            Goal: {userProfile.goalType}
          </p>
        </div>

        <div className="ascend-card-v2 p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Key Measurements
          </span>
          <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            Waist: {latest?.waistCm ?? '—'} cm
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono truncate">
            Body Fat: {latest?.bodyFatPct ?? '—'}% · Lean: {latest?.leanMassKg ?? '—'} kg
          </p>
        </div>

        <div className="ascend-card-v2 p-5">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
            Weekly Adherence
          </span>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-800 tabular-nums">
            {goals.weeklyWorkoutSessions} sessions / wk
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Daily target: {goals.dailyCalories.toLocaleString()} kcal
          </p>
        </div>
      </section>

      {/* Main Weight Trend Chart */}
      <section className="ascend-card-v2 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-600">
              <Scale className="h-4 w-4" />
              <span>Weight Trend</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              Body Weight History (kg)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {loggedCount} user-logged record(s) · {sampleCount} sample baseline record(s)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Source Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  sourceFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                All ({progressHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('logged')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  sourceFilter === 'logged'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                User-Logged ({loggedCount})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('sample')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  sourceFilter === 'sample'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Demo Baseline ({sampleCount})
              </button>
            </div>

            {/* Range Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setDateRange('4w')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  dateRange === '4w'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Recent 4
              </button>
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  dateRange === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                All History
              </button>
            </div>
          </div>
        </div>

        {displayedRecords.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">
              No progress records match the current filter.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogModal(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl"
              >
                Log Your Weight
              </button>
              {progressHistory.length === 0 && (
                <button
                  type="button"
                  onClick={onLoadDemoProgress}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Load Demonstration History
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayedRecords}
                margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="progWeightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`${val ?? 0} kg`, 'Weight']}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fill="url(#progWeightGrad)"
                  dot={{ r: 4, fill: '#0284C7', stroke: '#FFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Secondary Progressive Disclosure Section: Additional Measurements & Historical Records */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6">
        <button
          type="button"
          onClick={() => setShowDetailedHistory(!showDetailedHistory)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Additional Measurements & Historical Records ({displayedRecords.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Expand to inspect chest, arm, and thigh measurements and clearly labeled data provenance
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            {showDetailedHistory ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {showDetailedHistory && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-5">
            {/* Secondary Body Measurements Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500">Chest Circumference</span>
                <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                  {latest?.chestCm ?? '—'} cm
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500">Arm Circumference</span>
                <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                  {latest?.armCm ?? '—'} cm
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500">Thigh Circumference</span>
                <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                  {latest?.thighCm ?? '—'} cm
                </div>
              </div>
            </div>

            {/* Historical Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 px-3">Record Type</th>
                    <th className="py-2.5 px-3 text-right">Weight</th>
                    <th className="py-2.5 px-3 text-right">Waist</th>
                    <th className="py-2.5 px-3 text-right">Body Fat</th>
                    <th className="py-2.5 pl-3 text-right">Lean Mass</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {displayedRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4 font-semibold text-slate-900">
                        {rec.label}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {rec.source === 'logged' ? (
                          <span className="font-semibold text-emerald-700">
                            User-Entered Record
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Sample Baseline Data
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {rec.weightKg} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {rec.waistCm ?? '—'} cm
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {rec.bodyFatPct ?? '—'}%
                      </td>
                      <td className="py-3 pl-3 text-right font-mono text-slate-700">
                        {rec.leanMassKg ?? '—'} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
