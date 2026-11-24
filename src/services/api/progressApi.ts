/**
 * ASCEND Progress & Biometric Telemetry Domain API Service
 */

import { apiClient } from './client';

export interface BackendProgressRecord {
  id: string;
  userId: string;
  dateLogged: string;
  label: string;
  weightKg: number;
  bodyFatPct?: number | null;
  leanMassKg?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  caloriesConsumed: number;
  proteinConsumedG: number;
  carbsConsumedG: number;
  fatConsumedG: number;
  workoutCompleted: boolean;
  activityMinutes: number;
  stepsCount: number;
  createdAt: string;
}

export interface CreateProgressPayload {
  dateLogged: string;
  label?: string;
  weightKg: number;
  bodyFatPct?: number | null;
  leanMassKg?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  caloriesConsumed?: number;
  proteinConsumedG?: number;
  carbsConsumedG?: number;
  fatConsumedG?: number;
  workoutCompleted?: boolean;
  activityMinutes?: number;
  stepsCount?: number;
}

export interface UpdateProgressPayload {
  label?: string;
  weightKg?: number;
  bodyFatPct?: number | null;
  leanMassKg?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  caloriesConsumed?: number;
  proteinConsumedG?: number;
  carbsConsumedG?: number;
  fatConsumedG?: number;
  workoutCompleted?: boolean;
  activityMinutes?: number;
  stepsCount?: number;
}

export const progressApi = {
  async listRecords(days: number = 28): Promise<BackendProgressRecord[]> {
    return apiClient<BackendProgressRecord[]>(`/progress/records?days=${days}`);
  },

  async createOrUpsertRecord(payload: CreateProgressPayload): Promise<BackendProgressRecord> {
    return apiClient<BackendProgressRecord>('/progress/records', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRecord(recordId: string): Promise<BackendProgressRecord> {
    return apiClient<BackendProgressRecord>(`/progress/records/${recordId}`);
  },

  async updateRecord(recordId: string, payload: UpdateProgressPayload): Promise<BackendProgressRecord> {
    return apiClient<BackendProgressRecord>(`/progress/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteRecord(recordId: string): Promise<void> {
    await apiClient<void>(`/progress/records/${recordId}`, {
      method: 'DELETE',
    });
  },
};
