import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Heart,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Utensils,
  Zap,
} from 'lucide-react';
import { OnboardingPathway } from '../../types/ascend';

interface LandingPageViewProps {
  onStartOnboarding: () => void;
  onOpenSignIn: () => void;
  onExploreDemo: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onStartOnboarding,
  onOpenSignIn,
  onExploreDemo,
}) => {
  const [selectedPathwayPreview, setSelectedPathwayPreview] =
    useState<OnboardingPathway>(OnboardingPathway.GeneralFitness);

  const PATHWAY_PREVIEWS = {
    [OnboardingPathway.GeneralFitness]: {
      name: 'General Nutrition & Diet',
      tagline: 'Sustainable Energy & Healthy Body Composition',
      badge: 'Balanced Fueling',
      theme: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderTheme: 'border-emerald-500/30',
      accentColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: Heart,
      calories: 2150,
      protein: 135,
      carbs: 240,
      fat: 65,
      workout: 'Full Body Circuit & Zone 2 Cardio',
      duration: '40 mins',
      aiTip:
        'Focus on high-volume fibrous veggies and steady hydration to sustain daily alertness without energy dips.',
    },
    [OnboardingPathway.AthletePerformance]: {
      name: 'Athlete Performance',
      tagline: 'High-Output Fueling & Power Recovery',
      badge: 'Performance Optimization',
      theme: 'from-sky-500/20 via-blue-500/10 to-transparent',
      borderTheme: 'border-sky-500/30',
      accentColor: 'text-sky-700 bg-sky-50 border-sky-200',
      icon: Flame,
      calories: 2850,
      protein: 185,
      carbs: 360,
      fat: 72,
      workout: 'Explosive Lower Body & Sprints',
      duration: '65 mins',
      aiTip:
        'Target 40-50g fast-acting carbs 60 minutes pre-session to maximize glycogen availability during sprint intervals.',
    },
    [OnboardingPathway.MuscleGain]: {
      name: 'Weight Gain & Muscle Gain',
      tagline: 'Progressive Hypertrophy & Caloric Surplus',
      badge: 'Lean Mass Building',
      theme: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderTheme: 'border-amber-500/30',
      accentColor: 'text-amber-700 bg-amber-50 border-amber-200',
      icon: Dumbbell,
      calories: 3100,
      protein: 205,
      carbs: 385,
      fat: 85,
      workout: 'Push Hypertrophy: Chest, Delts & Triceps',
      duration: '55 mins',
      aiTip:
        'Maintain a steady +300-400 kcal surplus and distribute protein across 4 distinct feeding windows for optimal MPS.',
    },
  };

  const currentPreview = PATHWAY_PREVIEWS[selectedPathwayPreview];
  const PathwayIcon = currentPreview.icon;

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 selection:bg-sky-500/30 selection:text-white">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070D18]/85 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-xl font-extrabold tracking-tight text-white block leading-none">
                ASCEND
              </span>
              <span className="text-[11px] font-medium text-slate-400 block mt-0.5 tracking-wide">
                Getting Better Every Day
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a
              href="#pathways"
              className="hover:text-white transition-colors"
            >
              Three Pathways
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Platform Architecture
            </a>
            <a href="#science" className="hover:text-white transition-colors">
              Evidence-Based
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExploreDemo}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 transition-all shadow-xs"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Explore Demo</span>
            </button>
            <button
              type="button"
              onClick={onOpenSignIn}
              className="px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onStartOnboarding}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] rounded-xl shadow-md shadow-sky-500/25 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-sky-600/15 via-blue-600/10 to-indigo-600/5 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-emerald-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-500/10 border border-sky-400/25 text-sky-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ASCEND 2.0 · The Intelligent Nutrition & Fitness OS</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Precision Fueling.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-300">
                Progressive Training.
              </span>{' '}
              Everyday Mastery.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              ASCEND unifies personalized macronutrient targets, frictionless food
              logging, structured strength tracking, and an AI nutrition coach.
              Tailored across three specialized pathways for genuine, sustainable progress.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={onStartOnboarding}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 rounded-xl shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all"
              >
                <span>Launch Guided Setup</span>
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onExploreDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-xs"
              >
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Explore Live Interactive Demo</span>
              </button>
            </div>

            {/* Credibility micro-badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Zero Guilt Adherence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-sky-400" />
                <span>3 Dedicated Pathways</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                <span>Evidence-Based Science</span>
              </div>
            </div>
          </div>

          {/* 3. Live Interactive Pathway Showcase Widget */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="rounded-3xl p-1 bg-gradient-to-b from-slate-700/60 via-slate-800/40 to-slate-900/80 shadow-2xl">
              <div className="rounded-[22px] bg-[#0A101D] border border-slate-800 p-5 sm:p-8 space-y-6">
                {/* Pathway Selector Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                      Interactive Architecture Preview
                    </span>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white mt-0.5">
                      Toggle Pathway to see ASCEND adapt in real time:
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
                    {Object.values(OnboardingPathway).map((pathway) => {
                      const isActive = selectedPathwayPreview === pathway;
                      return (
                        <button
                          key={pathway}
                          type="button"
                          onClick={() => setSelectedPathwayPreview(pathway)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            isActive
                              ? pathway === OnboardingPathway.GeneralFitness
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : pathway === OnboardingPathway.AthletePerformance
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {pathway.replace(' & ', '/')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Simulated Dashboard Screen Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Calorie & Macro Target Card (5 cols) */}
                  <div
                    className={`lg:col-span-5 rounded-2xl bg-gradient-to-b ${currentPreview.theme} bg-slate-900/80 border ${currentPreview.borderTheme} p-5 space-y-4`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-white/10 text-white">
                          <PathwayIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {currentPreview.name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {currentPreview.tagline}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                        Target Model
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 text-center space-y-1">
                      <span className="text-xs text-slate-400 block font-medium">
                        Daily Energy Target
                      </span>
                      <strong className="font-mono text-3xl font-extrabold text-white tracking-tight block">
                        {currentPreview.calories.toLocaleString()}{' '}
                        <span className="text-sm font-normal text-slate-400">
                          kcal
                        </span>
                      </strong>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10">
                        <span className="text-[11px] text-sky-400 block font-semibold">
                          Protein
                        </span>
                        <strong className="font-mono text-sm font-bold text-white block mt-0.5">
                          {currentPreview.protein}g
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10">
                        <span className="text-[11px] text-emerald-400 block font-semibold">
                          Carbs
                        </span>
                        <strong className="font-mono text-sm font-bold text-white block mt-0.5">
                          {currentPreview.carbs}g
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10">
                        <span className="text-[11px] text-amber-400 block font-semibold">
                          Fat
                        </span>
                        <strong className="font-mono text-sm font-bold text-white block mt-0.5">
                          {currentPreview.fat}g
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Workout & AI Guidance Preview (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                    {/* Workout Card */}
                    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                          <Dumbbell className="h-3.5 w-3.5 text-sky-400" />
                          <span>Today’s Tailored Training Session</span>
                        </span>
                        <span className="font-mono text-slate-400">
                          {currentPreview.duration}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {currentPreview.workout}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Integrated progressive tracking with rest timers and set-by-set adherence logging.
                      </p>
                    </div>

                    {/* AI Coach Insight */}
                    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-sky-400" />
                        <h4 className="text-xs font-bold text-slate-200">
                          ASCEND Coach Prescription
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        "{currentPreview.aiTip}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">
                        Full prototype with 40+ foods, custom workouts & analytics
                      </span>
                      <button
                        type="button"
                        onClick={onExploreDemo}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        <span>Open this pathway in demo mode</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Three Dedicated Pathways Section */}
      <section id="pathways" className="py-20 border-t border-slate-800/80 bg-[#090F1C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-widest block">
              Personalized User Journeys
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              One Unified Core. Three Tailored Experiences.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              ASCEND adapts its macronutrient logic, dashboard metrics, and training recommendations to your true objective.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pathway 1 */}
            <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    General Nutrition & Diet
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Designed for everyday health, sustainable weight loss, healthy habit formation, and consistent hydration.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Calorie banking & mindful meal distribution</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Interactive water intake & daily step goals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Gentle progressive adherence coaching</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onStartOnboarding}
                className="w-full mt-4 py-2.5 px-4 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/40 transition-all text-center"
              >
                Select General Fitness
              </button>
            </div>

            {/* Pathway 2 */}
            <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-5 hover:border-sky-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <Flame className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Athlete Performance
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Built for competitive athletes and high-output lifters demanding exact carbohydrate timing, session adherence, and rapid recovery.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span>Glycogen-sparing carb distribution</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span>Timed rest intervals & exercise logging</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span>Electrolyte & hydration volume tracking</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onStartOnboarding}
                className="w-full mt-4 py-2.5 px-4 rounded-xl text-xs font-semibold text-sky-300 bg-sky-950/40 border border-sky-800/60 hover:bg-sky-900/40 transition-all text-center"
              >
                Select Athlete Performance
              </button>
            </div>

            {/* Pathway 3 */}
            <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-5 hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Weight Gain & Muscle Gain
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Designed for hypertrophy athletes requiring sustained caloric surplus, high-protein synthesis, and progressive strength overload.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Calorie surplus targets & macro alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Strength progression & hypertrophy logs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Lean body mass & waist circumference tracking</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onStartOnboarding}
                className="w-full mt-4 py-2.5 px-4 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 transition-all text-center"
              >
                Select Muscle Gain
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Platform Architecture / Feature Storytelling */}
      <section id="features" className="py-20 border-t border-slate-800/80 bg-[#070D18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-widest block">
              Core Capabilities
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Engineered for Complete Nutritional & Athletic Clarity
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <Utensils className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-white">
                Smart Food Ledger
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Portion scaling across grams, ounces, and standard servings with live macronutrient calculations and instant undo support.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-white">
                Rest Timer Engine
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interactive inter-set countdown timers (+30s adjustments, pause/resume) to optimize neurological recovery during heavy working sets.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-white">
                Trend Smoothing
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter out transient sodium and water weight fluctuations. View your authentic weekly trajectory with customizable Recharts graphs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-white">
                Contextual AI Coach
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ask questions about your daily intake, protein timing, or dinner adjustments. Receive structured insights with direct navigation actions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Evidence-Based Science Banner */}
      <section id="science" className="py-16 border-t border-slate-800/80 bg-[#0B1220]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-sky-900/30 via-slate-900 to-indigo-900/30 border border-slate-700/60 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 bg-sky-950/60 px-3 py-1 rounded-lg border border-sky-800/60">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Evidence-Based Framework</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                No Gimmicks. Just Physiology and Adherence.
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                ASCEND’s calculation service incorporates the Mifflin-St Jeor formula for basal metabolic rate (BMR), active energy multipliers, and ISSN guidelines for protein distribution.
              </p>
            </div>

            <button
              type="button"
              onClick={onStartOnboarding}
              className="px-6 py-3 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-md shrink-0 whitespace-nowrap active:scale-[0.98]"
            >
              Calculate Your Strategy
            </button>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-12 border-t border-slate-800/80 bg-[#060A13] text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-500" />
            <span className="font-display font-bold text-slate-300">ASCEND</span>
            <span>· Getting Better Every Day</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onExploreDemo}
              className="hover:text-slate-300 transition-colors"
            >
              Demo Playground
            </button>
            <button
              type="button"
              onClick={onOpenSignIn}
              className="hover:text-slate-300 transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onStartOnboarding}
              className="hover:text-slate-300 transition-colors"
            >
              Get Started
            </button>
          </div>

          <p className="text-[11px] text-slate-600">
            Frontend Architecture · Future FastAPI & PostgreSQL Ready
          </p>
        </div>
      </footer>
    </div>
  );
};
