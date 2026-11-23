import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Heart,
  Info,
  Lock,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  computeRecommendedTargets,
  prototypeSessionStorage,
} from '../../services/ascendApiService';
import {
  ActivityLevel,
  FitnessGoalType,
  NutritionGoals,
  OnboardingPathway,
  ProfileArchetype,
  UnitSystem,
  UserAccount,
  UserProfile,
} from '../../types/ascend';

type AuthScreenStep =
  | 'welcome'
  | 'signin'
  | 'signup'
  | 'demo_select'
  | 'onboarding';

interface AuthOnboardingFlowProps {
  initialScreen?: AuthScreenStep;
  onBackToLanding?: () => void;
  onCompleteAuthAndOnboarding: (payload: {
    account: UserAccount;
    profile: UserProfile;
    goals: NutritionGoals;
    preloadDemoData: boolean;
  }) => void;
}

const PATHWAY_CARDS: {
  pathway: OnboardingPathway;
  title: string;
  description: string;
  defaultGoal: FitnessGoalType;
  defaultArchetype: ProfileArchetype;
  icon: React.ComponentType<{ className?: string }>;
  highlights: string[];
}[] = [
  {
    pathway: OnboardingPathway.GeneralFitness,
    title: 'General Nutrition & Diet',
    description:
      'For everyday healthy eating, calorie awareness, balanced macronutrients, and sustainable weight management.',
    defaultGoal: FitnessGoalType.WeightLoss,
    defaultArchetype: ProfileArchetype.GeneralFitness,
    icon: Heart,
    highlights: [
      'Daily food logging & calorie balance',
      'Meal history & macronutrient tracking',
      'Healthy habits & steady weight goals',
    ],
  },
  {
    pathway: OnboardingPathway.AthletePerformance,
    title: 'Athlete Performance',
    description:
      'For athletes focused on structured training schedules, workout history, hydration, and performance fueling.',
    defaultGoal: FitnessGoalType.AthleticPerformance,
    defaultArchetype: ProfileArchetype.Athlete,
    icon: Flame,
    highlights: [
      'Training schedule & workout tracking',
      'Activity-appropriate carbs & hydration',
      'Performance goals & session progress',
    ],
  },
  {
    pathway: OnboardingPathway.MuscleGain,
    title: 'Weight Gain & Muscle Gain',
    description:
      'For users focused on increasing body weight, building lean muscle mass, and progressive strength training.',
    defaultGoal: FitnessGoalType.MuscleGain,
    defaultArchetype: ProfileArchetype.GeneralFitness,
    icon: Dumbbell,
    highlights: [
      'Calorie surplus & high-protein targets',
      'Consistent meal logging & weight trends',
      'Strength training & hypertrophy progress',
    ],
  },
];

export const AuthOnboardingFlow: React.FC<AuthOnboardingFlowProps> = ({
  initialScreen = 'welcome',
  onBackToLanding,
  onCompleteAuthAndOnboarding,
}) => {
  const [screen, setScreen] = useState<AuthScreenStep>(initialScreen);

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPass, setShowSignInPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassInfo, setShowForgotPassInfo] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Create Account form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [showSignUpPass, setShowSignUpPass] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  // Onboarding Wizard state (Steps 1: Pathway -> 2: Goals & Profile -> 3: Review & Adjust)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const [pathway, setPathway] = useState<OnboardingPathway>(
    OnboardingPathway.GeneralFitness
  );
  const [goalType, setGoalType] = useState<FitnessGoalType>(
    FitnessGoalType.WeightLoss
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(UnitSystem.Metric);
  const [age, setAge] = useState<string>('27');
  const [heightCm, setHeightCm] = useState<string>('175');
  const [currentWeightKg, setCurrentWeightKg] = useState<string>('74.0');
  const [targetWeightKg, setTargetWeightKg] = useState<string>('71.0');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    ActivityLevel.ModeratelyActive
  );
  const [trainingDays, setTrainingDays] = useState<number>(3);

  // Editable target overrides in Step 3 Review
  const [reviewTargets, setReviewTargets] = useState<NutritionGoals>(() =>
    computeRecommendedTargets({
      pathway: OnboardingPathway.GeneralFitness,
      archetype: ProfileArchetype.GeneralFitness,
      goalType: FitnessGoalType.WeightLoss,
      age: 27,
      heightCm: 175,
      currentWeightKg: 74.0,
      targetWeightKg: 71.0,
      activityLevel: ActivityLevel.ModeratelyActive,
      unitSystem: UnitSystem.Metric,
      trainingDaysPerWeek: 3,
    })
  );

  const buildDraftProfile = (): UserProfile => {
    const selectedCard = PATHWAY_CARDS.find((c) => c.pathway === pathway);
    return {
      pathway,
      archetype:
        selectedCard?.defaultArchetype ?? ProfileArchetype.GeneralFitness,
      goalType,
      age: Math.max(16, Math.min(95, parseInt(age, 10) || 27)),
      heightCm: Math.max(120, Math.min(230, parseFloat(heightCm) || 175)),
      currentWeightKg: Math.max(
        35,
        Math.min(220, parseFloat(currentWeightKg) || 74)
      ),
      targetWeightKg: Math.max(
        35,
        Math.min(220, parseFloat(targetWeightKg) || 71)
      ),
      activityLevel,
      unitSystem,
      trainingDaysPerWeek: trainingDays,
    };
  };

  const handleSelectPathway = (nextPathway: OnboardingPathway) => {
    setPathway(nextPathway);
    const card = PATHWAY_CARDS.find((c) => c.pathway === nextPathway);
    if (card) {
      setGoalType(card.defaultGoal);
      if (nextPathway === OnboardingPathway.MuscleGain) {
        setTargetWeightKg('77.5');
        setActivityLevel(ActivityLevel.ModeratelyActive);
        setTrainingDays(4);
      } else if (nextPathway === OnboardingPathway.AthletePerformance) {
        setTargetWeightKg('74.0');
        setActivityLevel(ActivityLevel.VeryActive);
        setTrainingDays(5);
      } else {
        setTargetWeightKg('71.0');
        setActivityLevel(ActivityLevel.ModeratelyActive);
        setTrainingDays(3);
      }
    }
  };

  // Sign In Submit (Existing User Journey)
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    const emailTrimmed = signInEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setSignInError('Please enter a valid email address.');
      return;
    }
    if (signInPassword.length < 6) {
      setSignInError('Please enter your password (at least 6 characters).');
      return;
    }

    // Check if this user already configured a pathway in prototype storage
    const existingRecord =
      prototypeSessionStorage.findRegisteredUser(emailTrimmed);

    if (
      existingRecord &&
      existingRecord.pathwayConfigured &&
      existingRecord.userProfile &&
      existingRecord.goals
    ) {
      onCompleteAuthAndOnboarding({
        account: {
          name: existingRecord.name,
          email: existingRecord.email,
          isAuthenticated: true,
          onboardingCompleted: true,
          isDemoAccount: false,
          rememberMe,
        },
        profile: existingRecord.userProfile,
        goals: existingRecord.goals,
        preloadDemoData: false,
      });
      return;
    }

    // Built-in returning account presets for convenient testing
    if (
      emailTrimmed.startsWith('alex@') ||
      emailTrimmed.startsWith('athlete@') ||
      emailTrimmed.startsWith('muscle@')
    ) {
      const presetPathway = emailTrimmed.startsWith('athlete@')
        ? OnboardingPathway.AthletePerformance
        : emailTrimmed.startsWith('muscle@')
        ? OnboardingPathway.MuscleGain
        : OnboardingPathway.GeneralFitness;

      const presetGoal =
        presetPathway === OnboardingPathway.AthletePerformance
          ? FitnessGoalType.AthleticPerformance
          : presetPathway === OnboardingPathway.MuscleGain
          ? FitnessGoalType.MuscleGain
          : FitnessGoalType.WeightLoss;

      const presetProfile: UserProfile = {
        pathway: presetPathway,
        archetype:
          presetPathway === OnboardingPathway.AthletePerformance
            ? ProfileArchetype.Athlete
            : ProfileArchetype.GeneralFitness,
        goalType: presetGoal,
        age: 28,
        heightCm: 175,
        currentWeightKg: 74.0,
        targetWeightKg:
          presetPathway === OnboardingPathway.MuscleGain
            ? 77.5
            : presetPathway === OnboardingPathway.AthletePerformance
            ? 74.0
            : 71.0,
        activityLevel:
          presetPathway === OnboardingPathway.AthletePerformance
            ? ActivityLevel.VeryActive
            : ActivityLevel.ModeratelyActive,
        unitSystem: UnitSystem.Metric,
        trainingDaysPerWeek:
          presetPathway === OnboardingPathway.AthletePerformance ? 5 : 4,
      };
      const presetGoals = computeRecommendedTargets(presetProfile);

      onCompleteAuthAndOnboarding({
        account: {
          name: emailTrimmed.split('@')[0].replace(/\b\w/g, (l) => l.toUpperCase()),
          email: emailTrimmed,
          isAuthenticated: true,
          onboardingCompleted: true,
          isDemoAccount: false,
          rememberMe,
        },
        profile: presetProfile,
        goals: presetGoals,
        preloadDemoData: false,
      });
      return;
    }

    // If an existing user's pathway is not yet configured, ask them to select one before opening the dashboard
    const derivedName = emailTrimmed
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    setSignUpName(derivedName || 'Member');
    setSignUpEmail(emailTrimmed);
    setScreen('onboarding');
    setWizardStep(1);
  };

  // Create Account Submit (New User Journey)
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    if (signUpName.trim().length < 2) {
      setSignUpError('Please enter your name.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setSignUpError('Please enter a valid email address.');
      return;
    }
    if (signUpPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters.');
      return;
    }
    if (signUpPassword !== signUpConfirm) {
      setSignUpError('Passwords do not match.');
      return;
    }

    setScreen('onboarding');
    setWizardStep(1);
  };

  // Demo User Pathway Launch
  const handleLaunchDemoPathway = (demoPathway: OnboardingPathway) => {
    const demoGoal =
      demoPathway === OnboardingPathway.AthletePerformance
        ? FitnessGoalType.AthleticPerformance
        : demoPathway === OnboardingPathway.MuscleGain
        ? FitnessGoalType.MuscleGain
        : FitnessGoalType.WeightLoss;

    const demoProfile: UserProfile = {
      pathway: demoPathway,
      archetype:
        demoPathway === OnboardingPathway.AthletePerformance
          ? ProfileArchetype.Athlete
          : ProfileArchetype.GeneralFitness,
      goalType: demoGoal,
      age: 28,
      heightCm: 175,
      currentWeightKg: 74.0,
      targetWeightKg:
        demoPathway === OnboardingPathway.MuscleGain
          ? 77.5
          : demoPathway === OnboardingPathway.AthletePerformance
          ? 74.0
          : 71.0,
      activityLevel:
        demoPathway === OnboardingPathway.AthletePerformance
          ? ActivityLevel.VeryActive
          : ActivityLevel.ModeratelyActive,
      unitSystem: UnitSystem.Metric,
      trainingDaysPerWeek:
        demoPathway === OnboardingPathway.AthletePerformance
          ? 5
          : demoPathway === OnboardingPathway.MuscleGain
          ? 4
          : 3,
    };

    const demoGoals = computeRecommendedTargets(demoProfile);

    onCompleteAuthAndOnboarding({
      account: {
        name: 'Demo Explorer',
        email: 'demo@ascend.app',
        isAuthenticated: true,
        onboardingCompleted: true,
        isDemoAccount: true,
      },
      profile: demoProfile,
      goals: demoGoals,
      preloadDemoData: true,
    });
  };

  const handleWizardNext = () => {
    setWizardError(null);
    if (wizardStep === 1) {
      setWizardStep(2);
      return;
    }

    if (wizardStep === 2) {
      const parsedAge = parseInt(age, 10);
      const parsedHeight = parseFloat(heightCm);
      const parsedWeight = parseFloat(currentWeightKg);
      const parsedTarget = parseFloat(targetWeightKg);

      if (Number.isNaN(parsedAge) || parsedAge < 16 || parsedAge > 95) {
        setWizardError('Please enter an age between 16 and 95.');
        return;
      }
      if (
        Number.isNaN(parsedHeight) ||
        parsedHeight < 120 ||
        parsedHeight > 230
      ) {
        setWizardError('Please enter a height between 120 cm and 230 cm.');
        return;
      }
      if (
        Number.isNaN(parsedWeight) ||
        parsedWeight < 35 ||
        parsedWeight > 220
      ) {
        setWizardError(
          'Please enter a current weight between 35 kg and 220 kg.'
        );
        return;
      }
      if (
        Number.isNaN(parsedTarget) ||
        parsedTarget < 35 ||
        parsedTarget > 220
      ) {
        setWizardError(
          'Please enter a target weight between 35 kg and 220 kg.'
        );
        return;
      }

      const nextProfile = buildDraftProfile();
      setReviewTargets(computeRecommendedTargets(nextProfile));
      setWizardStep(3);
    }
  };

  const handleFinishOnboarding = () => {
    const finalProfile = buildDraftProfile();
    const userEmail =
      signUpEmail.trim() || signInEmail.trim() || 'member@ascend.app';
    const userName = signUpName.trim() || 'Alex';

    // Save in prototype user registry so future Sign In goes directly to their dashboard
    prototypeSessionStorage.saveRegisteredUser({
      name: userName,
      email: userEmail,
      pathwayConfigured: true,
      userProfile: finalProfile,
      goals: reviewTargets,
    });

    onCompleteAuthAndOnboarding({
      account: {
        name: userName,
        email: userEmail,
        isAuthenticated: true,
        onboardingCompleted: true,
        isDemoAccount: false,
        rememberMe,
      },
      profile: finalProfile,
      goals: reviewTargets,
      preloadDemoData: false,
    });
  };

  const draftProfile = buildDraftProfile();

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-slate-900 flex flex-col justify-between px-4 sm:px-6 py-4">
      {/* Compact Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (onBackToLanding) {
              onBackToLanding();
            } else {
              setScreen('welcome');
            }
          }}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B1221] text-sky-400 transition-transform duration-150 group-hover:scale-105">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 block leading-none">
              ASCEND
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Getting Better Every Day
            </span>
          </div>
        </button>

        {screen === 'welcome' ? (
          <div className="flex items-center gap-2.5">
            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Home
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSignInError(null);
                setScreen('signin');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setSignUpError(null);
                setScreen('signup');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] rounded-xl transition-all shadow-2xs"
            >
              Create Account
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onBackToLanding && screen !== 'onboarding') {
                onBackToLanding();
              } else {
                setScreen('welcome');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{onBackToLanding && screen !== 'onboarding' ? 'Back to Home' : 'Back to Welcome'}</span>
          </button>
        )}
      </header>

      {/* Main Single-Viewport Center Area */}
      <main className="flex-1 flex items-center justify-center my-2">
        {/* 1. WELCOME SCREEN (Compact One-Screen Layout) */}
        {screen === 'welcome' && (
          <div className="max-w-4xl w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-2xs animate-page-enter">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 px-3 py-1 rounded-lg">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI-Assisted Nutrition, Fitness & Performance</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                  Track your nutrition, training, and goals in one calm workspace.
                </h1>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  ASCEND adapts to your personal pathway—whether you are focusing on everyday healthy eating, athletic performance, or building lean muscle mass.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setScreen('signup')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] rounded-xl transition-all shadow-2xs"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setScreen('signin')}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] rounded-xl transition-all"
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    onClick={() => setScreen('demo_select')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-xl transition-colors"
                  >
                    <span>Explore Demo Mode</span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                      Sample Data
                    </span>
                  </button>
                </div>
              </div>

              {/* Right Column: Three Pathways Preview */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200/70 rounded-xl p-5 space-y-3.5">
                <p className="text-xs font-semibold text-slate-500">
                  Three Personalized Pathways
                </p>
                {PATHWAY_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.pathway}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/60"
                    >
                      <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-xs font-bold text-slate-900">
                          {card.title}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {card.highlights[0]} · {card.highlights[1]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. SIGN-IN SCREEN (Compact Single-Viewport Design for 1366x768) */}
        {screen === 'signin' && (
          <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4 animate-page-enter">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900">
                  Sign in to ASCEND
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Open your personalized pathway and nutrition dashboard.
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4" />
              </div>
            </div>

            {/* Reserved Error / Recovery Feedback Slot */}
            {signInError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium animate-fade-in">
                {signInError}
              </div>
            )}

            {showForgotPassInfo && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-slate-700 text-xs space-y-1 animate-fade-in">
                <p className="font-semibold text-slate-900">
                  Prototype Password Recovery
                </p>
                <p className="leading-relaxed">
                  Email password reset will be handled by the FastAPI backend. In this frontend prototype, enter any valid email and a 6+ character password to sign in.
                </p>
              </div>
            )}

            <form onSubmit={handleSignInSubmit} className="space-y-3.5" noValidate>
              <div>
                <label
                  htmlFor="signin-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Email address
                </label>
                <input
                  id="signin-email"
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="alex@ascend.app"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassInfo(!showForgotPassInfo)}
                    className="text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showSignInPass ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPass(!showSignInPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showSignInPass ? 'Hide password' : 'Show password'
                    }
                  >
                    {showSignInPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Remember session on this device</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white text-sm font-semibold rounded-xl transition-all shadow-2xs"
              >
                Sign In
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 text-center space-y-1.5">
              <p className="text-xs text-slate-600">
                Don’t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setSignInError(null);
                    setScreen('signup');
                  }}
                  className="font-semibold text-sky-600 hover:text-sky-700"
                >
                  Create Account
                </button>
              </p>
              <p className="text-[11px] text-slate-400">
                Privacy note: Prototype session state is stored locally; passwords are never saved in browser storage.
              </p>
            </div>
          </div>
        )}

        {/* 3. CREATE ACCOUNT SCREEN (Compact Single-Viewport Design for 1366x768) */}
        {screen === 'signup' && (
          <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4 animate-page-enter">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900">
                  Create your ASCEND account
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Next, you’ll choose your pathway and personalize your targets.
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>

            {signUpError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium animate-fade-in">
                {signUpError}
              </div>
            )}

            <form onSubmit={handleSignUpSubmit} className="space-y-3" noValidate>
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Jordan Lee"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="jordan@example.com"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignUpPass ? 'text' : 'password'}
                      required
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="6+ chars"
                      className="w-full pl-3 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPass(!showSignUpPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={
                        showSignUpPass ? 'Hide password' : 'Show password'
                      }
                    >
                      {showSignUpPass ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    type={showSignUpPass ? 'text' : 'password'}
                    required
                    value={signUpConfirm}
                    onChange={(e) => setSignUpConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white text-sm font-semibold rounded-xl transition-all shadow-2xs mt-1"
              >
                Create Account & Choose Pathway
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 text-center space-y-1.5">
              <p className="text-xs text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setSignUpError(null);
                    setScreen('signin');
                  }}
                  className="font-semibold text-sky-600 hover:text-sky-700"
                >
                  Sign In
                </button>
              </p>
              <p className="text-[11px] text-slate-400">
                Prototype note: Account setup is local and ready for FastAPI registration integration.
              </p>
            </div>
          </div>
        )}

        {/* 4. DEMO PATHWAY SELECTOR SCREEN */}
        {screen === 'demo_select' && (
          <div className="max-w-3xl w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6 animate-page-enter">
            <div>
              <span className="text-xs font-semibold text-sky-600">
                Demonstration Mode (Clearly Labeled Sample Data)
              </span>
              <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
                Choose a Demo Pathway to Explore
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Select any pathway below to open the dashboard preloaded with internally consistent demonstration meals, workouts, and progress trends.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PATHWAY_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.pathway}
                    type="button"
                    onClick={() => handleLaunchDemoPathway(card.pathway)}
                    className="p-5 rounded-xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/40 text-left transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          Sample Preset
                        </span>
                      </div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        {card.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600">
                      <span>Launch Sample Dashboard</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. 3-STEP ONBOARDING WIZARD (Pathway -> Goals & Profile -> Review & Adjust) */}
        {screen === 'onboarding' && (
          <div className="max-w-3xl w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6 animate-page-enter">
            {/* Animated Progress Indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Step {wizardStep} of 3</span>
                <span>
                  {wizardStep === 1 && '1. Choose Your Pathway'}
                  {wizardStep === 2 && '2. Configure Goals & Profile'}
                  {wizardStep === 3 && '3. Review & Adjust Targets'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-sky-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(wizardStep / 3) * 100}%` }}
                />
              </div>
            </div>

            {wizardError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium animate-fade-in">
                {wizardError}
              </div>
            )}

            {/* STEP 1: CHOOSE ONE OF THREE DISTINCT PATHWAYS */}
            {wizardStep === 1 && (
              <div className="space-y-5 animate-page-enter">
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                    Choose your primary pathway
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Your pathway customizes your dashboard priorities, quick actions, and AI coaching prompts. You can switch pathways later in Settings.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {PATHWAY_CARDS.map((card) => {
                    const Icon = card.icon;
                    const selected = pathway === card.pathway;
                    return (
                      <button
                        key={card.pathway}
                        type="button"
                        onClick={() => handleSelectPathway(card.pathway)}
                        className={`p-4 rounded-xl border text-left transition-all flex items-start justify-between gap-4 ${
                          selected
                            ? 'bg-sky-50/70 border-sky-600 ring-1 ring-sky-600'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              selected
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                              {card.title}
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                              {card.description}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                              {card.highlights.map((item) => (
                                <span
                                  key={item}
                                  className="flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3 text-sky-600 shrink-0" />
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                            selected
                              ? 'bg-sky-600 border-sky-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: GOAL & PROFILE CONFIGURATION */}
            {wizardStep === 2 && (
              <div className="space-y-5 animate-page-enter">
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                    Configure your goal & basic profile
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Used to estimate sensible starting targets for your{' '}
                    <strong className="text-slate-800">{pathway}</strong> pathway.
                  </p>
                </div>

                {/* Specific Objective */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Primary Objective
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {Object.values(FitnessGoalType).map((g) => {
                      const active = goalType === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGoalType(g)}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{g}</span>
                          {active && (
                            <Check className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Biometric Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div>
                    <label
                      htmlFor="onboard-age"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Age (years)
                    </label>
                    <input
                      id="onboard-age"
                      type="number"
                      min={16}
                      max={95}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="onboard-height"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Height (cm)
                    </label>
                    <input
                      id="onboard-height"
                      type="number"
                      min={120}
                      max={230}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="onboard-weight"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Current Weight (kg)
                    </label>
                    <input
                      id="onboard-weight"
                      type="number"
                      step="0.1"
                      min={35}
                      max={220}
                      value={currentWeightKg}
                      onChange={(e) => setCurrentWeightKg(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="onboard-target"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Target Weight (kg)
                    </label>
                    <input
                      id="onboard-target"
                      type="number"
                      step="0.1"
                      min={35}
                      max={220}
                      value={targetWeightKg}
                      onChange={(e) => setTargetWeightKg(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Activity Level, Units & Training Days */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label
                      htmlFor="onboard-activity"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Activity Level
                    </label>
                    <select
                      id="onboard-activity"
                      value={activityLevel}
                      onChange={(e) =>
                        setActivityLevel(e.target.value as ActivityLevel)
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                    >
                      {Object.values(ActivityLevel).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="onboard-training-days"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Training Sessions / Week
                    </label>
                    <select
                      id="onboard-training-days"
                      value={trainingDays}
                      onChange={(e) =>
                        setTrainingDays(parseInt(e.target.value, 10) || 3)
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                    >
                      {[2, 3, 4, 5, 6].map((days) => (
                        <option key={days} value={days}>
                          {days} days per week
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="onboard-units"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Measurement Units
                    </label>
                    <select
                      id="onboard-units"
                      value={unitSystem}
                      onChange={(e) =>
                        setUnitSystem(e.target.value as UnitSystem)
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                    >
                      {Object.values(UnitSystem).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & ADJUST ESTIMATED TARGETS */}
            {wizardStep === 3 && (
              <div className="space-y-5 animate-page-enter">
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                    Review & customize your estimated targets
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    These daily targets are estimates based on your profile. Feel free to adjust any value below before entering your dashboard.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Selected Pathway & Goal
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {draftProfile.pathway} · {draftProfile.goalType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 font-mono">
                      {draftProfile.age}y · {draftProfile.heightCm}cm ·{' '}
                      {draftProfile.currentWeightKg}kg →{' '}
                      {draftProfile.targetWeightKg}kg
                    </span>
                  </div>

                  {/* Editable Target Inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <label className="text-xs text-slate-500 block mb-1">
                        Calories (kcal)
                      </label>
                      <input
                        type="number"
                        step={25}
                        value={reviewTargets.dailyCalories}
                        onChange={(e) =>
                          setReviewTargets({
                            ...reviewTargets,
                            dailyCalories:
                              parseInt(e.target.value, 10) || 2000,
                          })
                        }
                        className="w-full font-mono text-base font-bold text-slate-900 bg-transparent border-b border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <label className="text-xs text-slate-500 block mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        value={reviewTargets.proteinG}
                        onChange={(e) =>
                          setReviewTargets({
                            ...reviewTargets,
                            proteinG: parseInt(e.target.value, 10) || 130,
                          })
                        }
                        className="w-full font-mono text-base font-bold text-sky-700 bg-transparent border-b border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <label className="text-xs text-slate-500 block mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        value={reviewTargets.carbsG}
                        onChange={(e) =>
                          setReviewTargets({
                            ...reviewTargets,
                            carbsG: parseInt(e.target.value, 10) || 220,
                          })
                        }
                        className="w-full font-mono text-base font-bold text-emerald-700 bg-transparent border-b border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <label className="text-xs text-slate-500 block mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        value={reviewTargets.fatG}
                        onChange={(e) =>
                          setReviewTargets({
                            ...reviewTargets,
                            fatG: parseInt(e.target.value, 10) || 65,
                          })
                        }
                        className="w-full font-mono text-base font-bold text-amber-700 bg-transparent border-b border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <label className="text-xs text-slate-500 block mb-1">
                        Water (ml)
                      </label>
                      <input
                        type="number"
                        step={50}
                        value={reviewTargets.waterMl}
                        onChange={(e) =>
                          setReviewTargets({
                            ...reviewTargets,
                            waterMl: parseInt(e.target.value, 10) || 2500,
                          })
                        }
                        className="w-full font-mono text-base font-bold text-sky-600 bg-transparent border-b border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <label className="text-xs text-slate-500 block mb-1">
                        Daily Steps
                      </label>
                      <input
                        type="number"
                        step={500}
                        value={reviewTargets.dailySteps}
                        onChange={(e) =>
                          setReviewTargets({
                            ...reviewTargets,
                            dailySteps: parseInt(e.target.value, 10) || 10000,
                          })
                        }
                        className="w-full font-mono text-base font-bold text-slate-700 bg-transparent border-b border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewTargets(
                          computeRecommendedTargets(draftProfile)
                        )
                      }
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 underline underline-offset-2"
                    >
                      Reset to Recommended Values
                    </button>
                    <span className="text-[11px] text-slate-500">
                      Values recalculate automatically if you go Back and adjust biometrics
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 flex items-start gap-2.5 text-xs text-slate-700">
                  <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    Suggested calorie and macronutrient values are educational estimates rather than medical prescriptions.
                  </span>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setWizardStep((prev) => (prev - 1) as 1 | 2 | 3)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setScreen(signUpEmail ? 'signup' : 'welcome')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Cancel Setup</span>
                </button>
              )}

              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={handleWizardNext}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] rounded-xl transition-all shadow-2xs"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] rounded-xl transition-all shadow-2xs"
                >
                  <Check className="h-4 w-4" />
                  <span>Enter Personalized Dashboard</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Compact Single-Line Footer */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between text-[11px] text-slate-400">
        <span>ASCEND — Getting Better Every Day</span>
        <span className="hidden sm:inline">
          Prototype Authentication · Ready for FastAPI & PostgreSQL
        </span>
      </footer>
    </div>
  );
};
