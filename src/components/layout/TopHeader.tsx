import React from 'react';
import { ArrowRightLeft, Menu, Plus, Sparkles } from 'lucide-react';
import { NavigationTab, OnboardingPathway, UserProfile } from '../../types/ascend';

interface TopHeaderProps {
  activeTab: NavigationTab;
  userProfile: UserProfile;
  usingDemoData: boolean;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMobileMenu: () => void;
  onViewLandingPage?: () => void;
  onSwitchPathway?: () => void;
}

const TAB_TITLES: Record<NavigationTab, string> = {
  [NavigationTab.Dashboard]: 'Overview',
  [NavigationTab.Diet]: 'Diet & Meal Logging',
  [NavigationTab.Workouts]: 'Workouts & Training',
  [NavigationTab.Progress]: 'Progress & Biometrics',
  [NavigationTab.Goals]: 'Goals & Targets',
  [NavigationTab.Reports]: 'Nutrition Intelligence Reports',
  [NavigationTab.AiCoach]: 'AI Performance Coach',
  [NavigationTab.Calendar]: 'Training & Meal Calendar',
  [NavigationTab.Settings]: 'Account & Settings',
};

const getPathwayTheme = (pathway: OnboardingPathway) => {
  switch (pathway) {
    case OnboardingPathway.AthletePerformance:
      return {
        pill: 'bg-sky-50 text-sky-700 border-sky-200/80',
        dot: 'bg-sky-500',
        btn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20',
      };
    case OnboardingPathway.MuscleGain:
      return {
        pill: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-500',
        btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
      };
    case OnboardingPathway.GeneralFitness:
    default:
      return {
        pill: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        dot: 'bg-emerald-500',
        btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
      };
  }
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  userProfile,
  usingDemoData,
  onSelectTab,
  onOpenMobileMenu,
  onViewLandingPage,
  onSwitchPathway,
}) => {
  const theme = getPathwayTheme(userProfile.pathway);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all">
      {/* Left: Mobile Drawer Trigger + Contextual Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0 truncate">
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            {TAB_TITLES[activeTab]}
          </h1>

          <span className="hidden sm:inline text-slate-300 font-light" aria-hidden="true">
            /
          </span>

          {/* Interactive Pathway Switcher Pill */}
          <button
            type="button"
            onClick={onSwitchPathway}
            aria-label={`Active pathway: ${userProfile.pathway}. Click to switch pathway.`}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-102 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${theme.pill}`}
            title="Click to switch pathway"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
            <span>{userProfile.pathway}</span>
            {onSwitchPathway && <ArrowRightLeft className="h-2.5 w-2.5 opacity-60 ml-0.5" />}
          </button>

          {usingDemoData ? (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Demo Data
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live Account
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {onViewLandingPage && (
          <button
            type="button"
            onClick={onViewLandingPage}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all"
            title="View Product Landing"
          >
            Landing
          </button>
        )}

        {activeTab === NavigationTab.Diet ? (
          <button
            type="button"
            onClick={() => onSelectTab(NavigationTab.AiCoach)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200/80 hover:bg-sky-100 rounded-xl transition-all shadow-2xs hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-600" />
            <span>AI Coach</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab(NavigationTab.Diet)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-xs hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${theme.btn}`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Meal</span>
          </button>
        )}
      </div>
    </header>
  );
};
