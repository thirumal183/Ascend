/**
 * ASCEND Authentication & Session API Service
 */

import { apiClient, clearStoredTokens, setStoredTokens } from './client';

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  jwtVersion: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserRegisterRequest {
  email: string;
  password: string;
  fullName: string;
  pathway?: string;
  archetype?: string;
  goalType?: string;
  biologicalSex?: string;
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  age: number;
  activityLevel?: string;
  unitSystem?: string;
  trainingDaysPerWeek?: number;
}

export interface RegisterResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserProfileResponse {
  id: string;
  userId: string;
  pathway: string;
  archetype: string;
  goalType: string;
  biologicalSex: string;
  unitSystem: string;
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  age: number;
  activityLevel: string;
  trainingDaysPerWeek: number;
  targetCalorieAdjustment: number;
  proteinGPerKg: number;
  waterMlPerKg: number;
  updatedAt: string;
}

export interface NutritionGoalResponse {
  id: string;
  userId: string;
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  dailySteps: number;
  weeklyWorkoutSessions: number;
  weeklyActivityMinutes: number;
  updatedAt: string;
}

export interface AuthMeResponse {
  account: UserResponse;
  userProfile?: UserProfileResponse;
  nutritionGoals?: NutritionGoalResponse;
}

export interface SessionItem {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface SessionListResponse {
  sessions: SessionItem[];
}

export const authApi = {
  async register(payload: UserRegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
    setStoredTokens(response.tokens.accessToken, response.tokens.refreshToken);
    return response;
  },

  async login(payload: LoginRequest): Promise<TokenResponse> {
    const response = await apiClient<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
    setStoredTokens(response.accessToken, response.refreshToken);
    return response;
  },

  async getMe(): Promise<AuthMeResponse> {
    return apiClient<AuthMeResponse>('/auth/me', {
      method: 'GET',
    });
  },

  async verifyPassword(password: string): Promise<{ verified: boolean }> {
    return apiClient<{ verified: boolean }>('/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async refresh(refreshToken?: string): Promise<TokenResponse> {
    const response = await apiClient<TokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      skipAuth: true,
    });
    setStoredTokens(response.accessToken, response.refreshToken);
    return response;
  },

  async logout(refreshToken?: string): Promise<{ message: string }> {
    try {
      const res = await apiClient<{ message: string }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshToken || null }),
      });
      return res;
    } finally {
      clearStoredTokens();
    }
  },

  async listSessions(): Promise<SessionListResponse> {
    return apiClient<SessionListResponse>('/auth/sessions', {
      method: 'GET',
    });
  },

  async revokeSession(sessionId: string): Promise<void> {
    await apiClient<void>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },
};
