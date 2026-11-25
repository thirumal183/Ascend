/**
 * ASCEND Food Catalogue, UI Cleanliness & Live/Demo Mode Verification
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SAMPLE_FOOD_DATABASE } from '../src/data/mockData';
import { calculateScaledNutrients, filterFoodCatalog } from '../src/services/ascendApiService';
import { authApi } from '../src/services/api/authApi';
import { nutritionApi } from '../src/services/api/nutritionApi';
import { mapBackendFoodItemToFrontend } from '../src/services/api/mappers';
import { clearStoredTokens } from '../src/services/api/client';

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

async function run() {
  console.log('===============================================================');
  console.log('ASCEND Food Catalogue & UI Correction Verification');
  console.log('===============================================================');

  // 1. UI source cleanliness checks
  const dietViewSrc = fs.readFileSync(
    path.resolve('src/components/diet/DietManagementView.tsx'),
    'utf-8'
  );
  const detailsModalSrc = fs.readFileSync(
    path.resolve('src/components/diet/FoodDetailsModal.tsx'),
    'utf-8'
  );
  const landingSrc = fs.readFileSync(
    path.resolve('src/components/landing/LandingPageView.tsx'),
    'utf-8'
  );

  for (const forbidden of ['Demo Baseline', 'USDA FDC', 'Open Food Facts (ODbL)', 'Recipe Estimate']) {
    assert(!dietViewSrc.includes(forbidden), `DietManagementView must not render "${forbidden}"`);
  }
  assert(
    !detailsModalSrc.includes('Data Provenance & Source Attribution') &&
      !detailsModalSrc.includes('ASCEND Culinary Demo Baseline'),
    'FoodDetailsModal must not render per-food provenance card or demo baseline text'
  );
  assert(landingSrc.includes('Food Data Sources &amp; Attribution'), 'LandingPageView must keep Food Data Sources & Attribution');
  assert(landingSrc.includes('Pending Authorization'), 'LandingPageView must mark ICMR-NIN as Pending Authorization');
  assert(landingSrc.includes('Pending Import'), 'LandingPageView must mark Open Food Facts as Pending Import');
  console.log('  ✓ UI cleanliness & homepage attribution rules verified');

  // 2. Demo mode filtering & portion scaling
  const demoMatches = filterFoodCatalog(SAMPLE_FOOD_DATABASE, 'roti', 'All');
  assert(demoMatches.length >= 1, 'Demo mode search should match demo foods');
  const scaled = calculateScaledNutrients(demoMatches[0], 2, demoMatches[0].referenceUnit === 'serving' ? 'serving' : 'g');
  assert(scaled.calories > 0, 'Portion scaling in demo mode should compute positive calories');
  console.log(`  ✓ Demo mode search & portion scaling verified (${SAMPLE_FOOD_DATABASE.length} demo items)`);

  // 3. Live mode food search, details, portion scaling & meal logging
  const email = `catalogue.verify.${Date.now()}@ascend.test`;
  await authApi.register({
    email,
    password: 'StrongPassword123!',
    fullName: 'Catalogue Verifier',
    pathway: 'General Nutrition & Diet',
    biologicalSex: 'male',
    age: 28,
    heightCm: 175,
    currentWeightKg: 72,
    targetWeightKg: 70,
    activityLevel: 'Moderately Active',
  });

  const chickenRes = await nutritionApi.searchFoods({ q: 'chicken', limit: 20 });
  assert(chickenRes.items.length > 0, 'Live search for "chicken" must return PostgreSQL records');
  const firstChicken = mapBackendFoodItemToFrontend(chickenRes.items[0]);
  const detail = await nutritionApi.getFoodDetails(firstChicken.id);
  assert(detail.id === firstChicken.id, 'Food detail endpoint must return matching food');
  assert(detail.nutrients.calories >= 0, 'Food detail must include nutrients');

  const oatsRes = await nutritionApi.searchFoods({ q: 'oats', limit: 20 });
  assert(oatsRes.items.length > 0, 'Live search for "oats" must return PostgreSQL records');

  const dalRes = await nutritionApi.searchFoods({ q: 'dal', limit: 20 });
  assert(dalRes.items.length > 0, 'Live search for "dal" (Indian recipe estimates) must return PostgreSQL records');

  const logged = await nutritionApi.logIntake({
    foodId: firstChicken.id,
    meal: 'Lunch',
    quantity: 150,
    unit: 'g',
    dateIso: new Date().toISOString().slice(0, 10),
  });
  assert(logged.computedNutrients.calories > 0, 'Logged meal must freeze positive computed calories');
  await nutritionApi.deleteIntake(logged.id);
  await authApi.logout();
  clearStoredTokens();

  console.log(
    `  ✓ Live mode PostgreSQL search ("chicken": ${chickenRes.items.length}, "oats": ${oatsRes.items.length}, "dal": ${dalRes.items.length}), details & meal logging verified`
  );
  console.log('ALL CATALOGUE & UI CORRECTION CHECKS PASSED');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
