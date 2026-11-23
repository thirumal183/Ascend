import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  Minus,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  TrendingUp,
  Utensils,
  Zap,
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
import { computeDailyTotals } from '../../services/ascendApiService';
import {
  IntakeRecord,
  MealType,
  NavigationTab,
  NutritionGoals,
  OnboardingPathway,
  ProgressRecord,
  UserAccount,
  UserProfile,
  WorkoutPlan,
} from '../../types/ascend';

interface DashboardViewProps {
  userAccount: UserAccount;
  intakeRecords: IntakeRecord[];
  goals: NutritionGoals;
  userProfile: UserProfile;
  waterIntakeMl: number;
  onUpdateWater: (deltaMl: number) => void;
  todayWorkout: WorkoutPlan;
  progressHistory: ProgressRecord[];
  usingDemoData: boolean;
  onLoadDemoData: () => void;
  onNavigate: (tab: NavigationTab, preselectedMeal?: MealType) => void;
}

const MEAL_ORDER: MealType[] = [
  MealType.Breakfast,
  MealType.Lunch,
  MealType.Snacks,
  MealType.Dinner,
];

const MEAL_CONFIG: Record<
  MealType,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    bgTint: string;
    badge: string;
  }
> = {
  [MealType.Breakfast]: {
    icon: Sunrise,
    accentColor: 'text-amber-500',
    bgTint: 'bg-amber-50/70 border-amber-200/60',
    badge: 'Morning Fuel',
  },
  [MealType.Lunch]: {
    icon: Sun,
    accentColor: 'text-orange-500',
    bgTint: 'bg-orange-50/70 border-orange-200/60',
    badge: 'Midday Energy',
  },
  [MealType.Snacks]: {
    icon: Coffee,
    accentColor: 'text-emerald-500',
    bgTint: 'bg-emerald-50/70 border-emerald-200/60',
    badge: 'Energy Boost',
  },
  [MealType.Dinner]: {
    icon: Moon,
    accentColor: 'text-indigo-500',
    bgTint: 'bg-indigo-50/70 border-indigo-200/60',
    badge: 'Evening Fuel',
  },
};

const DATE_OPTIONS = ['Yesterday, Oct 26', 'Today, Oct 27', 'Tomorrow, Oct 28'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  userAccount,
  intakeRecords,
  goals,
  userProfile,
  waterIntakeMl,
  onUpdateWater,
  todayWorkout,
  progressHistory,
  usingDemoData,
  onLoadDemoData,
  onNavigate,
}) => {
  const [dateIdx, setDateIdx] = useState(1);

  const dailyTotals = computeDailyTotals(intakeRecords);

  const calPct = Math.min(
    100,
    Math.round((dailyTotals.calories / Math.max(1, goals.dailyCalories)) * 100)
  );
  const proPct = Math.min(
    100,
    Math.round((dailyTotals.proteinG / Math.max(1, goals.proteinG)) * 100)
  );
  const carbPct = Math.min(
    100,
    Math.round((dailyTotals.carbsG / Math.max(1, goals.carbsG)) * 100)
  );
  const fatPct = Math.min(
    100,
    Math.round((dailyTotals.fatG / Math.max(1, goals.fatG)) * 100)
  );
  const waterPct = Math.min(
    100,
    Math.round((waterIntakeMl / Math.max(1, goals.waterMl)) * 100)
  );

  const remainingCalories = Math.max(
    0,
    goals.dailyCalories - dailyTotals.calories
  );
  const remainingProtein = Math.max(
    0,
    Math.round((goals.proteinG - dailyTotals.proteinG) * 10) / 10
  );

  const completedExercises = todayWorkout.exercises.filter(
    (e) => e.completed
  ).length;
  const totalExercises = todayWorkout.exercises.length;
  const workoutPct = Math.round(
    (completedExercises / Math.max(1, totalExercises)) * 100
  );

  const firstName = (userAccount.name || 'Friend').split(' ')[0];

  // Pathway styling tokens
  const isAthlete =
    userProfile.pathway === OnboardingPathway.AthletePerformance;
  const isMuscleGain = userProfile.pathway === OnboardingPathway.MuscleGain;

  const pathwayTheme = isAthlete
    ? {
        badge: 'bg-sky-50 text-sky-700 border-sky-200/80',
        accentBg: 'bg-sky-50',
        accentText: 'text-sky-600',
        ringFill: 'from-sky-500 to-indigo-600',
        icon: Flame,
      }
    : isMuscleGain
    ? {
        badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
        accentBg: 'bg-amber-50',
        accentText: 'text-amber-600',
        ringFill: 'from-amber-500 to-orange-600',
        icon: Dumbbell,
      }
    : {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        accentBg: 'bg-emerald-50',
        accentText: 'text-emerald-600',
        ringFill: 'from-emerald-500 to-teal-600',
        icon: Heart,
      };

  const PathwayIcon = pathwayTheme.icon;

  const getConciseAiInsight = () => {
    if (intakeRecords.length === 0) {
      return {
        headline: 'Ready to log your first meal today',
        body: `Your ${userProfile.pathway} target is ${goals.dailyCalories.toLocaleString()} kcal with ${goals.proteinG}g of protein. Logging breakfast or lunch is the easiest way to start tracking your daily balance.`,
        actionLabel: 'Log Your First Meal',
        actionTab: NavigationTab.Diet,
      };
    }

    if (isAthlete) {
      return {
        headline: 'Athlete Fueling & Hydration Focus',
        body: `You’ve logged ${dailyTotals.calories.toLocaleString()} kcal, ${dailyTotals.proteinG}g protein, and ${(waterIntakeMl / 1000).toFixed(2)}L water. With ${remainingCalories.toLocaleString()} kcal remaining, prioritize complex carbohydrates and ${remainingProtein}g protein around your ${todayWorkout.title} session.`,
        actionLabel: 'Ask AI Coach for Post-Workout Meal',
        actionTab: NavigationTab.AiCoach,
      };
    }

    if (isMuscleGain) {
      return {
        headline: 'Calorie Surplus & Protein Pacing',
        body: `You have ${remainingCalories.toLocaleString()} kcal and ${remainingProtein}g of protein left to hit your muscle-gain target of ${goals.dailyCalories.toLocaleString()} kcal today. Adding a protein-dense dinner will keep your daily surplus consistent.`,
        actionLabel: 'Get High-Protein Dinner Ideas',
        actionTab: NavigationTab.AiCoach,
      };
    }

    return {
      headline: 'Everyday Nutrition Balance',
      body: `You’re at ${calPct}% of your daily calorie goal (${dailyTotals.calories.toLocaleString()} / ${goals.dailyCalories.toLocaleString()} kcal) and ${proPct}% of your protein target. You have ${remainingCalories.toLocaleString()} kcal remaining for a balanced evening meal.`,
      actionLabel: 'Open AI Nutrition Coach',
      actionTab: NavigationTab.AiCoach,
    };
  };

  const aiInsight = getConciseAiInsight();

  return (
    <div className="space-y-7 pb-20 lg:pb-12 animate-page-enter">
      {/* SECTION 1: Greeting, Pathway Focus, Date Selector, Main Calorie Progress & Compact Macros */}
      <section aria-label="Daily Nutrition Summary" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Hello, {firstName}
              </h1>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${pathwayTheme.badge}`}>
                <PathwayIcon className="h-3 w-3" />
                <span>{userProfile.pathway}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
              <span>Goal: <strong className="text-slate-800 font-semibold">{userProfile.goalType}</strong></span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Training: <strong className="text-slate-800 font-semibold">{userProfile.trainingDaysPerWeek} sessions/wk</strong></span>
              {usingDemoData && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.2 rounded border border-amber-200/60 text-[11px]">
                    Demo Preset
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setDateIdx((prev) => Math.max(0, prev - 1))}
                disabled={dateIdx === 0}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-800">
                <Calendar className="h-3.5 w-3.5 text-sky-600" />
                <span>{DATE_OPTIONS[dateIdx]}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDateIdx((prev) =>
                    Math.min(DATE_OPTIONS.length - 1, prev + 1)
                  )
                }
                disabled={dateIdx === DATE_OPTIONS.length - 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* HERO CALORIE & DAILY PROGRESS CARD */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-slate-500">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  {isMuscleGain
                    ? 'Target Calorie Surplus'
                    : isAthlete
                    ? 'Performance Fuel Budget'
                    : 'Daily Calorie Balance'}
                </span>
              </div>

              <div className="flex items-baseline gap-2.5 pt-1">
                <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tight tabular-nums">
                  {dailyTotals.calories.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-slate-400 font-mono tabular-nums">
                  / {goals.dailyCalories.toLocaleString()} kcal target
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                {remainingCalories > 0 ? (
                  <span className="font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                    {remainingCalories.toLocaleString()} kcal remaining for today
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                    Daily calorie target achieved!
                  </span>
                )}
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">
                  {intakeRecords.length} items logged
                </span>
              </div>
            </div>

            {/* Target Gauge & Percent Bar */}
            <div className="w-full lg:max-w-md space-y-2 bg-slate-50/70 border border-slate-200/60 p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Daily Target Completion</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  {calPct}%
                </span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-slate-200/70 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${pathwayTheme.ringFill}`}
                  style={{ width: `${Math.min(100, calPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>0 kcal</span>
                <span>{goals.dailyCalories.toLocaleString()} kcal</span>
              </div>
            </div>
          </div>

          {/* 4 REFINED MACRO CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Protein */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white via-sky-50/30 to-sky-50/60 border border-sky-100 hover:border-sky-200 transition-all space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  <span>Protein</span>
                </span>
                <span className="font-mono text-xs font-semibold text-sky-700 bg-sky-100/70 px-1.5 py-0.2 rounded">
                  {proPct}%
                </span>
              </div>
              <div className="font-mono text-xl font-black text-slate-900 tabular-nums">
                {dailyTotals.proteinG}g{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {goals.proteinG}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-sky-100/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, proPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{remainingProtein > 0 ? `${remainingProtein}g left` : 'Met'}</span>
                <span className="font-mono text-[10px] text-sky-700">~4 kcal/g</span>
              </div>
            </div>

            {/* Carbohydrates */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/60 border border-emerald-100 hover:border-emerald-200 transition-all space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Carbohydrates</span>
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                  {carbPct}%
                </span>
              </div>
              <div className="font-mono text-xl font-black text-slate-900 tabular-nums">
                {dailyTotals.carbsG}g{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {goals.carbsG}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-emerald-100/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, carbPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{Math.max(0, goals.carbsG - dailyTotals.carbsG)}g left</span>
                <span className="font-mono text-[10px] text-emerald-700">Energy fuel</span>
              </div>
            </div>

            {/* Dietary Fat */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white via-amber-50/30 to-amber-50/60 border border-amber-100 hover:border-amber-200 transition-all space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Dietary Fat</span>
                </span>
                <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded">
                  {fatPct}%
                </span>
              </div>
              <div className="font-mono text-xl font-black text-slate-900 tabular-nums">
                {dailyTotals.fatG}g{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {goals.fatG}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-amber-100/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, fatPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{Math.max(0, goals.fatG - dailyTotals.fatG)}g left</span>
                <span className="font-mono text-[10px] text-amber-700">~9 kcal/g</span>
              </div>
            </div>

            {/* Hydration / Water */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white via-cyan-50/30 to-cyan-50/60 border border-cyan-100 hover:border-cyan-200 transition-all flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Hydration</span>
                  {waterIntakeMl >= goals.waterMl && (
                    <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100 px-1.5 py-0.2 rounded">
                      Met
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateWater(-250)}
                    disabled={waterIntakeMl <= 0}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 active:scale-95 text-slate-600 transition-all"
                    aria-label="Subtract 250ml water"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateWater(250)}
                    className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-semibold transition-all shadow-2xs"
                  >
                    +250
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateWater(500)}
                    className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 text-xs font-medium transition-all"
                  >
                    +500
                  </button>
                </div>
              </div>
              <div className="font-mono text-xl font-black text-slate-900 tabular-nums">
                {(waterIntakeMl / 1000).toFixed(2)}L{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {(goals.waterMl / 1000).toFixed(1)}L
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-cyan-100/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, waterPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{waterPct}% target</span>
                <span className="font-mono text-[10px] text-cyan-700">Water intake</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 & SECTION 3 SPLIT: Today's Meals + Pathway Workout Summary & AI Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SECTION 2: Today's Meals */}
        <section
          aria-label="Today's Meals"
          className="lg:col-span-7 bg-white border border-slate-200/85 rounded-2xl p-6 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {dateIdx === 1
                  ? "Today’s Meals"
                  : dateIdx === 0
                  ? "Yesterday’s Meals"
                  : "Tomorrow’s Planned Meals"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {intakeRecords.length === 0
                  ? 'No meals logged yet today'
                  : `${intakeRecords.length} items logged (${dailyTotals.calories.toLocaleString()} kcal)`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(NavigationTab.Diet)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] rounded-xl transition-all self-start sm:self-auto shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Food</span>
            </button>
          </div>

          {dateIdx === 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>Viewing Yesterday (Oct 26) nutritional summary.</span>
              <button
                type="button"
                onClick={() => setDateIdx(1)}
                className="font-semibold text-sky-600 hover:text-sky-700 underline"
              >
                Jump to Today
              </button>
            </div>
          )}
          {dateIdx === 2 && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-center justify-between">
              <span>Pre-planning for Tomorrow (Oct 28).</span>
              <button
                type="button"
                onClick={() => onNavigate(NavigationTab.Diet)}
                className="font-semibold text-sky-700 hover:text-sky-900 underline"
              >
                Pre-log Meals
              </button>
            </div>
          )}

          {intakeRecords.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-2xs">
                <Utensils className="h-5 w-5" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Your meal log is ready
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Log your first meal to track calories and macros against your {userProfile.pathway.toLowerCase()} targets.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(NavigationTab.Diet, MealType.Breakfast)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Breakfast</span>
                </button>
                <button
                  type="button"
                  onClick={onLoadDemoData}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
                >
                  Load Sample Day
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {MEAL_ORDER.map((meal) => {
                const items = intakeRecords.filter((r) => r.meal === meal);
                const mealCalories = items.reduce(
                  (sum, item) => sum + item.computedNutrients.calories,
                  0
                );
                const config = MEAL_CONFIG[meal];
                const MealIcon = config.icon;

                return (
                  <div
                    key={meal}
                    className="p-4 rounded-xl border border-slate-200/70 hover:border-slate-300 transition-all bg-white"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${config.bgTint}`}>
                          <MealIcon className={`h-4 w-4 ${config.accentColor}`} />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 block leading-tight">
                            {meal}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {mealCalories} kcal · {items.length} item{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate(NavigationTab.Diet, meal)}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
                      >
                        + Add Food
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1 italic">
                        Nothing logged for {meal.toLowerCase()} yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="py-2 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                {item.foodName}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {item.quantity} {item.unit} · P {item.computedNutrients.proteinG}g · C {item.computedNutrients.carbsG}g · F {item.computedNutrients.fatG}g
                              </p>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-900 shrink-0 bg-slate-50 px-2 py-1 rounded border border-slate-100 tabular-nums">
                              {item.computedNutrients.calories} kcal
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: AI Coach Insight + Pathway-Adapted Workout Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* Concise AI Insight Card */}
          <section
            aria-label="AI Coach Insight"
            className="bg-gradient-to-br from-slate-950 via-[#0B1221] to-slate-900 text-white rounded-2xl p-6 space-y-4 border border-slate-800/80 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                <span>AI Nutrition Guidance</span>
              </div>
              <span className="text-[11px] text-slate-400 border border-slate-700/80 px-2 py-0.5 rounded-full">
                {userProfile.pathway}
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display text-base font-bold text-white leading-snug">
                {aiInsight.headline}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {aiInsight.body}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Local heuristic engine
              </span>
              <button
                type="button"
                onClick={() => onNavigate(aiInsight.actionTab)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 active:scale-[0.99] rounded-xl transition-all shadow-2xs"
              >
                <span>{aiInsight.actionLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>

          {/* Pathway-Adapted Workout Summary */}
          <section
            aria-label="Today's Workout Summary"
            className="bg-white border border-slate-200/85 rounded-2xl p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600">
                  <Dumbbell className="h-3.5 w-3.5" />
                  <span>
                    {isAthlete
                      ? 'Scheduled Athletic Session'
                      : isMuscleGain
                      ? 'Hypertrophy Training Routine'
                      : 'Today’s Active Movement'}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                  {todayWorkout.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Focus: {todayWorkout.focusArea} · ~{todayWorkout.estimatedMinutes} mins · {todayWorkout.intensityLabel} Intensity
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    {completedExercises} of {totalExercises} exercises completed
                  </span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {workoutPct}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${workoutPct}%` }}
                />
              </div>
            </div>

            {/* Exercise preview pills */}
            <div className="space-y-1.5 pt-1">
              {todayWorkout.exercises.slice(0, 3).map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-50 text-xs"
                >
                  <span className={`truncate ${ex.completed ? 'line-through text-slate-400' : 'font-medium text-slate-700'}`}>
                    {ex.name}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {ex.sets} × {ex.reps}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500 font-mono">
                Burn ~{todayWorkout.targetCaloriesBurned} kcal
              </span>
              <button
                type="button"
                onClick={() => onNavigate(NavigationTab.Workouts)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] rounded-xl transition-all"
              >
                <span>
                  {completedExercises > 0 && completedExercises < totalExercises
                    ? 'Continue Workout'
                    : 'Open Workout'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* SECTION 4: Compact Progress Preview with Area Chart */}
      <section
        aria-label="Progress Preview"
        className="bg-white border border-slate-200/85 rounded-2xl p-6 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Biometric Trend</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              {isMuscleGain
                ? 'Body Weight & Hypertrophy Curve'
                : 'Weight & Goal Progress Trajectory'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current: <strong className="font-mono text-slate-800">{userProfile.currentWeightKg} kg</strong> · Target:{' '}
              <strong className="font-mono text-sky-700">{userProfile.targetWeightKg} kg</strong>
              {usingDemoData ? ' · Labeled sample baseline' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(NavigationTab.Progress)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] rounded-xl transition-all self-start sm:self-auto"
          >
            <span>View All Checkpoints</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {progressHistory.length <= 1 && !usingDemoData ? (
          <div className="py-10 text-center space-y-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm font-semibold text-slate-800">
              Starting Checkpoint Recorded: {userProfile.currentWeightKg} kg
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Log additional weight check-ins on the Progress page to visualize your weekly trend curve.
            </p>
            <button
              type="button"
              onClick={() => onNavigate(NavigationTab.Progress)}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-2xs"
            >
              Log Next Check-In
            </button>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={progressHistory}
                margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dashWeightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={['dataMin - 0.8', 'dataMax + 0.8']}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`${val ?? 0} kg`, 'Weight']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fill="url(#dashWeightGrad)"
                  dot={{ r: 4, fill: '#0284C7', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6, fill: '#0284C7', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
};
