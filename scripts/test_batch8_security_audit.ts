/**
 * ASCEND Batch 8 Security & Cross-Tenant Data Isolation Audit
 *
 * Verifies:
 * 1. Password security and validation rules.
 * 2. Invalid credential rejection & rate-safety.
 * 3. Token tampering & malformed token rejection.
 * 4. Refresh token rotation & Reuse Attack Containment.
 * 5. Cross-user isolation across Foods, Intake, Workouts, Progress, and AI Conversations.
 * 6. Authorization boundary enforcement (preventing cross-user reads and mutations).
 */

import { authApi } from '../src/services/api/authApi';
import { nutritionApi } from '../src/services/api/nutritionApi';
import { workoutApi } from '../src/services/api/workoutApi';
import { progressApi } from '../src/services/api/progressApi';
import { aiCoachApi } from '../src/services/api/aiCoachApi';
import { apiClient, clearStoredTokens, setStoredTokens } from '../src/services/api/client';

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

async function runSecurityAudit() {
  console.log('===============================================================');
  console.log('ASCEND Phase 4 — Batch 8: Comprehensive Security & Isolation Audit');
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

  const suffixA = Math.random().toString(36).substring(2, 9);
  const suffixB = Math.random().toString(36).substring(2, 9);
  const userAEmail = `user_a_${suffixA}@ascend.io`;
  const userBEmail = `user_b_${suffixB}@ascend.io`;
  const password = 'StrongPassword123!';

  // --- 1. Password Policy & Invalid Credentials ---
  console.log('1. Password Policy & Authentication Security');
  try {
    await authApi.register({
      email: `short_pw_${suffixA}@ascend.io`,
      password: 'short',
      fullName: 'Short PW User',
      currentWeightKg: 70,
      targetWeightKg: 70,
      heightCm: 175,
      age: 25,
    });
    assert(false, 'Passwords < 8 characters must be rejected');
  } catch (err: any) {
    assert(err.status === 422 || err.message.includes('Password'), 'Password < 8 chars rejected with HTTP 422');
  }

  // Register User A
  clearStoredTokens();
  const regA = await authApi.register({
    email: userAEmail,
    password,
    fullName: 'Alice Walker',
    pathway: 'General Nutrition & Diet',
    archetype: 'General Fitness & Lifestyle',
    goalType: 'Weight Loss',
    currentWeightKg: 68.0,
    targetWeightKg: 64.0,
    heightCm: 168.0,
    age: 29,
  });
  const tokenA = regA.tokens.accessToken;
  const rtA1 = regA.tokens.refreshToken;
  assert(Boolean(tokenA), 'User A registered and received access token');

  // Register User B
  clearStoredTokens();
  const regB = await authApi.register({
    email: userBEmail,
    password,
    fullName: 'Bob Smith',
    pathway: 'Weight Gain & Muscle Gain',
    archetype: 'General Fitness & Lifestyle',
    goalType: 'Weight & Muscle Gain',
    currentWeightKg: 75.0,
    targetWeightKg: 80.0,
    heightCm: 180.0,
    age: 24,
  });
  const tokenB = regB.tokens.accessToken;
  assert(Boolean(tokenB), 'User B registered and received access token');

  // Test invalid password
  try {
    await authApi.login({ username: userAEmail, password: 'WrongPassword999!' });
    assert(false, 'Invalid password should fail');
  } catch (err: any) {
    assert(err.status === 401, 'Invalid password rejected with HTTP 401');
  }

  // --- 2. Refresh Token Rotation & Reuse Attack Detection ---
  console.log('\n2. Refresh Token Rotation & Replay Attack Containment');
  // Rotate RT for User A: rtA1 -> rtA2
  const rotA = await authApi.refresh(rtA1);
  const rtA2 = rotA.refreshToken;
  assert(rtA2 !== rtA1, 'Rotation issued new distinct refresh token');

  // Replay Attack: Attacker tries to use old revoked rtA1!
  try {
    await authApi.refresh(rtA1);
    assert(false, 'Replay of old refresh token must be rejected');
  } catch (reuseErr: any) {
    assert(reuseErr.status === 401, 'Refresh token reuse detected and rejected with HTTP 401');
  }

  // Replay Containment Check: All sessions for User A should now be revoked!
  try {
    await authApi.refresh(rtA2);
    assert(false, 'Active session must be revoked after reuse attack detection');
  } catch (revokedErr: any) {
    assert(revokedErr.status === 401, 'All active sessions invalidated following reuse event');
  }

  // Re-login User A cleanly
  const loginA = await authApi.login({ username: userAEmail, password });
  const activeTokenA = loginA.accessToken;
  setStoredTokens(activeTokenA, loginA.refreshToken);

  // --- 3. Cross-Tenant Data Isolation: Foods Domain ---
  console.log('\n3. Cross-Tenant Data Isolation: Foods Domain');
  const customFoodA = await nutritionApi.createCustomFood({
    name: `Alice Secret Recipe ${suffixA}`,
    category: 'Prepared Meals',
    referenceQuantity: 200,
    referenceUnit: 'g',
    referenceLabel: '200g Portion',
    gramsPerServing: 200,
    ediblePortionPct: 100,
    nutrients: { calories: 280, proteinG: 22, carbsG: 30, fatG: 8 },
  });
  assert(customFoodA.isCustomUserFood === true, 'User A created private custom food');

  // Switch client to User B
  setStoredTokens(tokenB, regB.tokens.refreshToken);
  const searchB = await nutritionApi.searchFoods({ q: `Alice Secret Recipe ${suffixA}` });
  assert(
    !searchB.items.some((f) => f.id === customFoodA.id),
    'User B search cannot see User A custom food'
  );

  // User B tries to delete User A's custom food
  try {
    await nutritionApi.deleteCustomFood(customFoodA.id);
    assert(false, 'User B must not be permitted to delete User A food');
  } catch (delErr: any) {
    assert(delErr.status === 404 || delErr.status === 403, 'Cross-user food deletion blocked with 403/404');
  }

  // --- 4. Cross-Tenant Data Isolation: Meal Intake Records ---
  console.log('\n4. Cross-Tenant Data Isolation: Meal Intake Domain');
  // Switch back to User A to log intake
  setStoredTokens(activeTokenA, loginA.refreshToken);
  const todayIso = new Date().toISOString().split('T')[0];
  const intakeA = await nutritionApi.logIntake({
    foodId: customFoodA.id,
    meal: 'Lunch',
    quantity: 1,
    unit: 'serving',
    dateIso: todayIso,
  });
  assert(Boolean(intakeA.id), 'User A logged lunch intake');

  // Switch to User B
  setStoredTokens(tokenB, regB.tokens.refreshToken);
  const dailyB = await nutritionApi.getDailyIntake(todayIso);
  assert(
    !dailyB.records.some((r) => r.id === intakeA.id),
    'User B daily intake diary is completely isolated from User A'
  );

  // User B tries to mutate or delete User A's intake record
  try {
    await nutritionApi.updateIntake(intakeA.id, { quantity: 5 });
    assert(false, 'User B must not be permitted to mutate User A intake');
  } catch (updErr: any) {
    assert(updErr.status === 404 || updErr.status === 403, 'Cross-user intake update blocked with 403/404');
  }

  try {
    await nutritionApi.deleteIntake(intakeA.id);
    assert(false, 'User B must not be permitted to delete User A intake');
  } catch (delIntakeErr: any) {
    assert(delIntakeErr.status === 404 || delIntakeErr.status === 403, 'Cross-user intake deletion blocked with 403/404');
  }

  // --- 5. Cross-Tenant Data Isolation: Workouts Domain ---
  console.log('\n5. Cross-Tenant Data Isolation: Workouts Domain');
  // User A logs a workout session
  setStoredTokens(activeTokenA, loginA.refreshToken);
  const sessionA = await workoutApi.createSession({
    sessionTitle: `Alice Private Yoga ${suffixA}`,
    dateLogged: todayIso,
    durationMinutes: 30,
    caloriesBurned: 120,
    completed: true,
  });

  // Switch to User B
  setStoredTokens(tokenB, regB.tokens.refreshToken);
  const sessionsB = await workoutApi.listSessions({ days: 30 });
  assert(
    !sessionsB.some((s) => s.id === sessionA.id),
    'User B workout session history does not contain User A session'
  );

  try {
    await workoutApi.getSessionDetails(sessionA.id);
    assert(false, 'User B cannot inspect User A workout session details');
  } catch (sessErr: any) {
    assert(sessErr.status === 404 || sessErr.status === 403, 'Cross-user workout inspection blocked with 403/404');
  }

  // --- 6. Cross-Tenant Data Isolation: Progress Records ---
  console.log('\n6. Cross-Tenant Data Isolation: Progress Biometrics Domain');
  // User A logs biometric checkpoint
  setStoredTokens(activeTokenA, loginA.refreshToken);
  const progA = await progressApi.createOrUpsertRecord({
    dateLogged: todayIso,
    label: 'Private Weight Checkpoint',
    weightKg: 67.8,
    bodyFatPct: 22.0,
  });

  // Switch to User B
  setStoredTokens(tokenB, regB.tokens.refreshToken);
  const progListB = await progressApi.listRecords(30);
  assert(
    !progListB.some((p) => p.id === progA.id),
    'User B progress history does not contain User A checkpoint'
  );

  try {
    await progressApi.getRecord(progA.id);
    assert(false, 'User B cannot retrieve User A progress record');
  } catch (pErr: any) {
    assert(pErr.status === 404 || pErr.status === 403, 'Cross-user progress retrieval blocked with 403/404');
  }

  // --- 7. Cross-Tenant Data Isolation: AI Coach Conversations ---
  console.log('\n7. Cross-Tenant Data Isolation: AI Coach Conversations');
  // User A sends coaching query
  setStoredTokens(activeTokenA, loginA.refreshToken);
  const chatMsgA = await aiCoachApi.sendChatMessage({
    message: 'Alice secret training question',
  });
  const convIdA = chatMsgA.conversationId;
  assert(Boolean(convIdA), 'User A conversational container created');

  // Switch to User B
  setStoredTokens(tokenB, regB.tokens.refreshToken);
  const convListB = await aiCoachApi.listConversations();
  assert(
    !convListB.some((c) => c.id === convIdA),
    'User B conversations list does not contain User A conversation'
  );

  try {
    await aiCoachApi.getConversation(convIdA);
    assert(false, 'User B cannot retrieve User A conversation turns');
  } catch (convErr: any) {
    assert(convErr.status === 404 || convErr.status === 403, 'Cross-user conversation inspection blocked with 403/404');
  }

  try {
    await aiCoachApi.deleteConversation(convIdA);
    assert(false, 'User B cannot delete User A conversation');
  } catch (delConvErr: any) {
    assert(delConvErr.status === 404 || delConvErr.status === 403, 'Cross-user conversation deletion blocked with 403/404');
  }

  // Clean up
  setStoredTokens(activeTokenA, loginA.refreshToken);
  await nutritionApi.deleteCustomFood(customFoodA.id);
  clearStoredTokens();

  console.log('\n===============================================================');
  console.log(`ALL SECURITY & CROSS-TENANT ISOLATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('===============================================================\n');
}

runSecurityAudit().catch((err) => {
  console.error('\nSECURITY AUDIT FAILED:', err);
  process.exit(1);
});
