/**
 * ASCEND Frontend-Backend Entity Mappers
 *
 * Provides bidirectional translation between frontend TypeScript models
 * and backend FastAPI Pydantic v2 schemas.
 */

import {
  ActivityLevel,
  ChatMessage,
  CoachStructuredInsight,
  ExerciseItem,
  ExerciseSetLog,
  FitnessGoalType,
  FoodCategory,
  FoodItem,
  IntakeRecord,
  MealType,
  NavigationTab,
  NutritionGoals,
  OnboardingPathway,
  PreparationState,
  ProfileArchetype,
  ProgressRecord,
  ServingUnit,
  SourceProvider,
  UnitSystem,
  UserAccount,
  UserProfile,
  VerificationStatus,
  WorkoutPlan,
} from '../../types/ascend';
import { AuthMeResponse, UserProfileResponse, NutritionGoalResponse } from './authApi';
import { BackendFoodItem, BackendFoodDetail, BackendIntakeRecord } from './nutritionApi';
import { WorkoutPlanResponse, WorkoutPlanDetailResponse, ExerciseItemResponse, ExerciseSetLogResponse } from './workoutApi';
import { BackendProgressRecord } from './progressApi';
import { BackendChatMessage } from './aiCoachApi';

// --- Enum Mappings ---

export function mapFrontendPathwayToBackend(pathway: OnboardingPathway): string {
  return pathway;
}

export function mapBackendPathwayToFrontend(pathway: string): OnboardingPathway {
  if (pathway === 'Athlete Performance' || pathway.toLowerCase() === 'athlete_performance') {
    return OnboardingPathway.AthletePerformance;
  }
  if (pathway === 'Weight Gain & Muscle Gain' || pathway.toLowerCase() === 'weight_gain_muscle_gain') {
    return OnboardingPathway.MuscleGain;
  }
  return OnboardingPathway.GeneralFitness;
}

export function mapFrontendArchetypeToBackend(archetype: ProfileArchetype): string {
  return archetype;
}

export function mapBackendArchetypeToFrontend(archetype: string): ProfileArchetype {
  if (archetype === 'Athlete Performance' || archetype.toLowerCase() === 'athlete') {
    return ProfileArchetype.Athlete;
  }
  return ProfileArchetype.GeneralFitness;
}

export function mapFrontendGoalTypeToBackend(goal: FitnessGoalType): string {
  return goal;
}

export function mapBackendGoalTypeToFrontend(goal: string): FitnessGoalType {
  if (goal === 'Weight Loss' || goal.toLowerCase() === 'weight_loss') {
    return FitnessGoalType.WeightLoss;
  }
  if (goal === 'Weight & Muscle Gain' || goal.toLowerCase() === 'muscle_gain') {
    return FitnessGoalType.MuscleGain;
  }
  if (goal === 'Athletic Performance' || goal.toLowerCase() === 'athletic_performance') {
    return FitnessGoalType.AthleticPerformance;
  }
  return FitnessGoalType.Maintenance;
}

export function mapFrontendActivityLevelToBackend(activity: ActivityLevel): string {
  if (activity === ActivityLevel.CompetitiveAthlete) {
    return 'Extremely Active';
  }
  return activity;
}

export function mapBackendActivityLevelToFrontend(activity: string): ActivityLevel {
  if (activity === 'Sedentary' || activity.toLowerCase() === 'sedentary') return ActivityLevel.Sedentary;
  if (activity === 'Lightly Active' || activity.toLowerCase() === 'lightly_active') return ActivityLevel.LightlyActive;
  if (activity === 'Very Active' || activity.toLowerCase() === 'very_active') return ActivityLevel.VeryActive;
  if (activity === 'Extremely Active' || activity === 'Competitive Athlete' || activity.toLowerCase() === 'competitive_athlete') return ActivityLevel.CompetitiveAthlete;
  return ActivityLevel.ModeratelyActive;
}

export function mapFrontendUnitSystemToBackend(unit: UnitSystem): string {
  return unit === UnitSystem.Imperial ? 'Imperial (lb, in, oz)' : 'Metric (kg, cm, ml)';
}

export function mapBackendUnitSystemToFrontend(unit: string): UnitSystem {
  return unit.toLowerCase().includes('imperial') ? UnitSystem.Imperial : UnitSystem.Metric;
}

// --- Auth & User State Mappers ---

export function mapAuthMeToUserState(me: AuthMeResponse): {
  account: UserAccount;
  userProfile?: UserProfile;
  goals?: NutritionGoals;
} {
  const account: UserAccount = {
    name: me.account.fullName,
    email: me.account.email,
    isAuthenticated: true,
    onboardingCompleted: !!me.userProfile,
    isDemoAccount: false,
    rememberMe: true,
  };

  let userProfile: UserProfile | undefined = undefined;
  if (me.userProfile) {
    userProfile = {
      pathway: mapBackendPathwayToFrontend(me.userProfile.pathway),
      archetype: mapBackendArchetypeToFrontend(me.userProfile.archetype),
      goalType: mapBackendGoalTypeToFrontend(me.userProfile.goalType),
      biologicalSex: (me.userProfile.biologicalSex as 'male' | 'female' | 'unspecified') || 'unspecified',
      age: me.userProfile.age,
      heightCm: me.userProfile.heightCm,
      currentWeightKg: me.userProfile.currentWeightKg,
      targetWeightKg: me.userProfile.targetWeightKg,
      activityLevel: mapBackendActivityLevelToFrontend(me.userProfile.activityLevel),
      unitSystem: mapBackendUnitSystemToFrontend(me.userProfile.unitSystem),
      trainingDaysPerWeek: me.userProfile.trainingDaysPerWeek,
    };
  }

  let goals: NutritionGoals | undefined = undefined;
  if (me.nutritionGoals) {
    goals = {
      dailyCalories: me.nutritionGoals.dailyCalories,
      proteinG: me.nutritionGoals.proteinG,
      carbsG: me.nutritionGoals.carbsG,
      fatG: me.nutritionGoals.fatG,
      waterMl: me.nutritionGoals.waterMl,
      dailySteps: me.nutritionGoals.dailySteps,
      weeklyWorkoutSessions: me.nutritionGoals.weeklyWorkoutSessions,
      weeklyActivityMinutes: me.nutritionGoals.weeklyActivityMinutes,
    };
  }

  return { account, userProfile, goals };
}

// --- Nutrition Mappers ---

export function mapBackendFoodItemToFrontend(item: BackendFoodItem): FoodItem {
  return {
    id: item.id,
    name: item.name,
    alternateNames: item.alternateNames || [],
    brandOrSource: item.brandOrSource,
    category: (item.category as any) || 'Prepared Meals',
    cuisineRegion: item.cuisineRegion as any,
    preparationState: (item.preparationState as PreparationState) || 'cooked',
    referenceQuantity: item.referenceQuantity,
    referenceUnit: (item.referenceUnit as 'g' | 'ml' | 'serving') || 'g',
    referenceLabel: item.referenceLabel,
    gramsPerServing: item.gramsPerServing,
    ediblePortionPct: item.ediblePortionPct,
    nutrients: {
      calories: item.nutrients.calories,
      proteinG: item.nutrients.proteinG,
      carbsG: item.nutrients.carbsG,
      fatG: item.nutrients.fatG,
      fiberG: item.nutrients.fiberG ?? null,
      sugarG: item.nutrients.sugarG ?? null,
      sodiumMg: item.nutrients.sodiumMg ?? null,
      potassiumMg: item.nutrients.potassiumMg ?? null,
      calciumMg: item.nutrients.calciumMg ?? null,
      ironMg: item.nutrients.ironMg ?? null,
    },
    isMicronutrientComplete: item.isMicronutrientComplete,
    dataNote: item.dataNote || undefined,
    sourceProvenance: {
      sourceProvider: (item.sourceProvider as SourceProvider) || (item.isCustomUserFood ? 'user_custom' : 'legacy_demo'),
      sourceName: item.brandOrSource,
      sourceId: item.sourceExternalId || item.code || undefined,
      sourceAttribution: item.sourceAttribution || undefined,
      barcode: item.barcode || undefined,
      verificationStatus:
        (item.verificationStatus as VerificationStatus) ||
        (item.isCustomUserFood ? 'user_entered' : 'unverified'),
      licenseType: item.licenseType || (item.isCustomUserFood ? 'User-Private' : 'unspecified'),
    },
  };
}

export function mapBackendIntakeRecordToFrontend(record: BackendIntakeRecord): IntakeRecord {
  return {
    id: record.id,
    foodId: record.foodId || '',
    foodName: record.foodName,
    category: record.category,
    meal: record.meal as MealType,
    quantity: record.quantity,
    unit: record.unit as ServingUnit,
    loggedAt: record.loggedAt,
    dateIso: record.dateIso,
    computedNutrients: {
      calories: record.computedNutrients.calories,
      proteinG: record.computedNutrients.proteinG,
      carbsG: record.computedNutrients.carbsG,
      fatG: record.computedNutrients.fatG,
      fiberG: record.computedNutrients.fiberG ?? null,
      sodiumMg: record.computedNutrients.sodiumMg ?? null,
    },
    isUserLogged: record.isUserLogged,
  };
}

// --- Workout Mappers ---

export function mapBackendWorkoutPlanToFrontend(
  plan: WorkoutPlanDetailResponse | WorkoutPlanResponse
): WorkoutPlan {
  const exercises: ExerciseItem[] =
    'exercises' in plan && Array.isArray(plan.exercises)
      ? plan.exercises.map((ex: ExerciseItemResponse) => ({
          id: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: ex.defaultSets,
          reps: ex.defaultReps,
          loadKg: ex.defaultLoadKg,
          restSeconds: ex.restSeconds,
          completed: false,
          notes: ex.notes || undefined,
        }))
      : [];

  return {
    id: plan.id,
    title: plan.title,
    dayLabel: plan.dayLabel,
    focusArea: plan.focusArea,
    estimatedMinutes: plan.estimatedMinutes,
    intensityLabel: plan.intensityLabel as 'Low' | 'Moderate' | 'High' | 'Peak Performance',
    targetCaloriesBurned: plan.targetCaloriesBurned,
    recommendedPathway: plan.recommendedPathway
      ? mapBackendPathwayToFrontend(plan.recommendedPathway)
      : undefined,
    exercises,
  };
}

// --- Progress Mappers ---

export function mapBackendProgressRecordToFrontend(rec: BackendProgressRecord): ProgressRecord {
  return {
    id: rec.id,
    dateIso: rec.dateLogged,
    label: rec.label,
    weightKg: rec.weightKg,
    bodyFatPct: rec.bodyFatPct ?? undefined,
    leanMassKg: rec.leanMassKg ?? undefined,
    waistCm: rec.waistCm ?? undefined,
    chestCm: rec.chestCm ?? undefined,
    armCm: rec.armCm ?? undefined,
    thighCm: rec.thighCm ?? undefined,
    caloriesConsumed: rec.caloriesConsumed,
    proteinConsumedG: rec.proteinConsumedG,
    carbsConsumedG: rec.carbsConsumedG,
    fatConsumedG: rec.fatConsumedG,
    workoutCompleted: rec.workoutCompleted,
    activityMinutes: rec.activityMinutes,
    stepsCount: rec.stepsCount,
    source: 'logged',
  };
}

// --- AI Coach Mappers ---

export function mapBackendChatMessageToFrontend(msg: BackendChatMessage): ChatMessage {
  let structuredInsight: CoachStructuredInsight | undefined = undefined;
  if (msg.structuredInsight) {
    structuredInsight = {
      title: msg.structuredInsight.title,
      summary: msg.structuredInsight.summary,
      metrics: (msg.structuredInsight.metrics || []).map((m) => ({
        label: m.label,
        current: m.current,
        target: m.target,
        status: m.status,
      })),
      suggestedAction: msg.structuredInsight.suggestedAction
        ? {
            label: msg.structuredInsight.suggestedAction.label,
            targetTab: (msg.structuredInsight.suggestedAction.targetTab as NavigationTab) || NavigationTab.Dashboard,
          }
        : undefined,
    };
  }

  return {
    id: msg.id,
    role: msg.role,
    timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    content: msg.content,
    structuredInsight,
    isMockResponse: msg.isMockResponse,
  };
}
