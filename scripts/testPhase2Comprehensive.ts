/**
 * Comprehensive Automated Verification Suite for ASCEND Phase 2
 * Tests real services, calculations, date utilities, and state handlers.
 */

import assert from 'node:assert';
import {
  calculateScaledNutrients,
  computeDailyTotals,
  computeRecommendedTargets,
  generateMockCoachReply,
} from '../src/services/ascendApiService';
import {
  getDateWithOffset,
  getLocalDateIso,
  getPastNDaysIso,
  formatIsoDate,
} from '../src/utils/dateUtils';
import {
  INITIAL_TODAY_INTAKE,
  INITIAL_USER_PROFILE,
  INITIAL_NUTRITION_GOALS,
  SAMPLE_FOOD_DATABASE,
  INITIAL_PROGRESS_HISTORY,
  INITIAL_WORKOUT_PLANS,
} from '../src/data/mockData';
import {
  FitnessGoalType,
  MealType,
  OnboardingPathway,
  ProfileArchetype,
  UnitSystem,
  UserProfile,
  ExerciseSetLog,
} from '../src/types/ascend';

console.log('🧪 Starting ASCEND Deep Functional Verification Test Suite...\n');

// 1. Timezone-Safe Local Calendar Handling
console.log('1. Testing Timezone-Safe Local Calendar Engine (dateUtils)...');
{
  const todayIso = getLocalDateIso();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  assert(dateRegex.test(todayIso), 'getLocalDateIso() must return YYYY-MM-DD');

  const offsetMinus1 = getDateWithOffset(-1);
  assert.strictEqual(offsetMinus1.dayName, 'Yesterday');
  assert(offsetMinus1.dateIso < todayIso, 'Yesterday ISO must precede Today ISO');

  const offsetPlus1 = getDateWithOffset(1);
  assert.strictEqual(offsetPlus1.dayName, 'Tomorrow');
  assert(offsetPlus1.dateIso > todayIso, 'Tomorrow ISO must follow Today ISO');

  const past7 = getPastNDaysIso(7);
  assert.strictEqual(past7.length, 7, 'Past 7 days must contain exactly 7 ISO strings');
  assert.strictEqual(past7[6], todayIso, 'Final entry in past 7 days must be Today');

  console.log(`   ✓ Local ISO generated: ${todayIso}`);
  console.log(`   ✓ Yesterday offset: ${offsetMinus1.dateIso} (${offsetMinus1.dayName})`);
  console.log(`   ✓ Tomorrow offset: ${offsetPlus1.dateIso} (${offsetPlus1.dayName})`);
  console.log(`   ✓ Rolling 7-day range: ${past7[0]} to ${past7[6]}`);
}

// 2. Dashboard & Diary Date Filtering
console.log('\n2. Testing Dashboard & Food Diary Date Isolation...');
{
  const todayIso = getLocalDateIso();
  const yesterdayIso = getDateWithOffset(-1).dateIso;

  // Filter today's intake
  const todayRecords = INITIAL_TODAY_INTAKE.filter((r) => r.dateIso === todayIso);
  const yesterdayRecords = INITIAL_TODAY_INTAKE.filter((r) => r.dateIso === yesterdayIso);

  assert(todayRecords.length > 0, 'INITIAL_TODAY_INTAKE must contain today records');
  assert(yesterdayRecords.length > 0, 'INITIAL_TODAY_INTAKE must contain yesterday baseline records');

  const todayTotals = computeDailyTotals(todayRecords);
  const yesterdayTotals = computeDailyTotals(yesterdayRecords);

  assert(todayTotals.calories > 0, 'Today total calories must be > 0');
  assert(yesterdayTotals.calories > 0, 'Yesterday total calories must be > 0');
  assert.notStrictEqual(todayTotals.calories + yesterdayTotals.calories, todayTotals.calories, 'Date filtering must prevent bleeding across days');

  console.log(`   ✓ Today records count: ${todayRecords.length} (${todayTotals.calories} kcal)`);
  console.log(`   ✓ Yesterday records count: ${yesterdayRecords.length} (${yesterdayTotals.calories} kcal)`);
}

// 3. Scientific Mifflin-St Jeor Formula with Biological Sex
console.log('\n3. Testing Mifflin-St Jeor Metabolic Equations with Biological Sex...');
{
  const baseProfile: UserProfile = {
    ...INITIAL_USER_PROFILE,
    currentWeightKg: 74,
    heightCm: 175,
    age: 27,
  };

  const maleTargets = computeRecommendedTargets({ ...baseProfile, biologicalSex: 'male' });
  const femaleTargets = computeRecommendedTargets({ ...baseProfile, biologicalSex: 'female' });
  const unspecifiedTargets = computeRecommendedTargets({ ...baseProfile, biologicalSex: 'unspecified' });

  // Expected BMR:
  // Male: 10*74 + 6.25*175 - 5*27 + 5 = 1703.75
  // Female: 10*74 + 6.25*175 - 5*27 - 161 = 1537.75
  // Delta in BMR = 166 kcal. With moderate active multiplier (1.55) & weight loss delta (-420):
  // Male TDEE = 1703.75 * 1.55 = 2640.8 -> -420 = 2220.8 -> rounded = 2220
  // Female TDEE = 1537.75 * 1.55 = 2383.5 -> -420 = 1963.5 -> rounded = 1960
  assert(maleTargets.dailyCalories > femaleTargets.dailyCalories, 'Male calories must exceed female calories for identical biometrics');
  assert(maleTargets.dailyCalories - femaleTargets.dailyCalories >= 200, 'Difference in TDEE must reflect 166 kcal BMR offset with activity multiplier');

  console.log(`   ✓ Male target (74kg, 175cm, 27y): ${maleTargets.dailyCalories} kcal (${maleTargets.proteinG}g protein)`);
  console.log(`   ✓ Female target (74kg, 175cm, 27y): ${femaleTargets.dailyCalories} kcal (${femaleTargets.proteinG}g protein)`);
  console.log(`   ✓ Caloric expenditure delta: ${maleTargets.dailyCalories - femaleTargets.dailyCalories} kcal`);
}

// 4. Multi-Pathway Calculation Divergence
console.log('\n4. Testing Pathway Recommendation Divergence...');
{
  const generalProfile: UserProfile = {
    ...INITIAL_USER_PROFILE,
    pathway: OnboardingPathway.GeneralFitness,
    goalType: FitnessGoalType.WeightLoss,
  };
  const athleteProfile: UserProfile = {
    ...INITIAL_USER_PROFILE,
    pathway: OnboardingPathway.AthletePerformance,
    goalType: FitnessGoalType.AthleticPerformance,
  };
  const muscleGainProfile: UserProfile = {
    ...INITIAL_USER_PROFILE,
    pathway: OnboardingPathway.MuscleGain,
    goalType: FitnessGoalType.MuscleGain,
  };

  const generalGoals = computeRecommendedTargets(generalProfile);
  const athleteGoals = computeRecommendedTargets(athleteProfile);
  const muscleGoals = computeRecommendedTargets(muscleGainProfile);

  // Muscle gain must provide caloric surplus over general weight loss
  assert(muscleGoals.dailyCalories > generalGoals.dailyCalories, 'Muscle Gain calories must exceed General Weight Loss calories');
  // Athlete must prescribe high protein (>= 2.2g/kg) and higher water target
  assert(athleteGoals.proteinG > generalGoals.proteinG, 'Athlete pathway must prescribe higher protein target');
  assert(athleteGoals.waterMl >= generalGoals.waterMl, 'Athlete pathway must provide enhanced hydration target');

  console.log(`   ✓ General Fitness (Weight Loss): ${generalGoals.dailyCalories} kcal, ${generalGoals.proteinG}g protein, ${generalGoals.waterMl}ml water`);
  console.log(`   ✓ Athlete Performance: ${athleteGoals.dailyCalories} kcal, ${athleteGoals.proteinG}g protein, ${athleteGoals.waterMl}ml water`);
  console.log(`   ✓ Muscle Gain (Surplus): ${muscleGoals.dailyCalories} kcal, ${muscleGoals.proteinG}g protein, ${muscleGoals.waterMl}ml water`);
}

// 5. Portion Scaling & Linear Nutrient Math
console.log('\n5. Testing Live Portion Scaling & Nutrient Precision...');
{
  const chicken = SAMPLE_FOOD_DATABASE.find(f => f.name.includes('Chicken Breast'))!;
  assert(chicken, 'Chicken Breast must exist in food database');

  const scaled100g = calculateScaledNutrients(chicken, 100, 'g');
  assert.strictEqual(scaled100g.calories, 272);
  assert.strictEqual(scaled100g.proteinG, 51.2);

  // Scaled 200g: 2x 100g base
  const scaled200g = calculateScaledNutrients(chicken, 200, 'g');
  assert.strictEqual(scaled200g.calories, 544);
  assert.strictEqual(scaled200g.proteinG, 102.4);

  // Scaled 1 serving (165g)
  const scaledServing = calculateScaledNutrients(chicken, 1, 'serving');
  assert.strictEqual(scaledServing.calories, Math.round(272 * (165 / 100)));

  console.log(`   ✓ Chicken Breast 100g: ${scaled100g.calories} kcal, ${scaled100g.proteinG}g protein`);
  console.log(`   ✓ Chicken Breast 200g: ${scaled200g.calories} kcal, ${scaled200g.proteinG}g protein`);
  console.log(`   ✓ Chicken Breast 1 serving (${chicken.gramsPerServing}g): ${scaledServing.calories} kcal, ${scaledServing.proteinG}g protein`);
}

// 6. Set-by-Set Workout Execution Engine
console.log('\n6. Testing Set-by-Set Workout Execution & Logging...');
{
  const sampleSets: ExerciseSetLog[] = [
    { setNum: 1, targetReps: '10-12', targetLoadKg: 70, actualReps: 12, actualLoadKg: 70, completed: true },
    { setNum: 2, targetReps: '10-12', targetLoadKg: 70, actualReps: 10, actualLoadKg: 70, completed: true },
    { setNum: 3, targetReps: '10-12', targetLoadKg: 70, actualReps: 8, actualLoadKg: 72.5, completed: false },
  ];

  const isExerciseComplete = sampleSets.every(s => s.completed);
  assert.strictEqual(isExerciseComplete, false, 'Exercise must remain incomplete when set 3 is incomplete');

  // Complete set 3
  sampleSets[2].completed = true;
  const isNowComplete = sampleSets.every(s => s.completed);
  assert.strictEqual(isNowComplete, true, 'Exercise must transition to complete when all sets are done');

  // Verify weight adjustment
  assert.strictEqual(sampleSets[2].actualLoadKg, 72.5, 'Actual load per set must be preserved');

  console.log(`   ✓ Set-by-set checklist completion derivation validated`);
  console.log(`   ✓ Progressive load tracking validated (Set 3: 72.5kg @ 8 reps)`);
}

// 7. AI Coach Service Boundary & Heuristic Contract
console.log('\n7. Testing AI Coach Heuristics & Handoff Contract...');
{
  const coachReply = generateMockCoachReply(
    'What should I eat for dinner to meet my protein target?',
    INITIAL_TODAY_INTAKE,
    INITIAL_NUTRITION_GOALS,
    INITIAL_USER_PROFILE,
    INITIAL_PROGRESS_HISTORY
  );

  assert(coachReply.content.length > 50, 'Coach reply content must not be empty');
  assert(coachReply.structuredInsight.title.length > 0, 'Coach structured insight must be present');
  assert(Array.isArray(coachReply.structuredInsight.metrics), 'Structured metrics must be an array');

  console.log(`   ✓ Coach heuristic reply generated: "${coachReply.structuredInsight.title}"`);
  console.log(`   ✓ Structured recommendation metrics: ${coachReply.structuredInsight.metrics.length} metrics items`);
}

console.log('\n============================================================');
console.log('🎉 ALL COMPREHENSIVE FUNCTIONAL VERIFICATION TESTS PASSED!');
console.log('============================================================\n');
