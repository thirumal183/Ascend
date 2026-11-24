import React from 'react';
import {
  Activity,
  ArrowRightLeft,
  Calendar,
  Dumbbell,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Target,
  Utensils,
  X,
} from 'lucide-react';
import { NavigationTab, OnboardingPathway, UserAccount, UserProfile } from '../../types/ascend';
import { AscendLogo } from '../brand/AscendLogo';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  userProfile: UserProfile;
  userAccount: UserAccount;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onViewLandingPage?: () => void;
  onSwitchPathway?: () => void;
}

interface NavItemConfig {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  { id: NavigationTab.Dashboard, label: 'Overview', icon: LayoutDashboard },
  { id: NavigationTab.Diet, label: 'Diet & Meals', icon: Utensils },
  { id: NavigationTab.Workouts, label: 'Workouts', icon: Dumbbell },
  { id: NavigationTab.Progress, label: 'Progress', icon: Activity },
  { id: NavigationTab.Goals, label: 'Goals', icon: Target },
  { id: NavigationTab.AiCoach, label: 'AI Coach', icon: Sparkles },
];

const SECONDARY_NAV_ITEMS: NavItemConfig[] = [
  { id: NavigationTab.Calendar, label: 'Calendar', icon: Calendar },
  { id: NavigationTab.Reports, label: 'Reports', icon: FileSpreadsheet },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
  userAccount,
  onSignOut,
  mobileOpen,
  onCloseMobile,
  onViewLandingPage,
  onSwitchPathway,
}) => {
  const handleNav = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const pathwayTheme = (() => {
    switch (userProfile.pathway) {
      case OnboardingPathway.AthletePerformance:
        return {
          name: 'Athlete Performance',
          badgeBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
          dot: 'bg-sky-500',
          activePill: 'bg-sky-50/80 text-sky-950 border-sky-200/80 shadow-xs font-semibold',
          activeIcon: 'text-sky-600',
          activeBar: 'bg-sky-500',
          glow: 'from-sky-500/20 to-sky-600/5',
          brandIcon: 'bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-sky-500/20',
        };
      case OnboardingPathway.MuscleGain:
        return {
          name: 'Muscle & Weight Gain',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dot: 'bg-amber-500',
          activePill: 'bg-amber-50/80 text-amber-950 border-amber-200/80 shadow-xs font-semibold',
          activeIcon: 'text-amber-600',
          activeBar: 'bg-amber-500',
          glow: 'from-amber-500/20 to-amber-600/5',
          brandIcon: 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-amber-500/20',
        };
      case OnboardingPathway.GeneralFitness:
      default:
        return {
          name: 'General Nutrition',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dot: 'bg-emerald-500',
          activePill: 'bg-emerald-50/80 text-emerald-950 border-emerald-200/80 shadow-xs font-semibold',
          activeIcon: 'text-emerald-600',
          activeBar: 'bg-emerald-500',
          glow: 'from-emerald-500/20 to-emerald-600/5',
          brandIcon: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/20',
        };
    }
  })();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Modern Scandinavian Health-Tech Sidebar */}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white/95 backdrop-blur-xl text-slate-700 border-r border-slate-200/70 transition-transform duration-200 ease-out lg:static lg:translate-x-0 shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNav(NavigationTab.Dashboard)}
            className="flex items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl group"
          >
            <AscendLogo
              variant="full"
              colorScheme="dark"
              pathway={userProfile.pathway}
              size="sm"
            />
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pathway Context Banner in Sidebar */}
        <div className="px-3 pt-3.5 pb-1">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full shrink-0 ${pathwayTheme.dot}`} />
              <div className="truncate">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Active Pathway</div>
                <div className="text-xs font-bold text-slate-800 truncate">{pathwayTheme.name}</div>
              </div>
            </div>
            {onSwitchPathway && (
              <button
                type="button"
                onClick={onSwitchPathway}
                className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                title="Switch Pathway"
                aria-label="Switch Pathway"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {/* Primary Nav */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Workspace
            </div>
            <div className="space-y-0.5">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                      isActive
                        ? pathwayTheme.activePill
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {isActive && (
                      <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${pathwayTheme.activeBar}`} />
                    )}
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? pathwayTheme.activeIcon : 'text-slate-600'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Nav */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Tools & Data
            </div>
            <div className="space-y-0.5">
              {SECONDARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                      isActive
                        ? pathwayTheme.activePill
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {isActive && (
                      <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${pathwayTheme.activeBar}`} />
                    )}
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? pathwayTheme.activeIcon : 'text-slate-600'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer: User profile & Settings */}
        <div className="p-3 border-t border-slate-100 space-y-1.5">
          <button
            type="button"
            onClick={() => handleNav(NavigationTab.Settings)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
              activeTab === NavigationTab.Settings
                ? pathwayTheme.activePill
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Settings className="h-4 w-4 text-slate-600" />
            <span>Settings</span>
          </button>

          <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                {userAccount?.name ? userAccount.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {userAccount?.name || 'User'}
                </div>
                <div className="text-[10px] text-slate-600 truncate">
                  {userProfile.currentWeightKg}kg · {userProfile.goalType}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (clean, luminous, frosted) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-around py-2 px-1 lg:hidden shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {PRIMARY_NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? pathwayTheme.activeIcon : 'text-slate-600'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
