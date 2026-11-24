import {
  ActivityLevel,
  ChatMessage,
  CoachStructuredInsight,
  FitnessGoalType,
  FoodCategory,
  FoodItem,
  IntakeRecord,
  NavigationTab,
  NutrientValues,
  NutritionGoals,
  OnboardingPathway,
  ProfileArchetype,
  ProgressRecord,
  ServingUnit,
  UserAccount,
  UserProfile,
  WorkoutPlan,
} from '../types/ascend';

/**
 * ASCEND Service Layer & FastAPI Boundary
 *
 * Keeps nutrition calculations, authentication session management, and AI coach
 * heuristics cleanly separated from presentation components.
 */

export const FASTAPI_ENDPOINTS_SPEC = {
  baseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:8000/api/v1',
  endpoints: [
    { method: 'POST', path: '/auth/login', description: 'Authenticate user and issue JWT session token' },
    { method: 'POST', path: '/auth/register', description: 'Create user account and initialize profile' },
    { method: 'GET', path: '/foods/search', description: 'Query USDA & custom food catalog in PostgreSQL' },
    { method: 'POST', path: '/intake/records', description: 'Persist daily meal intake record for user' },
    { method: 'DELETE', path: '/intake/records/{record_id}', description: 'Delete logged food entry' },
    { method: 'PUT', path: '/users/me/goals', description: 'Update user profile & daily macro targets' },
    { method: 'GET', path: '/analytics/progress', description: 'Fetch time-series biometric & adherence logs' },
    { method: 'POST', path: '/ai/chat', description: 'Interactive multi-turn Gemini coaching conversation' },
    { method: 'POST', path: '/ai/recommendations', description: 'Generate context-aware Gemini nutrition insight & structured recommendations' },
  ],
};

const STORAGE_KEY = 'ascend_prototype_session_v3';
const REGISTRY_KEY = 'ascend_prototype_user_registry_v3';

export interface PersistedSessionState {
  account: UserAccount;
  userProfile: UserProfile;
  goals: NutritionGoals;
  intakeRecords: IntakeRecord[];
  waterIntakeMl: number;
  stepsToday: number;
  progressHistory: ProgressRecord[];
  usingDemoData: boolean;
  workoutPlans?: WorkoutPlan[];
  chatMessages?: ChatMessage[];
  activeTab?: NavigationTab;
}

export interface RegisteredPrototypeUser {
  name: string;
  email: string;
  pathwayConfigured: boolean;
  userProfile?: UserProfile;
  goals?: NutritionGoals;
}

/**
 * Prototype local session & user registry persistence helper.
 * Never stores plaintext passwords or sensitive tokens.
 */
export const prototypeSessionStorage = {
  load(): PersistedSessionState | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedSessionState;
    } catch {
      return null;
    }
  },
  save(state: PersistedSessionState): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  },
  findRegisteredUser(email: string): RegisteredPrototypeUser | null {
    try {
      const normalized = email.trim().toLowerCase();
      const raw = window.localStorage.getItem(REGISTRY_KEY);
      if (!raw) return null;
      const list = JSON.parse(raw) as RegisteredPrototypeUser[];
      return list.find((u) => u.email.toLowerCase() === normalized) || null;
    } catch {
      return null;
    }
  },
  saveRegisteredUser(user: RegisteredPrototypeUser): void {
    try {
      const normalized = user.email.trim().toLowerCase();
      const raw = window.localStorage.getItem(REGISTRY_KEY);
      const list: RegisteredPrototypeUser[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((u) => u.email.toLowerCase() !== normalized);
      filtered.push({ ...user, email: normalized });
      window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(filtered));
    } catch {
      // Ignore storage errors
    }
  },
};

/**
 * Converts user-selected quantity and unit into scaled nutrient values.
 */
export function calculateScaledNutrients(
  food: FoodItem,
  quantity: number,
  unit: ServingUnit
): NutrientValues {
  const safeQty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);

  let totalGrams = safeQty;
  if (unit === 'g' || unit === 'ml') {
    totalGrams = safeQty;
  } else if (unit === 'oz') {
    totalGrams = safeQty * 28.3495;
  } else if (unit === 'serving') {
    totalGrams = safeQty * food.gramsPerServing;
  } else if (unit === 'cup') {
    totalGrams = safeQty * 225;
  }

  const baseGrams =
    food.referenceUnit === 'serving'
      ? food.gramsPerServing * food.referenceQuantity
      : food.referenceQuantity;

  const ratio = baseGrams > 0 ? totalGrams / baseGrams : 0;

  const round1 = (val: number) => Number((Math.round(val * 10) / 10).toFixed(1));
  const roundInt = (val: number) => Math.round(val);

  return {
    calories: roundInt(food.nutrients.calories * ratio),
    proteinG: round1(food.nutrients.proteinG * ratio),
    carbsG: round1(food.nutrients.carbsG * ratio),
    fatG: round1(food.nutrients.fatG * ratio),
    fiberG:
      food.nutrients.fiberG != null
        ? round1(food.nutrients.fiberG * ratio)
        : null,
    sugarG:
      food.nutrients.sugarG != null
        ? round1(food.nutrients.sugarG * ratio)
        : null,
    sodiumMg:
      food.nutrients.sodiumMg != null
        ? roundInt(food.nutrients.sodiumMg * ratio)
        : null,
    potassiumMg:
      food.nutrients.potassiumMg != null
        ? roundInt(food.nutrients.potassiumMg * ratio)
        : null,
    calciumMg:
      food.nutrients.calciumMg != null
        ? roundInt(food.nutrients.calciumMg * ratio)
        : null,
    ironMg:
      food.nutrients.ironMg != null
        ? round1(food.nutrients.ironMg * ratio)
        : null,
  };
}

/**
 * Aggregates all intake records for the day into total calories, macros, and electrolytes.
 */
export function computeDailyTotals(
  records: IntakeRecord[]
): NutrientValues & { incompleteCount: number } {
  let calories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberG = 0;
  let sugarG = 0;
  let sodiumMg = 0;
  let potassiumMg = 0;
  let calciumMg = 0;
  let ironMg = 0;
  let incompleteCount = 0;

  for (const rec of records) {
    const n = rec.computedNutrients;
    calories += n.calories;
    proteinG += n.proteinG;
    carbsG += n.carbsG;
    fatG += n.fatG;
    if (n.fiberG != null) fiberG += n.fiberG;
    if (n.sugarG != null) sugarG += n.sugarG;
    if (n.sodiumMg != null) sodiumMg += n.sodiumMg;
    if (n.potassiumMg != null) potassiumMg += n.potassiumMg;
    if (n.calciumMg != null) calciumMg += n.calciumMg;
    if (n.ironMg != null) ironMg += n.ironMg;

    if (n.fiberG == null || n.potassiumMg == null) {
      incompleteCount += 1;
    }
  }

  const round1 = (val: number) => Number((Math.round(val * 10) / 10).toFixed(1));

  return {
    calories: Math.round(calories),
    proteinG: round1(proteinG),
    carbsG: round1(carbsG),
    fatG: round1(fatG),
    fiberG: round1(fiberG),
    sugarG: round1(sugarG),
    sodiumMg: Math.round(sodiumMg),
    potassiumMg: Math.round(potassiumMg),
    calciumMg: Math.round(calciumMg),
    ironMg: round1(ironMg),
    incompleteCount,
  };
}

/**
 * Filters sample food items by search query and category with alternate names and regional aliases support.
 */
export function filterFoodCatalog(
  catalog: FoodItem[],
  searchQuery: string,
  category: FoodCategory
): FoodItem[] {
  const q = searchQuery.trim().toLowerCase();
  return catalog.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category;
    const matchesSearch =
      q.length === 0 ||
      item.name.toLowerCase().includes(q) ||
      item.brandOrSource.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.alternateNames &&
        item.alternateNames.some((alt) => alt.toLowerCase().includes(q))) ||
      (item.cuisineRegion && item.cuisineRegion.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });
}

/**
 * Calculates non-medical educational reference targets based on user profile settings and pathway.
 */
export function computeRecommendedTargets(profile: UserProfile): NutritionGoals {
  // Scientific Mifflin-St Jeor BMR Equation with biological sex attribution
  // Male: 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  // Female: 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const sexOffset = profile.biologicalSex === 'female' ? -161 : 5;
  const bmr =
    10 * profile.currentWeightKg +
    6.25 * profile.heightCm -
    5 * profile.age +
    sexOffset;

  const activityMultipliers: Record<ActivityLevel, number> = {
    [ActivityLevel.Sedentary]: 1.2,
    [ActivityLevel.LightlyActive]: 1.375,
    [ActivityLevel.ModeratelyActive]: 1.55,
    [ActivityLevel.VeryActive]: 1.725,
    [ActivityLevel.CompetitiveAthlete]: 1.9,
  };

  const tdee = bmr * (activityMultipliers[profile.activityLevel] || 1.55);

  let targetCalories = tdee;
  if (profile.goalType === FitnessGoalType.WeightLoss) {
    targetCalories = tdee - 420;
  } else if (profile.goalType === FitnessGoalType.MuscleGain) {
    targetCalories = tdee + 350;
  } else if (profile.goalType === FitnessGoalType.AthleticPerformance) {
    targetCalories = tdee + 200;
  }

  const roundedCalories = Math.max(1400, Math.round(targetCalories / 10) * 10);

  let proteinPerKg = 1.8;
  if (profile.pathway === OnboardingPathway.AthletePerformance) {
    proteinPerKg = 2.2;
  } else if (profile.pathway === OnboardingPathway.MuscleGain) {
    proteinPerKg = 2.1;
  } else if (profile.goalType === FitnessGoalType.WeightLoss) {
    proteinPerKg = 2.0;
  }

  const proteinG = Math.round(profile.currentWeightKg * proteinPerKg);
  const fatShare =
    profile.pathway === OnboardingPathway.AthletePerformance ? 0.25 : 0.28;
  const fatG = Math.round((roundedCalories * fatShare) / 9);
  const remainingCalories = Math.max(
    400,
    roundedCalories - proteinG * 4 - fatG * 9
  );
  const carbsG = Math.round(remainingCalories / 4);

  const waterMl =
    Math.round(
      (profile.currentWeightKg * 36 +
        (profile.pathway === OnboardingPathway.AthletePerformance ||
        profile.archetype === ProfileArchetype.Athlete
          ? 450
          : 0)) /
        50
    ) * 50;

  return {
    dailyCalories: roundedCalories,
    proteinG,
    carbsG,
    fatG,
    waterMl,
    dailySteps:
      profile.goalType === FitnessGoalType.WeightLoss ? 10500 : 9000,
    weeklyWorkoutSessions: profile.trainingDaysPerWeek,
    weeklyActivityMinutes: profile.trainingDaysPerWeek * 50,
  };
}

/**
 * Generates friendly, product-grade demonstration responses grounded in the user's current intake and progress.
 */
export function generateMockCoachReply(
  promptText: string,
  records: IntakeRecord[],
  goals: NutritionGoals,
  profile: UserProfile,
  progressHistory: ProgressRecord[]
): { content: string; structuredInsight: CoachStructuredInsight } {
  const totals = computeDailyTotals(records);
  const calRemaining = goals.dailyCalories - totals.calories;
  const proRemaining = Math.round((goals.proteinG - totals.proteinG) * 10) / 10;
  const carbRemaining = Math.round((goals.carbsG - totals.carbsG) * 10) / 10;

  const lower = promptText.toLowerCase();

  if (
    lower.includes('dinner') ||
    lower.includes('eat') ||
    lower.includes('meal') ||
    lower.includes('suggest') ||
    lower.includes('surplus')
  ) {
    return {
      content: `For your ${profile.pathway} plan, you have ${Math.max(0, calRemaining).toLocaleString()} kcal and ${Math.max(0, proRemaining)}g of protein remaining today. A balanced evening meal of 160g Wild Atlantic Salmon (or Grilled Chicken Breast) with 200g Baked Sweet Potato or Steamed Jasmine Rice provides ~510 kcal, 39g protein, and steady complex carbohydrates.`,
      structuredInsight: {
        title: 'Suggested Dinner Balance',
        summary:
          '160g Salmon Fillet + 200g Baked Sweet Potato (~510 kcal · 39g Protein · 41g Carbs)',
        metrics: [
          {
            label: 'Calories Left',
            current: `${totals.calories.toLocaleString()} kcal logged`,
            target: `${calRemaining > 0 ? `${calRemaining.toLocaleString()} kcal left` : 'Goal reached'}`,
            status: calRemaining > 250 ? 'attention' : 'optimal',
          },
          {
            label: 'Protein Left',
            current: `${totals.proteinG}g logged`,
            target: `${proRemaining > 0 ? `${proRemaining}g to go` : 'Goal met'}`,
            status: proRemaining <= 35 ? 'optimal' : 'attention',
          },
          {
            label: 'Carbs Left',
            current: `${totals.carbsG}g logged`,
            target: `${carbRemaining > 0 ? `${carbRemaining}g to go` : 'Goal met'}`,
            status: carbRemaining > 60 ? 'attention' : 'optimal',
          },
        ],
        suggestedAction: {
          label: 'Open Food Log',
          targetTab: NavigationTab.Diet,
        },
      },
    };
  }

  if (lower.includes('protein')) {
    const pct = Math.round(
      (totals.proteinG / Math.max(1, goals.proteinG)) * 100
    );
    const perKg = (totals.proteinG / profile.currentWeightKg).toFixed(1);
    return {
      content:
        records.length === 0
          ? `You haven't logged any meals yet today. Your daily target for ${profile.pathway} is ${goals.proteinG}g of protein (about ${(goals.proteinG / profile.currentWeightKg).toFixed(1)}g per kg of body weight). Starting with Greek yogurt, eggs, or oats with whey isolate is an easy way to log 30–35g right away.`
          : `You’ve logged ${totals.proteinG}g of protein so far today (${pct}% of your ${goals.proteinG}g target, or ${perKg}g/kg). ${
              proRemaining > 0
                ? `Adding one more protein-rich meal of ~${proRemaining}g will bring you right to your daily goal.`
                : 'You have already met your daily protein target—great consistency!'
            }`,
      structuredInsight: {
        title: 'Protein Target Progress',
        summary:
          proRemaining > 0
            ? `${proRemaining}g protein remaining to reach your ${goals.proteinG}g daily target.`
            : `Daily target of ${goals.proteinG}g achieved (${totals.proteinG}g logged).`,
        metrics: [
          {
            label: 'Today’s Protein',
            current: `${totals.proteinG} g`,
            target: `${goals.proteinG} g`,
            status: pct >= 80 ? 'optimal' : 'attention',
          },
          {
            label: 'Per kg Body Weight',
            current: `${perKg} g/kg`,
            target: `${(goals.proteinG / profile.currentWeightKg).toFixed(1)} g/kg`,
            status: pct >= 80 ? 'optimal' : 'attention',
          },
          {
            label: 'Logged Items',
            current: `${records.length} items`,
            target: '3–4 meals',
            status: records.length >= 3 ? 'optimal' : 'attention',
          },
        ],
        suggestedAction: {
          label: 'Open Food Log',
          targetTab: NavigationTab.Diet,
        },
      },
    };
  }

  if (
    lower.includes('week') ||
    lower.includes('change') ||
    lower.includes('progress') ||
    lower.includes('trend')
  ) {
    const firstWeight =
      progressHistory[0]?.weightKg ?? profile.currentWeightKg;
    const latestWeight =
      progressHistory[progressHistory.length - 1]?.weightKg ??
      profile.currentWeightKg;
    const weightDelta = (latestWeight - firstWeight).toFixed(1);
    return {
      content: `Over your recorded checkpoints, your body weight has moved from ${firstWeight} kg to ${latestWeight} kg (${Number(weightDelta) > 0 ? '+' : ''}${weightDelta} kg). Steady daily protein intake and consistent meal logging are helping you progress smoothly toward your ${profile.targetWeightKg} kg goal.`,
      structuredInsight: {
        title: 'Weekly Consistency & Weight Trend',
        summary:
          'Your nutrition consistency and regular workout sessions are keeping you aligned with your target trajectory.',
        metrics: [
          {
            label: 'Current Weight',
            current: `${latestWeight} kg`,
            target: `Goal: ${profile.targetWeightKg} kg`,
            status: 'optimal',
          },
          {
            label: 'Net Change',
            current: `${Number(weightDelta) > 0 ? '+' : ''}${weightDelta} kg`,
            target: profile.goalType,
            status: 'optimal',
          },
          {
            label: 'Weekly Workouts',
            current: `${goals.weeklyWorkoutSessions} planned`,
            target: `${profile.pathway}`,
            status: 'optimal',
          },
        ],
        suggestedAction: {
          label: 'View Progress',
          targetTab: NavigationTab.Progress,
        },
      },
    };
  }

  const calPct = Math.round(
    (totals.calories / Math.max(1, goals.dailyCalories)) * 100
  );
  return {
    content:
      records.length === 0
        ? `Your food log for today is currently empty. Your daily target for ${profile.pathway} (${profile.goalType}) is ${goals.dailyCalories.toLocaleString()} kcal (${goals.proteinG}g protein, ${goals.carbsG}g carbs, ${goals.fatG}g fat). Log your first meal in Diet whenever you're ready!`
        : `Today you have logged ${records.length} items totaling ${totals.calories.toLocaleString()} kcal (${calPct}% of your ${goals.dailyCalories.toLocaleString()} kcal target). Your macro breakdown so far is ${totals.proteinG}g protein, ${totals.carbsG}g carbohydrates, and ${totals.fatG}g fat.`,
    structuredInsight: {
      title: 'Today’s Nutrition Summary',
      summary:
        calRemaining > 0
          ? `You have ${calRemaining.toLocaleString()} kcal and ${Math.max(0, proRemaining)}g protein remaining today.`
          : 'You have reached your calorie target for the day.',
      metrics: [
        {
          label: 'Calories',
          current: `${totals.calories.toLocaleString()} kcal`,
          target: `${goals.dailyCalories.toLocaleString()} kcal`,
          status: calPct >= 70 && calPct <= 105 ? 'optimal' : 'attention',
        },
        {
          label: 'Protein',
          current: `${totals.proteinG} g`,
          target: `${goals.proteinG} g`,
          status:
            totals.proteinG >= goals.proteinG * 0.75 ? 'optimal' : 'attention',
        },
        {
          label: 'Carbohydrates',
          current: `${totals.carbsG} g`,
          target: `${goals.carbsG} g`,
          status: 'optimal',
        },
      ],
      suggestedAction: {
        label: 'Open Food Log',
        targetTab: NavigationTab.Diet,
      },
    },
  };
}
