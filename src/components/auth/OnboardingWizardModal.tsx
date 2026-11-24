import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Flame,
  Info,
  Scale,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import {
  ActivityLevel,
  FitnessGoalType,
  NutritionGoals,
  OnboardingPathway,
  ProfileArchetype,
  UnitSystem,
  UserProfile,
} from '../../types/ascend';
import { computeRecommendedTargets } from '../../services/ascendApiService';

export interface OnboardingWizardModalProps {
  isOpen: boolean;
  pathway: OnboardingPathway;
  onBackToPathway: () => void;
  onComplete: (profile: UserProfile, goals: NutritionGoals) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  pathway,
  onBackToPathway,
  onComplete,
  isSubmitting = false,
  submitError = null,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [biologicalSex, setBiologicalSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<string>('27');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(UnitSystem.Metric);
  const [heightValue, setHeightValue] = useState<string>('175');
  const [currentWeightValue, setCurrentWeightValue] = useState<string>('74.0');
  const [targetWeightValue, setTargetWeightValue] = useState<string>(
    pathway === OnboardingPathway.MuscleGain
      ? '78.0'
      : pathway === OnboardingPathway.AthletePerformance
        ? '74.0'
        : '71.0'
  );

  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    pathway === OnboardingPathway.AthletePerformance
      ? ActivityLevel.VeryActive
      : ActivityLevel.ModeratelyActive
  );
  const [trainingDays, setTrainingDays] = useState<number>(
    pathway === OnboardingPathway.AthletePerformance ? 5 : 4
  );

  const [goalType, setGoalType] = useState<FitnessGoalType>(
    pathway === OnboardingPathway.MuscleGain
      ? FitnessGoalType.MuscleGain
      : pathway === OnboardingPathway.AthletePerformance
        ? FitnessGoalType.AthleticPerformance
        : FitnessGoalType.WeightLoss
  );

  // Sync pathway-dependent defaults whenever pathway or modal open state changes
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError(null);
    setTargetWeightValue(
      pathway === OnboardingPathway.MuscleGain
        ? '78.0'
        : pathway === OnboardingPathway.AthletePerformance
          ? '74.0'
          : '71.0'
    );
    setActivityLevel(
      pathway === OnboardingPathway.AthletePerformance
        ? ActivityLevel.VeryActive
        : ActivityLevel.ModeratelyActive
    );
    setTrainingDays(pathway === OnboardingPathway.AthletePerformance ? 5 : 4);
    setGoalType(
      pathway === OnboardingPathway.MuscleGain
        ? FitnessGoalType.MuscleGain
        : pathway === OnboardingPathway.AthletePerformance
          ? FitnessGoalType.AthleticPerformance
          : FitnessGoalType.WeightLoss
    );
  }, [isOpen, pathway]);

  // Unit conversion helpers
  const handleUnitSystemChange = (newSystem: UnitSystem) => {
    if (newSystem === unitSystem) return;
    if (newSystem === UnitSystem.Imperial) {
      // Metric -> Imperial
      const h = parseFloat(heightValue);
      const w = parseFloat(currentWeightValue);
      const tw = parseFloat(targetWeightValue);
      if (!isNaN(h)) setHeightValue((h / 2.54).toFixed(1));
      if (!isNaN(w)) setCurrentWeightValue((w * 2.20462).toFixed(1));
      if (!isNaN(tw)) setTargetWeightValue((tw * 2.20462).toFixed(1));
    } else {
      // Imperial -> Metric
      const h = parseFloat(heightValue);
      const w = parseFloat(currentWeightValue);
      const tw = parseFloat(targetWeightValue);
      if (!isNaN(h)) setHeightValue(Math.round(h * 2.54).toString());
      if (!isNaN(w)) setCurrentWeightValue((w / 2.20462).toFixed(1));
      if (!isNaN(tw)) setTargetWeightValue((tw / 2.20462).toFixed(1));
    }
    setUnitSystem(newSystem);
  };

  const getMetricBiometrics = () => {
    const rawAge = Math.max(14, parseInt(age, 10) || 27);
    const rawH = parseFloat(heightValue) || (unitSystem === UnitSystem.Imperial ? 68.9 : 175);
    const rawW = parseFloat(currentWeightValue) || (unitSystem === UnitSystem.Imperial ? 163.1 : 74);
    const rawTW = parseFloat(targetWeightValue) || (unitSystem === UnitSystem.Imperial ? 156.5 : 71);

    const hCm = unitSystem === UnitSystem.Imperial ? Math.round(rawH * 2.54) : Math.round(rawH);
    const wKg = unitSystem === UnitSystem.Imperial ? Math.round((rawW / 2.20462) * 10) / 10 : rawW;
    const twKg = unitSystem === UnitSystem.Imperial ? Math.round((rawTW / 2.20462) * 10) / 10 : rawTW;

    return { age: rawAge, heightCm: hCm, currentWeightKg: wKg, targetWeightKg: twKg };
  };

  // Editable targets in Step 3
  const [customGoals, setCustomGoals] = useState<NutritionGoals>(() =>
    computeRecommendedTargets({
      pathway,
      archetype:
        pathway === OnboardingPathway.AthletePerformance
          ? ProfileArchetype.Athlete
          : ProfileArchetype.GeneralFitness,
      goalType,
      biologicalSex: 'male',
      age: 27,
      heightCm: 175,
      currentWeightKg: 74.0,
      targetWeightKg: 71.0,
      activityLevel,
      unitSystem,
      trainingDaysPerWeek: trainingDays,
    })
  );

  // Recalculate targets when biometrics change
  useEffect(() => {
    const { age: a, heightCm: h, currentWeightKg: w, targetWeightKg: tw } = getMetricBiometrics();
    const calculated = computeRecommendedTargets({
      pathway,
      archetype:
        pathway === OnboardingPathway.AthletePerformance
          ? ProfileArchetype.Athlete
          : ProfileArchetype.GeneralFitness,
      goalType,
      biologicalSex,
      age: a,
      heightCm: h,
      currentWeightKg: w,
      targetWeightKg: tw,
      activityLevel,
      unitSystem,
      trainingDaysPerWeek: trainingDays,
    });
    setCustomGoals(calculated);
  }, [
    pathway,
    goalType,
    biologicalSex,
    age,
    heightValue,
    currentWeightValue,
    targetWeightValue,
    activityLevel,
    unitSystem,
    trainingDays,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBackToPathway();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onBackToPathway]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      const parsedAge = parseInt(age, 10);
      const parsedHeight = parseFloat(heightValue);
      const parsedWeight = parseFloat(currentWeightValue);

      if (isNaN(parsedAge) || parsedAge < 14 || parsedAge > 99) {
        setError('Please enter a valid age between 14 and 99.');
        return;
      }

      if (unitSystem === UnitSystem.Metric) {
        if (isNaN(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
          setError('Please enter a valid height between 100cm and 250cm.');
          return;
        }
        if (isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
          setError('Please enter a valid weight between 30kg and 300kg.');
          return;
        }
      } else {
        if (isNaN(parsedHeight) || parsedHeight < 39 || parsedHeight > 98) {
          setError('Please enter a valid height between 39in and 98in.');
          return;
        }
        if (isNaN(parsedWeight) || parsedWeight < 66 || parsedWeight > 660) {
          setError('Please enter a valid weight between 66lb and 660lb.');
          return;
        }
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleFinish = () => {
    const { age: a, heightCm: h, currentWeightKg: w, targetWeightKg: tw } = getMetricBiometrics();
    const finalProfile: UserProfile = {
      pathway,
      archetype:
        pathway === OnboardingPathway.AthletePerformance
          ? ProfileArchetype.Athlete
          : ProfileArchetype.GeneralFitness,
      goalType,
      biologicalSex,
      age: a,
      heightCm: h,
      currentWeightKg: w,
      targetWeightKg: tw,
      activityLevel,
      unitSystem,
      trainingDaysPerWeek: trainingDays,
    };

    onComplete(finalProfile, customGoals);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-wizard-title"
      onClick={onBackToPathway}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in overscroll-contain"
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Step Tracker */}
        <div className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
              Personalized Setup · {pathway}
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Step {step} of 3
            </span>
          </div>

          <h2
            id="onboarding-wizard-title"
            className="text-xl font-bold font-display text-slate-900 tracking-tight"
          >
            {step === 1 && 'Personal Biometrics & Baseline'}
            {step === 2 && 'Activity Level & Training Schedule'}
            {step === 3 && 'Nutrition Targets Review & Customization'}
          </h2>

          {/* Stepper bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div
              className={`h-1.5 rounded-full transition-all ${
                step >= 1 ? 'bg-sky-600' : 'bg-slate-200'
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all ${
                step >= 2 ? 'bg-sky-600' : 'bg-slate-200'
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all ${
                step >= 3 ? 'bg-sky-600' : 'bg-slate-200'
              }`}
            />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {(error || submitError) && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error || submitError}</span>
            </div>
          )}

          {/* Step 1: Personal Biometrics */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* Biological Sex */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    Biological Sex
                  </span>
                  <span className="text-[11px] text-slate-500">
                    For accurate Mifflin-St Jeor metabolic expenditure calculations
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Biological sex selection"
                  className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={biologicalSex === 'male'}
                    onClick={() => setBiologicalSex('male')}
                    className={`px-3 py-1 rounded font-semibold transition-colors ${
                      biologicalSex === 'male'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={biologicalSex === 'female'}
                    onClick={() => setBiologicalSex('female')}
                    className={`px-3 py-1 rounded font-semibold transition-colors ${
                      biologicalSex === 'female'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>

              {/* Measurement Unit System */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs font-semibold text-slate-700">
                  Preferred Measurement System
                </span>
                <div
                  role="radiogroup"
                  aria-label="Preferred measurement unit system"
                  className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={unitSystem === UnitSystem.Metric}
                    onClick={() => handleUnitSystemChange(UnitSystem.Metric)}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                      unitSystem === UnitSystem.Metric
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Metric (kg / cm)
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={unitSystem === UnitSystem.Imperial}
                    onClick={() => handleUnitSystemChange(UnitSystem.Imperial)}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                      unitSystem === UnitSystem.Imperial
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Imperial (lb / in)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Age"
                  type="number"
                  min="14"
                  max="99"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  suffix="yrs"
                  required
                />
                <Input
                  label="Height"
                  type="number"
                  step={unitSystem === UnitSystem.Imperial ? '0.1' : '1'}
                  min={unitSystem === UnitSystem.Imperial ? 39 : 100}
                  max={unitSystem === UnitSystem.Imperial ? 98 : 250}
                  value={heightValue}
                  onChange={(e) => setHeightValue(e.target.value)}
                  suffix={unitSystem === UnitSystem.Imperial ? 'in' : 'cm'}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Current Weight"
                  type="number"
                  step="0.1"
                  min={unitSystem === UnitSystem.Imperial ? 66 : 30}
                  max={unitSystem === UnitSystem.Imperial ? 660 : 300}
                  value={currentWeightValue}
                  onChange={(e) => setCurrentWeightValue(e.target.value)}
                  suffix={unitSystem === UnitSystem.Imperial ? 'lb' : 'kg'}
                  required
                />
                <Input
                  label="Target Weight"
                  type="number"
                  step="0.1"
                  min={unitSystem === UnitSystem.Imperial ? 66 : 30}
                  max={unitSystem === UnitSystem.Imperial ? 660 : 300}
                  value={targetWeightValue}
                  onChange={(e) => setTargetWeightValue(e.target.value)}
                  suffix={unitSystem === UnitSystem.Imperial ? 'lb' : 'kg'}
                  helperText={
                    pathway === OnboardingPathway.MuscleGain
                      ? 'Caloric surplus targets lean mass gain.'
                      : 'Used to pace daily calorie targets.'
                  }
                  required
                />
              </div>
            </div>
          )}

          {/* Step 2: Activity & Training */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <Select
                label="Daily Activity Level (Excluding Workouts)"
                value={activityLevel}
                onChange={(e) =>
                  setActivityLevel(e.target.value as ActivityLevel)
                }
              >
                <option value={ActivityLevel.Sedentary}>
                  Sedentary (Desk job, minimal daily walking)
                </option>
                <option value={ActivityLevel.LightlyActive}>
                  Lightly Active (Occasional walking, light movement)
                </option>
                <option value={ActivityLevel.ModeratelyActive}>
                  Moderately Active (Regular walking, active lifestyle)
                </option>
                <option value={ActivityLevel.VeryActive}>
                  Very Active (High-step job, physically demanding day)
                </option>
                <option value={ActivityLevel.CompetitiveAthlete}>
                  Competitive Athlete (Multiple daily training sessions)
                </option>
              </Select>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Planned Training Days per Week: {trainingDays} days
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTrainingDays(days)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        trainingDays === days
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <Select
                label="Primary Fitness Objective"
                value={goalType}
                onChange={(e) =>
                  setGoalType(e.target.value as FitnessGoalType)
                }
              >
                <option value={FitnessGoalType.WeightLoss}>
                  Weight Loss & Calorie Deficit
                </option>
                <option value={FitnessGoalType.Maintenance}>
                  Maintenance & Recomposition
                </option>
                <option value={FitnessGoalType.MuscleGain}>
                  Muscle Gain & Calorie Surplus
                </option>
                <option value={FitnessGoalType.AthleticPerformance}>
                  Athletic Performance & Endurance
                </option>
              </Select>
            </div>
          )}

          {/* Step 3: Nutrition Targets Review */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-sky-900 text-xs flex items-start gap-2.5">
                <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  These targets are <strong>scientific estimates</strong> derived via the Mifflin-St Jeor formula and your selected {pathway} pathway. Feel free to adjust values below or in your Goals settings later.
                </p>
              </div>

              {/* Big Calorie Spotlight */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs text-sky-300 font-semibold uppercase tracking-wider block">
                    Calculated Daily Energy Target
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-mono text-3xl font-bold text-white tabular-nums">
                      {customGoals.dailyCalories.toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-300 font-sans">
                      kcal / day
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/10 text-sky-400">
                  <Flame className="h-6 w-6" />
                </div>
              </div>

              {/* Macro Customizers */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-1">
                  <span className="text-xs font-semibold text-sky-800 block">
                    Protein Target
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      aria-label="Protein target in grams"
                      value={customGoals.proteinG}
                      onChange={(e) =>
                        setCustomGoals((prev) => ({
                          ...prev,
                          proteinG: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full font-mono font-bold text-lg text-sky-900 bg-white border border-sky-200 rounded-lg px-2 py-1"
                    />
                    <span className="text-xs font-semibold text-sky-700">g</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                  <span className="text-xs font-semibold text-emerald-800 block">
                    Carbs Target
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      aria-label="Carbohydrate target in grams"
                      value={customGoals.carbsG}
                      onChange={(e) =>
                        setCustomGoals((prev) => ({
                          ...prev,
                          carbsG: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full font-mono font-bold text-lg text-emerald-900 bg-white border border-emerald-200 rounded-lg px-2 py-1"
                    />
                    <span className="text-xs font-semibold text-emerald-700">g</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                  <span className="text-xs font-semibold text-amber-800 block">
                    Fat Target
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      aria-label="Fat target in grams"
                      value={customGoals.fatG}
                      onChange={(e) =>
                        setCustomGoals((prev) => ({
                          ...prev,
                          fatG: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full font-mono font-bold text-lg text-amber-900 bg-white border border-amber-200 rounded-lg px-2 py-1"
                    />
                    <span className="text-xs font-semibold text-amber-700">g</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">
                  Recommended Daily Water Target
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {customGoals.waterMl.toLocaleString()} ml (~8 glasses)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          {step === 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToPathway}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to Pathways
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2) : 1))}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNextStep}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              variant="pathway"
              pathway={pathway}
              size="md"
              onClick={handleFinish}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              rightIcon={<CheckCircle2 className="h-4 w-4" />}
              className="font-bold px-6"
            >
              {isSubmitting ? 'Creating Account...' : 'Launch ASCEND Dashboard'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
