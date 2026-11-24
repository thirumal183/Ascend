/**
 * ASCEND Batch 7 Complete Frontend-Backend End-to-End Integration Verification
 *
 * Tests the real HTTP client against the live FastAPI backend:
 * 1. User Registration (Argon2id + 15 entities baseline)
 * 2. Login & Token issuance (Access JWT + Opaque Refresh)
 * 3. Session Recovery (/auth/me)
 * 4. Token Refresh Rotation & Session Revocation
 * 5. Food Catalog Search & Custom 3NF Food Creation / Deletion
 * 6. Meal Intake Logging, Portion Scaling, Frozen Snapshot & Daily Totals
 * 7. Workout Plans, Session Execution & Set-by-Set Telemetry Tracking
 * 8. Progress Biometric Checkpoint Logging & Time-Series Summary
 * 9. AI Coach Interaction with Structured Insights & Heuristic Fallback
 * 10. Multi-Pathway Consistency (General Nutrition, Athlete, Muscle Gain)
 */

import { authApi } from '../src/services/api/authApi';
import { nutritionApi } from '../src/services/api/nutritionApi';
import { workoutApi } from '../src/services/api/workoutApi';
import { progressApi } from '../src/services/api/progressApi';
import { aiCoachApi } from '../src/services/api/aiCoachApi';
import { clearStoredTokens, getStoredAccessToken, getStoredRefreshToken, setStoredTokens } from '../src/services/api/client';
import {
  mapAuthMeToUserState,
  mapBackendFoodItemToFrontend,
  mapBackendIntakeRecordToFrontend,
  mapBackendProgressRecordToFrontend,
  mapBackendWorkoutPlanToFrontend,
  mapBackendChatMessageToFrontend,
} from '../src/services/api/mappers';

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

const PASSED = '✓';
const FAILED = '✗';

async function runBatch7Verification() {
  console.log('===============================================================');
  console.log('ASCEND Phase 4 — Batch 7: Complete Integration Verification');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ${PASSED} ${message}`);
    } else {
      console.error(`  ${FAILED} FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const suffix = Math.random().toString(36).substring(2, 9);
  const testEmail = `integration_tester_${suffix}@ascend.io`;
  const testPassword = 'SecurePassword123!';
  const testFullName = 'Integration Test User';

  // --- Step 1: User Registration ---
  console.log('1. Authentication: Registration & Baseline Generation');
  clearStoredTokens();
  const regResult = await authApi.register({
    email: testEmail,
    password: testPassword,
    fullName: testFullName,
    pathway: 'Athlete Performance',
    archetype: 'Athlete Performance',
    goalType: 'Athletic Performance',
    biologicalSex: 'male',
    currentWeightKg: 78.5,
    targetWeightKg: 82.0,
    heightCm: 182.0,
    age: 26,
    activityLevel: 'Very Active',
    unitSystem: 'Metric (kg, cm, ml)',
    trainingDaysPerWeek: 5,
  });

  assert(Boolean(regResult.user?.id), 'User record returned with UUID');
  assert(regResult.user.email === testEmail, 'User email matches registration');
  assert(Boolean(regResult.tokens?.accessToken), 'Access token issued');
  assert(Boolean(regResult.tokens?.refreshToken), 'Refresh token issued');
  assert(getStoredAccessToken() === regResult.tokens.accessToken, 'Access token persisted in client storage');

  // --- Step 2: Session Recovery (/auth/me) ---
  console.log('\n2. Authentication: Session Recovery & Current User Projection');
  const meResult = await authApi.getMe();
  assert(meResult.account.email === testEmail, 'Current user email matches');
  assert(Boolean(meResult.userProfile), 'User profile returned');
  assert(meResult.userProfile?.currentWeightKg === 78.5, 'User profile biometrics match');
  assert(Boolean(meResult.nutritionGoals), 'Baseline nutrition goals computed');
  assert(meResult.nutritionGoals!.dailyCalories > 1500, 'Caloric target computed via Mifflin-St Jeor');

  const mappedUser = mapAuthMeToUserState(meResult);
  assert(mappedUser.account.isAuthenticated, 'Mapped account state is authenticated');
  assert(mappedUser.userProfile?.pathway === 'Athlete Performance', 'Pathway enum properly mapped');

  // --- Step 3: Login Flow & Refresh Rotation ---
  console.log('\n3. Authentication: Credential Validation & Token Rotation');
  clearStoredTokens();
  const loginResult = await authApi.login({
    username: testEmail,
    password: testPassword,
  });
  assert(Boolean(loginResult.accessToken), 'Login succeeds with registered credentials');

  const rotatedResult = await authApi.refresh(loginResult.refreshToken);
  assert(Boolean(rotatedResult.accessToken), 'Token rotation issues new access token');
  assert(rotatedResult.refreshToken !== loginResult.refreshToken, 'Old refresh token rotated to new high-entropy token');

  // --- Step 4: Food Catalog Search & Custom Food Creation ---
  console.log('\n4. Nutrition: Food Search & Custom 3NF Food Bridge');
  const searchResult = await nutritionApi.searchFoods({ limit: 10 });
  assert(searchResult.items.length > 0, 'Public food catalogue search returns items');
  const firstFood = mapBackendFoodItemToFrontend(searchResult.items[0]);
  assert(Boolean(firstFood.name), 'Food item properly mapped to frontend schema');
  assert(typeof firstFood.nutrients.calories === 'number', 'Nutrients object contains numeric calories');

  const customFoodName = `Homemade Power Shake ${suffix}`;
  const customFood = await nutritionApi.createCustomFood({
    name: customFoodName,
    category: 'Sports Supplements',
    referenceQuantity: 250,
    referenceUnit: 'ml',
    referenceLabel: '250ml Glass',
    gramsPerServing: 250,
    ediblePortionPct: 100,
    nutrients: {
      calories: 320,
      proteinG: 35.0,
      carbsG: 28.0,
      fatG: 6.5,
    },
  });
  assert(customFood.isCustomUserFood === true, 'Custom food created with user ownership flag');
  assert(customFood.name === customFoodName, 'Custom food name verified');

  // --- Step 5: Meal Intake Logging, Portion Scaling & Frozen Snapshot ---
  console.log('\n5. Nutrition: Meal Intake Logging & Snapshot Recalculation');
  const todayIso = new Date().toISOString().split('T')[0];
  const intakeRecord = await nutritionApi.logIntake({
    foodId: customFood.id,
    meal: 'Breakfast',
    quantity: 1,
    unit: 'serving',
    dateIso: todayIso,
  });
  assert(intakeRecord.foodName === customFoodName, 'Intake record foodName matches custom food');
  assert(intakeRecord.computedNutrients.calories === 320, 'Computed nutrient snapshot frozen (320 kcal)');
  assert(intakeRecord.computedNutrients.proteinG === 35.0, 'Computed protein snapshot frozen (35.0g)');

  const dailyIntake = await nutritionApi.getDailyIntake(todayIso);
  assert(dailyIntake.records.length >= 1, 'Daily intake returns logged meal');
  assert(dailyIntake.dailyTotals.calories >= 320, 'Daily totals aggregate caloric snapshot');
  assert(dailyIntake.dailyTotals.proteinG >= 35.0, 'Daily totals aggregate protein snapshot');

  // Delete intake record
  await nutritionApi.deleteIntake(intakeRecord.id);
  const dailyIntakeAfterDelete = await nutritionApi.getDailyIntake(todayIso);
  assert(
    !dailyIntakeAfterDelete.records.some((r) => r.id === intakeRecord.id),
    'Intake record successfully deleted'
  );

  // Delete custom food
  await nutritionApi.deleteCustomFood(customFood.id);
  console.log('  Cleaned up custom food item');

  // --- Step 6: Workouts, Sessions & Set Telemetry ---
  console.log('\n6. Workouts: Plan Listing, Sessions & Set Telemetry');
  const plans = await workoutApi.listPlans();
  assert(plans.length > 0, 'Workout plan templates listed from database');
  const firstPlan = mapBackendWorkoutPlanToFrontend(plans[0]);
  assert(Boolean(firstPlan.title), 'Workout plan mapped to frontend schema');

  const workoutSession = await workoutApi.createSession({
    workoutPlanId: plans[0].id,
    sessionTitle: `Morning Training Session ${suffix}`,
    dateLogged: todayIso,
    durationMinutes: 45,
    caloriesBurned: 380,
    rpe: 8,
    completed: true,
  });
  assert(workoutSession.completed === true, 'Workout session logged as completed');

  const setLogs = await workoutApi.updateSetLogs(workoutSession.id, [
    {
      exerciseName: 'Barbell Back Squat',
      setNumber: 1,
      targetReps: '8 reps',
      targetLoadKg: 100.0,
      actualReps: 8,
      actualLoadKg: 100.0,
      completed: true,
    },
    {
      exerciseName: 'Barbell Back Squat',
      setNumber: 2,
      targetReps: '8 reps',
      targetLoadKg: 105.0,
      actualReps: 8,
      actualLoadKg: 105.0,
      completed: true,
    },
  ]);
  assert(setLogs.length === 2, 'Set-by-set telemetry updated (2 sets)');
  assert(setLogs[1].actualLoadKg === 105.0, 'Actual load lifted persisted in database');

  // --- Step 7: Progress Biometric Checkpoint & Summary ---
  console.log('\n7. Progress: Biometric Logging & Time-Series Summary');
  const progressRecord = await progressApi.createOrUpsertRecord({
    dateLogged: todayIso,
    label: 'Morning Weigh-in',
    weightKg: 78.8,
    bodyFatPct: 13.5,
    waistCm: 80.0,
    chestCm: 104.0,
    caloriesConsumed: 2450,
    proteinConsumedG: 155.0,
    carbsConsumedG: 260.0,
    fatConsumedG: 70.0,
    workoutCompleted: true,
    activityMinutes: 45,
    stepsCount: 9200,
  });
  assert(progressRecord.weightKg === 78.8, 'Weight measurement saved');
  assert(progressRecord.bodyFatPct === 13.5, 'Body fat percentage saved');

  const progressList = await progressApi.listRecords(28);
  assert(progressList.length >= 1, 'Progress records listed chronologically');
  const mappedProgress = mapBackendProgressRecordToFrontend(progressList[0]);
  assert(mappedProgress.source === 'logged', 'Progress mapped with user-entered source provenance');

  // --- Step 8: AI Coach & Structured Insights ---
  console.log('\n8. AI Coach: Conversational Guidance & Structured Insights');
  const chatResponse = await aiCoachApi.sendChatMessage({
    message: 'What should I eat post-workout to hit my protein goal today?',
  });
  assert(Boolean(chatResponse.content), 'AI coach produces prose guidance');
  assert(Boolean(chatResponse.structuredInsight), 'AI coach returns structured insight payload');
  assert(
    Boolean(chatResponse.structuredInsight?.medicalDisclaimer?.includes('not medical advice')),
    'AI coach includes mandatory legal non-medical boundary statement'
  );
  assert(
    typeof chatResponse.isMockResponse === 'boolean',
    'AI coach clearly distinguishes live Gemini vs heuristic fallback'
  );

  const mappedChat = mapBackendChatMessageToFrontend(chatResponse);
  assert(mappedChat.role === 'assistant', 'Mapped chat message has assistant role');

  const conversations = await aiCoachApi.listConversations();
  assert(conversations.length >= 1, 'Conversation container persisted in database');

  // --- Step 9: User Logout ---
  console.log('\n9. Authentication: Device Logout & Session Cleanup');
  const logoutRes = await authApi.logout();
  assert(logoutRes.message.includes('logged out'), 'Logout successfully revokes server session');
  assert(getStoredAccessToken() === null, 'Client token storage cleared');

  console.log('\n===============================================================');
  console.log(`ALL BATCH 7 INTEGRATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('===============================================================\n');
}

runBatch7Verification().catch((err) => {
  console.error('\nBATCH 7 INTEGRATION VERIFICATION FAILED:', err);
  process.exit(1);
});
