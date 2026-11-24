import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Flame,
  Heart,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { OnboardingPathway } from '../../types/ascend';

export interface PathwaySelectionModalProps {
  isOpen: boolean;
  selectedPathway: OnboardingPathway;
  onSelectPathway: (pathway: OnboardingPathway) => void;
  onConfirm: () => void;
  onBackToLanding?: () => void;
}

export const PathwaySelectionModal: React.FC<PathwaySelectionModalProps> = ({
  isOpen,
  selectedPathway,
  onSelectPathway,
  onConfirm,
  onBackToLanding,
}) => {
  const [activePathway, setActivePathway] =
    useState<OnboardingPathway>(selectedPathway);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBackToLanding?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onBackToLanding]);

  if (!isOpen) return null;

  const PATHWAY_OPTIONS = [
    {
      id: OnboardingPathway.GeneralFitness,
      name: 'General Nutrition & Diet',
      tagline: 'Sustainable Energy, Calorie Awareness & Healthy Body Composition',
      icon: Heart,
      accent: 'emerald',
      badge: 'Balanced Fueling',
      color: '#059669',
      borderClass: 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20',
      activeBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      description:
        'Designed for users seeking balanced daily eating habits, calorie deficit or maintenance, mindful micronutrient density, and steady sustainable wellness.',
      features: [
        'Calorie balance & deficit pacing arc',
        'Balanced 30P / 45C / 25F macro distribution',
        'Daily hydration tracking & dietary fiber density',
        'Mindful habit-reinforcing AI Coach guidance',
      ],
      previewStats: {
        dailyCalories: '2,040 kcal',
        protein: '135g (30%)',
        workoutFocus: 'Full-body circuits, functional mobility & Zone 2 cardio',
      },
    },
    {
      id: OnboardingPathway.AthletePerformance,
      name: 'Athlete Performance',
      tagline: 'High-Output Fueling, Intra-Workout Nutrition & Training Volume',
      icon: Flame,
      accent: 'sky',
      badge: 'Performance Optimization',
      color: '#0284C7',
      borderClass: 'border-sky-300 ring-2 ring-sky-500/20 bg-sky-50/20',
      activeBadgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      description:
        'Built for athletes and competitors prioritizing training schedule execution, pre/post-workout carbohydrate timing, rapid recovery, and performance endurance.',
      features: [
        'Intra-day workout fueling & glycogen readiness',
        'Carbohydrate-focused 25P / 55C / 20F athletic split',
        'Structured periodization, RPE, & training logs',
        'Performance-analytical recovery coaching',
      ],
      previewStats: {
        dailyCalories: '2,650 kcal',
        protein: '165g (25%)',
        workoutFocus: 'Interval splits, RPE tracking & structured periodization',
      },
    },
    {
      id: OnboardingPathway.MuscleGain,
      name: 'Weight Gain & Muscle Gain',
      tagline: 'Calorie Surplus, Progressive Overload & High-Protein Hypertrophy',
      icon: Dumbbell,
      accent: 'amber',
      badge: 'Hypertrophic Surplus',
      color: '#D97706',
      borderClass: 'border-amber-300 ring-2 ring-amber-500/20 bg-amber-50/20',
      activeBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      description:
        'Tailored for dedicated individuals focused on building lean muscle mass, achieving consistent positive energy surplus, and progressive strength overload.',
      features: [
        'Controlled +300 to +450 kcal surplus meter',
        'High-protein 35P / 45C / 20F hypertrophy target',
        'Compound lift progression & volume tracking',
        'Surplus adherence & strength progression checks',
      ],
      previewStats: {
        dailyCalories: '2,850 kcal',
        protein: '190g (35%)',
        workoutFocus: 'Heavy compound lifts & progressive volume hypertrophy',
      },
    },
  ];

  const currentSelection =
    PATHWAY_OPTIONS.find((p) => p.id === activePathway) || PATHWAY_OPTIONS[0];

  const handleSelect = (id: OnboardingPathway) => {
    setActivePathway(id);
    onSelectPathway(id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pathway-modal-title"
      onClick={onBackToLanding}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in overscroll-contain"
    >
      <div
        className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-sky-50/20">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
              Step 1 of 2 · Choose Your Discipline
            </span>
            <h2
              id="pathway-modal-title"
              className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight"
            >
              Select Your Primary ASCEND Pathway
            </h2>
            <p className="text-xs text-slate-500">
              Personalizes your dashboard priorities, workout recommendations, and nutrition targets. You can switch pathways anytime in settings without losing records.
            </p>
          </div>

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl transition-colors shrink-0"
            >
              Back to Home
            </button>
          )}
        </div>

        {/* Pathway 3-Card Grid */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div role="radiogroup" aria-label="Choose your fitness pathway" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PATHWAY_OPTIONS.map((opt) => {
              const isSelected = activePathway === opt.id;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelect(opt.id)}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? `${opt.borderClass} shadow-md`
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          isSelected
                            ? opt.activeBadgeClass
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${opt.activeBadgeClass}`}
                      >
                        {opt.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 leading-snug">
                        {opt.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {opt.tagline}
                      </p>
                    </div>

                    <ul className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      {opt.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0 mt-0.5"
                            style={{ color: opt.color }}
                          />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold w-full">
                    <span
                      style={{ color: isSelected ? opt.color : '#64748B' }}
                    >
                      {isSelected ? 'Active Selection' : 'Click to Select'}
                    </span>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-transparent text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                      style={{
                        backgroundColor: isSelected ? opt.color : 'transparent',
                      }}
                    >
                      {isSelected && <span className="text-[10px]">✓</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Live Experience Preview */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles
                className="h-4 w-4"
                style={{ color: currentSelection.color }}
              />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Experience Blueprint: {currentSelection.name}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-0.5">
                <span className="text-slate-500 block">Baseline Energy</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {currentSelection.previewStats.dailyCalories}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Tailored to TDEE
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-0.5">
                <span className="text-slate-500 block">Daily Protein</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {currentSelection.previewStats.protein}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Target density
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-0.5">
                <span className="text-slate-500 block">Training Focus</span>
                <span className="font-semibold text-slate-900 line-clamp-1">
                  {currentSelection.previewStats.workoutFocus}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Weekly programming
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Selected: <strong className="text-slate-900">{currentSelection.name}</strong>
          </span>

          <Button
            type="button"
            variant="pathway"
            pathway={activePathway}
            onClick={onConfirm}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="px-6 py-2.5 font-bold"
          >
            Continue to Profile Setup
          </Button>
        </div>
      </div>
    </div>
  );
};
