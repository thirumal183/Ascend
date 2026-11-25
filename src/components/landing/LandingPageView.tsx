import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Pause,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import {
  NavigationTab,
  OnboardingPathway,
  UserAccount,
  UserProfile,
} from '../../types/ascend';
import { AscendLogo } from '../brand/AscendLogo';
import { AscendCursorField } from './AscendCursorField';
import { HomeUserGuide } from './HomeUserGuide';

interface LandingPageViewProps {
  userAccount?: UserAccount;
  userProfile?: UserProfile;
  onStartOnboarding: () => void;
  onOpenSignIn: () => void;
  onExploreDemo: () => void;
  onSelectPathway?: (pathway: OnboardingPathway) => void;
  onReturnToDashboard?: (tab?: NavigationTab) => void;
  onSignOut?: () => void;
}

type ShowcaseSlideId =
  | 'general'
  | 'athlete'
  | 'muscle'
  | 'nutrition'
  | 'coach';

interface ShowcaseSlide {
  id: ShowcaseSlideId;
  tabLabel: string;
  pathwayBadge: string;
  title: string;
  subtitle: string;
  accentHex: string;
  tabBarColor: string;
  badgeClass: string;
  checkColor: string;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  primaryMetricUnit: string;
  secondaryMetrics: { label: string; value: string }[];
  workflowTitle: string;
  workflowSummary: string;
  bullets: string[];
}

const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: 'general',
    tabLabel: 'General Nutrition',
    pathwayBadge: 'Pathway 01 · Everyday Balance',
    title: 'Steady daily nutrition without strict dieting',
    subtitle:
      'Calibrated for sustainable energy, dietary fiber, daily hydration, and practical weekly consistency.',
    accentHex: '#15803D',
    tabBarColor: 'bg-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    checkColor: 'text-emerald-400',
    primaryMetricLabel: 'Daily Calorie Target (Sample Profile)',
    primaryMetricValue: '2,150',
    primaryMetricUnit: 'kcal / day',
    secondaryMetrics: [
      { label: 'Protein', value: '135 g' },
      { label: 'Carbs', value: '240 g' },
      { label: 'Fat', value: '65 g' },
      { label: 'Hydration', value: '3.0 L' },
    ],
    workflowTitle: 'Balanced Meals & Daily Movement',
    workflowSummary:
      'Combines realistic calorie balance with hydration tracking and gentle activity streaks.',
    bullets: [
      'Balanced 30% protein / 45% carbs / 25% fat targets from Mifflin-St Jeor TDEE',
      'Quick water logging (+250 ml and +500 ml) stored safely in your account',
      'Clear weekly summaries focused on consistency—not guilt',
    ],
  },
  {
    id: 'athlete',
    tabLabel: 'Athlete Performance',
    pathwayBadge: 'Pathway 02 · High-Output Fueling',
    title: 'Training fuel, carbs, and paced recovery',
    subtitle:
      'Built for demanding weekly training schedules with carbohydrate fueling and inter-set rest tracking.',
    accentHex: '#2563EB',
    tabBarColor: 'bg-blue-600',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    checkColor: 'text-blue-400',
    primaryMetricLabel: 'Training Fuel Target (Sample Profile)',
    primaryMetricValue: '2,850',
    primaryMetricUnit: 'kcal / day',
    secondaryMetrics: [
      { label: 'Protein', value: '185 g' },
      { label: 'Carbs', value: '360 g' },
      { label: 'Fat', value: '72 g' },
      { label: 'Fluids', value: '3.4 L' },
    ],
    workflowTitle: 'Session Fueling & Live Set Tracking',
    workflowSummary:
      'Pairs pre-workout carbs with actual sets, lifted weight, RPE check-ins, and hydration replenishment.',
    bullets: [
      'Carb-forward 25% protein / 55% carbs / 20% fat ratio for hard workouts',
      'Log actual reps and loads (kg) with a responsive rest countdown timer',
      'Includes a +450 ml fluid buffer to replace training sweat losses',
    ],
  },
  {
    id: 'muscle',
    tabLabel: 'Muscle Gain',
    pathwayBadge: 'Pathway 03 · Lean Muscle Surplus',
    title: 'Controlled calorie surplus & strength tracking',
    subtitle:
      'Supports steady lean weight gain with high-protein meals and progressive lifting volume.',
    accentHex: '#EA580C',
    tabBarColor: 'bg-orange-600',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    checkColor: 'text-orange-400',
    primaryMetricLabel: 'Surplus Target (Sample Profile)',
    primaryMetricValue: '3,100',
    primaryMetricUnit: 'kcal / day',
    secondaryMetrics: [
      { label: 'Protein', value: '195 g' },
      { label: 'Carbs', value: '390 g' },
      { label: 'Fat', value: '85 g' },
      { label: 'Surplus', value: '+400 kcal' },
    ],
    workflowTitle: 'Hypertrophy Meals & Lift Progression',
    workflowSummary:
      'Monitors your daily calorie surplus alongside weight check-ins and custom gym routines saved to your profile.',
    bullets: [
      'Controlled +350 to +500 kcal surplus above your maintenance calories',
      '2.0–2.1 g/kg protein pacing aligned with sports nutrition research',
      'Add custom exercises directly into your saved PostgreSQL workout plans',
    ],
  },
  {
    id: 'nutrition',
    tabLabel: 'Food Database',
    pathwayBadge: 'Core Feature · Verified Nutrition Data',
    title: 'Trusted ICMR-NIN & USDA food values',
    subtitle:
      'Search Indian staples and global foods, compare nutrients side by side, and scale grams accurately.',
    accentHex: '#2563EB',
    tabBarColor: 'bg-indigo-600',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    checkColor: 'text-indigo-400',
    primaryMetricLabel: 'Structured Food Composition Catalog',
    primaryMetricValue: '40+',
    primaryMetricUnit: 'verified foods',
    secondaryMetrics: [
      { label: 'Sources', value: 'ICMR-NIN / USDA' },
      { label: 'Prep Tags', value: 'Raw / Cooked' },
      { label: 'Custom Foods', value: 'Account Private' },
      { label: 'Undo Window', value: '6 sec' },
    ],
    workflowTitle: 'Accurate Snapshots & Custom Foods',
    workflowSummary:
      'Saves exact meal nutrition at the moment you log it, keeping your historical diary trustworthy.',
    bullets: [
      'Labels raw vs. cooked state so rice, dal, and meats scale accurately',
      'Side-by-side comparison across calories, protein, carbs, fat, fiber & sodium',
      'Create private custom foods visible only inside your own account',
    ],
  },
  {
    id: 'coach',
    tabLabel: 'AI Coach',
    pathwayBadge: 'Core Feature · Grounded AI Coaching',
    title: 'Practical meal & recovery advice from your logs',
    subtitle:
      'Reads today’s meals, active pathway, and targets to suggest realistic next steps with clear safeguards.',
    accentHex: '#7C3AED',
    tabBarColor: 'bg-violet-600',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    checkColor: 'text-violet-400',
    primaryMetricLabel: 'Privacy & Safety Standards',
    primaryMetricValue: 'Zero',
    primaryMetricUnit: 'password or email sent',
    secondaryMetrics: [
      { label: 'Model', value: 'Gemini 2.5 Flash' },
      { label: 'Backup', value: 'Smart Offline Mode' },
      { label: 'Scope', value: 'Non-Medical' },
      { label: 'History', value: 'Saved in Account' },
    ],
    workflowTitle: 'Clear Answers & Instant Shortcuts',
    workflowSummary:
      'Highlights remaining protein or calorie gaps and links directly to Food Logging, Workouts, or Progress.',
    bullets: [
      'Explains what data is sent before your first AI coaching message',
      'Always labels whether a reply came from live Gemini or offline rules',
      'Educational fitness & nutrition guidance—never medical diagnoses',
    ],
  },
];

const NAV_SECTIONS = [
  { id: 'home-top', label: 'Home' },
  { id: 'live-architecture', label: 'Inside ASCEND' },
  { id: 'pathways', label: 'Three Pathways' },
  { id: 'capabilities', label: 'Features' },
  { id: 'science', label: 'Methodology' },
] as const;

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  userAccount,
  userProfile,
  onStartOnboarding,
  onOpenSignIn,
  onExploreDemo,
  onSelectPathway,
  onReturnToDashboard,
  onSignOut,
}) => {
  const isAuthed = Boolean(
    userAccount?.isAuthenticated && userAccount?.onboardingCompleted
  );

  const [activeNavId, setActiveNavId] = useState<string>('home-top');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isShowcasePaused, setIsShowcasePaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [slideTransitioning, setSlideTransitioning] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Sticky header elevation & active scroll section spy
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 12);

      if (y < 160) {
        setActiveNavId('home-top');
        return;
      }

      const nearBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 80;
      if (nearBottom) {
        setActiveNavId('science');
        return;
      }

      const sectionIds = ['live-architecture', 'pathways', 'capabilities', 'science'];
      let current = 'home-top';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 170) {
          current = id;
        }
      }
      setActiveNavId(current);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-advance showcase cleanly; resets interval whenever activeSlideIndex changes manually
  useEffect(() => {
    if (isShowcasePaused || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isShowcasePaused, prefersReducedMotion, activeSlideIndex]);

  // Brief subtle fade state without unmounting DOM panels (eliminates layout flicker)
  useEffect(() => {
    if (prefersReducedMotion) return;
    setSlideTransitioning(true);
    const t = window.setTimeout(() => setSlideTransitioning(false), 160);
    return () => window.clearTimeout(t);
  }, [activeSlideIndex, prefersReducedMotion]);

  // Close Home account dropdown on outside click / Escape
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [accountMenuOpen]);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    setActiveNavId(sectionId);
    if (sectionId === 'home-top') {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      return;
    }
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const handleLaunchWithPathway = (pathway: OnboardingPathway) => {
    if (isAuthed && onReturnToDashboard) {
      onReturnToDashboard(NavigationTab.Dashboard);
      return;
    }
    if (onSelectPathway) {
      onSelectPathway(pathway);
    }
    onStartOnboarding();
  };

  const selectSlide = (idx: number) => {
    setActiveSlideIndex(idx);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectSlide((idx + 1) % SHOWCASE_SLIDES.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectSlide((idx - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);
    }
  };

  const currentSlide = SHOWCASE_SLIDES[activeSlideIndex];

  return (
    <div
      id="home-top"
      className="relative min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased overflow-x-clip"
    >
      {/* Distinctive Restrained Cursor-Following Field (Homepage only, fine pointers only) */}
      <AscendCursorField />

      {/* ========================================================= */}
      {/* 1. STICKY NAVY & COBALT NAVIGATION HEADER                 */}
      {/* ========================================================= */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 border-b ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-slate-200/90 shadow-[0_8px_24px_-8px_rgba(10,22,40,0.1)]'
            : 'bg-white/85 backdrop-blur-sm border-slate-200/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Mark */}
          <button
            type="button"
            data-ascend-navbar-logo="true"
            onClick={() => scrollToSection('home-top')}
            className="flex items-center text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label="ASCEND Home"
          >
            <AscendLogo
              variant="full"
              colorScheme="dark"
              size="md"
              showTagline={true}
            />
          </button>

          {/* Desktop Navigation with Scroll-Aware Active Highlight */}
          <nav
            aria-label="Home Page Sections"
            className="hidden lg:flex items-center gap-2"
          >
            {NAV_SECTIONS.map((item) => {
              const isActive = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`relative px-3.5 py-2 text-xs font-semibold tracking-wide rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                    isActive
                      ? 'text-[#1D4ED8] bg-blue-50/90 shadow-[0_0_16px_rgba(37,99,235,0.16)]'
                      : 'text-slate-600 hover:text-[#0A1628] hover:bg-slate-100/80'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] transition-all duration-200 ${
                      isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Right Auth-Aware Actions */}
          <div className="flex items-center gap-2.5">
            {isAuthed && onReturnToDashboard ? (
              <>
                <button
                  type="button"
                  onClick={() => onReturnToDashboard(NavigationTab.Dashboard)}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A1628] hover:bg-[#13294B] rounded-xl shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-blue-300" />
                  <span>Open Dashboard</span>
                </button>

                {/* Authenticated Profile Dropdown on Home */}
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                    className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <span className="h-7 w-7 rounded-lg bg-[#2563EB] text-white font-display font-bold text-xs flex items-center justify-center">
                      {userAccount?.name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                    <span className="hidden md:inline text-xs font-semibold text-[#0F172A] max-w-[110px] truncate">
                      {userAccount?.name || 'Account'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  </button>

                  {accountMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-[#0F172A] truncate">
                          {userAccount?.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {userAccount?.email}
                        </p>
                        {userProfile?.pathway && (
                          <p className="text-[10px] font-semibold text-[#2563EB] mt-1">
                            {userProfile.pathway}
                          </p>
                        )}
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            onReturnToDashboard(NavigationTab.Dashboard);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0F172A] hover:bg-slate-100 text-left"
                        >
                          <LayoutDashboard className="h-4 w-4 text-[#2563EB]" />
                          <span>Go to Dashboard</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            onReturnToDashboard(NavigationTab.Settings);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 text-left"
                        >
                          <Settings className="h-4 w-4 text-slate-500" />
                          <span>Account & Settings</span>
                        </button>
                        {onSignOut && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onSignOut();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 text-left"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <Zap className="h-3.5 w-3.5 text-orange-500" />
                  <span>Try Demo</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-[#0A1628] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={onStartOnboarding}
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-xs shadow-blue-600/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-100" />
                </button>
              </>
            )}

            {/* Mobile Nav Menu Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 bg-white text-[#0F172A] hover:bg-slate-100"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            {NAV_SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold ${
                  activeNavId === item.id
                    ? 'bg-blue-50 text-[#1D4ED8]'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
              {isAuthed && onReturnToDashboard ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onReturnToDashboard(NavigationTab.Dashboard);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0A1628] text-white text-xs font-bold"
                >
                  Open Dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onExploreDemo();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[#0F172A] text-xs font-semibold"
                  >
                    Try Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenSignIn();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-[#0F172A] text-xs font-semibold"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. EDITORIAL HERO SECTION (COOL WHITE + NAVY & COBALT)    */}
      {/* ========================================================= */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden bg-gradient-to-b from-white via-[#F8FAFC] to-[#F4F7FB]">
        <div
          aria-hidden="true"
          className="absolute -top-28 -right-12 w-[580px] h-[580px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.09),rgba(124,58,237,0.04)_48%,transparent_70%)] pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-20 w-[440px] h-[440px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.06),transparent_65%)] pointer-events-none"
        />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Editorial Narrative (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="animate-hero-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200/90 text-[#1D4ED8] shadow-2xs">
                <Activity className="h-3.5 w-3.5" />
                <span>Personalized Nutrition, Workouts & AI Coaching</span>
              </div>

              <h1 className="animate-hero-2 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A1628] leading-[1.07]">
                Smart daily nutrition built for{' '}
                <span className="relative inline-block text-[#2563EB]">
                  real progress.
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-1 h-2 bg-blue-100/90 -z-10 rounded-full"
                  />
                </span>
              </h1>

              <p className="animate-hero-3 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                ASCEND brings together trusted ICMR-NIN and USDA food data, hydration tracking, set-by-set workout logs, and goal-aware AI coaching inside one clean daily workspace.
              </p>

              {/* Clear CTA Hierarchy */}
              <div className="animate-hero-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                {isAuthed && onReturnToDashboard ? (
                  <button
                    type="button"
                    onClick={() => onReturnToDashboard(NavigationTab.Dashboard)}
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-bold text-white bg-[#0A1628] hover:bg-[#13294B] rounded-xl shadow-md shadow-[#0A1628]/15 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                  >
                    <LayoutDashboard className="h-4 w-4 text-blue-300" />
                    <span>Continue to Dashboard</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStartOnboarding}
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-md shadow-blue-600/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                  >
                    <span>Start Free Setup</span>
                    <ArrowRight className="h-4 w-4 text-blue-100" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#0A1628] bg-white hover:bg-slate-100 border border-slate-300/80 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                >
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span>Explore Live Demo</span>
                </button>
              </div>

              {/* Grounded Feature Pillars */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ICMR-NIN & USDA Foods</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <span>3 Goal Pathways</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
                  <span>Mifflin-St Jeor TDEE</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-[#7C3AED] shrink-0" />
                  <span>AI Coaching Built In</span>
                </div>
              </div>
            </div>

            {/* Right Editorial Telemetry Card (5 cols) — Deep Navy Signature Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-[#0A1628] text-white p-6 sm:p-7 shadow-2xl shadow-[#0A1628]/20 border border-blue-500/20 space-y-5 relative overflow-hidden">
                <div
                  aria-hidden="true"
                  className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-600/20 blur-2xl pointer-events-none"
                />
                <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 block">
                      One Account, Three Paths
                    </span>
                    <h2 className="font-display text-lg font-bold text-white mt-0.5">
                      Targets Matched to Your Goal
                    </h2>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-blue-300" />
                  </div>
                </div>

                <div className="relative space-y-3">
                  {[
                    {
                      label: 'General Nutrition & Diet',
                      sub: 'Balanced energy & daily hydration',
                      kcal: '2,150 kcal',
                      dot: 'bg-emerald-400',
                      kcalTone: 'text-emerald-300',
                    },
                    {
                      label: 'Athlete Performance',
                      sub: 'Workout carbs & training volume',
                      kcal: '2,850 kcal',
                      dot: 'bg-blue-400',
                      kcalTone: 'text-blue-300',
                    },
                    {
                      label: 'Weight Gain & Muscle Gain',
                      sub: 'Controlled surplus & strength sets',
                      kcal: '3,100 kcal',
                      dot: 'bg-orange-400',
                      kcalTone: 'text-orange-300',
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="p-3.5 rounded-2xl bg-[#11223D] border border-white/10 flex items-center justify-between gap-3 hover:border-blue-400/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${row.dot}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {row.label}
                          </div>
                          <div className="text-[11px] text-slate-300/80 truncate">
                            {row.sub}
                          </div>
                        </div>
                      </div>
                      <span className={`font-mono text-xs font-bold tabular-nums shrink-0 ${row.kcalTone}`}>
                        {row.kcal}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="relative pt-2 flex items-center justify-between text-[11px] text-slate-300/80 border-t border-white/10">
                  <span>PostgreSQL Database · Secure Sessions</span>
                  <button
                    type="button"
                    onClick={() => scrollToSection('live-architecture')}
                    className="font-semibold text-blue-300 hover:text-white inline-flex items-center gap-1"
                  >
                    <span>Preview Screens</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. INTERACTIVE PRODUCT SHOWCASE (#live-architecture)      */}
      {/*    Stable DOM containers prevent lag and height jumps     */}
      {/* ========================================================= */}
      <section
        id="live-architecture"
        className="scroll-mt-24 py-16 sm:py-20 bg-white border-y border-slate-200/90 relative z-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Interactive Product Preview
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0A1628] tracking-tight">
                See how ASCEND adapts across each goal
              </h2>
              <p className="text-sm text-slate-600">
                Click any tab below or use arrow keys to explore each screen. Every panel reflects real tools inside the app.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() =>
                  selectSlide(
                    (activeSlideIndex - 1 + SHOWCASE_SLIDES.length) %
                      SHOWCASE_SLIDES.length
                  )
                }
                aria-label="Previous showcase slide"
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#0A1628] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsShowcasePaused((prev) => !prev)}
                aria-label={isShowcasePaused ? 'Resume showcase rotation' : 'Pause showcase rotation'}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#0A1628] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                {isShowcasePaused ? (
                  <>
                    <Play className="h-3.5 w-3.5 text-[#2563EB]" />
                    <span>Paused</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5 text-[#2563EB]" />
                    <span>Auto-Playing</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  selectSlide((activeSlideIndex + 1) % SHOWCASE_SLIDES.length)
                }
                aria-label="Next showcase slide"
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#0A1628] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stable Showcase Frame (Pauses cleanly on hover/focus without internal blur thrashing) */}
          <div
            onMouseEnter={() => setIsShowcasePaused(true)}
            onMouseLeave={() => setIsShowcasePaused(false)}
            onFocusCapture={() => setIsShowcasePaused(true)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsShowcasePaused(false);
              }
            }}
            className="rounded-3xl bg-[#F8FAFC] border border-slate-200/90 p-4 sm:p-7 space-y-6 shadow-sm"
          >
            {/* Synchronized Slide Selector Tabs */}
            <div
              role="tablist"
              aria-label="ASCEND Product Views"
              className="grid grid-cols-2 sm:grid-cols-5 gap-2"
            >
              {SHOWCASE_SLIDES.map((slide, idx) => {
                const selected = idx === activeSlideIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    id={`showcase-tab-${slide.id}`}
                    aria-controls={`showcase-panel-${slide.id}`}
                    aria-selected={selected}
                    onClick={() => selectSlide(idx)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={`relative overflow-hidden px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      selected
                        ? 'bg-white border-[#0A1628] text-[#0A1628] shadow-xs font-bold'
                        : 'bg-white/75 border-slate-200 text-slate-600 hover:bg-white hover:text-[#0A1628] font-medium'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-slate-400">
                      0{idx + 1}
                    </div>
                    <div className="text-xs truncate">{slide.tabLabel}</div>
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-0 right-0 h-0.5 transition-opacity duration-150 ${slide.tabBarColor} ${
                        selected ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Persistent Two-Column Showcase Stage (zero remounting lag) */}
            <div
              role="tabpanel"
              id={`showcase-panel-${currentSlide.id}`}
              aria-labelledby={`showcase-tab-${currentSlide.id}`}
              className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[380px] transition-opacity duration-150 ease-out ${
                slideTransitioning ? 'opacity-75' : 'opacity-100'
              }`}
            >
              {/* Left Metrics Card (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-6 flex flex-col justify-between space-y-5 shadow-2xs">
                <div className="space-y-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${currentSlide.badgeClass}`}
                  >
                    {currentSlide.pathwayBadge}
                  </span>

                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0A1628]">
                      {currentSlide.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {currentSlide.subtitle}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">
                      {currentSlide.primaryMetricLabel}
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#0A1628] tabular-nums">
                        {currentSlide.primaryMetricValue}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {currentSlide.primaryMetricUnit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {currentSlide.secondaryMetrics.map((m) => (
                    <div
                      key={m.label}
                      className="p-3 rounded-xl bg-slate-100/75 border border-slate-200/80"
                    >
                      <span className="text-[11px] text-slate-500 block">
                        {m.label}
                      </span>
                      <strong className="font-mono text-sm font-bold text-[#0A1628] tabular-nums">
                        {m.value}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Architecture & Action Card (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl bg-[#0A1628] text-white p-6 sm:p-7 flex flex-col justify-between space-y-6 border border-slate-800">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                      How It Works Inside the App
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Slide {activeSlideIndex + 1} / {SHOWCASE_SLIDES.length}
                    </span>
                  </div>

                  <h4 className="font-display text-xl sm:text-2xl font-bold text-white">
                    {currentSlide.workflowTitle}
                  </h4>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {currentSlide.workflowSummary}
                  </p>

                  <ul className="space-y-3 pt-3 border-t border-white/10">
                    {currentSlide.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-100"
                      >
                        <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${currentSlide.checkColor}`} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-300">
                    Try sample meals & workouts immediately or sign in to save your own progress.
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAuthed && onReturnToDashboard ? (
                      <button
                        type="button"
                        onClick={() => onReturnToDashboard(NavigationTab.Dashboard)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors"
                      >
                        <span>Open Dashboard</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onExploreDemo}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors"
                      >
                        <span>Try Interactive Demo</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. THREE PATHWAY CARDS WITH DISTINCTIVE AMBIENT GLOWS      */}
      {/*    (#pathways) — Green / Vivid Blue / Warm Orange         */}
      {/* ========================================================= */}
      <section
        id="pathways"
        className="scroll-mt-24 py-16 sm:py-24 bg-[#F8FAFC] relative z-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] block">
              Personalized Goal Pathways
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0A1628] tracking-tight">
              Three tailored paths powered by one calculation engine
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Your chosen path sets your daily calorie balance, macro split, hydration target, workout templates, and AI Coach context—while preserving your full history if you ever change it in Settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {/* Pathway 1: General Nutrition (Green Glow) */}
            <div
              data-pathway-glow="general"
              className="group relative rounded-3xl focus-within:-translate-y-1 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Surrounding Green Ambient Glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 rounded-[28px] bg-gradient-to-br from-emerald-400/30 via-emerald-300/15 to-teal-400/20 blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300"
              />
              <div className="relative h-full rounded-3xl bg-white group-hover:bg-gradient-to-b group-hover:from-emerald-50/45 group-hover:to-white group-focus-within:bg-gradient-to-b group-focus-within:from-emerald-50/45 group-focus-within:to-white border border-slate-200 group-hover:border-emerald-400/80 group-focus-within:border-emerald-400/80 p-7 flex flex-col justify-between space-y-6 shadow-xs group-hover:shadow-xl group-hover:shadow-emerald-600/10 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      <Heart className="h-6 w-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      Balanced Health
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0A1628]">
                      General Nutrition & Diet
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Balanced everyday eating, steady calorie awareness, fiber & micronutrients, and sustainable hydration habits.
                    </p>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-700 pt-3 border-t border-slate-100">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Balanced 30P / 45C / 25F macro targets</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Daily water goals & light cardio plans</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Clear progress check-ins without guilt</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchWithPathway(OnboardingPathway.GeneralFitness)}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  <span>{isAuthed ? 'Open Workspace' : 'Start General Nutrition'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Pathway 2: Athlete Performance (Vivid Blue Glow) */}
            <div
              data-pathway-glow="athlete"
              className="group relative rounded-3xl focus-within:-translate-y-1 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Surrounding Blue Ambient Glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 rounded-[28px] bg-gradient-to-br from-blue-500/30 via-sky-400/20 to-indigo-500/25 blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300"
              />
              <div className="relative h-full rounded-3xl bg-white group-hover:bg-gradient-to-b group-hover:from-blue-50/50 group-hover:to-white group-focus-within:bg-gradient-to-b group-focus-within:from-blue-50/50 group-focus-within:to-white border border-slate-200 group-hover:border-blue-500/80 group-focus-within:border-blue-500/80 p-7 flex flex-col justify-between space-y-6 shadow-xs group-hover:shadow-xl group-hover:shadow-blue-600/15 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      <Flame className="h-6 w-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                      High Output
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0A1628]">
                      Athlete Performance
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Built for structured training blocks, pre- and post-workout carbohydrate timing, and set-level workout logs.
                    </p>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-700 pt-3 border-t border-slate-100">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#2563EB] shrink-0" />
                      <span>Carb-focused 25P / 55C / 20F fueling</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#2563EB] shrink-0" />
                      <span>Built-in rest timer & workout runner</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#2563EB] shrink-0" />
                      <span>Extra hydration buffer (+450 ml/day)</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchWithPathway(OnboardingPathway.AthletePerformance)}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-[#2563EB] hover:text-white border border-blue-200 hover:border-[#2563EB] transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                >
                  <span>{isAuthed ? 'Open Workspace' : 'Start Athlete Performance'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Pathway 3: Muscle Gain (Warm Orange / Amber Glow) */}
            <div
              data-pathway-glow="muscle"
              className="group relative rounded-3xl focus-within:-translate-y-1 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Surrounding Orange/Amber Ambient Glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 rounded-[28px] bg-gradient-to-br from-orange-400/30 via-amber-400/20 to-orange-500/25 blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300"
              />
              <div className="relative h-full rounded-3xl bg-white group-hover:bg-gradient-to-b group-hover:from-orange-50/50 group-hover:to-white group-focus-within:bg-gradient-to-b group-focus-within:from-orange-50/50 group-focus-within:to-white border border-slate-200 group-hover:border-orange-400/85 group-focus-within:border-orange-400/85 p-7 flex flex-col justify-between space-y-6 shadow-xs group-hover:shadow-xl group-hover:shadow-orange-600/12 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      <Dumbbell className="h-6 w-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/80">
                      Lean Surplus
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0A1628]">
                      Weight Gain & Muscle Gain
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Designed for a steady calorie surplus, high protein targets, and progressive resistance training.
                    </p>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-700 pt-3 border-t border-slate-100">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-orange-600 shrink-0" />
                      <span>High-protein 35P / 45C / 20F split</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-orange-600 shrink-0" />
                      <span>Daily surplus meter & weight trends</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-orange-600 shrink-0" />
                      <span>Custom gym routines & load tracking</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchWithPathway(OnboardingPathway.MuscleGain)}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"
                >
                  <span>{isAuthed ? 'Open Workspace' : 'Start Muscle Gain'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. CORE PLATFORM FEATURES (#capabilities)                 */}
      {/* ========================================================= */}
      <section
        id="capabilities"
        className="scroll-mt-24 py-16 sm:py-20 bg-white border-t border-slate-200 relative z-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] block">
              Core Platform Features
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0A1628] tracking-tight">
              Built for simple daily logging and trustworthy numbers
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Utensils,
                title: 'Verified Food Catalog',
                desc: 'Search 40+ ICMR-NIN & USDA foods with clear raw vs. cooked portion scaling and custom meal entries.',
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
              },
              {
                icon: Droplets,
                title: 'Hydration & Fluid Targets',
                desc: 'Log water in seconds with persistent PostgreSQL storage and instant undo support.',
                color: 'text-[#2563EB] bg-blue-50 border-blue-200',
              },
              {
                icon: Clock,
                title: 'Workout Sets & Rest Timer',
                desc: 'Record actual reps, weight lifted (kg), and effort with a smooth inter-set rest countdown.',
                color: 'text-orange-600 bg-orange-50 border-orange-200',
              },
              {
                icon: TrendingUp,
                title: 'Biometrics, Calendar & CSV',
                desc: 'Review body weight trends, waist/chest logs, monthly consistency calendars, and exportable reports.',
                color: 'text-[#7C3AED] bg-violet-50 border-violet-200',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="p-6 rounded-2xl bg-[#F8FAFC] hover:bg-white border border-slate-200/90 hover:border-blue-200 hover:shadow-md hover:shadow-blue-950/5 transition-all space-y-3"
                >
                  <div
                    className={`h-11 w-11 rounded-xl border flex items-center justify-center ${card.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#0A1628]">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. EVIDENCE-BASED FRAMEWORK (#science)                    */}
      {/* ========================================================= */}
      <section
        id="science"
        className="scroll-mt-24 py-16 sm:py-20 bg-[#F8FAFC] border-t border-slate-200 relative z-20"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#0A1628] text-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-xl relative overflow-hidden border border-blue-500/20">
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-tr from-blue-600/25 via-violet-600/15 to-transparent blur-2xl pointer-events-none"
            />
            <div className="relative space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-300 bg-blue-500/15 px-3.5 py-1.5 rounded-lg border border-blue-400/25">
                <ShieldCheck className="h-4 w-4" />
                <span>Science-Backed Methodology</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Transparent nutrition math you can understand and adjust.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Daily targets are calculated from the <strong>Mifflin-St Jeor</strong> resting energy equation, realistic activity factors, sports protein guidelines, and <strong>ICMR-NIN</strong> & <strong>USDA</strong> food references—never black-box guesswork.
              </p>
            </div>

            {isAuthed && onReturnToDashboard ? (
              <button
                type="button"
                onClick={() => onReturnToDashboard(NavigationTab.Dashboard)}
                className="relative px-6 py-3.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors shrink-0 whitespace-nowrap shadow-md shadow-blue-600/25"
              >
                Open Your Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartOnboarding}
                className="relative px-6 py-3.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors shrink-0 whitespace-nowrap shadow-md shadow-blue-600/25"
              >
                Calculate Your Plan
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. FOOTER                                                 */}
      {/* ========================================================= */}
      <footer className="py-12 border-t border-slate-200 bg-white text-slate-600 text-xs relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AscendLogo
              variant="full"
              colorScheme="dark"
              size="sm"
              showTagline={false}
            />
            <span className="text-slate-300">·</span>
            <span className="font-medium text-[#0A1628]">
              Getting Better Every Day.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onExploreDemo}
              className="hover:text-[#0A1628] transition-colors font-medium"
            >
              Interactive Demo
            </button>
            {isAuthed && onReturnToDashboard ? (
              <button
                type="button"
                onClick={() => onReturnToDashboard(NavigationTab.Dashboard)}
                className="hover:text-[#0A1628] transition-colors font-semibold text-[#2563EB]"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="hover:text-[#0A1628] transition-colors font-medium"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={onStartOnboarding}
                  className="hover:text-[#0A1628] transition-colors font-medium"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            © 2026 ASCEND · Non-Medical Nutrition & Fitness Tracking
          </p>
        </div>
      </footer>

      {/* Homepage-only Floating User Guide (Strictly unauthenticated Homepage only) */}
      {!isAuthed && (
        <HomeUserGuide
          onStartOnboarding={onStartOnboarding}
          onExploreDemo={onExploreDemo}
          onJumpToSection={scrollToSection}
        />
      )}
    </div>
  );
};
