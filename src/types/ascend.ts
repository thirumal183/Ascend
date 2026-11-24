export enum NavigationTab {
  Dashboard = 'dashboard',
  Diet = 'diet',
  Workouts = 'workouts',
  Progress = 'progress',
  Goals = 'goals',
  Reports = 'reports',
  AiCoach = 'ai_coach',
  Calendar = 'calendar',
  Settings = 'settings',
}

export enum OnboardingPathway {
  GeneralFitness = 'General Nutrition & Diet',
  AthletePerformance = 'Athlete Performance',
  MuscleGain = 'Weight Gain & Muscle Gain',
}

export enum MealType {
  Breakfast = 'Breakfast',
  Lunch = 'Lunch',
  Snacks = 'Snacks',
  Dinner = 'Dinner',
}

export enum ProfileArchetype {
  GeneralFitness = 'General Fitness & Lifestyle',
  Athlete = 'Athlete Performance',
}

export enum FitnessGoalType {
  WeightLoss = 'Weight Loss',
  Maintenance = 'Weight Maintenance',
  MuscleGain = 'Weight & Muscle Gain',
  AthleticPerformance = 'Athletic Performance',
}

export enum ActivityLevel {
  Sedentary = 'Sedentary',
  LightlyActive = 'Lightly Active',
  ModeratelyActive = 'Moderately Active',
  VeryActive = 'Very Active',
  CompetitiveAthlete = 'Competitive Athlete',
}

export enum UnitSystem {
  Metric = 'Metric (kg, cm, ml)',
  Imperial = 'Imperial (lb, in, fl oz)',
}

export type FoodCategory =
  | 'All'
  | 'Protein Sources'
  | 'Grains & Oats'
  | 'Indian Breads & Roti'
  | 'Dals, Pulses & Curries'
  | 'Produce'
  | 'Dairy & Alternatives'
  | 'Sports Supplements'
  | 'Prepared Meals';

export type ServingUnit = 'g' | 'oz' | 'serving' | 'ml' | 'cup';

export type PreparationState = 'raw' | 'cooked' | 'packaged' | 'composite_dish';

export type VerificationStatus =
  | 'verified_reference'
  | 'packaged_label'
  | 'user_entered'
  | 'demonstration';

export interface SourceProvenance {
  sourceName: string;
  sourceId?: string;
  retrievalDate?: string;
  verificationStatus: VerificationStatus;
  licenseType: 'Public Domain (CC0)' | 'Curated Prototype / Demo' | 'ODbL' | 'Proprietary Label';
}

export interface UserAccount {
  name: string;
  email: string;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  isDemoAccount?: boolean;
  rememberMe?: boolean;
}

export interface NutrientValues {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sugarG?: number | null;
  sodiumMg?: number | null;
  potassiumMg?: number | null;
  calciumMg?: number | null;
  ironMg?: number | null;
}

export interface FoodItem {
  id: string;
  name: string;
  alternateNames?: string[];
  brandOrSource: string;
  category: Exclude<FoodCategory, 'All'>;
  cuisineRegion?:
    | 'South Indian'
    | 'North Indian'
    | 'Pan-Indian'
    | 'Global / Western'
    | 'Sports Nutrition';
  preparationState?: PreparationState;
  referenceQuantity: number;
  referenceUnit: 'g' | 'ml' | 'serving';
  referenceLabel: string;
  gramsPerServing: number;
  ediblePortionPct?: number;
  nutrients: NutrientValues;
  nutrientsPer100g?: NutrientValues;
  sourceProvenance?: SourceProvenance;
  isMicronutrientComplete: boolean;
  dataNote?: string;
}

export interface IntakeRecord {
  id: string;
  foodId: string;
  foodName: string;
  category: string;
  meal: MealType;
  quantity: number;
  unit: ServingUnit;
  loggedAt: string;
  dateIso: string;
  computedNutrients: NutrientValues;
  isUserLogged?: boolean;
}

export interface ExerciseSetLog {
  setNum: number;
  targetReps: string;
  targetLoadKg: number;
  actualReps?: number;
  actualLoadKg?: number;
  completed: boolean;
}

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  loadKg: number;
  restSeconds: number;
  completed: boolean;
  notes?: string;
  completedSets?: ExerciseSetLog[];
}

export interface WorkoutPlan {
  id: string;
  title: string;
  dayLabel: string;
  focusArea: string;
  estimatedMinutes: number;
  intensityLabel: 'Low' | 'Moderate' | 'High' | 'Peak Performance';
  targetCaloriesBurned: number;
  recommendedPathway?: OnboardingPathway;
  exercises: ExerciseItem[];
}

export interface UserProfile {
  pathway: OnboardingPathway;
  archetype: ProfileArchetype;
  goalType: FitnessGoalType;
  biologicalSex?: 'male' | 'female' | 'unspecified';
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  unitSystem: UnitSystem;
  trainingDaysPerWeek: number;
}

export interface NutritionGoals {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  dailySteps: number;
  weeklyWorkoutSessions: number;
  weeklyActivityMinutes: number;
}

export interface ProgressRecord {
  id: string;
  dateIso: string;
  label: string;
  weightKg: number;
  bodyFatPct?: number;
  leanMassKg?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  caloriesConsumed: number;
  proteinConsumedG: number;
  carbsConsumedG: number;
  fatConsumedG: number;
  workoutCompleted: boolean;
  activityMinutes: number;
  stepsCount: number;
  source: 'sample' | 'logged';
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  category: 'nutrition' | 'workout' | 'biometrics' | 'goal';
  title: string;
  detail: string;
  source: 'sample' | 'logged';
}

export interface CoachStructuredInsight {
  title: string;
  summary: string;
  metrics: {
    label: string;
    current: string;
    target: string;
    status: 'optimal' | 'attention' | 'deficit' | 'warning';
  }[];
  suggestedAction?: {
    label: string;
    targetTab: NavigationTab;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  content: string;
  structuredInsight?: CoachStructuredInsight;
  isMockResponse: boolean;
}
