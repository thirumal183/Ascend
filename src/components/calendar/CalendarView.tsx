import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Dumbbell, Utensils } from 'lucide-react';
import { computeDailyTotals } from '../../services/ascendApiService';
import { IntakeRecord, NavigationTab, NutritionGoals } from '../../types/ascend';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

import type { DailyAdherenceItem } from '../../services/api/nutritionApi';
import type { WorkoutSessionResponse } from '../../services/api/workoutApi';

interface CalendarViewProps {
  intakeRecords: IntakeRecord[];
  goals: NutritionGoals;
  onNavigate: (tab: NavigationTab) => void;
  intakeReport?: DailyAdherenceItem[];
  workoutSessions?: WorkoutSessionResponse[];
}

interface CalendarDayEntry {
  dayNumber: number;
  dateIso: string;
  calories: number;
  proteinG: number;
  workoutLabel?: string;
  adherenceStatus: 'optimal' | 'moderate' | 'unlogged' | 'upcoming';
  isToday?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  intakeRecords,
  goals,
  onNavigate,
  intakeReport = [],
  workoutSessions = [],
}) => {
  // Dynamic Month and Day Calculations
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthName = now.toLocaleDateString('en-US', { month: 'long' });
  const todayDateNum = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  // Monday-first leading empty offset cells (0 = Mon ... 6 = Sun)
  const leadingEmptyDays = (new Date(currentYear, currentMonthIdx, 1).getDay() + 6) % 7;

  // Map real intake records by local ISO date string (YYYY-MM-DD)
  const recordsByDate = useMemo(() => {
    const map = new Map<string, IntakeRecord[]>();
    for (const record of intakeRecords) {
      const dateKey = record.dateIso;
      if (!dateKey) continue;
      const existing = map.get(dateKey) || [];
      existing.push(record);
      map.set(dateKey, existing);
    }
    return map;
  }, [intakeRecords]);

  const monthDays: CalendarDayEntry[] = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateIso = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayRecords = recordsByDate.get(dateIso) || [];
        const hasRecords = dayRecords.length > 0;
        const dayTotals = hasRecords ? computeDailyTotals(dayRecords) : null;
        const reportRow = intakeReport.find((r) => r.dateIso === dateIso);
        const daySessions = workoutSessions.filter((s) => s.dateLogged === dateIso);
        const realWorkoutLabel = daySessions.length > 0 ? daySessions[0].sessionTitle : undefined;

        const cal = dayTotals ? dayTotals.calories : (reportRow?.calories ?? 0);
        const pro = dayTotals ? Math.round(dayTotals.proteinG) : Math.round(reportRow?.proteinG ?? 0);

        if (day === todayDateNum) {
          return {
            dayNumber: day,
            dateIso,
            calories: cal,
            proteinG: pro,
            workoutLabel: realWorkoutLabel || 'Today’s Planned Session',
            adherenceStatus: cal > 0 ? (Math.abs(cal - goals.dailyCalories) <= 250 ? 'optimal' : 'moderate') : 'unlogged',
            isToday: true,
          };
        }
        if (day > todayDateNum) {
          return {
            dayNumber: day,
            dateIso,
            calories: 0,
            proteinG: 0,
            workoutLabel: realWorkoutLabel,
            adherenceStatus: 'upcoming',
          };
        }

        if (cal > 0) {
          const adherence = Math.abs(cal - goals.dailyCalories) <= 250 ? 'optimal' : 'moderate';
          return {
            dayNumber: day,
            dateIso,
            calories: cal,
            proteinG: pro,
            workoutLabel: realWorkoutLabel,
            adherenceStatus: adherence,
          };
        }

        // Past day with no logs
        return {
          dayNumber: day,
          dateIso,
          calories: 0,
          proteinG: 0,
          workoutLabel: realWorkoutLabel,
          adherenceStatus: 'unlogged',
        };
      }),
    [recordsByDate, daysInMonth, currentYear, currentMonthIdx, intakeReport, workoutSessions, todayDateNum, goals.dailyCalories]
  );

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(todayDateNum);
  const selectedDay =
    monthDays.find((d) => d.dayNumber === selectedDayNumber) ||
    monthDays[todayDateNum - 1] ||
    monthDays[0];

  return (
    <div className="animate-page-enter space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Badge variant="sky" size="sm" className="mb-2">
            Schedule & Consistency · {currentMonthName} {currentYear}
          </Badge>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Training & Nutrition Calendar
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 bg-white border border-slate-200/80 px-4 py-2 rounded-xl shadow-2xs">
          <span>
            Daily Target: <strong className="font-mono text-slate-900">{goals.dailyCalories} kcal</strong>
          </span>
          <span>·</span>
          <span>Click any date to inspect details</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (8 cols) */}
        <Card
          variant="elevated"
          className="lg:col-span-8 p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-sky-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                {currentMonthName} {currentYear}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span>Met Target</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                <span>Today</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 pb-2">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: leadingEmptyDays }).map((_, idx) => (
              <div key={`empty-${idx}`} aria-hidden="true" className="min-h-[82px] rounded-xl bg-slate-50/30" />
            ))}
            {monthDays.map((entry) => {
              const isSelected = selectedDay.dayNumber === entry.dayNumber;
              return (
                <button
                  key={entry.dateIso}
                  type="button"
                  onClick={() => setSelectedDayNumber(entry.dayNumber)}
                  aria-label={`${currentMonthName} ${entry.dayNumber}, ${entry.calories ? `${entry.calories} calories logged` : 'Scheduled day'}`}
                  aria-pressed={isSelected}
                  className={`p-2.5 rounded-xl border text-left transition-all min-h-[82px] flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                    isSelected
                      ? 'bg-blue-50 border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs'
                      : entry.isToday
                      ? 'bg-[#0A1628] text-white border-[#0A1628] shadow-md'
                      : entry.adherenceStatus === 'upcoming'
                      ? 'bg-slate-50 border-slate-200/70 text-slate-500 hover:bg-slate-100'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-[#0A1628]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-bold">
                      {entry.dayNumber}
                    </span>
                    {entry.workoutLabel && (
                      <Dumbbell
                        className={`h-3.5 w-3.5 ${
                          entry.isToday && !isSelected
                            ? 'text-sky-400'
                            : 'text-sky-600'
                        }`}
                      />
                    )}
                  </div>

                  {entry.adherenceStatus === 'upcoming' ? (
                    <div className="mt-2 text-[10px] text-slate-400">Scheduled</div>
                  ) : entry.adherenceStatus === 'unlogged' ? (
                    <div className="mt-2 text-[10px] text-slate-400">No logs</div>
                  ) : (
                    <div className="mt-2 font-mono text-[10px] leading-tight">
                      <div className="font-bold">{entry.calories} kcal</div>
                      <div className="opacity-75">{entry.proteinG}g pro</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Selected Date Detail Inspector (4 cols) */}
        <aside className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-2xs">
          <div className="pb-4 border-b border-slate-100">
            <Badge variant="sky" size="sm" className="mb-1 font-mono">
              {selectedDay.dateIso} {selectedDay.isToday ? '· TODAY' : ''}
            </Badge>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              Schedule & Nutrition Inspector
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
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-semibold text-slate-900 block">
                    Planned Session:
                  </span>
                  <span className="text-slate-600 mt-0.5 block">
                    {selectedDay.workoutLabel}
                  </span>
                </div>
              )}
            </div>
          ) : selectedDay.adherenceStatus === 'unlogged' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
                <Utensils className="h-5 w-5 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600">
                  No nutrition entries logged for {selectedDay.dateIso}.
                </p>
                {selectedDay.isToday && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => onNavigate(NavigationTab.Diet)}
                  >
                    Log Meals for Today
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">Daily Intake</span>
                  <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                    {selectedDay.calories} kcal
                  </div>
                  <span className="text-[10px] text-slate-500">
                    of {goals.dailyCalories} kcal target
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100">
                  <span className="text-[11px] text-sky-800 font-medium">Protein Logged</span>
                  <div className="font-mono text-lg font-bold text-sky-950 mt-0.5">
                    {selectedDay.proteinG}g
                  </div>
                  <span className="text-[10px] text-sky-700">
                    of {goals.proteinG}g target
                  </span>
                </div>
              </div>

              {selectedDay.workoutLabel && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Dumbbell className="h-3.5 w-3.5 text-sky-600" />
                    <span>Completed Workout</span>
                  </span>
                  <p className="text-xs font-semibold text-slate-900">
                    {selectedDay.workoutLabel}
                  </p>
                </div>
              )}

              {selectedDay.isToday && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => onNavigate(NavigationTab.Diet)}
                  >
                    Open Today’s Food Diary
                  </Button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
