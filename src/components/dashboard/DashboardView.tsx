import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  Minus,
  Moon,
  Plus,
  RotateCcw,
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
import { getDateWithOffset } from '../../utils/dateUtils';
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
import {
  formatCalories,
  formatGrams,
  formatNumber,
} from '../../utils/formatters';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MetricStat } from '../ui/MetricStat';
import { ProgressBar } from '../ui/ProgressBar';
import { ProgressRing } from '../ui/ProgressRing';

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
  // Dynamic Date calculation based on local system time
  const [dateOffset, setDateOffset] = useState<number>(0); // 0 = today, -1 = yesterday, +1 = tomorrow
  const [previewSkeleton, setPreviewSkeleton] = useState(false);

  const { activeDateIso, formattedDate } = useMemo(() => {
    const info = getDateWithOffset(dateOffset);
    return {
      activeDateIso: info.dateIso,
      formattedDate: info.displayLabel,
    };
  }, [dateOffset]);

  // Filter intake records specifically for the active selected day (Yesterday / Today / Tomorrow)
  const dayIntakeRecords = useMemo(
    () => intakeRecords.filter((r) => r.dateIso === activeDateIso),
    [intakeRecords, activeDateIso]
  );

  const dailyTotals = useMemo(
    () => computeDailyTotals(dayIntakeRecords),
    [dayIntakeRecords]
  );

  const {
    calPct,
    proPct,
    carbPct,
    fatPct,
    waterPct,
    remainingCalories,
    remainingProtein,
    remainingCarbs,
    remainingFat,
  } = useMemo(() => {
    return {
      calPct: Math.min(
        100,
        Math.round((dailyTotals.calories / Math.max(1, goals.dailyCalories)) * 100)
      ),
      proPct: Math.min(
        100,
        Math.round((dailyTotals.proteinG / Math.max(1, goals.proteinG)) * 100)
      ),
      carbPct: Math.min(
        100,
        Math.round((dailyTotals.carbsG / Math.max(1, goals.carbsG)) * 100)
      ),
      fatPct: Math.min(
        100,
        Math.round((dailyTotals.fatG / Math.max(1, goals.fatG)) * 100)
      ),
      waterPct: Math.min(
        100,
        Math.round((waterIntakeMl / Math.max(1, goals.waterMl)) * 100)
      ),
      remainingCalories: Math.max(
        0,
        goals.dailyCalories - dailyTotals.calories
      ),
      remainingProtein: Math.max(
        0,
        Math.round((goals.proteinG - dailyTotals.proteinG) * 10) / 10
      ),
      remainingCarbs: Math.max(
        0,
        Math.round((goals.carbsG - dailyTotals.carbsG) * 10) / 10
      ),
      remainingFat: Math.max(
        0,
        Math.round((goals.fatG - dailyTotals.fatG) * 10) / 10
      ),
    };
  }, [dailyTotals, goals, waterIntakeMl]);

  const completedExercises = todayWorkout.exercises.filter((e) => e.completed).length;
  const totalExercises = todayWorkout.exercises.length;
  const workoutPct = Math.round(
    (completedExercises / Math.max(1, totalExercises)) * 100
  );

  const firstName = (userAccount.name || 'Friend').split(' ')[0];

  const isAthlete = userProfile.pathway === OnboardingPathway.AthletePerformance;
  const isMuscleGain = userProfile.pathway === OnboardingPathway.MuscleGain;
  const isGeneral = !isAthlete && !isMuscleGain;

  // Group meals by meal type for active selected day
  const mealsByType = useMemo(() => {
    return {
      [MealType.Breakfast]: dayIntakeRecords.filter(
        (r) => r.meal === MealType.Breakfast
      ),
      [MealType.Lunch]: dayIntakeRecords.filter((r) => r.meal === MealType.Lunch),
      [MealType.Snacks]: dayIntakeRecords.filter(
        (r) => r.meal === MealType.Snacks
      ),
      [MealType.Dinner]: dayIntakeRecords.filter(
        (r) => r.meal === MealType.Dinner
      ),
    };
  }, [dayIntakeRecords]);

  // Contextual Horizon Next-Action Determination
  const contextualAction = useMemo(() => {
    const hasBreakfast = (mealsByType[MealType.Breakfast]?.length ?? 0) > 0;
    const hasLunch = (mealsByType[MealType.Lunch]?.length ?? 0) > 0;
    const hasDinner = (mealsByType[MealType.Dinner]?.length ?? 0) > 0;

    if (!hasBreakfast) {
      return {
        title: 'Morning Fueling Horizon',
        description:
          'Prime your metabolism with balanced breakfast protein and hydrate with 500ml water.',
        actionLabel: 'Log Breakfast',
        targetMeal: MealType.Breakfast,
        tag: 'First Feeding',
      };
    }
    if (!hasLunch) {
      return {
        title: 'Midday Energy Window',
        description:
          'Log your lunch meal to sustain focus and avoid afternoon glucose crashes.',
        actionLabel: 'Log Lunch',
        targetMeal: MealType.Lunch,
        tag: 'Midday Fuel',
      };
    }
    if (isAthlete && completedExercises === 0) {
      return {
        title: 'Performance Training Scheduled',
        description: `${todayWorkout.title} (~${todayWorkout.estimatedMinutes}m) is scheduled. Consume pre-workout fuel.`,
        actionLabel: 'Start Workout',
        targetTab: NavigationTab.Workouts,
        tag: 'Session Priority',
      };
    }
    if (!hasDinner) {
      return {
        title: 'Evening Recovery Nutrition',
        description: `You have ${formatCalories(remainingCalories)} kcal and ${formatGrams(remainingProtein)} protein remaining today.`,
        actionLabel: 'Log Dinner',
        targetMeal: MealType.Dinner,
        tag: 'Evening Nutrition',
      };
    }
    return {
      title: 'Daily Nutrition Complete',
      description:
        'All primary meal windows are logged. Great job fueling your health today!',
      actionLabel: 'View Reports',
      targetTab: NavigationTab.Reports,
      tag: 'Targets Met',
    };
  }, [
    mealsByType,
    isAthlete,
    completedExercises,
    todayWorkout,
    remainingCalories,
    remainingProtein,
  ]);

  // Estimated Surplus calculation for Muscle Gain
  const estimatedTdee = Math.round(goals.dailyCalories * 0.85); // Estimated maintenance
  const surplusKcal = dailyTotals.calories - estimatedTdee;
  const targetSurplusKcal = goals.dailyCalories - estimatedTdee;

  // Meal items by meal type for active selected day
  const getMealItems = (meal: MealType) =>
    dayIntakeRecords.filter((r) => r.meal === meal);

  // Quick logging helper
  const handleQuickAddFood = (meal: MealType) => {
    onNavigate(NavigationTab.Diet, meal);
  };

  // -------------------------------------------------------------
  // SKELETON LOADING PREVIEW
  // -------------------------------------------------------------
  if (previewSkeleton) {
    return (
      <div className="space-y-6 pb-20 animate-fade-in" aria-label="Loading skeleton preview">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <Button variant="outline" size="sm" onClick={() => setPreviewSkeleton(false)}>
            Close Skeleton Preview
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200/80 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-200/80 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-20 lg:pb-12 animate-page-enter">
      {/* ========================================================= */}
      {/* TOP HEADER BAR: Greeting, Pathway Badge & Date Selector  */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hello, {firstName}
            </h1>
            <Badge
              variant={isAthlete ? 'sky' : isMuscleGain ? 'amber' : 'emerald'}
              size="md"
              className="gap-1.5"
            >
              {isAthlete ? (
                <Flame className="h-3.5 w-3.5" />
              ) : isMuscleGain ? (
                <Dumbbell className="h-3.5 w-3.5" />
              ) : (
                <Heart className="h-3.5 w-3.5" />
              )}
              <span>{userProfile.pathway}</span>
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
            <span>
              Goal:{' '}
              <strong className="text-slate-800 font-semibold">
                {userProfile.goalType}
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              Training:{' '}
              <strong className="text-slate-800 font-semibold">
                {userProfile.trainingDaysPerWeek} sessions/wk
              </strong>
            </span>
            {usingDemoData && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 text-[11px]">
                  Sample Demo Baseline
                </span>
              </>
            )}
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setDateOffset((prev) => prev - 1)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-sky-600" />
              <span>{formattedDate}</span>
            </div>
            <button
              type="button"
              onClick={() => setDateOffset((prev) => prev + 1)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPreviewSkeleton(true)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Inspect loading skeleton state"
          >
            Skeletons
          </button>
        </div>
      </div>

      {/* Contextual Horizon Next-Action Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/60 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3.5">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isAthlete
                ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
                : isMuscleGain
                ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isAthlete
                    ? 'bg-sky-400/15 text-sky-300 border border-sky-400/30'
                    : isMuscleGain
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                    : 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30'
                }`}
              >
                {contextualAction.tag}
              </span>
              <h3 className="text-sm font-bold text-white">
                {contextualAction.title}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {contextualAction.description}
            </p>
          </div>
        </div>
        <div className="self-end sm:self-auto shrink-0">
          <Button
            variant="pathway"
            pathway={userProfile.pathway}
            size="sm"
            onClick={() => {
              if (contextualAction.targetTab) {
                onNavigate(contextualAction.targetTab);
              } else if (contextualAction.targetMeal) {
                handleQuickAddFood(contextualAction.targetMeal);
              }
            }}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            {contextualAction.actionLabel}
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PATHWAY 1: GENERAL NUTRITION & DIET DASHBOARD            */}
      {/* Priorities: Daily Nutrition, Calorie Balance, Habits     */}
      {/* ========================================================= */}
      {isGeneral && (
        <div className="space-y-7 animate-fade-in">
          {/* Hero Widget: Calorie Balance & Daily Energy Arc */}
          <div className="ascend-card-v2 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <ProgressRing
                  value={calPct}
                  size={120}
                  strokeWidth={10}
                  pathway={OnboardingPathway.GeneralFitness}
                  centerLabel="of Goal"
                  centerValue={`${calPct}%`}
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5" />
                    <span>Daily Calorie Balance</span>
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tight tabular-nums">
                      {dailyTotals.calories.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 font-mono tabular-nums">
                      / {goals.dailyCalories.toLocaleString()} kcal target
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 pt-0.5">
                    {remainingCalories > 0 ? (
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {remainingCalories.toLocaleString()} kcal remaining for today
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Daily calorie budget achieved!
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Actions Dock: General Nutrition */}
              <div className="flex flex-wrap items-center gap-2.5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                <Button
                  variant="pathway"
                  pathway={OnboardingPathway.GeneralFitness}
                  size="sm"
                  onClick={() => onNavigate(NavigationTab.Diet)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Log Food
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateWater(250)}
                  leftIcon={<Droplets className="h-4 w-4 text-cyan-600" />}
                >
                  +250ml Water
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(NavigationTab.Progress)}
                  leftIcon={<TrendingUp className="h-4 w-4 text-slate-600" />}
                >
                  Check-In
                </Button>
              </div>
            </div>

            {/* 3 Macro Cards (clean tonal wells) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100/80 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-sky-950">
                  <span>Protein</span>
                  <span className="font-mono">{formatGrams(dailyTotals.proteinG)} / {formatGrams(goals.proteinG)}</span>
                </div>
                <ProgressBar value={proPct} color="bg-sky-600" height="sm" />
                <span className="text-[11px] text-slate-500 font-mono block">
                  {formatGrams(remainingProtein)} left ({proPct}%)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100/80 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-emerald-950">
                  <span>Carbohydrates</span>
                  <span className="font-mono">{formatGrams(dailyTotals.carbsG)} / {formatGrams(goals.carbsG)}</span>
                </div>
                <ProgressBar value={carbPct} color="bg-emerald-600" height="sm" />
                <span className="text-[11px] text-slate-500 font-mono block">
                  {formatGrams(remainingCarbs)} left ({carbPct}%)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100/80 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-amber-950">
                  <span>Dietary Fat</span>
                  <span className="font-mono">{formatGrams(dailyTotals.fatG)} / {formatGrams(goals.fatG)}</span>
                </div>
                <ProgressBar value={fatPct} color="bg-amber-600" height="sm" />
                <span className="text-[11px] text-slate-500 font-mono block">
                  {formatGrams(remainingFat)} left ({fatPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Split: Meals Timeline + Healthy Habits & AI Guidance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Meals Timeline (7 cols) - borderless tonal styling */}
            <section
              aria-label="Today's Meal Timeline"
              className="lg:col-span-7 ascend-card-v2 p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Daily Meals Timeline
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track meals throughout the day for balanced satiety and steady glucose
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate(NavigationTab.Diet)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Log Item
                </Button>
              </div>

              <div className="space-y-3">
                {[
                  { meal: MealType.Breakfast, title: 'Breakfast', icon: Sunrise, tag: 'Morning Energy' },
                  { meal: MealType.Lunch, title: 'Lunch', icon: Sun, tag: 'Midday Fuel' },
                  { meal: MealType.Snacks, title: 'Snacks', icon: Coffee, tag: 'Mindful Snack' },
                  { meal: MealType.Dinner, title: 'Dinner', icon: Moon, tag: 'Evening Nutrition' },
                ].map(({ meal, title, icon: Icon, tag }) => {
                  const items = getMealItems(meal);
                  const mealCals = items.reduce(
                    (sum, i) => sum + i.computedNutrients.calories,
                    0
                  );
                  return (
                    <div
                      key={meal}
                      className="p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {title}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {tag} · {items.length} logged
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {mealCals} kcal
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickAddFood(meal)}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline p-1"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {items.length === 0 ? (
                        <p className="text-xs text-slate-500 italic pl-8">
                          No food logged for {title.toLowerCase()} yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100 pl-8">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="py-1.5 flex items-center justify-between text-xs gap-2"
                            >
                              <span className="text-slate-800 font-medium min-w-0 truncate">
                                {item.foodName} ({item.quantity} {item.unit})
                              </span>
                              <span className="font-mono text-slate-600 shrink-0">
                                {formatCalories(item.computedNutrients.calories)} kcal · P {formatGrams(item.computedNutrients.proteinG)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right Column (5 cols): Hydration & AI Coach Habit Advice */}
            <div className="lg:col-span-5 space-y-6">
              {/* Daily Hydration Card */}
              <Card variant="default" className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100">
                      <Droplets className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Hydration Tracker
                      </h3>
                      <p className="text-xs text-slate-500">
                        Target: {(goals.waterMl / 1000).toFixed(1)}L per day
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-100">
                    {(waterIntakeMl / 1000).toFixed(2)}L
                  </span>
                </div>

                <ProgressBar value={waterPct} color="bg-cyan-600" height="md" />

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onUpdateWater(-250)}
                    disabled={waterIntakeMl <= 0}
                    className="h-9 w-9 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    aria-label="Subtract 250ml water"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[70px] text-xs"
                    onClick={() => onUpdateWater(250)}
                  >
                    +250ml
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[70px] text-xs"
                    onClick={() => onUpdateWater(500)}
                  >
                    +500ml
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[70px] text-xs"
                    onClick={() => onUpdateWater(750)}
                  >
                    +750ml
                  </Button>
                </div>
              </Card>

              {/* AI Guidance Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-[#0B1221] text-white border border-emerald-900/50 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Everyday Nutrition Coaching</span>
                  </span>
                  <Badge variant="emerald" size="sm">
                    Habits Focus
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Balance your evening meal for steady energy
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  You have {formatCalories(remainingCalories)} kcal and {formatGrams(remainingProtein)} protein remaining. Incorporating leafy greens, lentils or fish will fulfill your micronutrient targets without exceeding your calorie budget.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-950 bg-emerald-400 hover:bg-emerald-300 border-none font-bold"
                  onClick={() => onNavigate(NavigationTab.AiCoach)}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Ask Coach for Dinner Ideas
                </Button>
              </div>

              {/* Active Movement Preview */}
              <Card variant="default" className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    <span>Daily Movement Plan</span>
                  </span>
                  <Badge variant="slate" size="sm">
                    {todayWorkout.estimatedMinutes} mins
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-900">
                  {todayWorkout.title}
                </p>
                <p className="text-xs text-slate-500">
                  Focus: {todayWorkout.focusArea} · {completedExercises}/{totalExercises} exercises done
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onNavigate(NavigationTab.Workouts)}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  View Workout Session
                </Button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PATHWAY 2: ATHLETE PERFORMANCE DASHBOARD                 */}
      {/* Priorities: Training Spotlight, Fueling, Glycogen        */}
      {/* ========================================================= */}
      {isAthlete && (
        <div className="space-y-7 animate-fade-in">
          {/* Athlete Hero Widget: Training Session Spotlight */}
          <Card variant="dark" className="border-sky-500/30 p-6 sm:p-7 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="sky" size="sm" className="gap-1">
                    <Flame className="h-3 w-3" />
                    <span>Priority Training Session</span>
                  </Badge>
                  <span className="text-xs text-sky-400 font-mono">
                    ~{todayWorkout.estimatedMinutes} mins · {todayWorkout.intensityLabel} Intensity
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {todayWorkout.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  Focus: <strong className="text-white">{todayWorkout.focusArea}</strong> · Expected Calorie Expenditure:{' '}
                  <strong className="text-sky-300 font-mono">~{todayWorkout.targetCaloriesBurned} kcal</strong>
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-2 w-48 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-300"
                      style={{ width: `${workoutPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-300 font-semibold">
                    {completedExercises}/{totalExercises} Complete ({workoutPct}%)
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/25"
                  onClick={() => onNavigate(NavigationTab.Workouts)}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {completedExercises > 0 ? 'Resume Workout Runner' : 'Start Athletic Session'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-slate-700 text-white hover:bg-slate-800"
                  onClick={() => onNavigate(NavigationTab.Diet)}
                >
                  Log Fueling
                </Button>
              </div>
            </div>
          </Card>

          {/* 4 Athlete Metric Gauges: Fueling Budget, Glycogen Carbs, Protein Timing, Fluid Loss */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricStat
              label="Performance Energy"
              value={formatCalories(dailyTotals.calories)}
              unit={`/ ${formatCalories(goals.dailyCalories)} kcal`}
              subValue={`${formatCalories(remainingCalories)} kcal left to fuel`}
              pathway={OnboardingPathway.AthletePerformance}
              icon={Zap}
            />
            <MetricStat
              label="Glycogen Carbs"
              value={formatGrams(dailyTotals.carbsG)}
              unit={`/ ${formatGrams(goals.carbsG)}`}
              subValue={`${formatGrams(remainingCarbs)} available for training`}
              pathway={OnboardingPathway.AthletePerformance}
              icon={Flame}
            />
            <MetricStat
              label="Recovery Protein"
              value={formatGrams(dailyTotals.proteinG)}
              unit={`/ ${formatGrams(goals.proteinG)}`}
              subValue={`${formatGrams(remainingProtein)} for tissue repair`}
              pathway={OnboardingPathway.AthletePerformance}
              icon={Dumbbell}
            />
            <MetricStat
              label="Hydration Replenish"
              value={`${(waterIntakeMl / 1000).toFixed(2)}L`}
              unit={`/ ${(goals.waterMl / 1000).toFixed(1)}L`}
              subValue={waterIntakeMl >= goals.waterMl ? 'Optimal hydration' : 'Replenish active fluids'}
              pathway={OnboardingPathway.AthletePerformance}
              icon={Droplets}
            />
          </div>

          {/* Two-Column Athlete Split: Nutrient Timing & Fuel Schedule + Performance AI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 cols: Athlete Nutrient Timing & Meal Fueling */}
            <section
              aria-label="Athlete Fueling Schedule"
              className="lg:col-span-7 ascend-card-v2 p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Performance Nutrient Timing
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structure carbohydrate and protein intake around your training session
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate(NavigationTab.Diet)}
                >
                  Log Performance Meal
                </Button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    phase: 'Pre-Workout Fueling',
                    timing: '60–90 mins before training',
                    recommended: '40–50g complex carbohydrates + 20g protein',
                    icon: Zap,
                    meal: MealType.Breakfast,
                  },
                  {
                    phase: 'Intra-Workout Hydration & Electrolytes',
                    timing: 'During training',
                    recommended: '500ml water + electrolytes per 45 min session',
                    icon: Droplets,
                    meal: MealType.Lunch,
                  },
                  {
                    phase: 'Post-Workout Recovery Window',
                    timing: 'Within 45 mins post session',
                    recommended: '30–35g fast-digesting protein + 40g replenishing carbs',
                    icon: RotateCcw,
                    meal: MealType.Snacks,
                  },
                  {
                    phase: 'Evening Replenishment',
                    timing: '3 hours before sleep',
                    recommended: 'Slow-digesting protein (casein/dal/paneer) for recovery',
                    icon: Moon,
                    meal: MealType.Dinner,
                  },
                ].map(({ phase, timing, recommended, icon: Icon, meal }) => {
                  const loggedItems = getMealItems(meal);
                  return (
                    <div
                      key={phase}
                      className="p-4 rounded-xl border border-sky-100 bg-sky-50/20 space-y-2 hover:border-sky-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-sky-600 text-white">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {phase}
                            </span>
                            <span className="text-[10px] text-sky-700 font-semibold">
                              {timing}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickAddFood(meal)}
                          className="text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                        >
                          + Log Fuel
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 pl-8">
                        Target guideline: {recommended}
                      </p>
                      {loggedItems.length > 0 && (
                        <div className="pl-8 pt-1 text-[11px] font-mono text-slate-700 flex flex-wrap gap-2">
                          {loggedItems.map((i) => (
                            <span key={i.id} className="bg-white px-2 py-0.5 rounded border border-slate-200">
                              {i.foodName} ({formatCalories(i.computedNutrients.calories)} kcal)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right 5 cols: Performance AI Coach & Fluid Balance */}
            <div className="lg:col-span-5 space-y-6">
              {/* Athlete AI Guidance Card */}
              <div className="p-6 rounded-2xl bg-[#070D18] text-white border border-sky-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between text-xs text-sky-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Athletic Fueling Engine</span>
                  </span>
                  <Badge variant="sky" size="sm">
                    High Intensity
                  </Badge>
                </div>
                <h4 className="text-base font-bold text-white">
                  Carb intake pacing for today’s session
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  With {todayWorkout.title} scheduled, consume 45g of easily digestible carbohydrates 45 mins before your session. You still have {formatGrams(remainingCarbs)} of carbs in your daily budget.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                  onClick={() => onNavigate(NavigationTab.AiCoach)}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Ask Coach for Pre-Workout Snack
                </Button>
              </div>

              {/* Workout History Teaser */}
              <Card variant="default" className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-sky-600" />
                    <span>Weekly Athletic Consistency</span>
                  </span>
                  <Badge variant="slate" size="sm">
                    {userProfile.trainingDaysPerWeek} Days Target
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  You’ve logged 4 sessions this week with consistent energy pacing.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onNavigate(NavigationTab.Calendar)}
                >
                  View Training Calendar
                </Button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PATHWAY 3: WEIGHT GAIN & MUSCLE GAIN DASHBOARD            */}
      {/* Priorities: Calorie Surplus, Protein Pacing, Hypertrophy  */}
      {/* ========================================================= */}
      {isMuscleGain && (
        <div className="space-y-7 animate-fade-in">
          {/* Muscle Gain Hero Widget: Caloric Surplus Gauge & Protein Pacing */}
          <Card variant="elevated" className="border-amber-200/80 p-6 sm:p-7">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <Badge variant="amber" size="sm" className="gap-1 mb-1">
                  <Dumbbell className="h-3 w-3" />
                  <span>Calorie Surplus & Lean Hypertrophy</span>
                </Badge>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tight tabular-nums">
                    {dailyTotals.calories.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 font-mono tabular-nums">
                    / {goals.dailyCalories.toLocaleString()} kcal target
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Target Caloric Surplus:{' '}
                  <strong className="text-amber-800 font-bold font-mono">
                    +{targetSurplusKcal} kcal/day
                  </strong>{' '}
                  above maintenance (~{estimatedTdee} kcal)
                </p>
                <div className="pt-1">
                  {surplusKcal >= targetSurplusKcal ? (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Optimal anabolic surplus achieved today!
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {remainingCalories.toLocaleString()} kcal left to guarantee muscle protein synthesis
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Ring for Surplus Completion */}
              <div className="flex items-center gap-6">
                <ProgressRing
                  value={calPct}
                  size={120}
                  strokeWidth={10}
                  pathway={OnboardingPathway.MuscleGain}
                  centerLabel="Surplus Hit"
                  centerValue={`${calPct}%`}
                />
                <div className="space-y-2">
                  <Button
                    variant="pathway"
                    pathway={OnboardingPathway.MuscleGain}
                    size="md"
                    className="w-full"
                    onClick={() => onNavigate(NavigationTab.Diet)}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Log Calorie Surplus
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onNavigate(NavigationTab.Workouts)}
                    leftIcon={<Dumbbell className="h-3.5 w-3.5 text-amber-600" />}
                  >
                    Start Lift Session
                  </Button>
                </div>
              </div>
            </div>

            {/* Protein Pacing Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1">
                <div className="flex justify-between text-xs font-bold text-amber-950">
                  <span>Protein Pacing</span>
                  <span className="font-mono">{formatGrams(dailyTotals.proteinG)} / {formatGrams(goals.proteinG)}</span>
                </div>
                <ProgressBar value={proPct} color="bg-amber-600" height="sm" />
                <span className="text-[11px] text-slate-500 font-mono block">
                  {formatGrams(remainingProtein)} left (~2.0g per kg target)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-200/60 space-y-1">
                <div className="flex justify-between text-xs font-bold text-sky-950">
                  <span>Hypertrophy Carbs</span>
                  <span className="font-mono">{formatGrams(dailyTotals.carbsG)} / {formatGrams(goals.carbsG)}</span>
                </div>
                <ProgressBar value={carbPct} color="bg-sky-600" height="sm" />
                <span className="text-[11px] text-slate-500 font-mono block">
                  {formatGrams(remainingCarbs)} left for heavy training
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                <div className="flex justify-between text-xs font-bold text-emerald-950">
                  <span>Calorie Surplus Fats</span>
                  <span className="font-mono">{formatGrams(dailyTotals.fatG)} / {formatGrams(goals.fatG)}</span>
                </div>
                <ProgressBar value={fatPct} color="bg-emerald-600" height="sm" />
                <span className="text-[11px] text-slate-500 font-mono block">
                  {formatGrams(remainingFat)} left (hormonal health & density)
                </span>
              </div>
            </div>
          </Card>

          {/* Two-Column Muscle Gain Split: Anabolic Feeding Windows + Progressive Overload */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 cols: Anabolic Feeding Windows */}
            <section
              aria-label="High-Protein Feeding Windows"
              className="lg:col-span-7 ascend-card-v2 p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Anabolic Feeding Windows
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Distribute 35–45g protein per feeding window to maximize Muscle Protein Synthesis (MPS)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate(NavigationTab.Diet)}
                >
                  + Add Feeding
                </Button>
              </div>

              <div className="space-y-3.5">
                {[
                  {
                    window: 'Window 1: Morning Muscle Fuel',
                    targetProtein: '35g',
                    meal: MealType.Breakfast,
                    icon: Sunrise,
                  },
                  {
                    window: 'Window 2: Midday Hypertrophy Meal',
                    targetProtein: '45g',
                    meal: MealType.Lunch,
                    icon: Sun,
                  },
                  {
                    window: 'Window 3: Afternoon Mass Booster',
                    targetProtein: '30g',
                    meal: MealType.Snacks,
                    icon: Coffee,
                  },
                  {
                    window: 'Window 4: Post-Workout Anabolic Dinner',
                    targetProtein: '45g',
                    meal: MealType.Dinner,
                    icon: Moon,
                  },
                ].map(({ window, targetProtein, meal, icon: Icon }) => {
                  const loggedItems = getMealItems(meal);
                  const mealProtein = Math.round(
                    loggedItems.reduce(
                      (sum, i) => sum + i.computedNutrients.proteinG,
                      0
                    )
                  );
                  const targetNum = parseInt(targetProtein, 10) || 35;
                  const windowPct = Math.min(
                    100,
                    Math.round((mealProtein / targetNum) * 100)
                  );
                  return (
                    <div
                      key={window}
                      className="p-4 rounded-xl border border-amber-200/70 bg-amber-50/20 space-y-2.5 hover:border-amber-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-600 text-white">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {window}
                            </span>
                            <span className="text-[10px] text-amber-800 font-semibold">
                              Target: {targetProtein} protein
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                            Logged: {formatGrams(mealProtein)} P ({windowPct}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickAddFood(meal)}
                            className="text-xs font-semibold text-amber-800 hover:underline p-1"
                          >
                            + Log
                          </button>
                        </div>
                      </div>

                      <ProgressBar value={windowPct} color="bg-amber-600" height="xs" />

                      {loggedItems.length === 0 ? (
                        <p className="text-xs text-slate-500 italic pl-8">
                          No feeding logged for this window yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100 pl-8 text-xs">
                          {loggedItems.map((item) => (
                            <div key={item.id} className="py-1 flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-800 min-w-0 truncate">
                                {item.foodName} ({item.quantity} {item.unit})
                              </span>
                              <span className="font-mono text-slate-600 shrink-0">
                                {formatGrams(item.computedNutrients.proteinG)} P · {formatCalories(item.computedNutrients.calories)} kcal
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right 5 cols: Progressive Overload & Hypertrophy AI */}
            <div className="lg:col-span-5 space-y-6">
              {/* Strength Routine & Overload Card */}
              <div className="ascend-card-v2 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Hypertrophy Routine
                      </h3>
                      <p className="text-xs text-slate-500">
                        {todayWorkout.title}
                      </p>
                    </div>
                  </div>
                  <Badge variant="amber" size="sm">
                    Hypertrophy
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Compound Overload Focus:
                  </span>
                  <div className="text-xs text-slate-800 space-y-1">
                    <p className="font-semibold">· Target: 8–12 Rep Max working sets</p>
                    <p className="font-semibold">· Progressive overload delta: +2.5kg on primary compound lift</p>
                  </div>
                </div>

                <Button
                  variant="pathway"
                  pathway={OnboardingPathway.MuscleGain}
                  size="sm"
                  className="w-full"
                  onClick={() => onNavigate(NavigationTab.Workouts)}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Open Lift Session Runner
                </Button>
              </div>

              {/* Muscle Gain AI Advice */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950 via-slate-950 to-[#0B1221] text-white border border-amber-600/40 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Hypertrophy Coach</span>
                  </span>
                  <Badge variant="amber" size="sm">
                    Muscle Building
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Lock in your daily caloric surplus
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  You need {remainingCalories} more calories to guarantee an optimal anabolic environment for tonight’s muscle repair. Add a protein-dense dinner with peanut butter, paneer, or a mass gainer shake.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-950 bg-amber-400 hover:bg-amber-300 border-none font-bold"
                  onClick={() => onNavigate(NavigationTab.AiCoach)}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Ask Coach for High-Calorie Snack
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BIOMETRIC TREND CURVE (SHARED FOR ALL PATHWAYS)          */}
      {/* ========================================================= */}
      <section
        aria-label="Biometric Progress Trajectory"
        className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Biometric Trend & Weight Trajectory</span>
            </div>
            <h3 className="mt-1 font-display text-base font-bold text-slate-900">
              {isMuscleGain
                ? 'Lean Mass & Weight Gain Curve'
                : 'Body Weight & Goal Adherence Curve'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current: <strong className="font-mono text-slate-800">{userProfile.currentWeightKg} kg</strong> · Target:{' '}
              <strong className="font-mono text-sky-700">{userProfile.targetWeightKg} kg</strong>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(NavigationTab.Progress)}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            All Checkpoints
          </Button>
        </div>

        {progressHistory.length <= 1 && !usingDemoData ? (
          <div className="py-8 text-center space-y-2 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-800">
              Starting Checkpoint Recorded: {userProfile.currentWeightKg} kg
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Log additional weight check-ins on the Progress page to visualize your trend curve.
            </p>
          </div>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={progressHistory}
                margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dashWeightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isAthlete ? '#0284C7' : isMuscleGain ? '#D97706' : '#059669'}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor={isAthlete ? '#0284C7' : isMuscleGain ? '#D97706' : '#059669'}
                      stopOpacity={0}
                    />
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
                  stroke={isAthlete ? '#0284C7' : isMuscleGain ? '#D97706' : '#059669'}
                  strokeWidth={2.5}
                  fill="url(#dashWeightGrad)"
                  dot={{
                    r: 4,
                    fill: isAthlete ? '#0284C7' : isMuscleGain ? '#D97706' : '#059669',
                    strokeWidth: 2,
                    stroke: '#FFFFFF',
                  }}
                  activeDot={{
                    r: 6,
                    fill: isAthlete ? '#0284C7' : isMuscleGain ? '#D97706' : '#059669',
                    stroke: '#FFFFFF',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
};
