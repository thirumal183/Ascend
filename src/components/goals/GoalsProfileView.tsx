import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
  Heart,
  Info,
  RotateCcw,
  Target,
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
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface GoalsProfileViewProps {
  userProfile: UserProfile;
  goals: NutritionGoals;
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

export const GoalsProfileView: React.FC<GoalsProfileViewProps> = ({
  userProfile,
  goals,
  onUpdateProfileAndGoals,
}) => {
  const [draftProfile, setDraftProfile] = useState<UserProfile>(userProfile);
  const [draftGoals, setDraftGoals] = useState<NutritionGoals>(goals);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const recommended = computeRecommendedTargets(draftProfile);

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
      `Saved your ${draftProfile.pathway} profile and updated daily targets (${draftGoals.dailyCalories.toLocaleString()} kcal). Historical records are preserved.`
    );
    setTimeout(() => setSavedBanner(null), 4000);
  };

  return (
    <div className="animate-page-enter space-y-8 pb-20 lg:pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Goals & Personal Profile
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Choose your focus pathway, update your personal measurements, and review your daily nutrition targets.
        </p>
      </div>

      {savedBanner && (
        <div className="animate-fade-in p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      <form onSubmit={handleSaveSubmit} className="space-y-6">
        {/* 1. Simple Pathway & Goal Selection Area */}
        <section className="ascend-card-v2 p-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              1. Focus Pathway
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Shapes your dashboard layout, suggested workouts, and macro balance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PATHWAY_OPTIONS.map((item) => {
              const Icon = item.icon;
              const selected = draftProfile.pathway === item.pathway;
              
              let activeTheme = 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20';
              let iconTheme = 'bg-emerald-600 text-white shadow-xs';
              let checkColor = 'text-emerald-600';

              if (item.pathway === OnboardingPathway.AthletePerformance) {
                activeTheme = 'bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20';
                iconTheme = 'bg-sky-600 text-white shadow-xs';
                checkColor = 'text-sky-600';
              } else if (item.pathway === OnboardingPathway.MuscleGain) {
                activeTheme = 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20';
                iconTheme = 'bg-amber-600 text-white shadow-xs';
                checkColor = 'text-amber-600';
              }

              return (
                <button
                  key={item.pathway}
                  type="button"
                  onClick={() => handleSelectPathway(item.pathway)}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between shadow-2xs ${
                    selected
                      ? `${activeTheme} shadow-xs`
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
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
                      {selected && <Check className={`h-5 w-5 ${checkColor}`} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
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
                    className={`p-3.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{g}</span>
                    {active && <Check className="h-3.5 w-3.5 text-sky-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. Compact Personal Profile Form + Estimated Daily Targets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Compact Personal Profile Form (7 cols) */}
          <section className="lg:col-span-7 ascend-card-v2 p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                2. Personal Profile Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Used to estimate your daily energy needs
              </p>
            </div>

            {/* Biological Sex */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">Biological Sex</span>
                <span className="text-[11px] text-slate-500">Mifflin-St Jeor metabolic standard (+5 kcal male / -161 kcal female)</span>
              </div>
              <div role="radiogroup" aria-label="Biological sex selection" className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
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
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
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
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="prof-age-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Age
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
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
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
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
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
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
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
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
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
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
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
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
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
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  {Object.values(UnitSystem).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Estimated Daily Targets + Optional Advanced Target Editor (5 cols) */}
          <section className="lg:col-span-5 ascend-card-v2 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  3. Daily Nutrition Targets
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estimated from your profile & goal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraftGoals(recommended)}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Estimate</span>
              </button>
            </div>

            {/* Clean Target Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block">
                  Daily Calories
                </span>
                <strong className="font-mono text-xl font-bold text-slate-900 mt-1 block">
                  {draftGoals.dailyCalories.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span>
                </strong>
              </div>
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/70 shadow-2xs">
                <span className="text-xs font-semibold text-sky-800 block">Protein</span>
                <strong className="font-mono text-xl font-bold text-sky-900 mt-1 block">
                  {draftGoals.proteinG} <span className="text-xs font-normal text-sky-700">g</span>
                </strong>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 shadow-2xs">
                <span className="text-xs font-semibold text-emerald-800 block">
                  Carbohydrates
                </span>
                <strong className="font-mono text-xl font-bold text-emerald-900 mt-1 block">
                  {draftGoals.carbsG} <span className="text-xs font-normal text-emerald-700">g</span>
                </strong>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 shadow-2xs">
                <span className="text-xs font-semibold text-amber-800 block">Fat</span>
                <strong className="font-mono text-xl font-bold text-amber-900 mt-1 block">
                  {draftGoals.fatG} <span className="text-xs font-normal text-amber-700">g</span>
                </strong>
              </div>
            </div>

            {/* Scientific Rationale Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span>Scientific Target Rationale</span>
              </div>
              <p className="leading-relaxed">
                {draftProfile.pathway === OnboardingPathway.AthletePerformance
                  ? 'Isocaloric & carb-dense fueling calibrated for glycogen restoration and intra-workout hydration.'
                  : draftProfile.pathway === OnboardingPathway.MuscleGain
                  ? '+350 kcal/day lean surplus targeted with ~2.0g/kg protein across 4 feeding windows to optimize MPS and minimize fat gain.'
                  : '-420 kcal/day sustainable deficit targeted for ~0.4kg/wk fat loss while preserving lean muscle and metabolic rate.'}
              </p>
            </div>

            {/* Optional Expandable Advanced Target Editor */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdvancedEditor(!showAdvancedEditor)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5"
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
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                      className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                Nutritional estimates are educational reference targets and not medical prescriptions.
              </span>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
};
