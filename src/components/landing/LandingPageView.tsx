import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  Dumbbell,
  ExternalLink,
  Flame,
  Heart,
  Layers,
  Play,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Utensils,
  Zap,
} from 'lucide-react';
import { OnboardingPathway } from '../../types/ascend';
import { AscendLogo } from '../brand/AscendLogo';

interface LandingPageViewProps {
  onStartOnboarding: () => void;
  onOpenSignIn: () => void;
  onExploreDemo: () => void;
  onSelectPathway?: (pathway: OnboardingPathway) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onStartOnboarding,
  onOpenSignIn,
  onExploreDemo,
  onSelectPathway,
}) => {
  const [selectedPathwayPreview, setSelectedPathwayPreview] =
    useState<OnboardingPathway>(OnboardingPathway.GeneralFitness);

  const PATHWAY_PREVIEWS = {
    [OnboardingPathway.GeneralFitness]: {
      name: 'General Nutrition & Diet',
      tagline: 'Sustainable Energy, Calorie Awareness & Metabolic Balance',
      badge: 'Everyday Metabolic Health',
      themeGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/40',
      activeTabBg: 'bg-emerald-500 text-white shadow-emerald-500/25',
      accentColor: 'text-emerald-400',
      glowColor: 'bg-emerald-500/10',
      icon: Heart,
      calories: 2150,
      protein: 135,
      carbs: 240,
      fat: 65,
      workout: 'Full Body Functional Mobility & Zone 2 Cardio',
      duration: '40 mins',
      burnKcal: '~280 kcal',
      aiPrescription:
        'Structure daily meals for steady blood glucose: prioritize fibrous legumes, seasonal vegetables, and balanced protein distribution with zero food guilt.',
      coreMetrics: [
        { label: 'Calorie Budget', value: '2,150 kcal', note: 'Maintenance & Vitality' },
        { label: 'Hydration Target', value: '3.0 L/day', note: 'Steady Energy' },
        { label: 'Adherence Model', value: 'Flexible Banking', note: 'Zero Guilt Tracking' },
      ],
    },
    [OnboardingPathway.AthletePerformance]: {
      name: 'Athlete Performance',
      tagline: 'High-Output Fueling, Glycogen Availability & Timed Recovery',
      badge: 'Performance & Glycogen Cockpit',
      themeGradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-sky-500/40',
      activeTabBg: 'bg-sky-500 text-white shadow-sky-500/25',
      accentColor: 'text-sky-400',
      glowColor: 'bg-sky-500/10',
      icon: Flame,
      calories: 2850,
      protein: 185,
      carbs: 360,
      fat: 72,
      workout: 'Explosive Lower Body Power & Inter-Set Rest Pacing',
      duration: '65 mins',
      burnKcal: '~480 kcal',
      aiPrescription:
        'Carbohydrate periodization: consume 45-50g fast-acting complex carbohydrates 60 mins pre-session. Replenish with 30g whey/soy and electrolytes within 45 mins post-workout.',
      coreMetrics: [
        { label: 'Performance Fuel', value: '2,850 kcal', note: 'High Expenditure Multiplier' },
        { label: 'Carb Timing', value: '360g / day', note: 'Glycogen Replenishment' },
        { label: 'Rest Intervals', value: '90s Paced', note: 'Neurological Recovery' },
      ],
    },
    [OnboardingPathway.MuscleGain]: {
      name: 'Weight Gain & Muscle Gain',
      tagline: 'Progressive Hypertrophy, Caloric Surplus & 4-Pulse MPS',
      badge: 'Hypertrophic Surplus Forge',
      themeGradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderColor: 'border-amber-500/40',
      activeTabBg: 'bg-amber-500 text-white shadow-amber-500/25',
      accentColor: 'text-amber-400',
      glowColor: 'bg-amber-500/10',
      icon: Dumbbell,
      calories: 3100,
      protein: 195,
      carbs: 390,
      fat: 85,
      workout: 'Push Hypertrophy & Progressive Compound Overload',
      duration: '55 mins',
      burnKcal: '~350 kcal',
      aiPrescription:
        'Sustain an anabolic surplus of +350 to +500 kcal daily. Distribute 35-45g protein across 4 distinct feeding windows to repeatedly cross the leucine trigger threshold.',
      coreMetrics: [
        { label: 'Target Surplus', value: '+450 kcal', note: 'Above Maintenance (TDEE)' },
        { label: 'Protein Pace', value: '2.0g / kg', note: 'Schoenfeld Hypertrophy' },
        { label: 'MPS Windows', value: '4 Daily Pulses', note: 'Leucine Threshold' },
      ],
    },
  };

  const currentPreview = PATHWAY_PREVIEWS[selectedPathwayPreview];
  const PathwayIcon = currentPreview.icon;

  const handleLaunchWithPathway = (pathway: OnboardingPathway) => {
    if (onSelectPathway) {
      onSelectPathway(pathway);
    }
    onStartOnboarding();
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 selection:bg-teal-500/20 selection:text-teal-300 font-sans antialiased overflow-x-hidden">
      {/* ========================================================= */}
      {/* 1. STICKY FROSTED BRAND NAVIGATION HEADER                */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-[#070D18]/85 backdrop-blur-xl border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
          {/* Brand Logo with Official ASCEND Geometry */}
          <div className="flex items-center gap-3">
            <AscendLogo
              variant="full"
              colorScheme="light"
              size="md"
              showTagline={true}
              className="hover:opacity-95 transition-opacity cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a
              href="#pathways"
              className="hover:text-teal-400 transition-colors"
            >
              Three Pathways
            </a>
            <a
              href="#interactive-preview"
              className="hover:text-teal-400 transition-colors"
            >
              Live Architecture
            </a>
            <a
              href="#features"
              className="hover:text-teal-400 transition-colors"
            >
              Core Capabilities
            </a>
            <a
              href="#science"
              className="hover:text-teal-400 transition-colors"
            >
              Evidence-Based
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExploreDemo}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition-all shadow-xs"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Explore Demo</span>
            </button>
            <button
              type="button"
              onClick={onOpenSignIn}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onStartOnboarding}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 hover:from-teal-300 hover:to-emerald-300 active:scale-[0.98] rounded-xl shadow-lg shadow-teal-500/20 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION WITH STAGGERED ENTRANCE ANIMATION         */}
      {/* ========================================================= */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        {/* Scandinavian Ambient Luminescence: Teal & Sky soft blurred spheres */}
        <div aria-hidden="true" className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[400px] bg-gradient-to-tr from-teal-500/15 via-sky-600/10 to-indigo-600/5 blur-[140px] pointer-events-none rounded-full" />
        <div aria-hidden="true" className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-emerald-600/10 blur-[120px] pointer-events-none rounded-full" />
        <div aria-hidden="true" className="absolute top-1/2 right-1/4 w-[450px] h-[350px] bg-sky-600/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Stagger Step 1: Trust Pill Badge */}
            <div className="animate-hero-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-400/30 text-teal-300 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ASCEND 2.2 · Scandinavian Health-Tech & Kinetic Vitality</span>
            </div>

            {/* Stagger Step 2: Monumental Hero Title */}
            <h1 className="animate-hero-2 font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
              Precision Fueling.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-sky-300 to-indigo-200">
                Progressive Training.
              </span>{' '}
              Everyday Mastery.
            </h1>

            {/* Stagger Step 3: Clear Narrative Description */}
            <p className="animate-hero-3 text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              ASCEND unifies authoritative food composition data, frictionless macronutrient logging, structured strength progression, and an AI performance coach—architected across three specialized user pathways.
            </p>

            {/* Stagger Step 4: Primary CTA Action Buttons */}
            <div className="animate-hero-4 flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={onStartOnboarding}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-sm font-bold text-slate-950 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 hover:from-teal-300 hover:to-emerald-300 rounded-xl shadow-xl shadow-teal-500/25 active:scale-[0.98] transition-all"
              >
                <span>Launch Guided Setup</span>
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onExploreDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-sm font-semibold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm"
              >
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Explore Live Interactive Demo</span>
              </button>
            </div>

            {/* Credibility Trust Badges */}
            <div className="animate-hero-4 pt-8 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                <span>ICMR-NIN & USDA Food Data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                <span>3 Dedicated Pathways</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>Mifflin-St Jeor TDEE Science</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Zero-Guilt Adherence</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. INTERACTIVE PATHWAY ARCHITECTURE SHOWCASE WIDGET       */}
          {/* ========================================================= */}
          <div id="interactive-preview" className="mt-16 max-w-5xl mx-auto">
            <div className="rounded-3xl p-1 bg-gradient-to-b from-slate-700/50 via-slate-800/40 to-slate-900/80 shadow-2xl">
              <div className="rounded-[22px] bg-[#0A101D] border border-slate-800/90 p-6 sm:p-8 space-y-6">
                {/* Pathway Switcher Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-teal-400 uppercase tracking-widest block">
                      Live Product Architecture
                    </span>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white mt-0.5">
                      Toggle Pathway to see the interface adapt:
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
                    {Object.values(OnboardingPathway).map((pathway) => {
                      const isActive = selectedPathwayPreview === pathway;
                      return (
                        <button
                          key={pathway}
                          type="button"
                          onClick={() => setSelectedPathwayPreview(pathway)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            isActive
                              ? pathway === OnboardingPathway.GeneralFitness
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : pathway === OnboardingPathway.AthletePerformance
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'bg-amber-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {pathway.replace(' & ', ' / ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Simulated Dynamic Screen Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left: Calorie & Macro Target Card (5 cols) */}
                  <div
                    className={`lg:col-span-5 rounded-2xl bg-gradient-to-b ${currentPreview.themeGradient} bg-slate-900/90 border ${currentPreview.borderColor} p-6 space-y-5 flex flex-col justify-between`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-xl bg-white/10 text-white">
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
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                          Target
                        </span>
                      </div>

                      {/* Monumental Tabular Numerals */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 text-center space-y-1">
                        <span className="text-xs text-slate-400 block font-medium">
                          Daily Energy Allocation
                        </span>
                        <div className="font-mono text-4xl font-black text-white tracking-tight tabular-nums">
                          {currentPreview.calories.toLocaleString()}{' '}
                          <span className="text-sm font-normal text-slate-400">
                            kcal
                          </span>
                        </div>
                      </div>

                      {/* Macro Breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                          <span className="text-[11px] text-sky-400 block font-semibold">
                            Protein
                          </span>
                          <strong className="font-mono text-base font-bold text-white block mt-0.5 tabular-nums">
                            {currentPreview.protein}g
                          </strong>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                          <span className="text-[11px] text-emerald-400 block font-semibold">
                            Carbs
                          </span>
                          <strong className="font-mono text-base font-bold text-white block mt-0.5 tabular-nums">
                            {currentPreview.carbs}g
                          </strong>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                          <span className="text-[11px] text-amber-400 block font-semibold">
                            Fat
                          </span>
                          <strong className="font-mono text-base font-bold text-white block mt-0.5 tabular-nums">
                            {currentPreview.fat}g
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Metric Pills */}
                    <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs text-slate-300">
                      {currentPreview.coreMetrics.map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">{m.label}</span>
                          <span className="font-semibold text-white font-mono">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Workout & AI Guidance Preview (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                    {/* Workout Card */}
                    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                          <Dumbbell className="h-3.5 w-3.5 text-teal-400" />
                          <span>Today’s Tailored Training Session</span>
                        </span>
                        <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {currentPreview.duration} · {currentPreview.burnKcal}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">
                        {currentPreview.workout}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Integrated progressive overload tracking with inter-set rest timer engine and RPE pacing.
                      </p>
                    </div>

                    {/* AI Coach Prescription */}
                    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-teal-400" />
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          ASCEND AI Coach Prescription
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{currentPreview.aiPrescription}"
                      </p>
                    </div>

                    {/* Quick Demo Action Trigger */}
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">
                        Experience the live app pre-populated with {currentPreview.name} data
                      </span>
                      <button
                        type="button"
                        onClick={onExploreDemo}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl transition-all shadow-sm shrink-0"
                      >
                        <span>Open Live Demo</span>
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

      {/* ========================================================= */}
      {/* 4. THREE DEDICATED PATHWAYS SECTION                       */}
      {/* ========================================================= */}
      <section id="pathways" className="py-24 border-t border-slate-800/80 bg-[#090F1C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block">
              Personalized User Journeys
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              One Unified Engine. Three Specialized Journeys.
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Generic health apps force all users into the same calorie-counting mold. ASCEND completely adapts its macronutrient algorithms, dashboard layout, and training recommendations to your true somatic goal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pathway 1: General Nutrition & Diet */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-7 space-y-6 transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col justify-between group">
              <div className="space-y-5">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Heart className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    General Nutrition & Diet
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Designed for everyday healthy eating, sustainable weight management, steady energy, and long-term metabolic health.
                  </p>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Balanced calorie equilibrium & non-punitive tracking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>3-preset hydration steppers & daily step pacing</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Gentle progressive adherence coaching</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchWithPathway(OnboardingPathway.GeneralFitness)}
                className="w-full mt-6 py-3 px-4 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-800/80 hover:bg-emerald-900/60 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Select General Nutrition</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Pathway 2: Athlete Performance */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 p-7 space-y-6 transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col justify-between group">
              <div className="space-y-5">
                <div className="h-14 w-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Flame className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Athlete Performance
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Engineered for competitive athletes and high-output trainers demanding exact carbohydrate timing, session adherence, and rapid glycogen synthesis.
                  </p>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>Pre/intra/post-workout carbohydrate periodization</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>Isolated inter-set rest timer & session runner</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>High-output fluid replenishment & electrolyte pacing</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchWithPathway(OnboardingPathway.AthletePerformance)}
                className="w-full mt-6 py-3 px-4 rounded-xl text-xs font-bold text-sky-300 bg-sky-950/50 border border-sky-800/80 hover:bg-sky-900/60 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Select Athlete Performance</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Pathway 3: Weight Gain & Muscle Gain */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-7 space-y-6 transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col justify-between group">
              <div className="space-y-5">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Dumbbell className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Weight Gain & Muscle Gain
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Designed for hypertrophy athletes requiring sustained caloric surplus, high-protein synthesis pacing, and progressive compound overload.
                  </p>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Caloric surplus forge (+350 to +500 kcal above TDEE)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>4-pulse MPS protein schedule (leucine threshold)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Progressive overload tracking (+2.5kg compound delta)</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchWithPathway(OnboardingPathway.MuscleGain)}
                className="w-full mt-6 py-3 px-4 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/50 border border-amber-800/80 hover:bg-amber-900/60 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Select Muscle Gain</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. PLATFORM CAPABILITIES & CRAFT GRID                    */}
      {/* ========================================================= */}
      <section id="features" className="py-24 border-t border-slate-800/80 bg-[#070D18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block">
              Engineering Craftsmanship
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Engineered for Nutritional & Biometric Clarity
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every feature in ASCEND is built around clinical research, authoritative data sources, and real athletic workflow requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Food Ledger */}
            <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <Utensils className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Verified Food Ledger
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Over 40+ authentic reference foods with verified ICMR-NIN & USDA attribution, raw vs. cooked state tags, and instant portion scaling with a 6-second undo window.
              </p>
            </div>

            {/* Card 2: Rest Timer */}
            <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Isolated Rest Timer
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Thumb-friendly inter-set rest timer with +30s extensions and pause/resume. Re-renders independently to maintain 60 FPS performance on mobile devices.
              </p>
            </div>

            {/* Card 3: Biometric Analytics */}
            <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Trend-Smoothing Biometrics
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter out transient sodium and fluid fluctuations. View authentic weekly trends using Recharts area charts, body fat percentages, and waist circumference logs.
              </p>
            </div>

            {/* Card 4: AI Performance Coach */}
            <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Contextual AI Coach
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pathway-aware conversational guidance that analyzes your daily intake records and suggests balanced dinners, high-calorie snacks, or recovery carbs with instant deep-link actions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. EVIDENCE-BASED SCIENCE FRAMEWORK                      */}
      {/* ========================================================= */}
      <section id="science" className="py-20 border-t border-slate-800/80 bg-[#0B1220]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-indigo-950/40 border border-slate-700/60 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-teal-400 bg-teal-950/60 px-3.5 py-1.5 rounded-lg border border-teal-800/60">
                <ShieldCheck className="h-4 w-4" />
                <span>Evidence-Based Framework</span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                No Gimmicks. Just Physiology, Physics and Proven Adherence.
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                ASCEND’s calculation engine implements the <strong>Mifflin-St Jeor formula</strong> for basal metabolic rate (BMR), validated physical activity level (PAL) multipliers, <strong>Schoenfeld & Aragon (2018)</strong> 2.0g/kg protein distribution targets, and <strong>ICMR-NIN 2024 Dietary Guidelines for Indians</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={onStartOnboarding}
              className="px-7 py-3.5 text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-lg shrink-0 whitespace-nowrap active:scale-[0.98]"
            >
              Calculate Your Strategy
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. FOOTER                                                */}
      {/* ========================================================= */}
      <footer className="py-14 border-t border-slate-800/80 bg-[#060A13] text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AscendLogo
              variant="full"
              colorScheme="light"
              size="sm"
              showTagline={false}
            />
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 font-medium">Getting Better Every Day.</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onExploreDemo}
              className="hover:text-slate-300 transition-colors font-medium"
            >
              Live Demo
            </button>
            <button
              type="button"
              onClick={onOpenSignIn}
              className="hover:text-slate-300 transition-colors font-medium"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onStartOnboarding}
              className="hover:text-slate-300 transition-colors font-medium"
            >
              Get Started
            </button>
          </div>

          <p className="text-[11px] text-slate-600">
            © 2026 ASCEND · Modern Health-Tech Architecture · FastAPI & PostgreSQL Ready
          </p>
        </div>
      </footer>
    </div>
  );
};
