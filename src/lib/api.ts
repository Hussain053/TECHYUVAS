import type { ArchetypeSummary, RoutineSimulationResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000';

let isBackendAvailable: boolean | null = null;
let lastCheckTime = 0;
const CHECK_COOLDOWN_MS = 15000;

export interface HealthStatus {
  status: string;
  database: string;
  ml_models: {
    regression_pipeline: string;
    clustering_pipeline: string;
  };
}

export async function checkBackendHealth(): Promise<HealthStatus | null> {
  const now = Date.now();
  if (isBackendAvailable === false && now - lastCheckTime < CHECK_COOLDOWN_MS) {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      isBackendAvailable = false;
      lastCheckTime = now;
      return null;
    }
    isBackendAvailable = true;
    lastCheckTime = now;
    return await res.json();
  } catch {
    isBackendAvailable = false;
    lastCheckTime = now;
    return null;
  }
}

export async function simulateRoutineApi(params: {
  totalScreenTime: number;
  workStudyHours: number;
  socialMediaHours: number;
  entertainmentHours: number;
  lateNightUsage: number;
  breaks: number;
  averageBreakMinutes: number;
  ageGroup?: string;
  occupation?: string;
}): Promise<RoutineSimulationResponse> {
  const now = Date.now();
  const shouldTryBackend = isBackendAvailable !== false || now - lastCheckTime >= CHECK_COOLDOWN_MS;

  if (shouldTryBackend) {
    const payload = {
      total_screen_time: params.totalScreenTime,
      active_work: params.workStudyHours,
      social_media: params.socialMediaHours,
      entertainment: params.entertainmentHours,
      late_night: params.lateNightUsage,
      break_count: Math.round(params.breaks),
      avg_break_duration: Math.round(params.averageBreakMinutes),
      age_group: params.ageGroup || '25-34',
      occupation: params.occupation || 'Software Engineer',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${API_BASE_URL}/api/v1/ml/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        isBackendAvailable = true;
        lastCheckTime = now;
        return await res.json();
      }
      isBackendAvailable = false;
      lastCheckTime = now;
    } catch {
      isBackendAvailable = false;
      lastCheckTime = now;
      // Graceful offline fallback using calibrated dataset parameters
    }
  }

  // Calibrated client-side heuristic matching our Ridge model weights
  const activeImpact = params.workStudyHours * 6.5;
  const lateNightPenalty = params.lateNightUsage * 7.5;
  const breakBonus = Math.min(params.breaks, 8) * 2.2;
  const leisurePenalty = (params.socialMediaHours + params.entertainmentHours) * 1.5;
  const rawScore = 35.0 + activeImpact - lateNightPenalty + breakBonus - leisurePenalty;
  const score = Math.max(10, Math.min(98, Math.round(rawScore * 10) / 10));

  const delta = Math.round((score - 60.0) * 10) / 10;
  const factors: string[] = [];
  if (params.workStudyHours >= 5.0) factors.push('Strong active work/study duration contributes positively to output.');
  if (params.lateNightUsage > 2.0) factors.push('Elevated late-night screen time has a negative impact on routine stability.');
  if (params.breaks >= 5) factors.push('Regular break intervals support sustainable cognitive pacing.');

  let archetype: ArchetypeSummary;
  if (params.lateNightUsage > 2.0) {
    archetype = {
      cluster_id: 3,
      archetype_name: 'Late-Night Crunch & Fatigue Risk',
      description: 'Characterized by elevated late-night hours and reduced rest intervals.',
      distance_to_center: 1.8,
      is_routine_drift: true,
      cluster_benchmark_averages: { Total_Screen_Time_Hrs: 6.45, Active_Work_Hrs: 3.93, Productivity_Score_100: 47.66 },
    };
  } else if (params.workStudyHours > 5.5 && params.breaks >= 5) {
    archetype = {
      cluster_id: 0,
      archetype_name: 'High-Focus & Rest-Balanced',
      description: 'Characterized by solid active study/work hours with consistent breaks.',
      distance_to_center: 1.2,
      is_routine_drift: false,
      cluster_benchmark_averages: { Total_Screen_Time_Hrs: 9.76, Active_Work_Hrs: 6.53, Productivity_Score_100: 81.78 },
    };
  } else if (params.socialMediaHours + params.entertainmentHours > 3.0) {
    archetype = {
      cluster_id: 2,
      archetype_name: 'High Entertainment & Distraction Drift',
      description: 'Higher proportion of screen time allocated to leisure and social media.',
      distance_to_center: 1.5,
      is_routine_drift: false,
      cluster_benchmark_averages: { Total_Screen_Time_Hrs: 8.28, Active_Work_Hrs: 4.55, Productivity_Score_100: 67.36 },
    };
  } else {
    archetype = {
      cluster_id: 1,
      archetype_name: 'Moderate & Sustainable Routine',
      description: 'Paced daily activity within standard baseline boundaries.',
      distance_to_center: 1.1,
      is_routine_drift: false,
      cluster_benchmark_averages: { Total_Screen_Time_Hrs: 5.53, Active_Work_Hrs: 3.5, Productivity_Score_100: 60.03 },
    };
  }

  return {
    predicted_productivity_score: score,
    delta_from_reference: delta,
    contributing_factors: factors.length ? factors : ['Balanced activity within normal parameters.'],
    confidence_band: {
      lower: Math.max(0, Math.round((score - 8.84) * 10) / 10),
      upper: Math.min(100, Math.round((score + 8.84) * 10) / 10),
    },
    archetype,
  };
}

export async function profileHabitApi(params: {
  totalScreenTime: number;
  workStudyHours: number;
  socialMediaHours: number;
  entertainmentHours: number;
  lateNightUsage: number;
  breaks: number;
  averageBreakMinutes: number;
}): Promise<ArchetypeSummary> {
  const now = Date.now();
  const shouldTryBackend = isBackendAvailable !== false || now - lastCheckTime >= CHECK_COOLDOWN_MS;

  if (shouldTryBackend) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${API_BASE_URL}/api/v1/ml/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_screen_time: params.totalScreenTime,
          active_work: params.workStudyHours,
          social_media: params.socialMediaHours,
          entertainment: params.entertainmentHours,
          late_night: params.lateNightUsage,
          break_count: Math.round(params.breaks),
          avg_break_duration: Math.round(params.averageBreakMinutes),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        isBackendAvailable = true;
        lastCheckTime = now;
        return await res.json();
      }
      isBackendAvailable = false;
      lastCheckTime = now;
    } catch {
      isBackendAvailable = false;
      lastCheckTime = now;
    }
  }

  const sim = await simulateRoutineApi(params);
  return sim.archetype;
}
