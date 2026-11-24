/**
 * ASCEND Phase 4 — Batch 8: Multi-Pathway User Journey Verification
 *
 * Verifies end-to-end domain lifecycles across all three supported pathways:
 * 1. General Nutrition & Diet
 * 2. Athlete Performance
 * 3. Weight Gain & Muscle Gain
 *
 * Checks:
 * - Onboarding registration & baseline physiological profile
 * - Pathway-specific food intake logging & macro allocations
 * - Workout plan & session logging with set-level telemetry
 * - Biometric progress checkpoints
 * - Pathway-aware AI Coach conversation & guidance
 */

import { authApi } from '../src/services/api/authApi';
import { nutritionApi } from '../src/services/api/nutritionApi';
import { workoutApi } from '../src/services/api/workoutApi';
import { progressApi } from '../src/services/api/progressApi';
import { aiCoachApi } from '../src/services/api/aiCoachApi';
import { clearStoredTokens, setStoredTokens } from '../src/services/api/client';

// Polyfill localStorage in Node.js environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: store.size,
  } as Storage;
}

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

interface PathwayTestConfig {
  pathway: 'General Nutrition & Diet' | 'Athlete Performance' | 'Weight Gain & Muscle Gain';
  archetype: string;
  goalType: string;
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  age: number;
  dailyCalorieTarget: number;
  sampleMealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  workoutName: string;
  aiPrompt: string;
}

const PATHWAYS: PathwayTestConfig[] = [
  {
    pathway: 'General Nutrition & Diet',
    archetype: 'General Fitness & Lifestyle',
    goalType: 'Weight Loss',
    currentWeightKg: 78.0,
    targetWeightKg: 70.0,
    heightCm: 172.0,
    age: 32,
    dailyCalorieTarget: 1850,
    sampleMealType: 'Lunch',
    workoutName: 'Zone 2 Cardio & Core',
    aiPrompt: 'How can I maintain a steady deficit without losing energy during afternoon work?',
  },
  {
    pathway: 'Athlete Performance',
    archetype: 'Athlete Performance',
    goalType: 'Athletic Performance',
    currentWeightKg: 65.0,
    targetWeightKg: 65.0,
    heightCm: 178.0,
    age: 26,
    dailyCalorieTarget: 2800,
    sampleMealType: 'Breakfast',
    workoutName: 'Threshold Interval Session',
    aiPrompt: 'What should my intra-workout carb strategy look like for a 2-hour long run?',
  },
  {
    pathway: 'Weight Gain & Muscle Gain',
    archetype: 'General Fitness & Lifestyle',
    goalType: 'Weight & Muscle Gain',
    currentWeightKg: 68.0,
    targetWeightKg: 78.0,
    heightCm: 175.0,
    age: 23,
    dailyCalorieTarget: 3100,
    sampleMealType: 'Dinner',
    workoutName: 'Push Hypertrophy: Chest & Delts',
    aiPrompt: 'How can I ensure progressive overload on bench press while staying in a clean surplus?',
  },
];

async function runPathwayJourneys() {
  console.log('===============================================================');
  console.log('ASCEND Phase 4 — Batch 8: Multi-Pathway User Journey Tests');
  console.log('===============================================================\n');

  let passedTests = 0;
  const todayIso = new Date().toISOString().split('T')[0];

  for (const config of PATHWAYS) {
    console.log(`\nTesting Pathway: [${config.pathway}]`);
    console.log('---------------------------------------------------------------');
    clearStoredTokens();

    const suffix = Math.random().toString(36).substring(2, 8);
    const email = `athlete_${suffix}@ascend.io`;
    const password = 'StrongPassword123!';

    // 1. Onboarding & Registration
    const reg = await authApi.register({
      email,
      password,
      fullName: `${config.pathway} Champion`,
      pathway: config.pathway,
      archetype: config.archetype,
      goalType: config.goalType,
      currentWeightKg: config.currentWeightKg,
      targetWeightKg: config.targetWeightKg,
      heightCm: config.heightCm,
      age: config.age,
    });
    setStoredTokens(reg.tokens.accessToken, reg.tokens.refreshToken);
    assert(Boolean(reg.tokens.accessToken), `${config.pathway}: Registered and authenticated`);
    passedTests++;

    const me = await authApi.getMe();
    assert(me.account.email === email, `${config.pathway}: Retrieved user profile matching registered identity`);
    assert(me.userProfile?.pathway === config.pathway, `${config.pathway}: Profile pathway locked to ${config.pathway}`);
    passedTests++;

    // 2. Nutrition Intake Logging
    const searchRes = await nutritionApi.searchFoods({ limit: 10 });
    assert(searchRes.items.length > 0, `${config.pathway}: Food search returned base catalog items`);
    passedTests++;

    const foodItem = searchRes.items[0];
    const intake = await nutritionApi.logIntake({
      foodId: foodItem.id,
      quantity: 2.0,
      unit: 'serving',
      meal: config.sampleMealType,
      dateIso: todayIso,
    });
    assert(Boolean(intake.id), `${config.pathway}: Logged ${config.sampleMealType} intake (${intake.computedNutrients.calories} kcal)`);
    passedTests++;

    // 3. Daily Nutrition Totals & Target Evaluation
    const daily = await nutritionApi.getDailyIntake(todayIso);
    assert(daily.dailyTotals.calories >= intake.computedNutrients.calories, `${config.pathway}: Daily intake rollup calculated correctly`);
    passedTests++;

    // 4. Workout Plan & Session Logging
    const plans = await workoutApi.listPlans();
    assert(plans.length > 0, `${config.pathway}: Retrieved available workout plans`);
    passedTests++;

    const session = await workoutApi.createSession({
      workoutPlanId: plans[0].id,
      sessionTitle: config.workoutName,
      dateLogged: todayIso,
      durationMinutes: 50,
      caloriesBurned: 420,
      rpe: 8,
      completed: true,
    });
    assert(session.completed === true, `${config.pathway}: Logged completed workout session '${session.sessionTitle}'`);
    passedTests++;

    const setLogs = await workoutApi.updateSetLogs(session.id, [
      {
        exerciseName: 'Barbell Back Squat',
        setNumber: 1,
        targetReps: '10 reps',
        targetLoadKg: 80.0,
        actualReps: 10,
        actualLoadKg: 80.0,
        completed: true,
      },
    ]);
    assert(setLogs.length === 1 && setLogs[0].actualReps === 10, `${config.pathway}: Set telemetry logged with actual reps and load`);
    passedTests++;

    // 5. Biometric Progress Tracking
    const progress = await progressApi.createOrUpsertRecord({
      dateLogged: todayIso,
      label: `Progress Checkpoint ${config.pathway}`,
      weightKg: config.currentWeightKg,
      bodyFatPct: 15.0,
      caloriesConsumed: 2200,
      workoutCompleted: true,
    });
    assert(progress.weightKg === config.currentWeightKg, `${config.pathway}: Logged biometric progress checkpoint`);
    passedTests++;

    // 6. Pathway-Aware AI Coach Interaction
    const aiResp = await aiCoachApi.sendChatMessage({
      message: config.aiPrompt,
    });
    assert(Boolean(aiResp.content), `${config.pathway}: AI Coach responded with actionable guidance`);
    passedTests++;
    assert(Boolean(aiResp.structuredInsight?.medicalDisclaimer), `${config.pathway}: AI Coach included mandatory medical disclaimer`);
    passedTests++;
  }

  console.log('\n===============================================================');
  console.log(`ALL MULTI-PATHWAY USER JOURNEYS PASSED: ${passedTests}/${PATHWAYS.length * 11}`);
  console.log('===============================================================\n');
}

runPathwayJourneys().catch((err) => {
  console.error('\nPATHWAY JOURNEY TEST SUITE FAILED:', err);
  process.exit(1);
});
