import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Dumbbell, Utensils } from 'lucide-react';
import { computeDailyTotals } from '../../services/ascendApiService';
import { IntakeRecord, NavigationTab, NutritionGoals } from '../../types/ascend';

interface CalendarViewProps {
  intakeRecords: IntakeRecord[];
  goals: NutritionGoals;
  onNavigate: (tab: NavigationTab) => void;
}

interface CalendarDayEntry {
  dayNumber: number;
  dateIso: string;
  calories: number;
  proteinG: number;
  workoutLabel?: string;
  adherenceStatus: 'optimal' | 'moderate' | 'upcoming';
  isToday?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  intakeRecords,
  goals,
  onNavigate,
}) => {
  const dailyTotals = computeDailyTotals(intakeRecords);

  const octoberDays: CalendarDayEntry[] = useMemo(
    () =>
      Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        const dateIso = `2026-10-${String(day).padStart(2, '0')}`;
        if (day === 27) {
          return {
            dayNumber: day,
            dateIso,
            calories: dailyTotals.calories,
            proteinG: Math.round(dailyTotals.proteinG),
            workoutLabel: 'Today’s Planned Session',
            adherenceStatus: 'moderate',
            isToday: true,
          };
        }
        if (day > 27) {
          return {
            dayNumber: day,
            dateIso,
            calories: 0,
            proteinG: 0,
            workoutLabel:
              day % 2 === 0 ? 'Scheduled Resistance Session' : undefined,
            adherenceStatus: 'upcoming',
          };
        }
        const hasWorkout = day % 2 !== 0 || day % 5 === 0;
        return {
          dayNumber: day,
          dateIso,
          calories: 2540 + ((day * 37) % 180),
          proteinG: 178 + (day % 14),
          workoutLabel: hasWorkout
            ? day % 3 === 0
              ? 'Lower Body Strength'
              : 'Upper Body & Core'
            : undefined,
          adherenceStatus: day % 6 === 0 ? 'moderate' : 'optimal',
        };
      }),
    [dailyTotals.calories, dailyTotals.proteinG]
  );

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(27);
  const selectedDay =
    octoberDays.find((d) => d.dayNumber === selectedDayNumber) ||
    octoberDays[26];

  return (
    <div className="animate-page-enter space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Monthly Schedule & Adherence Log · October 2026
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Training & Nutrition Calendar
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>Target: <strong className="font-mono">{goals.dailyCalories} kcal</strong></span>
          <span>·</span>
          <span>Click any date to inspect daily summary</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (8 cols) */}
        <section
          aria-label="October 2026 Calendar Grid"
          className="lg:col-span-8 bg-white border border-slate-200/80 rounded-xl p-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-sky-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                October 2026
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Optimal Target</span>
              <span>·</span>
              <span>Active Today (Oct 27)</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mt-4 text-center text-xs font-semibold text-slate-400 pb-2">
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {octoberDays.map((entry) => {
              const isSelected = selectedDay.dayNumber === entry.dayNumber;
              return (
                <button
                  key={entry.dateIso}
                  type="button"
                  onClick={() => setSelectedDayNumber(entry.dayNumber)}
                  className={`p-2.5 rounded-lg border text-left transition-all min-h-[82px] flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500'
                      : entry.isToday
                      ? 'bg-slate-900 text-white border-slate-900'
                      : entry.adherenceStatus === 'upcoming'
                      ? 'bg-slate-50/60 border-slate-200/60 text-slate-400 hover:bg-slate-100'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-bold">
                      {entry.dayNumber}
                    </span>
                    {entry.workoutLabel && (
                      <Dumbbell
                        className={`h-3 w-3 ${
                          entry.isToday && !isSelected
                            ? 'text-sky-400'
                            : 'text-sky-600'
                        }`}
                      />
                    )}
                  </div>

                  {entry.adherenceStatus !== 'upcoming' ? (
                    <div className="mt-2 font-mono text-[10px] leading-tight">
                      <div className="font-semibold">{entry.calories} kcal</div>
                      <div className="opacity-75">{entry.proteinG}g pro</div>
                    </div>
                  ) : (
                    <div className="mt-2 text-[10px] opacity-70">Scheduled</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Date Detail Inspector (4 cols) */}
        <aside className="lg:col-span-4 bg-white border border-slate-200/80 rounded-xl p-6 space-y-5">
          <div className="pb-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-sky-600 font-mono">
              {selectedDay.dateIso} {selectedDay.isToday ? '· TODAY' : ''}
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              Daily Schedule & Nutrition Inspector
            </h2>
          </div>

          {selectedDay.adherenceStatus === 'upcoming' ? (
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Future training date ({selectedDay.dateIso}). Planned daily energy target:{' '}
                <strong className="font-mono text-slate-900">
                  {goals.dailyCalories} kcal
                </strong>
                .
              </p>
              {selectedDay.workoutLabel && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-900 block">
                    Planned Session:
                  </span>
                  <span className="text-slate-600 mt-0.5 block">
                    {selectedDay.workoutLabel}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="font-sans text-xs text-slate-500 block">
                    Logged Energy
                  </span>
                  <strong className="text-base text-slate-900">
                    {selectedDay.calories} kcal
                  </strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="font-sans text-xs text-slate-500 block">
                    Logged Protein
                  </span>
                  <strong className="text-base text-sky-700">
                    {selectedDay.proteinG} g
                  </strong>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Workout Status</span>
                </div>
                <p className="text-slate-600">
                  {selectedDay.workoutLabel
                    ? `${selectedDay.workoutLabel} (Logged)`
                    : 'Active Recovery & Mobility Day'}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate(NavigationTab.Diet)}
                  className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Utensils className="h-3.5 w-3.5" />
                  <span>Open Food Log</span>
                </button>
                {selectedDay.workoutLabel && (
                  <button
                    type="button"
                    onClick={() => onNavigate(NavigationTab.Workouts)}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Dumbbell className="h-3.5 w-3.5 text-sky-600" />
                    <span>View Workout Session</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
