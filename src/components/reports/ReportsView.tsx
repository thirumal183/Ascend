import React, { useMemo } from 'react';
import { Download, FileSpreadsheet, Info } from 'lucide-react';
import { computeDailyTotals } from '../../services/ascendApiService';
import {
  IntakeRecord,
  NutritionGoals,
  ProgressRecord,
  UserProfile,
} from '../../types/ascend';
import { getDateWithOffset, getLocalDateIso, getPastNDaysIso } from '../../utils/dateUtils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

import type { DailyAdherenceItem } from '../../services/api/nutritionApi';
import type { WorkoutSessionResponse } from '../../services/api/workoutApi';

interface ReportsViewProps {
  intakeRecords: IntakeRecord[];
  goals: NutritionGoals;
  userProfile: UserProfile;
  progressHistory: ProgressRecord[];
  intakeReport?: DailyAdherenceItem[];
  workoutSessions?: WorkoutSessionResponse[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  intakeRecords,
  goals,
  userProfile,
  progressHistory,
  intakeReport = [],
  workoutSessions = [],
}) => {
  const todayIso = getLocalDateIso();
  const yesterdayIso = getDateWithOffset(-1).dateIso;

  // Filter records strictly for today's active session
  const todayIntakeRecords = useMemo(
    () => intakeRecords.filter((r) => r.dateIso === todayIso),
    [intakeRecords, todayIso]
  );
  const todayTotals = useMemo(
    () => computeDailyTotals(todayIntakeRecords),
    [todayIntakeRecords]
  );

  // Compute 7-day rolling adherence matrix from real intake records, backend adherence report, progress & workout sessions
  const past7Days = useMemo(() => {
    const dates = getPastNDaysIso(7);
    return dates.map((dateIso) => {
      const records = intakeRecords.filter((r) => r.dateIso === dateIso);
      const reportRow = intakeReport.find((r) => r.dateIso === dateIso);
      const progRow = progressHistory.find((p) => p.dateIso === dateIso);
      const daySessions = workoutSessions.filter((s) => s.dateLogged === dateIso);
      const isToday = dateIso === todayIso;
      const isYesterday = dateIso === yesterdayIso;
      const dateObj = new Date(`${dateIso}T00:00:00`);
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dayLabel = isToday
        ? 'Today'
        : isYesterday
        ? 'Yesterday'
        : `${weekday} (${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

      const totals = records.length > 0 ? computeDailyTotals(records) : null;
      const calories = totals ? totals.calories : (reportRow?.calories ?? progRow?.caloriesConsumed ?? 0);
      const protein = totals ? Math.round(totals.proteinG) : Math.round(reportRow?.proteinG ?? progRow?.proteinConsumedG ?? 0);
      const hasLogs = records.length > 0 || (reportRow ? reportRow.calories > 0 : false) || (progRow ? progRow.caloriesConsumed > 0 : false);
      const delta = calories - goals.dailyCalories;

      const sessionMins = daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      const activityMins = sessionMins > 0 ? sessionMins : (progRow?.activityMinutes ?? 0);
      const steps = progRow?.stepsCount ?? 0;
      const workoutDone = daySessions.some((s) => s.completed) || Boolean(progRow?.workoutCompleted);

      return {
        dateIso,
        dayLabel,
        isToday,
        hasLogs,
        calories,
        protein,
        delta,
        activityMins,
        steps,
        workoutDone,
      };
    });
  }, [intakeRecords, intakeReport, progressHistory, workoutSessions, goals.dailyCalories, todayIso, yesterdayIso]);

  const handleDownloadCsv = () => {
    if (intakeRecords.length === 0) return;

    const headers = [
      'Date',
      'Meal',
      'Time',
      'Food_Name',
      'Quantity',
      'Unit',
      'Calories',
      'Protein_g',
      'Carbs_g',
      'Fat_g',
      'Data_Source',
    ];
    const sanitizeCsvCell = (val: string) => {
      const safe = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const rows = intakeRecords.map((r) => [
      r.dateIso || new Date().toISOString().split('T')[0],
      r.meal,
      r.loggedAt,
      sanitizeCsvCell(r.foodName),
      r.quantity,
      r.unit,
      r.computedNutrients.calories,
      r.computedNutrients.proteinG,
      r.computedNutrients.carbsG,
      r.computedNutrients.fatG,
      r.isUserLogged ? 'User_Logged_Session' : 'Sample_Baseline',
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `ascend_nutrition_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-page-enter space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Badge variant="sky" size="sm" className="mb-2">
            Nutritional Ledger · Daily & Weekly Adherence
          </Badge>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Nutrition & Performance Reports
          </h1>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleDownloadCsv}
          disabled={intakeRecords.length === 0}
          leftIcon={<Download className="h-4 w-4" />}
          className="self-start sm:self-auto"
        >
          <span>Export Today’s Intake CSV</span>
        </Button>
      </div>

      {/* Provenance Notice */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
        <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900 font-semibold">
            Report Data Provenance:
          </strong>{' '}
          This summary distinguishes between user-logged records added during your active browser session ({intakeRecords.filter((r) => r.isUserLogged).length} items) and pre-loaded sample records ({intakeRecords.filter((r) => !r.isUserLogged).length} items).
        </div>
      </div>

      {/* Weekly 7-Day Adherence Matrix */}
      <Card variant="elevated" className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              7-Day Rolling Nutrition & Activity Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison against configured {userProfile.goalType} targets ({goals.dailyCalories} kcal / {goals.proteinG}g protein)
            </p>
          </div>
          <FileSpreadsheet className="h-5 w-5 text-slate-400" />
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Day</th>
                <th className="py-2.5 px-3 text-right">Calories Logged</th>
                <th className="py-2.5 px-3 text-right">Target Delta</th>
                <th className="py-2.5 px-3 text-right">Protein Intake</th>
                <th className="py-2.5 px-3 text-right">Activity Mins</th>
                <th className="py-2.5 px-3 text-right">Daily Steps</th>
                <th className="py-2.5 pl-3 text-right">Workout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-mono tabular-nums">
              {past7Days.map((row) => (
                <tr
                  key={row.dateIso}
                  className={`hover:bg-slate-50/70 ${
                    row.isToday ? 'bg-sky-50/50 font-semibold' : ''
                  }`}
                >
                  <td
                    className={`py-3 pr-4 font-sans ${
                      row.isToday
                        ? 'text-sky-950 font-bold'
                        : 'text-slate-900 font-medium'
                    }`}
                  >
                    {row.dayLabel}
                  </td>
                  <td
                    className={`py-3 px-3 text-right ${
                      row.hasLogs
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-400 font-normal italic'
                    }`}
                  >
                    {row.hasLogs ? `${row.calories} kcal` : 'Unlogged'}
                  </td>
                  <td
                    className={`py-3 px-3 text-right text-xs ${
                      !row.hasLogs
                        ? 'text-slate-400'
                        : Math.abs(row.delta) <= 100
                        ? 'text-emerald-700'
                        : row.delta > 0
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {row.hasLogs
                      ? row.delta > 0
                        ? `+${row.delta} kcal`
                        : `${row.delta} kcal`
                      : '—'}
                  </td>
                  <td
                    className={`py-3 px-3 text-right ${
                      row.hasLogs ? 'text-sky-700' : 'text-slate-400'
                    }`}
                  >
                    {row.hasLogs ? `${row.protein} g` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">
                    {row.hasLogs ? `${row.activityMins} mins` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">
                    {row.hasLogs ? row.steps.toLocaleString() : '—'}
                  </td>
                  <td className="py-3 pl-3 text-right font-sans text-xs">
                    {row.isToday ? (
                      <span className="font-semibold text-sky-700">
                        In Progress ({progressHistory.length} checkpoints)
                      </span>
                    ) : row.workoutDone ? (
                      <span className="font-semibold text-emerald-700">
                        Completed
                      </span>
                    ) : (
                      <span className="text-slate-400">Rest / No logs</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detailed Ledger Breakdown Table */}
      <Card variant="elevated" className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Active Session Nutritional Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized entries recorded today ({todayIntakeRecords.length} items logged)
            </p>
          </div>
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {todayTotals.calories.toLocaleString()} kcal total
          </span>
        </div>

        {todayIntakeRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No foods logged for today yet. Use the Diet tab to record meals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Meal</th>
                  <th className="py-2.5 px-3">Food Name</th>
                  <th className="py-2.5 px-3 text-right">Portion</th>
                  <th className="py-2.5 px-3 text-right">Calories</th>
                  <th className="py-2.5 px-3 text-right">Protein</th>
                  <th className="py-2.5 px-3 text-right">Carbs</th>
                  <th className="py-2.5 px-3 text-right">Fat</th>
                  <th className="py-2.5 pl-3 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {todayIntakeRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-4 font-sans font-semibold text-slate-900">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                        {item.meal}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      {item.foodName}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {item.computedNutrients.calories} kcal
                    </td>
                    <td className="py-2.5 px-3 text-right text-sky-700">
                      {item.computedNutrients.proteinG}g
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700">
                      {item.computedNutrients.carbsG}g
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-700">
                      {item.computedNutrients.fatG}g
                    </td>
                    <td className="py-2.5 pl-3 text-right font-sans text-[11px]">
                      {item.isUserLogged ? (
                        <span className="text-emerald-700 font-semibold">User Logged</span>
                      ) : (
                        <span className="text-slate-400">Sample Item</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Scientific Reference Attribution Banner */}
      <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-sky-600 shrink-0" />
          <span>
            Scientific Reference Standards: <strong>ICMR-NIN Dietary Guidelines for Indians (DGI 2024)</strong> & <strong>USDA FoodData Central (CC0 Public Domain)</strong>.
          </span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-slate-400 tracking-wider">
          ASCEND-CLINICAL-V2.3
        </span>
      </div>
    </div>
  );
};
