import React from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Dumbbell,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Target,
  UserCheck,
  Utensils,
  X,
} from 'lucide-react';
import { NavigationTab, UserAccount, UserProfile } from '../../types/ascend';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  userProfile: UserProfile;
  userAccount: UserAccount;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  { id: NavigationTab.Dashboard, label: 'Overview', icon: LayoutDashboard },
  { id: NavigationTab.Diet, label: 'Diet', icon: Utensils },
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
}) => {
  const handleNav = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Primary Sidebar Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0B1221] text-slate-300 border-r border-slate-800/80 transition-transform duration-200 ease-out lg:static lg:translate-x-0 shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Identity Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => handleNav(NavigationTab.Dashboard)}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-400/30 text-sky-400 shadow-sm group-hover:border-sky-400/50 transition-all">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-white leading-none group-hover:text-sky-300 transition-colors">
                ASCEND
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-400">
                Getting Better Every Day
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {/* Primary Navigation */}
          <div className="space-y-1">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-500/15 text-white border border-sky-500/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive ? 'text-sky-400 scale-105' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary Section: Planning & Exports */}
          <div className="pt-4 border-t border-slate-800/80 space-y-1">
            <p className="px-3.5 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Schedule & History
            </p>
            {SECONDARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`relative w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-500/15 text-white border border-sky-500/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-1.5 top-2 bottom-2 w-1 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive ? 'text-sky-400 scale-105' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile & Account Area at Bottom */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#080E1A]/90 space-y-2">
          <button
            type="button"
            onClick={() => handleNav(NavigationTab.Settings)}
            className={`w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition-all border ${
              activeTab === NavigationTab.Settings
                ? 'bg-slate-800 text-white border-slate-700 shadow-xs'
                : 'border-transparent hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/25 to-blue-600/15 border border-sky-400/30 text-sky-300">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {userAccount.name || 'Personal Account'}
              </p>
              <p className="text-xs text-sky-400/80 font-medium truncate">
                {userProfile.pathway}
              </p>
            </div>
            <Settings className="h-4 w-4 text-slate-500 hover:text-slate-300 shrink-0 transition-colors" />
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out / Switch Profile</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around lg:hidden"
      >
        {[
          PRIMARY_NAV_ITEMS[0], // Overview
          PRIMARY_NAV_ITEMS[1], // Diet
          PRIMARY_NAV_ITEMS[2], // Workouts
          PRIMARY_NAV_ITEMS[3], // Progress
          PRIMARY_NAV_ITEMS[5], // AI Coach
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                isActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
