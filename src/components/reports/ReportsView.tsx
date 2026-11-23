import React from 'react';
import { Download, FileSpreadsheet, Info } from 'lucide-react';
import { WEEKLY_DAILY_TREND } from '../../data/mockData';
import { computeDailyTotals } from '../../services/ascendApiService';
import {
  IntakeRecord,
  NutritionGoals,
  ProgressRecord,
  UserProfile,
} from '../../types/ascend';

interface ReportsViewProps {
  intakeRecords: IntakeRecord[];
  goals: NutritionGoals;
  userProfile: UserProfile;
  progressHistory: ProgressRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  intakeRecords,
  goals,
  userProfile,
  progressHistory,
}) => {
  const dailyTotals = computeDailyTotals(intakeRecords);

  const handleDownloadCsv = () => {
    if (intakeRecords.length === 0) return;

    const headers = [
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
    const rows = intakeRecords.map((r) => [
      r.meal,
      r.loggedAt,
      `"${r.foodName.replace(/"/g, '""')}"`,
      r.quantity,
      r.unit,
      r.computedNutrients.calories,
      r.computedNutrients.proteinG,
      r.computedNutrients.carbsG,
      r.computedNutrients.fatG,
      r.isUserLogged ? 'User_Logged_Session' : 'Sample_Baseline',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ascend_nutrition_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-page-enter space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Structured Nutritional Ledger · Daily & Weekly Adherence Summaries
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Nutrition & Performance Reports
          </h1>
        </div>
        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={intakeRecords.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors self-start sm:self-auto"
          title={intakeRecords.length === 0 ? 'No meals logged to export' : 'Export nutrition CSV'}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Today’s Intake CSV</span>
        </button>
      </div>

      {/* Provenance Notice */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex items-start gap-3">
        <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900 font-semibold">
            Report Data Provenance:
          </strong>{' '}
          This summary distinguishes between user-logged records added during your active browser session ({intakeRecords.filter((r) => r.isUserLogged).length} items) and pre-loaded sample records ({intakeRecords.filter((r) => !r.isUserLogged).length} items).
        </div>
      </div>

      {/* Weekly 7-Day Adherence Matrix */}
      <section className="bg-white border border-slate-200/80 rounded-xl p-6">
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
              {WEEKLY_DAILY_TREND.map((row) => {
                const delta = row.calories - goals.dailyCalories;
                return (
                  <tr key={row.day} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-sans font-semibold text-slate-900">
                      {row.day} (Sample)
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {row.calories} kcal
                    </td>
                    <td
                      className={`py-3 px-3 text-right text-xs ${
                        Math.abs(delta) <= 100
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta} kcal
                    </td>
                    <td className="py-3 px-3 text-right text-sky-700">
                      {row.protein} g
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {row.activityMins} mins
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {row.steps.toLocaleString()}
                    </td>
                    <td className="py-3 pl-3 text-right font-sans text-xs">
                      {row.workoutDone ? (
                        <span className="font-semibold text-emerald-700">
                          Completed
                        </span>
                      ) : (
                        <span className="text-slate-400">Rest Day</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Current Live Session Row */}
              <tr className="bg-sky-50/50 font-semibold">
                <td className="py-3 pr-4 font-sans text-sky-950">
                  Today (Active Session)
                </td>
                <td className="py-3 px-3 text-right text-sky-950">
                  {dailyTotals.calories} kcal
                </td>
                <td className="py-3 px-3 text-right text-xs text-sky-800">
                  {dailyTotals.calories - goals.dailyCalories} kcal
                </td>
                <td className="py-3 px-3 text-right text-sky-700">
                  {dailyTotals.proteinG} g
                </td>
                <td className="py-3 px-3 text-right text-slate-900">48 mins</td>
                <td className="py-3 px-3 text-right text-slate-900">8,450</td>
                <td className="py-3 pl-3 text-right font-sans text-xs text-sky-700">
                  In Progress ({progressHistory.length} checkpoints)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
