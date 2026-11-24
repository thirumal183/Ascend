/**
 * ASCEND Workout & Training Domain API Service
 */

import { apiClient } from './client';

export interface ExerciseItemResponse {
  id: string;
  workoutPlanId: string;
  name: string;
  muscleGroup: string;
  defaultSets: number;
  defaultReps: string;
  defaultLoadKg: number;
  restSeconds: number;
  notes?: string | null;
  sortOrder: number;
}

export interface WorkoutPlanResponse {
  id: string;
  title: string;
  dayLabel: string;
  focusArea: string;
  estimatedMinutes: number;
  intensityLabel: string;
  targetCaloriesBurned: number;
  recommendedPathway?: string | null;
  isSystemTemplate: boolean;
  createdAt: string;
}

export interface WorkoutPlanDetailResponse extends WorkoutPlanResponse {
  exercises: ExerciseItemResponse[];
}

export interface CreateExerciseItemPayload {
  name: string;
  muscleGroup: string;
  defaultSets?: number;
  defaultReps?: string;
  defaultLoadKg?: number;
  restSeconds?: number;
  notes?: string | null;
  sortOrder?: number;
}

export interface CreateWorkoutPlanPayload {
  title: string;
  dayLabel?: string;
  focusArea: string;
  estimatedMinutes?: number;
  intensityLabel?: 'Low' | 'Moderate' | 'High' | 'Peak Performance';
  targetCaloriesBurned?: number;
  recommendedPathway?: string | null;
  isSystemTemplate?: boolean;
  exercises?: CreateExerciseItemPayload[];
}

export interface ExerciseSetLogPayload {
  exerciseItemId?: string | null;
  exerciseName: string;
  setNumber: number;
  targetReps?: string;
  targetLoadKg?: number;
  actualReps?: number | null;
  actualLoadKg?: number | null;
  completed: boolean;
}

export interface ExerciseSetLogResponse {
  id: string;
  workoutSessionId: string;
  exerciseItemId?: string | null;
  exerciseName: string;
  setNumber: number;
  targetReps: string;
  targetLoadKg: number;
  actualReps?: number | null;
  actualLoadKg?: number | null;
  completed: boolean;
  createdAt: string;
}

export interface WorkoutSessionResponse {
  id: string;
  userId: string;
  workoutPlanId?: string | null;
  sessionTitle: string;
  dateLogged: string;
  durationMinutes: number;
  caloriesBurned: number;
  rpe?: number | null;
  notes?: string | null;
  completed: boolean;
  createdAt: string;
}

export interface WorkoutSessionDetailResponse extends WorkoutSessionResponse {
  setLogs: ExerciseSetLogResponse[];
}

export interface CreateWorkoutSessionPayload {
  workoutPlanId?: string | null;
  sessionTitle: string;
  dateLogged: string;
  durationMinutes: number;
  caloriesBurned?: number;
  rpe?: number | null;
  notes?: string | null;
  completed?: boolean;
}

export interface UpdateWorkoutSessionPayload {
  sessionTitle?: string;
  dateLogged?: string;
  durationMinutes?: number;
  caloriesBurned?: number;
  rpe?: number | null;
  notes?: string | null;
  completed?: boolean;
}

export const workoutApi = {
  async listPlans(pathway?: string): Promise<WorkoutPlanResponse[]> {
    const qs = pathway ? `?pathway=${encodeURIComponent(pathway)}` : '';
    return apiClient<WorkoutPlanResponse[]>(`/workouts/plans${qs}`);
  },

  async getPlanDetails(planId: string): Promise<WorkoutPlanDetailResponse> {
    return apiClient<WorkoutPlanDetailResponse>(`/workouts/plans/${planId}`);
  },

  async createPlan(payload: CreateWorkoutPlanPayload): Promise<WorkoutPlanDetailResponse> {
    return apiClient<WorkoutPlanDetailResponse>('/workouts/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deletePlan(planId: string): Promise<void> {
    await apiClient<void>(`/workouts/plans/${planId}`, {
      method: 'DELETE',
    });
  },

  async listExercises(muscleGroup?: string): Promise<ExerciseItemResponse[]> {
    const qs = muscleGroup ? `?muscle_group=${encodeURIComponent(muscleGroup)}` : '';
    return apiClient<ExerciseItemResponse[]>(`/workouts/exercises${qs}`);
  },

  async createSession(payload: CreateWorkoutSessionPayload): Promise<WorkoutSessionResponse> {
    return apiClient<WorkoutSessionResponse>('/workouts/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listSessions(params: { days?: number; completed?: boolean } = {}): Promise<WorkoutSessionResponse[]> {
    const qp = new URLSearchParams();
    if (params.days) qp.append('days', String(params.days));
    if (typeof params.completed === 'boolean') qp.append('completed', String(params.completed));
    const qs = qp.toString();
    return apiClient<WorkoutSessionResponse[]>(`/workouts/sessions${qs ? `?${qs}` : ''}`);
  },

  async getSessionDetails(sessionId: string): Promise<WorkoutSessionDetailResponse> {
    return apiClient<WorkoutSessionDetailResponse>(`/workouts/sessions/${sessionId}`);
  },

  async updateSession(sessionId: string, payload: UpdateWorkoutSessionPayload): Promise<WorkoutSessionResponse> {
    return apiClient<WorkoutSessionResponse>(`/workouts/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async updateSetLogs(sessionId: string, setLogs: ExerciseSetLogPayload[]): Promise<ExerciseSetLogResponse[]> {
    return apiClient<ExerciseSetLogResponse[]>(`/workouts/sessions/${sessionId}/sets`, {
      method: 'PUT',
      body: JSON.stringify({ setLogs }),
    });
  },
};
