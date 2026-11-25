import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Compass,
  Dumbbell,
  Flame,
  Heart,
  HelpCircle,
  Sparkles,
  Utensils,
  X,
  Zap,
} from 'lucide-react';

interface HomeUserGuideProps {
  onStartOnboarding: () => void;
  onExploreDemo: () => void;
  onJumpToSection: (sectionId: string) => void;
}

const GUIDE_SECTIONS = [
  {
    id: 'start',
    label: 'Start',
    title: 'Getting Started in 2 Minutes',
    body: 'Pick one goal path, enter your height, weight, age, and weekly routine, and ASCEND calculates realistic daily calorie, macro, and water targets using the Mifflin-St Jeor formula.',
  },
  {
    id: 'pathways',
    label: 'Pathways',
    title: 'Three Focused Paths',
    items: [
      {
        name: 'General Nutrition',
        tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        desc: 'Steady everyday meals, fiber focus, hydration, and light movement.',
        icon: Heart,
      },
      {
        name: 'Athlete Performance',
        tone: 'text-blue-700 bg-blue-50 border-blue-200',
        desc: 'Extra carbs for hard sessions, hydration buffering, and training logs.',
        icon: Flame,
      },
      {
        name: 'Muscle Gain',
        tone: 'text-orange-700 bg-orange-50 border-orange-200',
        desc: 'Controlled daily calorie surplus, high protein, and strength load progression.',
        icon: Dumbbell,
      },
    ],
  },
  {
    id: 'modules',
    label: 'Daily Tools',
    title: 'Food, Workouts, Progress & AI Coach',
    rows: [
      {
        icon: Utensils,
        label: 'Food Logging',
        text: 'Search ICMR-NIN and USDA foods, scale grams cleanly, or add private custom meals.',
      },
      {
        icon: Dumbbell,
        label: 'Workouts & Rest Timer',
        text: 'Check off sets with your actual reps and weight, backed by an in-app rest countdown.',
      },
      {
        icon: Activity,
        label: 'Progress Tracking',
        text: 'Log weight, body measurements, and step streaks across calendar views and CSV reports.',
      },
      {
        icon: Sparkles,
        label: 'AI Coach',
        text: 'Ask practical meal or recovery questions based on what you logged today—not generic guesses.',
      },
    ],
  },
] as const;

/**
 * Floating bottom-right User Guide strictly scoped to the public unauthenticated Homepage.
 * Disappears once the user signs in and never mounts inside internal dashboards or auth routes.
 */
export const HomeUserGuide: React.FC<HomeUserGuideProps> = ({
  onStartOnboarding,
  onExploreDemo,
  onJumpToSection,
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'start' | 'pathways' | 'modules'>('start');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3"
    >
      {open && (
        <div
          id="ascend-home-user-guide-panel"
          role="dialog"
          aria-label="ASCEND Quick User Guide"
          className="w-[calc(100vw-2rem)] sm:w-[390px] max-h-[75vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-[#0A1628]/15 overflow-hidden animate-fade-in"
        >
          {/* Compact Navy Header */}
          <div className="px-4 py-3.5 bg-[#0A1628] text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-600/25 border border-blue-400/30 text-blue-300 flex items-center justify-center">
                <Compass className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold leading-tight">
                  ASCEND Quick Guide
                </h3>
                <p className="text-[11px] text-blue-200/80">
                  How everything works in plain English
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close User Guide"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Guide Section Tabs */}
          <div
            role="tablist"
            aria-label="Guide topics"
            className="grid grid-cols-3 gap-1 p-1.5 bg-slate-100 border-b border-slate-200 shrink-0"
          >
            {GUIDE_SECTIONS.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                    selected
                      ? 'bg-white text-[#0A1628] shadow-2xs'
                      : 'text-slate-600 hover:text-[#0A1628]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Guide Body */}
          <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-600">
            {activeTab === 'start' && (
              <div className="space-y-3">
                <p className="font-display text-sm font-bold text-[#0A1628]">
                  Getting Started in 2 Minutes
                </p>
                <p className="leading-relaxed">
                  1. Choose a goal path (<strong>General Nutrition</strong>, <strong>Athlete Performance</strong>, or <strong>Muscle Gain</strong>).
                </p>
                <p className="leading-relaxed">
                  2. Enter your measurements once. ASCEND calculates science-backed calorie, protein, carb, fat, and hydration targets using <strong>Mifflin-St Jeor</strong>.
                </p>
                <p className="leading-relaxed">
                  3. Prefer to look around first? Launch the <strong>Interactive Demo</strong> immediately with sample meals and workouts—no account required.
                </p>
                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onJumpToSection('pathways');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold transition-colors"
                  >
                    Compare Pathways
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onJumpToSection('live-architecture');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors"
                  >
                    Preview Screens
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'pathways' && (
              <div className="space-y-2.5">
                <p className="font-display text-sm font-bold text-[#0A1628]">
                  Three Focused Paths
                </p>
                {GUIDE_SECTIONS[1].items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.name}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5"
                    >
                      <div className={`p-1.5 rounded-lg border shrink-0 ${item.tone}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-[#0A1628]">{item.name}</div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="space-y-2.5">
                <p className="font-display text-sm font-bold text-[#0A1628]">
                  Inside the Workspace
                </p>
                {GUIDE_SECTIONS[2].rows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.label}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5"
                    >
                      <Icon className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-[#0A1628]">{row.label}</div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          {row.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Quick Actions */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onExploreDemo();
              }}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[#0A1628] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="h-3.5 w-3.5 text-orange-500" />
              <span>Try Demo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onStartOnboarding();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Create Account</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom-Right Guide Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="ascend-home-user-guide-panel"
        aria-label={open ? 'Close User Guide' : 'Open User Guide'}
        className="group inline-flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full bg-[#0A1628] hover:bg-[#13294B] text-white text-xs font-bold shadow-lg shadow-[#0A1628]/25 border border-blue-400/30 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
      >
        <span className="h-5 w-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
          <HelpCircle className="h-3.5 w-3.5" />
        </span>
        <span>User Guide</span>
      </button>
    </div>
  );
};
