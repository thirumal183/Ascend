import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  ChevronDown,
  Home,
  Lock,
  LogOut,
  Menu,
  Plus,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  NavigationTab,
  OnboardingPathway,
  UserAccount,
  UserProfile,
} from '../../types/ascend';

interface TopHeaderProps {
  activeTab: NavigationTab;
  userAccount: UserAccount;
  userProfile: UserProfile;
  usingDemoData: boolean;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMobileMenu: () => void;
  onViewLandingPage?: () => void;
  onSwitchPathway?: () => void;
  onSignOut: () => void;
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
        pill: 'bg-blue-50 text-blue-700 border-blue-200/90',
        dot: 'bg-[#2563EB]',
        btn: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-900/15',
      };
    case OnboardingPathway.MuscleGain:
      return {
        pill: 'bg-orange-50 text-orange-800 border-orange-200/90',
        dot: 'bg-[#EA580C]',
        btn: 'bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-orange-900/15',
      };
    case OnboardingPathway.GeneralFitness:
    default:
      return {
        pill: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        dot: 'bg-[#15803D]',
        btn: 'bg-[#15803D] hover:bg-[#166534] text-white shadow-emerald-950/15',
      };
  }
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  userAccount,
  userProfile,
  usingDemoData,
  onSelectTab,
  onOpenMobileMenu,
  onViewLandingPage,
  onSwitchPathway,
  onSignOut,
}) => {
  const theme = getPathwayTheme(userProfile.pathway);
  const isDemoMode = usingDemoData || Boolean(userAccount.isDemoAccount);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const userInitial = userAccount.name ? userAccount.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 bg-white/92 backdrop-blur-md border-b border-slate-200/90 transition-colors">
      {/* Left: Mobile Drawer Trigger + Contextual Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-[#0A1628] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0 truncate">
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0A1628] whitespace-nowrap">
            {TAB_TITLES[activeTab]}
          </h1>

          <span className="hidden sm:inline text-slate-300 font-light" aria-hidden="true">
            /
          </span>

          {/* Pathway Pill: Interactive in Demo Mode, Settings-linked in Live Account Mode */}
          {isDemoMode && onSwitchPathway ? (
            <button
              type="button"
              onClick={onSwitchPathway}
              aria-label={`Active demo pathway: ${userProfile.pathway}. Click to switch pathway.`}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${theme.pill}`}
              title="Demo Mode: Click to switch pathways freely"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              <span>{userProfile.pathway}</span>
              <ArrowRightLeft className="h-2.5 w-2.5 opacity-70 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectTab(NavigationTab.Settings)}
              aria-label={`Account pathway: ${userProfile.pathway}. Manage in Settings.`}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${theme.pill}`}
              title="Account pathway (change in Settings with password confirmation)"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              <span>{userProfile.pathway}</span>
              <Lock className="h-2.5 w-2.5 opacity-60 ml-0.5" />
            </button>
          )}

          {isDemoMode ? (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-800 border border-orange-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Demo Mode
            </span>
          ) : (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
              Verified Account
            </span>
          )}
        </div>
      </div>

      {/* Right: Home + Primary Quick Action + Accessible Account/Settings Menu */}
      <div className="flex items-center gap-2 shrink-0">
        {onViewLandingPage && (
          <button
            type="button"
            onClick={onViewLandingPage}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#0A1628] bg-slate-100 hover:bg-slate-200/75 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            title="Return to ASCEND Home"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>
        )}

        {activeTab === NavigationTab.Diet ? (
          <button
            type="button"
            onClick={() => onSelectTab(NavigationTab.AiCoach)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100/75 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Coach</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab(NavigationTab.Diet)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${theme.btn}`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log Meal</span>
            <span className="sm:hidden">Meal</span>
          </button>
        )}

        {/* Top-Right Account & Settings Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Open account and settings menu"
            className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            <div className="h-7 w-7 rounded-lg bg-[#0A1628] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
              {userInitial}
            </div>
            <div className="hidden sm:block max-w-[120px] truncate">
              <div className="text-xs font-semibold text-[#0F172A] truncate leading-tight">
                {userAccount.name || 'Account'}
              </div>
              <div className="text-[10px] text-slate-500 truncate leading-tight">
                {isDemoMode ? 'Demo Workspace' : 'Settings'}
              </div>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-150 ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Account controls"
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-[#0A1628]/12 py-2 z-50 animate-fade-in"
            >
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-[#0F172A] truncate">
                  {userAccount.name || 'ASCEND Member'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {userAccount.email || 'Authenticated Session'}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${theme.pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                    {userProfile.pathway}
                  </span>
                </div>
              </div>

              <div className="py-1 px-1.5 space-y-0.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSelectTab(NavigationTab.Settings);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0F172A] hover:bg-slate-100 transition-colors text-left"
                >
                  <Settings className="h-4 w-4 text-[#2563EB]" />
                  <span>Account & Settings</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSelectTab(NavigationTab.Goals);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors text-left"
                >
                  <Target className="h-4 w-4 text-slate-500" />
                  <span>Goals & Personal Profile</span>
                </button>

                {onViewLandingPage && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onViewLandingPage();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors text-left"
                  >
                    <Home className="h-4 w-4 text-slate-500" />
                    <span>Home Overview</span>
                  </button>
                )}

                {isDemoMode && onSwitchPathway && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onSwitchPathway();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors text-left"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-[#2563EB]" />
                    <span>Switch Demo Pathway</span>
                  </button>
                )}
              </div>

              <div className="pt-1 mt-1 border-t border-slate-100 px-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
