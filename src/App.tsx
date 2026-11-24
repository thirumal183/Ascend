/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AscendLogo } from './components/brand/AscendLogo';
import { StartupIntro } from './components/brand/StartupIntro';
import { AuthModal } from './components/auth/AuthModal';
import { PathwaySelectionModal } from './components/auth/PathwaySelectionModal';
import { OnboardingWizardModal } from './components/auth/OnboardingWizardModal';
import { CalendarView } from './components/calendar/CalendarView';
import { AiCoachView } from './components/coach/AiCoachView';
import { DashboardView } from './components/dashboard/DashboardView';
import { DietManagementView } from './components/diet/DietManagementView';
import { GoalsProfileView } from './components/goals/GoalsProfileView';
import { LandingPageView } from './components/landing/LandingPageView';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { ProgressTrackingView } from './components/progress/ProgressTrackingView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { WorkoutManagementView } from './components/workouts/WorkoutManagementView';
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
import { getLocalDateIso } from './utils/dateUtils';
import {
  ChatMessage,
  ExerciseItem,
  ExerciseSetLog,
  FitnessGoalType,
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
  const [showStartupIntro, setShowStartupIntro] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [pathwayModalOpen, setPathwayModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<{ name: string; email: string } | null>(null);
  const [selectedOnboardingPathway, setSelectedOnboardingPathway] = useState<OnboardingPathway>(
    savedSession?.userProfile?.pathway || OnboardingPathway.GeneralFitness
  );

  // Persist session changes to localStorage (without any passwords)
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

      if (!usingDemoData && userAccount.email) {
        prototypeSessionStorage.saveRegisteredUser({
          name: userAccount.name,
          email: userAccount.email,
          pathwayConfigured: true,
          userProfile,
          goals,
        });
      }
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
      // Fresh personal log for new users
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

  // Sign Out / Switch Profile
  const handleSignOut = () => {
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
  const handleSignInSuccess = (account: {
    name: string;
    email: string;
    rememberMe: boolean;
  }) => {
    const registered = prototypeSessionStorage.findRegisteredUser(account.email);
    const authedAccount: UserAccount = {
      name: account.name || registered?.name || account.email.split('@')[0],
      email: account.email,
      isAuthenticated: true,
      onboardingCompleted: true,
      rememberMe: account.rememberMe,
      isDemoAccount: false,
    };
    setUserAccount(authedAccount);
    if (registered?.userProfile && registered?.goals) {
      setUserProfile(registered.userProfile);
      setGoals(registered.goals);
    }
    setUsingDemoData(false);
    setAuthModalOpen(false);
    setShowLandingPage(false);
    setActiveTab(NavigationTab.Dashboard);
  };

  // Handle successful Sign Up -> Transition to Pathway Selection
  const handleSignUpSuccess = (account: { name: string; email: string }) => {
    setPendingAccount(account);
    setAuthModalOpen(false);
    setPathwayModalOpen(true);
  };

  // Handle Pathway confirmed -> Transition to Onboarding Wizard
  const handlePathwayConfirmed = () => {
    setPathwayModalOpen(false);
    setOnboardingModalOpen(true);
  };

  // Handle Onboarding completed -> Launch Dashboard
  const handleOnboardingCompleted = (
    profile: UserProfile,
    newGoals: NutritionGoals
  ) => {
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
    const newRecord: IntakeRecord = {
      ...record,
      id: `intake-${Date.now()}`,
    };
    setIntakeRecords((prev) => [...prev, newRecord]);
    return newRecord.id;
  };

  const handleUpdateIntakeRecord = (
    id: string,
    quantity: number,
    unit: ServingUnit,
    meal: MealType
  ) => {
    setIntakeRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        const catalogFood = SAMPLE_FOOD_DATABASE.find(
          (f) => f.id === rec.foodId
        );
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

  const handleDeleteIntakeRecord = (id: string) => {
    setIntakeRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Water Handler
  const handleUpdateWater = (deltaMl: number) => {
    setWaterIntakeMl((prev) => Math.max(0, prev + deltaMl));
  };

  // Workout Handlers
  const handleToggleExercise = (workoutId: string, exerciseId: string) => {
    setWorkoutPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== workoutId) return plan;
        return {
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
      })
    );
  };

  const handleUpdateExerciseSets = (
    workoutId: string,
    exerciseId: string,
    sets: ExerciseSetLog[]
  ) => {
    const allCompleted = sets.length > 0 && sets.every((s) => s.completed);
    setWorkoutPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== workoutId) return plan;
        return {
          ...plan,
          exercises: plan.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, completed: allCompleted, completedSets: sets }
              : ex
          ),
        };
      })
    );
  };

  const handleAddExercise = (
    workoutId: string,
    exercise: Omit<ExerciseItem, 'id'>
  ) => {
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
  const handleUpdateProfileAndGoals = (
    nextProfile: UserProfile,
    nextGoals: NutritionGoals
  ) => {
    setUserProfile(nextProfile);
    setGoals(nextGoals);
  };

  // Switch Pathway in Settings without losing historical records
  const handleChangePathway = (pathway: OnboardingPathway) => {
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
  };

  // Progress Checkpoint Handler
  const handleAddProgressRecord = (record: Omit<ProgressRecord, 'id'>) => {
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

  // AI Coach Message Handler
  const handleAppendMessage = (msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  };

  // Settings Handlers
  const handleChangeUnitSystem = (unitSystem: UnitSystem) => {
    setUserProfile((prev) => ({ ...prev, unitSystem }));
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

  // Public Product Landing Page & Integrated Modern Auth/Onboarding Modals
  if (showLandingPage || !userAccount.isAuthenticated || !userAccount.onboardingCompleted) {
    return (
      <>
        {showStartupIntro && (
          <StartupIntro onComplete={() => setShowStartupIntro(false)} />
        )}

        <LandingPageView
          onStartOnboarding={handleOpenSignUp}
          onOpenSignIn={handleOpenSignIn}
          onExploreDemo={handleDirectDemoEntry}
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
            setOnboardingModalOpen(false);
            setPathwayModalOpen(true);
          }}
          onComplete={handleOnboardingCompleted}
        />
      </>
    );
  }

  // Select today's workout matching the user's pathway
  const pathwayWorkout =
    workoutPlans.find((p) => p.recommendedPathway === userProfile.pathway) ||
    workoutPlans[0];

  return (
    <div className="min-h-screen flex bg-slate-50/80 text-slate-900 selection:bg-sky-500/20 selection:text-sky-950">
      {/* Modern Scandinavian Health-Tech Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        userProfile={userProfile}
        userAccount={userAccount}
        onSignOut={handleSignOut}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onViewLandingPage={() => setShowLandingPage(true)}
        onSwitchPathway={() => setPathwayModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          activeTab={activeTab}
          userProfile={userProfile}
          usingDemoData={usingDemoData}
          onSelectTab={(tab) => handleNavigate(tab)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onViewLandingPage={() => setShowLandingPage(true)}
          onSwitchPathway={() => setPathwayModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-6xl mx-auto">
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
                foodCatalog={SAMPLE_FOOD_DATABASE}
                intakeRecords={intakeRecords}
                goals={goals}
                initialMeal={preselectedMeal}
                onAddIntakeRecord={handleAddIntakeRecord}
                onUpdateIntakeRecord={handleUpdateIntakeRecord}
                onDeleteIntakeRecord={handleDeleteIntakeRecord}
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
                onUpdateProfileAndGoals={handleUpdateProfileAndGoals}
              />
            )}

            {activeTab === NavigationTab.Reports && (
              <ReportsView
                intakeRecords={intakeRecords}
                goals={goals}
                userProfile={userProfile}
                progressHistory={progressHistory}
              />
            )}

            {activeTab === NavigationTab.AiCoach && (
              <AiCoachView
                messages={chatMessages}
                onAppendMessage={handleAppendMessage}
                intakeRecords={intakeRecords}
                goals={goals}
                userProfile={userProfile}
                progressHistory={progressHistory}
                onNavigate={(tab) => handleNavigate(tab)}
              />
            )}

            {activeTab === NavigationTab.Calendar && (
              <CalendarView
                intakeRecords={intakeRecords}
                goals={goals}
                onNavigate={(tab) => handleNavigate(tab)}
              />
            )}

            {activeTab === NavigationTab.Settings && (
              <SettingsView
                userAccount={userAccount}
                userProfile={userProfile}
                usingDemoData={usingDemoData}
                onChangePathway={handleChangePathway}
                onChangeUnitSystem={handleChangeUnitSystem}
                onToggleDemoData={handleToggleDemoData}
                onResetSampleData={handleResetSampleData}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </main>
      </div>

      {/* Pathway Switcher Modal (Accessible from anywhere in the app) */}
      <PathwaySelectionModal
        isOpen={pathwayModalOpen}
        selectedPathway={userProfile.pathway}
        onSelectPathway={(pw) => {
          handleChangePathway(pw);
        }}
        onConfirm={() => setPathwayModalOpen(false)}
        onBackToLanding={() => setPathwayModalOpen(false)}
      />

      {showStartupIntro && (
        <StartupIntro onComplete={() => setShowStartupIntro(false)} />
      )}
    </div>
  );
}
