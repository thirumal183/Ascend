/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AscendLogo } from './components/brand/AscendLogo';
import { StartupIntro } from './components/brand/StartupIntro';
import { AuthModal } from './components/auth/AuthModal';
import { PathwaySelectionModal } from './components/auth/PathwaySelectionModal';
import { OnboardingWizardModal } from './components/auth/OnboardingWizardModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { DietManagementView } from './components/diet/DietManagementView';
import { LandingPageView } from './components/landing/LandingPageView';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import type { DailyAdherenceItem } from './services/api/nutritionApi';
import type { WorkoutSessionResponse } from './services/api/workoutApi';

const CalendarView = lazy(() => import('./components/calendar/CalendarView').then((m) => ({ default: m.CalendarView })));
const AiCoachView = lazy(() => import('./components/coach/AiCoachView').then((m) => ({ default: m.AiCoachView })));
const GoalsProfileView = lazy(() => import('./components/goals/GoalsProfileView').then((m) => ({ default: m.GoalsProfileView })));
const ProgressTrackingView = lazy(() => import('./components/progress/ProgressTrackingView').then((m) => ({ default: m.ProgressTrackingView })));
const ReportsView = lazy(() => import('./components/reports/ReportsView').then((m) => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const WorkoutManagementView = lazy(() => import('./components/workouts/WorkoutManagementView').then((m) => ({ default: m.WorkoutManagementView })));
import {
  INITIAL_CHAT_MESSAGES,
  INITIAL_NUTRITION_GOALS,
  INITIAL_PROGRESS_HISTORY,
  INITIAL_TODAY_INTAKE,
  INITIAL_USER_PROFILE,
  INITIAL_WORKOUT_PLANS,
  MUSCLE_GAIN_PROGRESS_HISTORY,
  SAMPLE_FOOD_DATABASE,
} from './data/mockData';
import {
  calculateScaledNutrients,
  computeRecommendedTargets,
  prototypeSessionStorage,
} from './services/ascendApiService';
import {
  authApi,
  usersApi,
  nutritionApi,
  workoutApi,
  progressApi,
  aiCoachApi,
  onAuthFailure,
  getStoredAccessToken,
  getStoredRefreshToken,
  hasLiveSessionHint,
  clearStoredTokens,
} from './services/api';
import {
  mapAuthMeToUserState,
  mapBackendIntakeRecordToFrontend,
  mapBackendProgressRecordToFrontend,
  mapBackendWorkoutPlanToFrontend,
  mapBackendFoodItemToFrontend,
  mapBackendChatMessageToFrontend,
  mapFrontendPathwayToBackend,
  mapFrontendArchetypeToBackend,
  mapFrontendGoalTypeToBackend,
  mapFrontendActivityLevelToBackend,
  mapFrontendUnitSystemToBackend,
} from './services/api/mappers';
import { getLocalDateIso } from './utils/dateUtils';
import {
  ChatMessage,
  ExerciseItem,
  ExerciseSetLog,
  FitnessGoalType,
  FoodItem,
  IntakeRecord,
  MealType,
  NavigationTab,
  NutritionGoals,
  OnboardingPathway,
  ProfileArchetype,
  ProgressRecord,
  ServingUnit,
  UnitSystem,
  UserAccount,
  UserProfile,
  WorkoutPlan,
} from './types/ascend';

const DEFAULT_UNAUTHENTICATED_ACCOUNT: UserAccount = {
  name: '',
  email: '',
  isAuthenticated: false,
  onboardingCompleted: false,
};

export default function App() {
  const savedSession = prototypeSessionStorage.load();

  const [userAccount, setUserAccount] = useState<UserAccount>(
    savedSession?.account ?? DEFAULT_UNAUTHENTICATED_ACCOUNT
  );
  const [userProfile, setUserProfile] = useState<UserProfile>(
    savedSession?.userProfile ?? INITIAL_USER_PROFILE
  );
  const [goals, setGoals] = useState<NutritionGoals>(
    savedSession?.goals ?? INITIAL_NUTRITION_GOALS
  );
  const [intakeRecords, setIntakeRecords] = useState<IntakeRecord[]>(
    savedSession?.intakeRecords ?? INITIAL_TODAY_INTAKE
  );
  const [waterIntakeMl, setWaterIntakeMl] = useState<number>(
    savedSession?.waterIntakeMl ?? 1750
  );
  const [stepsToday, setStepsToday] = useState<number>(
    savedSession?.stepsToday ?? 7450
  );
  const [progressHistory, setProgressHistory] = useState<ProgressRecord[]>(
    savedSession?.progressHistory ?? INITIAL_PROGRESS_HISTORY
  );
  const [usingDemoData, setUsingDemoData] = useState<boolean>(
    savedSession?.usingDemoData ?? true
  );

  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>(
    savedSession?.workoutPlans ?? INITIAL_WORKOUT_PLANS
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    savedSession?.chatMessages ?? INITIAL_CHAT_MESSAGES
  );
  const [foodCatalog, setFoodCatalog] = useState<FoodItem[]>(SAMPLE_FOOD_DATABASE);

  const [activeTab, setActiveTab] = useState<NavigationTab>(
    savedSession?.activeTab && Object.values(NavigationTab).includes(savedSession.activeTab)
      ? savedSession.activeTab
      : NavigationTab.Dashboard
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [preselectedMeal, setPreselectedMeal] = useState<MealType | undefined>(
    undefined
  );

  const [showLandingPage, setShowLandingPage] = useState<boolean>(
    !savedSession?.account?.isAuthenticated
  );
  const [showStartupIntro, setShowStartupIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return false;
    }
    return true;
  });

  const handleDismissStartupIntro = () => {
    setShowStartupIntro(false);
  };
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [pathwayModalOpen, setPathwayModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeWorkoutSessionId, setActiveWorkoutSessionId] = useState<string | null>(null);
  const [liveIntakeReport, setLiveIntakeReport] = useState<DailyAdherenceItem[]>([]);
  const [liveWorkoutSessions, setLiveWorkoutSessions] = useState<WorkoutSessionResponse[]>([]);
  const [pendingAccount, setPendingAccount] = useState<{
    name: string;
    email: string;
    password?: string;
  } | null>(null);
  const [selectedOnboardingPathway, setSelectedOnboardingPathway] = useState<OnboardingPathway>(
    savedSession?.userProfile?.pathway || OnboardingPathway.GeneralFitness
  );

  // Global Toast Notification State
  const [globalBanner, setGlobalBanner] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // Auto-dismiss global banner
  useEffect(() => {
    if (!globalBanner) return;
    const t = setTimeout(() => setGlobalBanner(null), 6000);
    return () => clearTimeout(t);
  }, [globalBanner]);

  // Session Recovery & Auth Rehydration on Mount
  useEffect(() => {
    onAuthFailure(() => {
      setUserAccount(DEFAULT_UNAUTHENTICATED_ACCOUNT);
      setShowLandingPage(true);
      setGlobalBanner({
        type: 'error',
        message: 'Your authenticated session expired or was revoked. Please sign in again.',
      });
    });

    const hydrateLiveDomainData = async () => {
      // Clear all demo-only state before hydrating authenticated live data
      setIntakeRecords([]);
      setProgressHistory([]);
      setWorkoutPlans([]);
      setFoodCatalog([]);
      setChatMessages([]);
      setActiveConversationId(null);
      setActiveWorkoutSessionId(null);
      setWaterIntakeMl(0);
      setStepsToday(0);

      const todayIso = getLocalDateIso();
      const [intakeRes, progRes, plansRes, foodsRes, sessionsRes, convsRes, reportRes] = await Promise.allSettled([
        nutritionApi.getDailyIntake(todayIso),
        progressApi.listRecords(365),
        workoutApi.listPlans(),
        nutritionApi.searchFoods({ limit: 50 }),
        workoutApi.listSessions({ days: 30 }),
        aiCoachApi.listConversations(),
        nutritionApi.getIntakeReports(30),
      ]);

      if (reportRes.status === 'fulfilled') {
        setLiveIntakeReport(reportRes.value.report);
      } else {
        setLiveIntakeReport([]);
      }
      if (sessionsRes.status === 'fulfilled') {
        setLiveWorkoutSessions(sessionsRes.value);
      } else {
        setLiveWorkoutSessions([]);
      }

      if (intakeRes.status === 'fulfilled') {
        if (intakeRes.value.records) {
          setIntakeRecords(intakeRes.value.records.map(mapBackendIntakeRecordToFrontend));
        }
        setWaterIntakeMl(intakeRes.value.dailyTotals?.waterMl ?? 0);
      }

      if (progRes.status === 'fulfilled') {
        const mappedProg = progRes.value.map(mapBackendProgressRecordToFrontend);
        setProgressHistory(mappedProg);
        const todayProg = mappedProg.find((p) => p.dateIso === todayIso);
        if (todayProg) {
          setStepsToday(todayProg.stepsCount || 0);
        }
      }

      if (plansRes.status === 'fulfilled') {
        const detailedPlans = await Promise.allSettled(
          plansRes.value.map((p) => workoutApi.getPlanDetails(p.id))
        );
        const hydratedPlans = detailedPlans
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map((r) => mapBackendWorkoutPlanToFrontend(r.value));

        // Overlay today's persisted set logs if a session exists
        if (sessionsRes.status === 'fulfilled' && sessionsRes.value.length > 0) {
          const latestSession = sessionsRes.value[0];
          setActiveWorkoutSessionId(latestSession.id);
          try {
            const detail = await workoutApi.getSessionDetails(latestSession.id);
            for (const plan of hydratedPlans) {
              if (plan.id === latestSession.workoutPlanId) {
                plan.exercises = plan.exercises.map((ex) => {
                  const logs = detail.setLogs.filter((l) => l.exerciseName === ex.name);
                  if (logs.length === 0) return ex;
                  return {
                    ...ex,
                    completed: logs.every((l) => l.completed),
                    completedSets: logs.map((l) => ({
                      setNum: l.setNumber,
                      targetReps: l.targetReps,
                      targetLoadKg: l.targetLoadKg,
                      actualReps: l.actualReps ?? parseInt(l.targetReps, 10) ?? 10,
                      actualLoadKg: l.actualLoadKg ?? l.targetLoadKg,
                      completed: l.completed,
                    })),
                  };
                });
              }
            }
          } catch {
            // Non-fatal if session detail fails
          }
        }
        setWorkoutPlans(hydratedPlans);
      }

      if (foodsRes.status === 'fulfilled') {
        setFoodCatalog(foodsRes.value.items.map(mapBackendFoodItemToFrontend));
      }

      if (convsRes.status === 'fulfilled' && convsRes.value.length > 0) {
        const latestConv = convsRes.value[0];
        setActiveConversationId(latestConv.id);
        try {
          const convDetail = await aiCoachApi.getConversation(latestConv.id);
          setChatMessages(convDetail.messages.map(mapBackendChatMessageToFrontend));
        } catch {
          // Non-fatal
        }
      }
    };

    const recoverLiveSession = async () => {
      let token = getStoredAccessToken();
      if (!token && hasLiveSessionHint()) {
        try {
          const refreshed = await authApi.refresh();
          token = refreshed.accessToken;
        } catch {
          clearStoredTokens();
          return;
        }
      }
      if (!token) return;

      try {
        const me = await authApi.getMe();
        const mapped = mapAuthMeToUserState(me);
        setUserAccount(mapped.account);
        if (mapped.userProfile) setUserProfile(mapped.userProfile);
        if (mapped.goals) setGoals(mapped.goals);
        setUsingDemoData(false);
        setShowLandingPage(false);

        await hydrateLiveDomainData();
      } catch (err) {
        clearStoredTokens();
      }
    };

    recoverLiveSession();
  }, []);

  // Persist session changes to localStorage (without passwords)
  useEffect(() => {
    if (userAccount.isAuthenticated && userAccount.onboardingCompleted) {
      prototypeSessionStorage.save({
        account: userAccount,
        userProfile,
        goals,
        intakeRecords,
        waterIntakeMl,
        stepsToday,
        progressHistory,
        usingDemoData,
        workoutPlans,
        chatMessages,
        activeTab,
      });
    }
  }, [
    userAccount,
    userProfile,
    goals,
    intakeRecords,
    waterIntakeMl,
    stepsToday,
    progressHistory,
    usingDemoData,
    workoutPlans,
    chatMessages,
    activeTab,
  ]);

  // Complete Authentication & Onboarding
  const handleCompleteAuthAndOnboarding = (payload: {
    account: UserAccount;
    profile: UserProfile;
    goals: NutritionGoals;
    preloadDemoData: boolean;
  }) => {
    setUserAccount(payload.account);
    setUserProfile(payload.profile);
    setGoals(payload.goals);
    setUsingDemoData(payload.preloadDemoData);

    if (payload.preloadDemoData) {
      setIntakeRecords(INITIAL_TODAY_INTAKE);
      setProgressHistory(
        payload.profile.pathway === OnboardingPathway.MuscleGain
          ? MUSCLE_GAIN_PROGRESS_HISTORY
          : INITIAL_PROGRESS_HISTORY
      );
      setWaterIntakeMl(1750);
    } else {
      setIntakeRecords([]);
      setProgressHistory([
        {
          id: `prog-init-${Date.now()}`,
          dateIso: getLocalDateIso(),
          label: 'Start',
          weightKg: payload.profile.currentWeightKg,
          caloriesConsumed: 0,
          proteinConsumedG: 0,
          carbsConsumedG: 0,
          fatConsumedG: 0,
          workoutCompleted: false,
          activityMinutes: 0,
          stepsCount: 0,
          source: 'logged',
        },
      ]);
      setWaterIntakeMl(0);
    }

    setActiveTab(NavigationTab.Dashboard);
  };

  // Direct Demo entry from Landing Page
  const handleDirectDemoEntry = () => {
    clearStoredTokens();
    handleCompleteAuthAndOnboarding({
      account: {
        name: 'Alex Rivera',
        email: 'alex.rivera@ascend.app',
        isAuthenticated: true,
        onboardingCompleted: true,
        isDemoAccount: true,
        rememberMe: true,
      },
      profile: INITIAL_USER_PROFILE,
      goals: INITIAL_NUTRITION_GOALS,
      preloadDemoData: true,
    });
    setShowLandingPage(false);
  };

  // Sign Out / Revoke Session
  const handleSignOut = async () => {
    const rt = getStoredRefreshToken();
    if (userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        await authApi.logout(rt ?? undefined);
      } catch {
        // Continue clean local sign out
      }
    }
    clearStoredTokens();
    prototypeSessionStorage.clear();
    setUserAccount(DEFAULT_UNAUTHENTICATED_ACCOUNT);
    setShowLandingPage(true);
    setActiveTab(NavigationTab.Dashboard);
  };

  // Open Sign In Modal
  const handleOpenSignIn = () => {
    setAuthModalTab('signin');
    setAuthModalOpen(true);
  };

  // Open Sign Up / Get Started Modal
  const handleOpenSignUp = () => {
    setAuthModalTab('signup');
    setAuthModalOpen(true);
  };

  // Handle successful Sign In
  const handleSignInSuccess = async (account: {
    name: string;
    email: string;
    rememberMe: boolean;
    userProfile?: UserProfile;
    goals?: NutritionGoals;
  }) => {
    const isDemo =
      account.email.toLowerCase().includes('demo') ||
      account.email === 'alex.rivera@ascend.app';

    const authedAccount: UserAccount = {
      name: account.name,
      email: account.email,
      isAuthenticated: true,
      onboardingCompleted: true,
      rememberMe: account.rememberMe,
      isDemoAccount: isDemo,
    };
    setUserAccount(authedAccount);
    setUsingDemoData(isDemo);

    if (account.userProfile) setUserProfile(account.userProfile);
    if (account.goals) setGoals(account.goals);

    if (!isDemo) {
      setIntakeRecords([]);
      setProgressHistory([]);
      setWorkoutPlans([]);
      setFoodCatalog([]);
      setChatMessages([]);
      setActiveConversationId(null);
      setActiveWorkoutSessionId(null);
      setWaterIntakeMl(0);
      setStepsToday(0);

      const todayIso = getLocalDateIso();
      try {
        const [intakeRes, progRes, plansRes, foodsRes, sessionsRes, convsRes, reportRes] = await Promise.allSettled([
          nutritionApi.getDailyIntake(todayIso),
          progressApi.listRecords(365),
          workoutApi.listPlans(),
          nutritionApi.searchFoods({ limit: 50 }),
          workoutApi.listSessions({ days: 30 }),
          aiCoachApi.listConversations(),
          nutritionApi.getIntakeReports(30),
        ]);

        if (reportRes.status === 'fulfilled') {
          setLiveIntakeReport(reportRes.value.report);
        } else {
          setLiveIntakeReport([]);
        }
        if (sessionsRes.status === 'fulfilled') {
          setLiveWorkoutSessions(sessionsRes.value);
        } else {
          setLiveWorkoutSessions([]);
        }

        if (intakeRes.status === 'fulfilled') {
          if (intakeRes.value.records) {
            setIntakeRecords(intakeRes.value.records.map(mapBackendIntakeRecordToFrontend));
          }
          setWaterIntakeMl(intakeRes.value.dailyTotals?.waterMl ?? 0);
        }
        if (progRes.status === 'fulfilled') {
          const mappedProg = progRes.value.map(mapBackendProgressRecordToFrontend);
          setProgressHistory(mappedProg);
          const todayProg = mappedProg.find((p) => p.dateIso === todayIso);
          if (todayProg) {
            setStepsToday(todayProg.stepsCount || 0);
          }
        }
        if (plansRes.status === 'fulfilled') {
          const detailedPlans = await Promise.allSettled(
            plansRes.value.map((p) => workoutApi.getPlanDetails(p.id))
          );
          const hydratedPlans = detailedPlans
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .map((r) => mapBackendWorkoutPlanToFrontend(r.value));

          if (sessionsRes.status === 'fulfilled' && sessionsRes.value.length > 0) {
            const latestSession = sessionsRes.value[0];
            setActiveWorkoutSessionId(latestSession.id);
            try {
              const detail = await workoutApi.getSessionDetails(latestSession.id);
              for (const plan of hydratedPlans) {
                if (plan.id === latestSession.workoutPlanId) {
                  plan.exercises = plan.exercises.map((ex) => {
                    const logs = detail.setLogs.filter((l) => l.exerciseName === ex.name);
                    if (logs.length === 0) return ex;
                    return {
                      ...ex,
                      completed: logs.every((l) => l.completed),
                      completedSets: logs.map((l) => ({
                        setNum: l.setNumber,
                        targetReps: l.targetReps,
                        targetLoadKg: l.targetLoadKg,
                        actualReps: l.actualReps ?? parseInt(l.targetReps, 10) ?? 10,
                        actualLoadKg: l.actualLoadKg ?? l.targetLoadKg,
                        completed: l.completed,
                      })),
                    };
                  });
                }
              }
            } catch {
              // Non-fatal
            }
          }
          setWorkoutPlans(hydratedPlans);
        }
        if (foodsRes.status === 'fulfilled') {
          setFoodCatalog(foodsRes.value.items.map(mapBackendFoodItemToFrontend));
        }
        if (convsRes.status === 'fulfilled' && convsRes.value.length > 0) {
          const latestConv = convsRes.value[0];
          setActiveConversationId(latestConv.id);
          try {
            const convDetail = await aiCoachApi.getConversation(latestConv.id);
            setChatMessages(convDetail.messages.map(mapBackendChatMessageToFrontend));
          } catch {
            // Non-fatal
          }
        }
      } catch (err) {
        console.warn('Error loading user data after login:', err);
      }
    }

    setAuthModalOpen(false);
    setShowLandingPage(false);
    setActiveTab(NavigationTab.Dashboard);
  };

  // Handle successful Sign Up -> Transition to Pathway Selection
  const handleSignUpSuccess = (account: {
    name: string;
    email: string;
    password?: string;
  }) => {
    setPendingAccount(account);
    setAuthModalOpen(false);
    setPathwayModalOpen(true);
  };

  // Handle Pathway confirmed -> Transition to Onboarding Wizard
  const handlePathwayConfirmed = () => {
    setPathwayModalOpen(false);
    setOnboardingModalOpen(true);
  };

  // Handle Onboarding completed -> Live Backend Registration or Launch Dashboard
  const handleOnboardingCompleted = async (
    profile: UserProfile,
    newGoals: NutritionGoals
  ) => {
    if (pendingAccount?.password) {
      setOnboardingSubmitting(true);
      setOnboardingError(null);
      try {
        const regRes = await authApi.register({
          email: pendingAccount.email,
          password: pendingAccount.password,
          fullName: pendingAccount.name,
          pathway: mapFrontendPathwayToBackend(profile.pathway),
          archetype: mapFrontendArchetypeToBackend(profile.archetype),
          goalType: mapFrontendGoalTypeToBackend(profile.goalType),
          biologicalSex: profile.biologicalSex || 'unspecified',
          currentWeightKg: profile.currentWeightKg,
          targetWeightKg: profile.targetWeightKg,
          heightCm: profile.heightCm,
          age: profile.age,
          activityLevel: mapFrontendActivityLevelToBackend(profile.activityLevel),
          unitSystem: mapFrontendUnitSystemToBackend(profile.unitSystem),
          trainingDaysPerWeek: profile.trainingDaysPerWeek,
        });

        // Persist any custom Step 3 macro/calorie edits made during onboarding
        let persistedGoals = newGoals;
        try {
          const updatedGoals = await usersApi.updateGoals({
            dailyCalories: newGoals.dailyCalories,
            proteinG: newGoals.proteinG,
            carbsG: newGoals.carbsG,
            fatG: newGoals.fatG,
            waterMl: newGoals.waterMl,
            dailySteps: newGoals.dailySteps,
            weeklyWorkoutSessions: newGoals.weeklyWorkoutSessions,
            weeklyActivityMinutes: newGoals.weeklyActivityMinutes,
          });
          persistedGoals = {
            ...newGoals,
            dailyCalories: updatedGoals.dailyCalories,
            proteinG: updatedGoals.proteinG,
            carbsG: updatedGoals.carbsG,
            fatG: updatedGoals.fatG,
            waterMl: updatedGoals.waterMl,
          };
        } catch {
          // Non-fatal: backend defaults remain active
        }

        const authedAccount: UserAccount = {
          name: regRes.user.fullName,
          email: regRes.user.email,
          isAuthenticated: true,
          onboardingCompleted: true,
          rememberMe: true,
          isDemoAccount: false,
        };

        setUserAccount(authedAccount);
        setUserProfile(profile);
        setGoals(persistedGoals);
        setUsingDemoData(false);
        setIntakeRecords([]);
        setProgressHistory([]);
        setChatMessages([]);
        setActiveConversationId(null);
        setWaterIntakeMl(0);
        setStepsToday(0);

        // Load live food catalog and workout templates for the newly registered user
        try {
          const [foodsRes, plansRes] = await Promise.allSettled([
            nutritionApi.searchFoods({ limit: 50 }),
            workoutApi.listPlans(),
          ]);
          if (foodsRes.status === 'fulfilled') {
            setFoodCatalog(foodsRes.value.items.map(mapBackendFoodItemToFrontend));
          } else {
            setFoodCatalog([]);
          }
          if (plansRes.status === 'fulfilled') {
            const detailed = await Promise.allSettled(
              plansRes.value.map((p) => workoutApi.getPlanDetails(p.id))
            );
            setWorkoutPlans(
              detailed
                .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                .map((r) => mapBackendWorkoutPlanToFrontend(r.value))
            );
          } else {
            setWorkoutPlans([]);
          }
        } catch {
          setFoodCatalog([]);
          setWorkoutPlans([]);
        }

        setPendingAccount(null);
        setOnboardingModalOpen(false);
        setShowLandingPage(false);
        setActiveTab(NavigationTab.Dashboard);
        setGlobalBanner({
          type: 'success',
          message: `Welcome to ASCEND, ${regRes.user.fullName}! Account and ${profile.pathway} goals registered successfully.`,
        });
        return;
      } catch (err: any) {
        const msg = `Registration failed: ${err.message || 'Please check your inputs and try again.'}`;
        setOnboardingError(msg);
        setGlobalBanner({
          type: 'error',
          message: msg,
        });
        return;
      } finally {
        setOnboardingSubmitting(false);
      }
    }

    // Fallback Demo or prototype flow
    const finalAccount: UserAccount = {
      name: pendingAccount?.name || userAccount.name || 'Friend',
      email: pendingAccount?.email || userAccount.email || 'user@ascend.app',
      isAuthenticated: true,
      onboardingCompleted: true,
      rememberMe: true,
      isDemoAccount: false,
    };
    handleCompleteAuthAndOnboarding({
      account: finalAccount,
      profile,
      goals: newGoals,
      preloadDemoData: false,
    });
    setOnboardingModalOpen(false);
    setShowLandingPage(false);
  };

  // Navigation handler
  const handleNavigate = (tab: NavigationTab, mealPreset?: MealType) => {
    if (mealPreset) {
      setPreselectedMeal(mealPreset);
    }
    setActiveTab(tab);
  };

  // Diet Management Handlers
  const handleAddIntakeRecord = (record: Omit<IntakeRecord, 'id'>): string => {
    const tempId = `intake-${Date.now()}`;
    const newRecord: IntakeRecord = {
      ...record,
      id: tempId,
    };
    setIntakeRecords((prev) => [...prev, newRecord]);

    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      nutritionApi
        .logIntake({
          foodId: record.foodId,
          meal: record.meal as any,
          quantity: record.quantity,
          unit: record.unit as any,
          dateIso: record.dateIso || getLocalDateIso(),
        })
        .then((created) => {
          const mapped = mapBackendIntakeRecordToFrontend(created);
          setIntakeRecords((prev) =>
            prev.map((r) => (r.id === tempId ? mapped : r))
          );
        })
        .catch((err: any) => {
          setIntakeRecords((prev) => prev.filter((r) => r.id !== tempId));
          setGlobalBanner({
            type: 'error',
            message: `Failed to save meal to server: ${err.message}`,
          });
        });
    }

    return tempId;
  };

  const handleUpdateIntakeRecord = async (
    id: string,
    quantity: number,
    unit: ServingUnit,
    meal: MealType
  ) => {
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        const updated = await nutritionApi.updateIntake(id, {
          quantity,
          unit,
          meal,
        });
        const mapped = mapBackendIntakeRecordToFrontend(updated);
        setIntakeRecords((prev) => prev.map((r) => (r.id === id ? mapped : r)));
        return;
      } catch (err: any) {
        setGlobalBanner({
          type: 'error',
          message: `Failed to update meal on backend: ${err.message}`,
        });
        return;
      }
    }

    setIntakeRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        const catalogFood = foodCatalog.find((f) => f.id === rec.foodId);
        const computedNutrients = catalogFood
          ? calculateScaledNutrients(catalogFood, quantity, unit)
          : rec.computedNutrients;
        return {
          ...rec,
          quantity,
          unit,
          meal,
          computedNutrients,
          isUserLogged: true,
        };
      })
    );
  };

  const handleDeleteIntakeRecord = async (id: string) => {
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        await nutritionApi.deleteIntake(id);
      } catch (err: any) {
        setGlobalBanner({
          type: 'error',
          message: `Failed to delete meal from backend: ${err.message}`,
        });
        return;
      }
    }
    setIntakeRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Custom Food Creation & Deletion Handlers
  const handleAddCustomFood = async (food: FoodItem): Promise<FoodItem | void> => {
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        const created = await nutritionApi.createCustomFood({
          name: food.name,
          category: food.category,
          brandOrSource: food.brandOrSource,
          referenceQuantity: food.referenceQuantity,
          referenceUnit: food.referenceUnit,
          referenceLabel: food.referenceLabel,
          gramsPerServing: food.gramsPerServing,
          ediblePortionPct: food.ediblePortionPct || 100,
          nutrients: food.nutrients,
          dataNote: food.dataNote,
        });
        const mapped = mapBackendFoodItemToFrontend(created);
        setFoodCatalog((prev) => [mapped, ...prev]);
        setGlobalBanner({
          type: 'success',
          message: `Created custom food "${mapped.name}" in database.`,
        });
        return mapped;
      } catch (err: any) {
        setGlobalBanner({
          type: 'error',
          message: `Failed to create custom food on backend: ${err.message}`,
        });
        throw err;
      }
    }

    setFoodCatalog((prev) => [food, ...prev]);
    return food;
  };

  const handleDeleteCustomFood = async (foodId: string) => {
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        await nutritionApi.deleteCustomFood(foodId);
      } catch (err: any) {
        setGlobalBanner({
          type: 'error',
          message: `Failed to delete custom food: ${err.message}`,
        });
        return;
      }
    }
    setFoodCatalog((prev) => prev.filter((f) => f.id !== foodId));
  };

  // Water Handler
  const handleUpdateWater = async (deltaMl: number) => {
    setWaterIntakeMl((prev) => Math.max(0, prev + deltaMl));

    if (usingDemoData || !userAccount.isAuthenticated || userAccount.isDemoAccount || deltaMl === 0) {
      return;
    }

    const todayIso = getLocalDateIso();
    try {
      if (deltaMl > 0) {
        await nutritionApi.logWater({ amountMl: deltaMl, dateIso: todayIso });
      } else {
        const daily = await nutritionApi.getDailyWater(todayIso);
        let remaining = Math.abs(deltaMl);
        const ordered = [...daily.records].reverse();
        for (const rec of ordered) {
          if (remaining <= 0) break;
          if (rec.amountMl <= remaining) {
            await nutritionApi.deleteWater(rec.id);
            remaining -= rec.amountMl;
          } else {
            await nutritionApi.updateWater(rec.id, { amountMl: rec.amountMl - remaining });
            remaining = 0;
          }
        }
      }
      const refreshed = await nutritionApi.getDailyWater(todayIso);
      setWaterIntakeMl(refreshed.totalMl);
    } catch (err) {
      console.error('Failed to persist water intake:', err);
      setWaterIntakeMl((prev) => Math.max(0, prev - deltaMl));
    }
  };

  // Workout Persistence Helper for Live Mode
  const persistWorkoutPlanState = async (plan: WorkoutPlan) => {
    if (usingDemoData || !userAccount.isAuthenticated || userAccount.isDemoAccount) return;
    try {
      let sessionId = activeWorkoutSessionId;
      const todayIso = getLocalDateIso();
      if (!sessionId) {
        const created = await workoutApi.createSession({
          workoutPlanId: plan.id,
          sessionTitle: plan.title,
          dateLogged: todayIso,
          durationMinutes: plan.estimatedMinutes,
          caloriesBurned: plan.targetCaloriesBurned,
          completed: plan.exercises.length > 0 && plan.exercises.every((e) => e.completed),
        });
        sessionId = created.id;
        setActiveWorkoutSessionId(sessionId);
      }

      const setPayloads = plan.exercises.flatMap((ex) => {
        const sets = ex.completedSets && ex.completedSets.length > 0
          ? ex.completedSets
          : Array.from({ length: Math.max(1, ex.sets) }, (_, i) => ({
              setNum: i + 1,
              targetReps: ex.reps,
              targetLoadKg: ex.loadKg,
              actualReps: parseInt(ex.reps, 10) || 10,
              actualLoadKg: ex.loadKg,
              completed: ex.completed,
            }));
        return sets.map((s) => ({
          exerciseName: ex.name,
          setNumber: s.setNum,
          targetReps: s.targetReps,
          targetLoadKg: s.targetLoadKg,
          actualReps: s.actualReps,
          actualLoadKg: s.actualLoadKg,
          completed: s.completed,
        }));
      });

      if (setPayloads.length > 0) {
        await workoutApi.updateSetLogs(sessionId, setPayloads);
      }
    } catch (err: any) {
      setGlobalBanner({
        type: 'error',
        message: `Failed to sync workout telemetry: ${err.message}`,
      });
    }
  };

  // Workout Handlers
  const handleToggleExercise = (workoutId: string, exerciseId: string) => {
    let updatedPlan: WorkoutPlan | undefined;
    setWorkoutPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== workoutId) return plan;
        const nextPlan: WorkoutPlan = {
          ...plan,
          exercises: plan.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            const nextCompleted = !ex.completed;
            const updatedSets = ex.completedSets
              ? ex.completedSets.map((s) => ({ ...s, completed: nextCompleted }))
              : undefined;
            return {
              ...ex,
              completed: nextCompleted,
              completedSets: updatedSets,
            };
          }),
        };
        updatedPlan = nextPlan;
        return nextPlan;
      })
    );
    if (updatedPlan) {
      void persistWorkoutPlanState(updatedPlan);
    }
  };

  const handleUpdateExerciseSets = async (
    workoutId: string,
    exerciseId: string,
    sets: ExerciseSetLog[]
  ) => {
    const allCompleted = sets.length > 0 && sets.every((s) => s.completed);
    let updatedPlan: WorkoutPlan | undefined;
    setWorkoutPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== workoutId) return plan;
        const nextPlan: WorkoutPlan = {
          ...plan,
          exercises: plan.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, completed: allCompleted, completedSets: sets }
              : ex
          ),
        };
        updatedPlan = nextPlan;
        return nextPlan;
      })
    );
    if (updatedPlan) {
      await persistWorkoutPlanState(updatedPlan);
    }
  };

  const handleAddExercise = async (
    workoutId: string,
    exercise: Omit<ExerciseItem, 'id'>
  ) => {
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        const created = await workoutApi.addExerciseToPlan(workoutId, {
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          defaultSets: exercise.sets,
          defaultReps: exercise.reps,
          defaultLoadKg: exercise.loadKg,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
        });
        const persistedEx: ExerciseItem = {
          ...exercise,
          id: created.id,
        };
        setWorkoutPlans((prev) =>
          prev.map((plan) =>
            plan.id === workoutId
              ? { ...plan, exercises: [...plan.exercises, persistedEx] }
              : plan
          )
        );
        return;
      } catch (err) {
        console.error('Failed to persist ad-hoc exercise:', err);
        return;
      }
    }

    const newEx: ExerciseItem = {
      ...exercise,
      id: `ex-${Date.now()}`,
    };
    setWorkoutPlans((prev) =>
      prev.map((plan) =>
        plan.id === workoutId
          ? { ...plan, exercises: [...plan.exercises, newEx] }
          : plan
      )
    );
  };

  // Goals & Profile Handler
  const handleUpdateProfileAndGoals = async (
    nextProfile: UserProfile,
    nextGoals: NutritionGoals
  ) => {
    setUserProfile(nextProfile);
    setGoals(nextGoals);

    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        await usersApi.updateProfile({
          archetype: mapFrontendArchetypeToBackend(nextProfile.archetype),
          goalType: mapFrontendGoalTypeToBackend(nextProfile.goalType),
          biologicalSex: nextProfile.biologicalSex || 'unspecified',
          unitSystem: mapFrontendUnitSystemToBackend(nextProfile.unitSystem),
          currentWeightKg: nextProfile.currentWeightKg,
          targetWeightKg: nextProfile.targetWeightKg,
          heightCm: nextProfile.heightCm,
          age: nextProfile.age,
          activityLevel: mapFrontendActivityLevelToBackend(nextProfile.activityLevel),
          trainingDaysPerWeek: nextProfile.trainingDaysPerWeek,
          recalculateGoals: false,
        });
        await usersApi.updateGoals({
          dailyCalories: nextGoals.dailyCalories,
          proteinG: nextGoals.proteinG,
          carbsG: nextGoals.carbsG,
          fatG: nextGoals.fatG,
          waterMl: nextGoals.waterMl,
          dailySteps: nextGoals.dailySteps,
          weeklyWorkoutSessions: nextGoals.weeklyWorkoutSessions,
          weeklyActivityMinutes: nextGoals.weeklyActivityMinutes,
        });
        setGlobalBanner({
          type: 'success',
          message: 'Profile and nutrition targets saved to database.',
        });
      } catch (err: any) {
        setGlobalBanner({
          type: 'error',
          message: `Failed to save profile/goals: ${err.message}`,
        });
      }
    }
  };

  // Demo-only quick pathway switch (never mutates a live authenticated account)
  const handleChangePathway = (pathway: OnboardingPathway) => {
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      setGlobalBanner({
        type: 'error',
        message: 'Authenticated accounts must change pathways in Account & Settings with password confirmation.',
      });
      setActiveTab(NavigationTab.Settings);
      return;
    }
    const defaultGoalMap: Record<OnboardingPathway, FitnessGoalType> = {
      [OnboardingPathway.GeneralFitness]: FitnessGoalType.WeightLoss,
      [OnboardingPathway.AthletePerformance]: FitnessGoalType.AthleticPerformance,
      [OnboardingPathway.MuscleGain]: FitnessGoalType.MuscleGain,
    };
    const nextProfile: UserProfile = {
      ...userProfile,
      pathway,
      archetype:
        pathway === OnboardingPathway.AthletePerformance
          ? ProfileArchetype.Athlete
          : ProfileArchetype.GeneralFitness,
      goalType: defaultGoalMap[pathway],
    };
    setUserProfile(nextProfile);
    setGoals(computeRecommendedTargets(nextProfile));
    setProgressHistory(
      pathway === OnboardingPathway.MuscleGain
        ? MUSCLE_GAIN_PROGRESS_HISTORY
        : INITIAL_PROGRESS_HISTORY
    );
  };

  const handleVerifyAccountPassword = async (password: string): Promise<void> => {
    await authApi.verifyPassword(password);
  };

  // Password-verified pathway change for real authenticated accounts (preserves all history)
  const handleAuthenticatedChangePathway = async (
    pathway: OnboardingPathway,
    currentPassword: string
  ): Promise<void> => {
    const defaultGoalMap: Record<OnboardingPathway, FitnessGoalType> = {
      [OnboardingPathway.GeneralFitness]: FitnessGoalType.WeightLoss,
      [OnboardingPathway.AthletePerformance]: FitnessGoalType.AthleticPerformance,
      [OnboardingPathway.MuscleGain]: FitnessGoalType.MuscleGain,
    };
    const nextArchetype =
      pathway === OnboardingPathway.AthletePerformance
        ? ProfileArchetype.Athlete
        : ProfileArchetype.GeneralFitness;
    const nextGoalType = defaultGoalMap[pathway];

    const res = await usersApi.switchPathway({
      pathway: mapFrontendPathwayToBackend(pathway),
      currentPassword,
      archetype: mapFrontendArchetypeToBackend(nextArchetype),
      goalType: mapFrontendGoalTypeToBackend(nextGoalType),
      recalculateGoals: true,
    });

    const refreshedMe = await authApi.getMe();
    const mapped = mapAuthMeToUserState(refreshedMe);
    setUserAccount(mapped.account);
    if (mapped.userProfile) {
      setUserProfile(mapped.userProfile);
    } else {
      setUserProfile((prev) => ({
        ...prev,
        pathway,
        archetype: nextArchetype,
        goalType: nextGoalType,
      }));
    }
    if (mapped.goals) {
      setGoals(mapped.goals);
    } else {
      setGoals({
        dailyCalories: res.nutritionGoals.dailyCalories,
        proteinG: res.nutritionGoals.proteinG,
        carbsG: res.nutritionGoals.carbsG,
        fatG: res.nutritionGoals.fatG,
        waterMl: res.nutritionGoals.waterMl,
        dailySteps: res.nutritionGoals.dailySteps,
        weeklyWorkoutSessions: res.nutritionGoals.weeklyWorkoutSessions,
        weeklyActivityMinutes: res.nutritionGoals.weeklyActivityMinutes,
      });
    }

    setGlobalBanner({
      type: 'success',
      message: `Account pathway changed to ${pathway} and targets updated. Historical records preserved.`,
    });
  };

  // Progress Checkpoint Handler
  const handleAddProgressRecord = async (record: Omit<ProgressRecord, 'id'>) => {
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        const created = await progressApi.createOrUpsertRecord({
          dateLogged: record.dateIso,
          label: record.label,
          weightKg: record.weightKg,
          bodyFatPct: record.bodyFatPct,
          leanMassKg: record.leanMassKg,
          waistCm: record.waistCm,
          chestCm: record.chestCm,
          armCm: record.armCm,
          thighCm: record.thighCm,
          caloriesConsumed: record.caloriesConsumed,
          proteinConsumedG: record.proteinConsumedG,
          carbsConsumedG: record.carbsConsumedG,
          fatConsumedG: record.fatConsumedG,
          workoutCompleted: record.workoutCompleted,
          activityMinutes: record.activityMinutes,
          stepsCount: record.stepsCount,
        });

        const mapped = mapBackendProgressRecordToFrontend(created);
        setProgressHistory((prev) => {
          const filtered = prev.filter((p) => p.dateIso !== mapped.dateIso);
          return [...filtered, mapped];
        });
        setUserProfile((prev) => ({
          ...prev,
          currentWeightKg: record.weightKg,
        }));
        setGlobalBanner({
          type: 'success',
          message: `Saved biometric check-in for ${mapped.dateIso} (${mapped.weightKg} kg) to backend.`,
        });
        return;
      } catch (err: any) {
        setGlobalBanner({
          type: 'error',
          message: `Failed to save progress to server: ${err.message}`,
        });
        throw err;
      }
    }

    const newRec: ProgressRecord = {
      ...record,
      id: `prog-${Date.now()}`,
    };
    setProgressHistory((prev) => [...prev, newRec]);
    setUserProfile((prev) => ({
      ...prev,
      currentWeightKg: record.weightKg,
    }));
  };

  // Toggle between Clean Personal Log and Sample Demo Data
  const handleToggleDemoData = (loadDemo: boolean) => {
    setUsingDemoData(loadDemo);
    if (loadDemo) {
      setIntakeRecords(INITIAL_TODAY_INTAKE);
      setProgressHistory(
        userProfile.pathway === OnboardingPathway.MuscleGain
          ? MUSCLE_GAIN_PROGRESS_HISTORY
          : INITIAL_PROGRESS_HISTORY
      );
      setWaterIntakeMl(1750);
    } else {
      setIntakeRecords((prev) => prev.filter((r) => r.isUserLogged));
      setProgressHistory((prev) => prev.filter((r) => r.source === 'logged'));
    }
  };

  // AI Coach Message Handlers
  const handleAppendMessage = (msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  };

  const handleClearMessages = async () => {
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount && activeConversationId) {
      try {
        await aiCoachApi.deleteConversation(activeConversationId);
      } catch (err: any) {
        setGlobalBanner({
          type: 'error',
          message: `Failed to delete conversation history: ${err.message}`,
        });
        return;
      }
    }
    setActiveConversationId(null);
    setChatMessages([]);
  };

  // Settings Handlers
  const handleChangeUnitSystem = async (unitSystem: UnitSystem) => {
    setUserProfile((prev) => ({ ...prev, unitSystem }));
    if (!usingDemoData && userAccount.isAuthenticated && !userAccount.isDemoAccount) {
      try {
        await usersApi.updateProfile({
          unitSystem: mapFrontendUnitSystemToBackend(unitSystem),
          recalculateGoals: false,
        });
      } catch (err: any) {
        setGlobalBanner({
          type: 'error',
          message: `Failed to save unit preference: ${err.message}`,
        });
      }
    }
  };

  const handleResetSampleData = () => {
    setUserProfile(INITIAL_USER_PROFILE);
    setGoals(INITIAL_NUTRITION_GOALS);
    setIntakeRecords(INITIAL_TODAY_INTAKE);
    setWaterIntakeMl(1750);
    setStepsToday(7450);
    setWorkoutPlans(INITIAL_WORKOUT_PLANS);
    setProgressHistory(INITIAL_PROGRESS_HISTORY);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setUsingDemoData(true);
  };

  // Public Home Experience & Integrated Auth/Onboarding Modals
  if (showLandingPage || !userAccount.isAuthenticated || !userAccount.onboardingCompleted) {
    return (
      <>
        {showStartupIntro && (
          <StartupIntro onComplete={handleDismissStartupIntro} />
        )}

        <LandingPageView
          userAccount={userAccount}
          userProfile={userProfile}
          onStartOnboarding={handleOpenSignUp}
          onOpenSignIn={handleOpenSignIn}
          onExploreDemo={handleDirectDemoEntry}
          onSelectPathway={(pw) => setSelectedOnboardingPathway(pw)}
          onReturnToDashboard={(tab) => {
            if (tab) setActiveTab(tab);
            setShowLandingPage(false);
          }}
          onSignOut={handleSignOut}
        />

        <AuthModal
          isOpen={authModalOpen}
          initialTab={authModalTab}
          onClose={() => setAuthModalOpen(false)}
          onSignInSuccess={handleSignInSuccess}
          onSignUpSuccess={handleSignUpSuccess}
          onExploreDemo={handleDirectDemoEntry}
        />

        <PathwaySelectionModal
          isOpen={pathwayModalOpen}
          selectedPathway={selectedOnboardingPathway}
          onSelectPathway={(pw) => {
            setSelectedOnboardingPathway(pw);
            setUserProfile((prev) => ({ ...prev, pathway: pw }));
          }}
          onConfirm={handlePathwayConfirmed}
          onBackToLanding={() => setPathwayModalOpen(false)}
        />

        <OnboardingWizardModal
          isOpen={onboardingModalOpen}
          pathway={selectedOnboardingPathway}
          onBackToPathway={() => {
            setOnboardingError(null);
            setOnboardingModalOpen(false);
            setPathwayModalOpen(true);
          }}
          onComplete={handleOnboardingCompleted}
          isSubmitting={onboardingSubmitting}
          submitError={onboardingError}
        />
      </>
    );
  }

  // Select today's workout matching the user's pathway
  const pathwayWorkout =
    workoutPlans.find((p) => p.recommendedPathway === userProfile.pathway) ||
    workoutPlans[0];
  const isDemoMode = usingDemoData || Boolean(userAccount.isDemoAccount);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-600/15 selection:text-blue-950">
      {showStartupIntro && (
        <StartupIntro onComplete={handleDismissStartupIntro} />
      )}
      {/* Desktop Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        userAccount={userAccount}
        userProfile={userProfile}
        usingDemoData={usingDemoData}
        onSelectTab={(tab) => handleNavigate(tab)}
        onSignOut={handleSignOut}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onViewLandingPage={() => setShowLandingPage(true)}
        onSwitchPathway={isDemoMode ? () => setPathwayModalOpen(true) : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          activeTab={activeTab}
          userAccount={userAccount}
          userProfile={userProfile}
          usingDemoData={usingDemoData}
          onSelectTab={(tab) => handleNavigate(tab)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onViewLandingPage={() => setShowLandingPage(true)}
          onSwitchPathway={isDemoMode ? () => setPathwayModalOpen(true) : undefined}
          onSignOut={handleSignOut}
        />

        {/* Global Toast Notification */}
        {globalBanner && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <div
              className={`max-w-6xl mx-auto p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md animate-fade-in ${
                globalBanner.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {globalBanner.type === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                )}
                <span className="text-sm font-medium">{globalBanner.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setGlobalBanner(null)}
                className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-6xl mx-auto">
            <Suspense
              fallback={
                <div className="py-16 text-center text-sm text-slate-500 animate-pulse">
                  Loading view...
                </div>
              }
            >
            {activeTab === NavigationTab.Dashboard && (
              <DashboardView
                userAccount={userAccount}
                intakeRecords={intakeRecords}
                goals={goals}
                userProfile={userProfile}
                waterIntakeMl={waterIntakeMl}
                onUpdateWater={handleUpdateWater}
                todayWorkout={pathwayWorkout}
                progressHistory={progressHistory}
                usingDemoData={usingDemoData}
                onLoadDemoData={() => handleToggleDemoData(true)}
                onNavigate={handleNavigate}
              />
            )}

            {activeTab === NavigationTab.Diet && (
              <DietManagementView
                foodCatalog={foodCatalog}
                intakeRecords={intakeRecords}
                goals={goals}
                initialMeal={preselectedMeal}
                onAddIntakeRecord={handleAddIntakeRecord}
                onUpdateIntakeRecord={handleUpdateIntakeRecord}
                onDeleteIntakeRecord={handleDeleteIntakeRecord}
                onAddCustomFood={handleAddCustomFood}
                onDeleteCustomFood={handleDeleteCustomFood}
              />
            )}

            {activeTab === NavigationTab.Workouts && (
              <WorkoutManagementView
                workoutPlans={workoutPlans}
                userPathway={userProfile.pathway}
                onToggleExercise={handleToggleExercise}
                onAddExercise={handleAddExercise}
                onUpdateExerciseSets={handleUpdateExerciseSets}
              />
            )}

            {activeTab === NavigationTab.Progress && (
              <ProgressTrackingView
                progressHistory={progressHistory}
                goals={goals}
                userProfile={userProfile}
                onAddProgressRecord={handleAddProgressRecord}
                onLoadDemoProgress={() => handleToggleDemoData(true)}
              />
            )}

            {activeTab === NavigationTab.Goals && (
              <GoalsProfileView
                userProfile={userProfile}
                goals={goals}
                canSwitchPathwayDirectly={isDemoMode}
                onOpenSettings={() => handleNavigate(NavigationTab.Settings)}
                onUpdateProfileAndGoals={handleUpdateProfileAndGoals}
              />
            )}

            {activeTab === NavigationTab.Reports && (
              <ReportsView
                intakeRecords={intakeRecords}
                goals={goals}
                userProfile={userProfile}
                progressHistory={progressHistory}
                intakeReport={usingDemoData ? [] : liveIntakeReport}
                workoutSessions={usingDemoData ? [] : liveWorkoutSessions}
              />
            )}

            {activeTab === NavigationTab.AiCoach && (
              <AiCoachView
                messages={chatMessages}
                onAppendMessage={handleAppendMessage}
                onClearMessages={handleClearMessages}
                conversationId={activeConversationId}
                onConversationIdChange={setActiveConversationId}
                intakeRecords={intakeRecords}
                goals={goals}
                userProfile={userProfile}
                progressHistory={progressHistory}
                onNavigate={(tab) => handleNavigate(tab)}
                isDemoAccount={userAccount.isDemoAccount ?? false}
              />
            )}

            {activeTab === NavigationTab.Calendar && (
              <CalendarView
                intakeRecords={intakeRecords}
                goals={goals}
                onNavigate={(tab) => handleNavigate(tab)}
                intakeReport={usingDemoData ? [] : liveIntakeReport}
                workoutSessions={usingDemoData ? [] : liveWorkoutSessions}
              />
            )}

            {activeTab === NavigationTab.Settings && (
              <SettingsView
                userAccount={userAccount}
                userProfile={userProfile}
                usingDemoData={usingDemoData}
                onChangePathway={handleChangePathway}
                onVerifyPassword={handleVerifyAccountPassword}
                onChangePathwayWithPassword={handleAuthenticatedChangePathway}
                onChangeUnitSystem={handleChangeUnitSystem}
                onToggleDemoData={handleToggleDemoData}
                onResetSampleData={handleResetSampleData}
                onSignOut={handleSignOut}
              />
            )}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Demo-only Pathway Switcher Modal */}
      {isDemoMode && (
        <PathwaySelectionModal
          isOpen={pathwayModalOpen}
          selectedPathway={userProfile.pathway}
          onSelectPathway={(pw) => {
            handleChangePathway(pw);
          }}
          onConfirm={() => setPathwayModalOpen(false)}
          onBackToLanding={() => setPathwayModalOpen(false)}
        />
      )}

      {showStartupIntro && (
        <StartupIntro onComplete={handleDismissStartupIntro} />
      )}
    </div>
  );
}
