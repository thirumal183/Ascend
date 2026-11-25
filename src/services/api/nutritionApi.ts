/**
 * ASCEND Nutrition Domain API Service
 */

import { apiClient } from './client';

export interface CoreNutrients {
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

export interface NutrientDetail {
  code: string;
  name: string;
  unit: string;
  category: string;
  amount: number;
}

export interface BackendFoodItem {
  id: string;
  code?: string | null;
  name: string;
  alternateNames: string[];
  brandOrSource: string;
  category: string;
  cuisineRegion?: string | null;
  preparationState: string;
  referenceQuantity: number;
  referenceUnit: string;
  referenceLabel: string;
  gramsPerServing: number;
  ediblePortionPct: number;
  isMicronutrientComplete: boolean;
  isCustomUserFood: boolean;
  createdByUserId?: string | null;
  dataNote?: string | null;
  sourceProvider?: string;
  sourceExternalId?: string | null;
  licenseType?: string;
  verificationStatus?: string;
  sourceAttribution?: string | null;
  barcode?: string | null;
  nutrients: CoreNutrients;
  createdAt: string;
}

export interface BackendFoodDetail extends BackendFoodItem {
  allNutrients: NutrientDetail[];
}

export interface FoodSearchResponse {
  items: BackendFoodItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateCustomFoodPayload {
  name: string;
  category?: string;
  alternateNames?: string[];
  brandOrSource?: string;
  cuisineRegion?: string | null;
  preparationState?: string;
  referenceQuantity?: number;
  referenceUnit?: string;
  referenceLabel?: string;
  gramsPerServing?: number;
  ediblePortionPct?: number;
  nutrients: CoreNutrients;
  dataNote?: string | null;
}

export interface ComputedNutrients {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sodiumMg?: number | null;
}

export interface BackendIntakeRecord {
  id: string;
  foodId?: string | null;
  foodName: string;
  category: string;
  meal: string;
  quantity: number;
  unit: string;
  loggedAt: string;
  dateIso: string;
  computedNutrients: ComputedNutrients;
  isUserLogged: boolean;
  createdAt: string;
}

export interface CreateIntakePayload {
  foodId: string;
  meal: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
  quantity: number;
  unit: 'g' | 'oz' | 'serving' | 'ml' | 'cup';
  dateIso: string;
  timeLogged?: string;
}

export interface UpdateIntakePayload {
  meal?: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
  quantity?: number;
  unit?: 'g' | 'oz' | 'serving' | 'ml' | 'cup';
  dateIso?: string;
  timeLogged?: string;
}

export interface DailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sodiumMg?: number | null;
  waterMl: number;
  waterTargetMl?: number;
}

export interface WaterIntakeRecord {
  id: string;
  userId: string;
  amountMl: number;
  dateLogged: string;
  loggedAt: string;
  notes?: string | null;
  createdAt: string;
}

export interface DailyWaterResponse {
  dateIso: string;
  totalMl: number;
  targetMl: number;
  records: WaterIntakeRecord[];
}

export interface CreateWaterIntakePayload {
  amountMl: number;
  dateIso: string;
  notes?: string | null;
}

export interface UpdateWaterIntakePayload {
  amountMl: number;
  notes?: string | null;
}

export interface DailyIntakeResponse {
  dateIso: string;
  records: BackendIntakeRecord[];
  dailyTotals: DailyTotals;
}

export interface DailyAdherenceItem {
  dateIso: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  calorieDelta: number;
  compliant: boolean;
}

export interface IntakeReportResponse {
  days: number;
  report: DailyAdherenceItem[];
}

export const nutritionApi = {
  async searchFoods(params: {
    q?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<FoodSearchResponse> {
    const qp = new URLSearchParams();
    if (params.q) qp.append('q', params.q);
    if (params.category && params.category !== 'All') qp.append('category', params.category);
    if (params.limit) qp.append('limit', String(params.limit));
    if (params.offset) qp.append('offset', String(params.offset));

    const qs = qp.toString();
    return apiClient<FoodSearchResponse>(`/foods/search${qs ? `?${qs}` : ''}`);
  },

  async getFoodDetails(foodId: string): Promise<BackendFoodDetail> {
    return apiClient<BackendFoodDetail>(`/foods/${foodId}`);
  },

  async createCustomFood(payload: CreateCustomFoodPayload): Promise<BackendFoodItem> {
    return apiClient<BackendFoodItem>('/foods/custom', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomFood(foodId: string): Promise<void> {
    await apiClient<void>(`/foods/custom/${foodId}`, {
      method: 'DELETE',
    });
  },

  async getDailyIntake(dateIso: string): Promise<DailyIntakeResponse> {
    return apiClient<DailyIntakeResponse>(`/intake/daily?date_iso=${dateIso}`);
  },

  async logIntake(payload: CreateIntakePayload): Promise<BackendIntakeRecord> {
    return apiClient<BackendIntakeRecord>('/intake/records', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateIntake(recordId: string, payload: UpdateIntakePayload): Promise<BackendIntakeRecord> {
    return apiClient<BackendIntakeRecord>(`/intake/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteIntake(recordId: string): Promise<void> {
    await apiClient<void>(`/intake/records/${recordId}`, {
      method: 'DELETE',
    });
  },

  async getIntakeReports(days: number = 7): Promise<IntakeReportResponse> {
    return apiClient<IntakeReportResponse>(`/intake/reports?days=${days}`);
  },

  async getDailyWater(dateIso: string): Promise<DailyWaterResponse> {
    return apiClient<DailyWaterResponse>(`/intake/water?date_iso=${dateIso}`);
  },

  async logWater(payload: CreateWaterIntakePayload): Promise<WaterIntakeRecord> {
    return apiClient<WaterIntakeRecord>('/intake/water', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateWater(recordId: string, payload: UpdateWaterIntakePayload): Promise<WaterIntakeRecord> {
    return apiClient<WaterIntakeRecord>(`/intake/water/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteWater(recordId: string): Promise<void> {
    await apiClient<void>(`/intake/water/${recordId}`, {
      method: 'DELETE',
    });
  },
};
