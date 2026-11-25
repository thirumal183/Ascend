import React from 'react';
import {
  Activity,
  ArrowRightLeft,
  Calendar,
  Dumbbell,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Lock,
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
  usingDemoData: boolean;
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
  usingDemoData,
  onSignOut,
  mobileOpen,
  onCloseMobile,
  onViewLandingPage,
  onSwitchPathway,
}) => {
  const isDemoMode = usingDemoData || Boolean(userAccount.isDemoAccount);

  const handleNav = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const pathwayTheme = (() => {
    switch (userProfile.pathway) {
      case OnboardingPathway.AthletePerformance:
        return {
          name: 'Athlete Performance',
          dot: 'bg-[#2563EB]',
          activePill: 'bg-blue-50/90 text-blue-950 border-blue-200/90 font-semibold',
          activeIcon: 'text-[#2563EB]',
          activeBar: 'bg-[#2563EB]',
        };
      case OnboardingPathway.MuscleGain:
        return {
          name: 'Muscle & Weight Gain',
          dot: 'bg-[#EA580C]',
          activePill: 'bg-orange-50/90 text-orange-950 border-orange-200/90 font-semibold',
          activeIcon: 'text-[#EA580C]',
          activeBar: 'bg-[#EA580C]',
        };
      case OnboardingPathway.GeneralFitness:
      default:
        return {
          name: 'General Nutrition',
          dot: 'bg-[#15803D]',
          activePill: 'bg-emerald-50/90 text-emerald-950 border-emerald-200/90 font-semibold',
          activeIcon: 'text-[#15803D]',
          activeBar: 'bg-[#15803D]',
        };
    }
  })();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0A1628]/45 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Cool-White & Navy Application Sidebar */}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white text-slate-700 border-r border-slate-200 transition-transform duration-200 ease-out lg:static lg:translate-x-0 shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            data-ascend-navbar-logo="true"
            onClick={() => handleNav(NavigationTab.Dashboard)}
            className="flex items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-xl"
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
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0A1628] lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pathway Context Card */}
        <div className="px-3 pt-3.5 pb-1">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full shrink-0 ${pathwayTheme.dot}`} />
              <div className="truncate">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Active Pathway
                </div>
                <div className="text-xs font-bold text-[#0A1628] truncate">
                  {pathwayTheme.name}
                </div>
              </div>
            </div>
            {isDemoMode && onSwitchPathway ? (
              <button
                type="button"
                onClick={() => {
                  onSwitchPathway();
                  onCloseMobile();
                }}
                className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-[#0A1628] hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                title="Switch Demo Pathway"
                aria-label="Switch Demo Pathway"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNav(NavigationTab.Settings)}
                className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-[#0A1628] hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                title="Manage pathway in Settings"
                aria-label="Manage pathway in Settings"
              >
                <Lock className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {/* Primary Nav */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left border ${
                      isActive
                        ? pathwayTheme.activePill
                        : 'border-transparent text-slate-600 hover:text-[#0A1628] hover:bg-slate-100/80'
                    }`}
                  >
                    {isActive && (
                      <span
                        className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${pathwayTheme.activeBar}`}
                      />
                    )}
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? pathwayTheme.activeIcon : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Nav */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Planning & Analytics
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
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left border ${
                      isActive
                        ? pathwayTheme.activePill
                        : 'border-transparent text-slate-600 hover:text-[#0A1628] hover:bg-slate-100/80'
                    }`}
                  >
                    {isActive && (
                      <span
                        className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${pathwayTheme.activeBar}`}
                      />
                    )}
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? pathwayTheme.activeIcon : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

              {onViewLandingPage && (
                <button
                  type="button"
                  onClick={() => {
                    onViewLandingPage();
                    onCloseMobile();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium border border-transparent text-slate-600 hover:text-[#0A1628] hover:bg-slate-100/80 transition-colors text-left"
                >
                  <Home className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">Home</span>
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Compact Footer */}
        <div className="p-3 border-t border-slate-100 space-y-1.5">
          <button
            type="button"
            onClick={() => handleNav(NavigationTab.Settings)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left border ${
              activeTab === NavigationTab.Settings
                ? pathwayTheme.activePill
                : 'border-transparent text-slate-600 hover:text-[#0A1628] hover:bg-slate-100/80'
            }`}
          >
            <Settings className={`h-4 w-4 ${activeTab === NavigationTab.Settings ? pathwayTheme.activeIcon : 'text-slate-400'}`} />
            <span>Account & Settings</span>
          </button>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-[#0A1628] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                {userAccount?.name ? userAccount.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-[#0A1628] truncate">
                  {userAccount?.name || 'User'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {userProfile.currentWeightKg}kg · {userProfile.goalType}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-2 px-1 lg:hidden shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
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
                isActive ? 'text-[#0A1628] font-bold' : 'text-slate-500 hover:text-[#0A1628]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? pathwayTheme.activeIcon : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
