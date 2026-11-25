import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Info,
  Lock,
  RotateCcw,
  Settings,
  Target,
  TrendingUp,
} from 'lucide-react';
import { computeRecommendedTargets } from '../../services/ascendApiService';
import {
  ActivityLevel,
  FitnessGoalType,
  NutritionGoals,
  OnboardingPathway,
  ProfileArchetype,
  UnitSystem,
  UserProfile,
} from '../../types/ascend';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface GoalsProfileViewProps {
  userProfile: UserProfile;
  goals: NutritionGoals;
  canSwitchPathwayDirectly?: boolean;
  onOpenSettings?: () => void;
  onUpdateProfileAndGoals: (
    nextProfile: UserProfile,
    nextGoals: NutritionGoals
  ) => void;
}

const PATHWAY_OPTIONS = [
  {
    pathway: OnboardingPathway.GeneralFitness,
    description: 'Balanced daily eating, weight loss or maintenance, hydration, and everyday habits.',
    icon: Heart,
    archetype: ProfileArchetype.GeneralFitness,
    defaultGoal: FitnessGoalType.WeightLoss,
  },
  {
    pathway: OnboardingPathway.AthletePerformance,
    description: 'Training fuel, protein timing, hydration, and workout adherence.',
    icon: Flame,
    archetype: ProfileArchetype.Athlete,
    defaultGoal: FitnessGoalType.AthleticPerformance,
  },
  {
    pathway: OnboardingPathway.MuscleGain,
    description: 'Calorie surplus, high-protein intake, progressive strength, and weight gain trends.',
    icon: Dumbbell,
    archetype: ProfileArchetype.GeneralFitness,
    defaultGoal: FitnessGoalType.MuscleGain,
  },
];

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  [ActivityLevel.Sedentary]: 1.2,
  [ActivityLevel.LightlyActive]: 1.375,
  [ActivityLevel.ModeratelyActive]: 1.55,
  [ActivityLevel.VeryActive]: 1.725,
  [ActivityLevel.CompetitiveAthlete]: 1.9,
};

const PATHWAY_GUIDANCE: Record<
  OnboardingPathway,
  {
    badgeVariant: 'emerald' | 'sky' | 'amber';
    accentBorder: string;
    accentBg: string;
    accentText: string;
    title: string;
    priorities: string[];
    hydrationNote: string;
    progressFocus: string;
  }
> = {
  [OnboardingPathway.GeneralFitness]: {
    badgeVariant: 'emerald',
    accentBorder: 'border-emerald-200/80',
    accentBg: 'bg-emerald-50/50',
    accentText: 'text-emerald-800',
    title: 'Everyday Balance & Sustainable Habits',
    priorities: [
      'Anchor each meal with lean protein and fiber-rich whole foods for steady satiety.',
      'Hit your daily hydration target consistently before relying on evening snacks.',
      'Focus on weekly adherence trends rather than single-day fluctuations.',
    ],
    hydrationNote: '36 ml/kg baseline for metabolic & digestive support',
    progressFocus: 'Weekly weight trend, daily step consistency, and balanced meal logging.',
  },
  [OnboardingPathway.AthletePerformance]: {
    badgeVariant: 'sky',
    accentBorder: 'border-blue-200/80',
    accentBg: 'bg-blue-50/50',
    accentText: 'text-blue-800',
    title: 'High-Output Fueling & Recovery',
    priorities: [
      'Prioritize carbohydrates (50–55% of calories) around high-intensity training blocks.',
      'Target ~2.2 g/kg protein split across 3–4 meals to support tissue repair.',
      'Replenish sweat losses with the built-in +450 ml daily hydration buffer.',
    ],
    hydrationNote: '36 ml/kg baseline + 450 ml training sweat buffer',
    progressFocus: 'Session completion rate, lifted volume / RPE, and recovery fueling.',
  },
  [OnboardingPathway.MuscleGain]: {
    badgeVariant: 'amber',
    accentBorder: 'border-amber-200/80',
    accentBg: 'bg-amber-50/50',
    accentText: 'text-amber-800',
    title: 'Controlled Surplus & Hypertrophy',
    priorities: [
      'Maintain a steady +350 kcal/day surplus above TDEE to build lean mass without excess fat.',
      'Distribute ~2.1 g/kg protein evenly across 4 feeding windows (35–45g per meal).',
      'Pair nutrition surplus with progressive overload in your strength sessions.',
    ],
    hydrationNote: '36 ml/kg baseline supporting glycogen & cellular volume',
    progressFocus: 'Steady upward weight trend (+0.25–0.4 kg/wk) and compound lift loads.',
  },
};

export const GoalsProfileView: React.FC<GoalsProfileViewProps> = ({
  userProfile,
  goals,
  canSwitchPathwayDirectly = true,
  onOpenSettings,
  onUpdateProfileAndGoals,
}) => {
  const [draftProfile, setDraftProfile] = useState<UserProfile>(userProfile);
  const [draftGoals, setDraftGoals] = useState<NutritionGoals>(goals);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    setDraftProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    setDraftGoals(goals);
  }, [goals]);

  const recommended = useMemo(
    () => computeRecommendedTargets(draftProfile),
    [draftProfile]
  );

  // Compute transparent Mifflin-St Jeor BMR, TDEE, macro splits, and weight projection
  const metabolicBreakdown = useMemo(() => {
    const sexOffset = draftProfile.biologicalSex === 'female' ? -161 : 5;
    const bmr = Math.round(
      10 * draftProfile.currentWeightKg +
        6.25 * draftProfile.heightCm -
        5 * draftProfile.age +
        sexOffset
    );
    const multiplier = ACTIVITY_MULTIPLIERS[draftProfile.activityLevel] || 1.55;
    const tdee = Math.round(bmr * multiplier);
    const dailyDelta = draftGoals.dailyCalories - tdee;
    // Standard 7,700 kcal per kg body weight equivalent (educational estimate)
    const weeklyChangeKg = Number(((dailyDelta * 7) / 7700).toFixed(2));
    const weightDiffKg = Number(
      (draftProfile.targetWeightKg - draftProfile.currentWeightKg).toFixed(1)
    );

    let estimatedWeeks: number | null = null;
    if (
      Math.abs(weeklyChangeKg) >= 0.08 &&
      Math.abs(weightDiffKg) >= 0.3 &&
      Math.sign(weeklyChangeKg) === Math.sign(weightDiffKg)
    ) {
      estimatedWeeks = Math.max(1, Math.round(Math.abs(weightDiffKg / weeklyChangeKg)));
    }

    const macroCals = Math.max(
      1,
      draftGoals.proteinG * 4 + draftGoals.carbsG * 4 + draftGoals.fatG * 9
    );
    const proteinPct = Math.round(((draftGoals.proteinG * 4) / macroCals) * 100);
    const carbsPct = Math.round(((draftGoals.carbsG * 4) / macroCals) * 100);
    const fatPct = Math.max(0, 100 - proteinPct - carbsPct);
    const proteinPerKg = Number(
      (draftGoals.proteinG / Math.max(30, draftProfile.currentWeightKg)).toFixed(1)
    );

    const isCustomOverride =
      draftGoals.dailyCalories !== recommended.dailyCalories ||
      draftGoals.proteinG !== recommended.proteinG ||
      draftGoals.carbsG !== recommended.carbsG ||
      draftGoals.fatG !== recommended.fatG ||
      draftGoals.waterMl !== recommended.waterMl;

    return {
      bmr,
      tdee,
      multiplier,
      dailyDelta,
      weeklyChangeKg,
      weightDiffKg,
      estimatedWeeks,
      proteinPct,
      carbsPct,
      fatPct,
      proteinPerKg,
      isCustomOverride,
    };
  }, [draftProfile, draftGoals, recommended]);

  const pathwayGuide = PATHWAY_GUIDANCE[draftProfile.pathway];

  const updateProfileAndRecalculate = (next: UserProfile) => {
    setDraftProfile(next);
    setDraftGoals(computeRecommendedTargets(next));
  };

  const handleSelectPathway = (pathway: OnboardingPathway) => {
    const opt = PATHWAY_OPTIONS.find((p) => p.pathway === pathway);
    const updated: UserProfile = {
      ...draftProfile,
      pathway,
      archetype: opt?.archetype ?? ProfileArchetype.GeneralFitness,
      goalType: opt?.defaultGoal ?? draftProfile.goalType,
    };
    updateProfileAndRecalculate(updated);
  };

  const handleSelectGoal = (goalType: FitnessGoalType) => {
    updateProfileAndRecalculate({ ...draftProfile, goalType });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfileAndGoals(draftProfile, draftGoals);
    setSavedBanner(
      `Saved your ${draftProfile.pathway} profile and updated daily targets (${draftGoals.dailyCalories.toLocaleString()} kcal, ${(
        draftGoals.waterMl / 1000
      ).toFixed(2)}L water). Historical records are preserved.`
    );
    setTimeout(() => setSavedBanner(null), 5000);
  };

  const getRationaleText = () => {
    if (metabolicBreakdown.isCustomOverride) {
      const deltaLabel =
        metabolicBreakdown.dailyDelta >= 0
          ? `+${metabolicBreakdown.dailyDelta}`
          : `${metabolicBreakdown.dailyDelta}`;
      return `Custom targets active (${deltaLabel} kcal/day vs. estimated ${metabolicBreakdown.tdee.toLocaleString()} kcal maintenance). Macro split: ${metabolicBreakdown.proteinPct}% protein (${metabolicBreakdown.proteinPerKg} g/kg), ${metabolicBreakdown.carbsPct}% carbs, ${metabolicBreakdown.fatPct}% fat.`;
    }
    if (draftProfile.goalType === FitnessGoalType.WeightLoss) {
      return `Targets apply a sustainable -420 kcal/day deficit below your ${metabolicBreakdown.tdee.toLocaleString()} kcal TDEE with ${metabolicBreakdown.proteinPerKg} g/kg protein to help preserve lean muscle.`;
    }
    if (draftProfile.goalType === FitnessGoalType.MuscleGain) {
      return `Targets apply a controlled +350 kcal/day lean surplus above your ${metabolicBreakdown.tdee.toLocaleString()} kcal TDEE with ${metabolicBreakdown.proteinPerKg} g/kg protein to support hypertrophy.`;
    }
    if (draftProfile.goalType === FitnessGoalType.AthleticPerformance) {
      return `Targets apply a +200 kcal/day performance fueling buffer above your ${metabolicBreakdown.tdee.toLocaleString()} kcal TDEE with ${metabolicBreakdown.carbsPct}% carbohydrates for glycogen replenishment.`;
    }
    return `Maintenance targets match your estimated ${metabolicBreakdown.tdee.toLocaleString()} kcal TDEE with balanced macros (${metabolicBreakdown.proteinPct}P / ${metabolicBreakdown.carbsPct}C / ${metabolicBreakdown.fatPct}F) for steady daily energy.`;
  };

  return (
    <div className="animate-page-enter space-y-7 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0A1628]">
            Goals & Personal Profile
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Choose your focus pathway, update your personal measurements, and review your calculated daily targets.
          </p>
        </div>
        <Badge variant={pathwayGuide.badgeVariant} size="md" className="self-start sm:self-auto">
          {draftProfile.pathway}
        </Badge>
      </div>

      {savedBanner && (
        <div className="animate-fade-in p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      <form onSubmit={handleSaveSubmit} className="space-y-6">
        {/* 1. Pathway & Goal Selection */}
        <section className="ascend-card-v2 p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0A1628]">
                1. Focus Pathway
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {canSwitchPathwayDirectly
                  ? 'Shapes your dashboard layout, suggested workouts, hydration buffer, and macro balance'
                  : 'Account-level pathway. Switching pathways requires password confirmation in Settings.'}
              </p>
            </div>
            {!canSwitchPathwayDirectly && onOpenSettings && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                leftIcon={<Settings className="h-3.5 w-3.5 text-[#2563EB]" />}
              >
                Change in Settings
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PATHWAY_OPTIONS.map((item) => {
              const Icon = item.icon;
              const selected = draftProfile.pathway === item.pathway;

              let activeTheme = 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20';
              let iconTheme = 'bg-emerald-600 text-white shadow-xs';
              let checkColor = 'text-emerald-600';

              if (item.pathway === OnboardingPathway.AthletePerformance) {
                activeTheme = 'bg-blue-50/70 border-[#2563EB] ring-2 ring-blue-500/20';
                iconTheme = 'bg-[#2563EB] text-white shadow-xs';
                checkColor = 'text-[#2563EB]';
              } else if (item.pathway === OnboardingPathway.MuscleGain) {
                activeTheme = 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20';
                iconTheme = 'bg-orange-600 text-white shadow-xs';
                checkColor = 'text-orange-600';
              }

              return (
                <button
                  key={item.pathway}
                  type="button"
                  disabled={!canSwitchPathwayDirectly}
                  onClick={() => canSwitchPathwayDirectly && handleSelectPathway(item.pathway)}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                    selected
                      ? `${activeTheme} shadow-xs`
                      : canSwitchPathwayDirectly
                      ? 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
                      : 'bg-slate-50/50 border-slate-200/60 opacity-65 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center transition-transform ${
                          selected
                            ? iconTheme
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {selected ? (
                        <Check className={`h-5 w-5 ${checkColor}`} />
                      ) : !canSwitchPathwayDirectly ? (
                        <Lock className="h-4 w-4 text-slate-400" />
                      ) : null}
                    </div>
                    <h3 className="text-sm font-bold text-[#0A1628]">
                      {item.pathway}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Specific Goal Pills */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-2.5">
              Specific Objective
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.values(FitnessGoalType).map((g) => {
                const active = draftProfile.goalType === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleSelectGoal(g)}
                    className={`p-3.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      active
                        ? 'bg-[#0A1628] text-white border-[#0A1628] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{g}</span>
                    {active && <Check className="h-3.5 w-3.5 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. Personal Profile Form + Estimated Daily Targets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Personal Profile Details + Pathway Guidance */}
          <div className="lg:col-span-7 space-y-6">
            <section className="ascend-card-v2 p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0A1628]">
                  2. Personal Profile Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Used to calculate your Mifflin-St Jeor BMR and daily energy expenditure
                </p>
              </div>

              {/* Biological Sex */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Biological Sex</span>
                  <span className="text-[11px] text-slate-500">
                    Mifflin-St Jeor metabolic standard (+5 kcal male / -161 kcal female)
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Biological sex selection"
                  className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs self-start sm:self-auto"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={draftProfile.biologicalSex !== 'female'}
                    onClick={() =>
                      updateProfileAndRecalculate({
                        ...draftProfile,
                        biologicalSex: 'male',
                      })
                    }
                    className={`px-3 py-1 rounded font-semibold transition-colors ${
                      draftProfile.biologicalSex !== 'female'
                        ? 'bg-[#0A1628] text-white'
                        : 'text-slate-600 hover:text-[#0A1628]'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={draftProfile.biologicalSex === 'female'}
                    onClick={() =>
                      updateProfileAndRecalculate({
                        ...draftProfile,
                        biologicalSex: 'female',
                      })
                    }
                    className={`px-3 py-1 rounded font-semibold transition-colors ${
                      draftProfile.biologicalSex === 'female'
                        ? 'bg-[#0A1628] text-white'
                        : 'text-slate-600 hover:text-[#0A1628]'
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="prof-age-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Age (yrs)
                  </label>
                  <input
                    id="prof-age-input"
                    type="number"
                    min={16}
                    max={95}
                    value={draftProfile.age}
                    onChange={(e) =>
                      updateProfileAndRecalculate({
                        ...draftProfile,
                        age: parseInt(e.target.value, 10) || 25,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label htmlFor="prof-height-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Height (cm)
                  </label>
                  <input
                    id="prof-height-input"
                    type="number"
                    min={120}
                    max={230}
                    value={draftProfile.heightCm}
                    onChange={(e) =>
                      updateProfileAndRecalculate({
                        ...draftProfile,
                        heightCm: parseFloat(e.target.value) || 175,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label htmlFor="prof-weight-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Weight (kg)
                  </label>
                  <input
                    id="prof-weight-input"
                    type="number"
                    step="0.1"
                    min={35}
                    max={220}
                    value={draftProfile.currentWeightKg}
                    onChange={(e) =>
                      updateProfileAndRecalculate({
                        ...draftProfile,
                        currentWeightKg: parseFloat(e.target.value) || 70,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label htmlFor="prof-target-weight-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Weight (kg)
                  </label>
                  <input
                    id="prof-target-weight-input"
                    type="number"
                    step="0.1"
                    min={35}
                    max={220}
                    value={draftProfile.targetWeightKg}
                    onChange={(e) =>
                      setDraftProfile({
                        ...draftProfile,
                        targetWeightKg: parseFloat(e.target.value) || 70,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="prof-act-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Activity Level
                  </label>
                  <select
                    id="prof-act-select"
                    value={draftProfile.activityLevel}
                    onChange={(e) =>
                      updateProfileAndRecalculate({
                        ...draftProfile,
                        activityLevel: e.target.value as ActivityLevel,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    {Object.values(ActivityLevel).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="prof-train-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Training Days / Week
                  </label>
                  <select
                    id="prof-train-select"
                    value={draftProfile.trainingDaysPerWeek}
                    onChange={(e) =>
                      updateProfileAndRecalculate({
                        ...draftProfile,
                        trainingDaysPerWeek: parseInt(e.target.value, 10) || 3,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    {[2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {d} sessions / week
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="prof-units-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Measurement Units
                  </label>
                  <select
                    id="prof-units-select"
                    value={draftProfile.unitSystem}
                    onChange={(e) =>
                      setDraftProfile({
                        ...draftProfile,
                        unitSystem: e.target.value as UnitSystem,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    {Object.values(UnitSystem).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Metabolic & Trajectory Breakdown */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Estimated BMR (Resting)
                  </span>
                  <strong className="font-mono text-base font-bold text-[#0A1628] mt-0.5 block tabular-nums">
                    {metabolicBreakdown.bmr.toLocaleString()} kcal/day
                  </strong>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Maintenance TDEE (×{metabolicBreakdown.multiplier})
                  </span>
                  <strong className="font-mono text-base font-bold text-[#0A1628] mt-0.5 block tabular-nums">
                    {metabolicBreakdown.tdee.toLocaleString()} kcal/day
                  </strong>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
                  <span className="text-[11px] font-semibold text-[#1D4ED8] block">
                    Target Balance vs. TDEE
                  </span>
                  <strong className="font-mono text-base font-bold text-[#0A1628] mt-0.5 block tabular-nums">
                    {metabolicBreakdown.dailyDelta >= 0
                      ? `+${metabolicBreakdown.dailyDelta}`
                      : metabolicBreakdown.dailyDelta}{' '}
                    kcal/day
                  </strong>
                </div>
              </div>
            </section>

            {/* Pathway-Specific Strategy & Activity Targets */}
            <section className={`ascend-card-v2 p-5 sm:p-6 space-y-4 border ${pathwayGuide.accentBorder}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${pathwayGuide.accentText}`}>
                    Pathway Strategy
                  </span>
                  <h3 className="font-display text-base font-bold text-[#0A1628] mt-0.5">
                    {pathwayGuide.title}
                  </h3>
                </div>
                <Badge variant={pathwayGuide.badgeVariant} size="sm">
                  {draftProfile.pathway}
                </Badge>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                {pathwayGuide.priorities.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                  <Footprints className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 block">Daily Steps Goal</span>
                    <strong className="font-mono text-xs font-bold text-[#0A1628] tabular-nums">
                      {draftGoals.dailySteps.toLocaleString()} steps
                    </strong>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                  <Dumbbell className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 block">Weekly Sessions</span>
                    <strong className="font-mono text-xs font-bold text-[#0A1628] tabular-nums">
                      {draftGoals.weeklyWorkoutSessions} workouts / wk
                    </strong>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 block">Active Minutes</span>
                    <strong className="font-mono text-xs font-bold text-[#0A1628] tabular-nums">
                      {draftGoals.weeklyActivityMinutes} mins / wk
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-600">
                <strong className="text-[#0A1628]">Progress Focus:</strong> {pathwayGuide.progressFocus}
              </div>
            </section>
          </div>

          {/* Right Column (5 cols): Daily Targets, Weight Projection & Advanced Editor */}
          <section className="lg:col-span-5 ascend-card-v2 p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0A1628]">
                  3. Daily Nutrition Targets
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {metabolicBreakdown.isCustomOverride
                    ? 'Custom target overrides active'
                    : 'Calculated estimate from your profile & goal'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraftGoals(recommended)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg px-2 py-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Estimate</span>
              </button>
            </div>

            {/* Clean Target Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 block">
                  Daily Calories
                </span>
                <strong className="font-mono text-xl font-bold text-[#0A1628] mt-1 block tabular-nums">
                  {draftGoals.dailyCalories.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500">kcal</span>
                </strong>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {metabolicBreakdown.dailyDelta >= 0
                    ? `+${metabolicBreakdown.dailyDelta}`
                    : metabolicBreakdown.dailyDelta}{' '}
                  kcal vs. TDEE
                </span>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900">Protein</span>
                  <span className="font-mono text-[11px] font-bold text-blue-700">
                    {metabolicBreakdown.proteinPct}%
                  </span>
                </div>
                <strong className="font-mono text-xl font-bold text-blue-950 mt-1 block tabular-nums">
                  {draftGoals.proteinG}{' '}
                  <span className="text-xs font-normal text-blue-700">g</span>
                </strong>
                <span className="text-[11px] text-blue-700/80 mt-0.5 block">
                  {metabolicBreakdown.proteinPerKg} g/kg body weight
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900">Carbohydrates</span>
                  <span className="font-mono text-[11px] font-bold text-emerald-700">
                    {metabolicBreakdown.carbsPct}%
                  </span>
                </div>
                <strong className="font-mono text-xl font-bold text-emerald-950 mt-1 block tabular-nums">
                  {draftGoals.carbsG}{' '}
                  <span className="text-xs font-normal text-emerald-700">g</span>
                </strong>
                <span className="text-[11px] text-emerald-700/80 mt-0.5 block">
                  Primary training & daily fuel
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900">Dietary Fat</span>
                  <span className="font-mono text-[11px] font-bold text-amber-700">
                    {metabolicBreakdown.fatPct}%
                  </span>
                </div>
                <strong className="font-mono text-xl font-bold text-amber-950 mt-1 block tabular-nums">
                  {draftGoals.fatG}{' '}
                  <span className="text-xs font-normal text-amber-700">g</span>
                </strong>
                <span className="text-[11px] text-amber-700/80 mt-0.5 block">
                  Essential fatty acid intake
                </span>
              </div>
            </div>

            {/* Prominent Hydration Target Card */}
            <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0">
                  <Droplets className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-cyan-950 block">
                    Daily Hydration Target
                  </span>
                  <span className="text-[11px] text-cyan-800/85 block truncate">
                    {pathwayGuide.hydrationNote}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <strong className="font-mono text-lg font-extrabold text-cyan-950 tabular-nums block">
                  {(draftGoals.waterMl / 1000).toFixed(2)} L
                </strong>
                <span className="font-mono text-[10px] text-cyan-800">
                  {draftGoals.waterMl.toLocaleString()} ml
                </span>
              </div>
            </div>

            {/* Weight Trajectory Projection */}
            <div className="p-3.5 rounded-xl bg-[#0A1628] text-white space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-blue-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Estimated Pace Projection</span>
                </span>
                <span className="font-mono text-[11px] text-slate-300">
                  {draftProfile.currentWeightKg} → {draftProfile.targetWeightKg} kg
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {Math.abs(metabolicBreakdown.weeklyChangeKg) < 0.05
                  ? 'Calorie target aligns closely with estimated maintenance (~0.0 kg/week net change).'
                  : metabolicBreakdown.weeklyChangeKg < 0
                  ? `At ${metabolicBreakdown.dailyDelta} kcal/day, estimated pace is ~${Math.abs(
                      metabolicBreakdown.weeklyChangeKg
                    ).toFixed(2)} kg/week loss`
                  : `At +${metabolicBreakdown.dailyDelta} kcal/day, estimated pace is ~+${metabolicBreakdown.weeklyChangeKg.toFixed(
                      2
                    )} kg/week gain`}
                {metabolicBreakdown.estimatedWeeks !== null
                  ? ` (~${metabolicBreakdown.estimatedWeeks} weeks to reach ${draftProfile.targetWeightKg} kg).`
                  : '.'}
              </p>
            </div>

            {/* Scientific Rationale Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#0A1628]">
                <Info className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                <span>Calculation Summary</span>
              </div>
              <p className="leading-relaxed">{getRationaleText()}</p>
            </div>

            {/* Optional Expandable Advanced Target Editor */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdvancedEditor(!showAdvancedEditor)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-[#0A1628] py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg"
              >
                <span>
                  {showAdvancedEditor
                    ? 'Hide custom target editor'
                    : 'Customize daily calorie, macro & hydration targets'}
                </span>
                {showAdvancedEditor ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showAdvancedEditor && (
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="goal-cals-input" className="block text-xs font-medium text-slate-600 mb-1">
                      Calories (kcal)
                    </label>
                    <input
                      id="goal-cals-input"
                      type="number"
                      step={25}
                      value={draftGoals.dailyCalories}
                      onChange={(e) =>
                        setDraftGoals({
                          ...draftGoals,
                          dailyCalories: parseInt(e.target.value, 10) || 2000,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label htmlFor="goal-pro-input" className="block text-xs font-medium text-slate-600 mb-1">
                      Protein (g)
                    </label>
                    <input
                      id="goal-pro-input"
                      type="number"
                      value={draftGoals.proteinG}
                      onChange={(e) =>
                        setDraftGoals({
                          ...draftGoals,
                          proteinG: parseInt(e.target.value, 10) || 120,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label htmlFor="goal-carbs-input" className="block text-xs font-medium text-slate-600 mb-1">
                      Carbs (g)
                    </label>
                    <input
                      id="goal-carbs-input"
                      type="number"
                      value={draftGoals.carbsG}
                      onChange={(e) =>
                        setDraftGoals({
                          ...draftGoals,
                          carbsG: parseInt(e.target.value, 10) || 220,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label htmlFor="goal-fat-input" className="block text-xs font-medium text-slate-600 mb-1">
                      Fat (g)
                    </label>
                    <input
                      id="goal-fat-input"
                      type="number"
                      value={draftGoals.fatG}
                      onChange={(e) =>
                        setDraftGoals({
                          ...draftGoals,
                          fatG: parseInt(e.target.value, 10) || 65,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="goal-water-input" className="block text-xs font-medium text-slate-600 mb-1">
                      Daily Water Target (ml)
                    </label>
                    <input
                      id="goal-water-input"
                      type="number"
                      step={100}
                      value={draftGoals.waterMl}
                      onChange={(e) =>
                        setDraftGoals({
                          ...draftGoals,
                          waterMl: parseInt(e.target.value, 10) || 2500,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              leftIcon={<Target className="h-4 w-4" />}
            >
              <span>Save Goals & Targets</span>
            </Button>

            {/* Concise Non-Medical Educational Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
              <Info className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
              <span>
                Calculated estimates are educational reference targets and not medical advice or prescriptions.
              </span>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
};
