/**
 * ASCEND User Profile, Pathway & Goals API Client
 */

import { apiClient } from './client';
import { NutritionGoalResponse, UserProfileResponse } from './authApi';

export interface UpdateUserProfilePayload {
  fullName?: string;
  pathway?: string;
  archetype?: string;
  goalType?: string;
  biologicalSex?: string;
  unitSystem?: string;
  currentWeightKg?: number;
  targetWeightKg?: number;
  heightCm?: number;
  age?: number;
  activityLevel?: string;
  trainingDaysPerWeek?: number;
  recalculateGoals?: boolean;
}

export interface SwitchPathwayPayload {
  pathway: string;
  currentPassword: string;
  archetype?: string;
  goalType?: string;
  recalculateGoals?: boolean;
  customCalorieAdjustment?: number | null;
  customProteinPerKg?: number | null;
}

export interface UpdateNutritionGoalsPayload {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  dailySteps?: number;
  weeklyWorkoutSessions?: number;
  weeklyActivityMinutes?: number;
}

export interface UserProfileAndGoalsResponse {
  userProfile: UserProfileResponse;
  nutritionGoals: NutritionGoalResponse;
}

export const usersApi = {
  async updateProfile(payload: UpdateUserProfilePayload): Promise<UserProfileAndGoalsResponse> {
    return apiClient<UserProfileAndGoalsResponse>('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async switchPathway(payload: SwitchPathwayPayload): Promise<UserProfileAndGoalsResponse> {
    return apiClient<UserProfileAndGoalsResponse>('/users/me/pathway', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateGoals(payload: UpdateNutritionGoalsPayload): Promise<NutritionGoalResponse> {
    return apiClient<NutritionGoalResponse>('/users/me/goals', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
