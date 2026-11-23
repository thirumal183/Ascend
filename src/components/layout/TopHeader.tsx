import React from 'react';
import { Menu, Plus, Sparkles } from 'lucide-react';
import { NavigationTab, OnboardingPathway, UserProfile } from '../../types/ascend';

interface TopHeaderProps {
  activeTab: NavigationTab;
  userProfile: UserProfile;
  usingDemoData: boolean;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMobileMenu: () => void;
  onViewLandingPage?: () => void;
}

const TAB_TITLES: Record<NavigationTab, string> = {
  [NavigationTab.Dashboard]: 'Overview',
  [NavigationTab.Diet]: 'Diet & Meal Logging',
  [NavigationTab.Workouts]: 'Workouts',
  [NavigationTab.Progress]: 'Progress & Measurements',
  [NavigationTab.Goals]: 'Goals & Profile',
  [NavigationTab.Reports]: 'Nutrition Reports',
  [NavigationTab.AiCoach]: 'AI Nutrition Coach',
  [NavigationTab.Calendar]: 'Training & Meal Calendar',
  [NavigationTab.Settings]: 'Account & Settings',
};

const getPathwayTheme = (pathway: OnboardingPathway) => {
  switch (pathway) {
    case OnboardingPathway.AthletePerformance:
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case OnboardingPathway.MuscleGain:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case OnboardingPathway.GeneralFitness:
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  userProfile,
  usingDemoData,
  onSelectTab,
  onOpenMobileMenu,
  onViewLandingPage,
}) => {
  const pathwayStyle = getPathwayTheme(userProfile.pathway);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
      {/* Left: Mobile Drawer Trigger + Contextual Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5 truncate">
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            {TAB_TITLES[activeTab]}
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <span
            className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pathwayStyle}`}
          >
            {userProfile.pathway}
          </span>
          {usingDemoData ? (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100/70 text-amber-800 border border-amber-300/80">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Demo Mode
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-100/70 text-emerald-800 border border-emerald-300/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Personal Log
            </span>
          )}
        </div>
      </div>

      {/* Right: Contextual Primary Action */}
      <div className="flex items-center gap-2 shrink-0">
        {onViewLandingPage && (
          <button
            type="button"
            onClick={onViewLandingPage}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all"
            title="Explore Product Landing"
          >
            <span>Landing</span>
          </button>
        )}
        {activeTab === NavigationTab.Diet ? (
          <button
            type="button"
            onClick={() => onSelectTab(NavigationTab.AiCoach)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200/80 hover:bg-sky-100 rounded-xl transition-all whitespace-nowrap shrink-0 shadow-2xs hover:shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-600" />
            <span>Ask AI Coach</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab(NavigationTab.Diet)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-sky-700 rounded-xl hover:from-sky-700 hover:to-sky-800 transition-all whitespace-nowrap shrink-0 shadow-xs hover:shadow-sm active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Food</span>
          </button>
        )}
      </div>
    </header>
  );
};
