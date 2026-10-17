import { demoActivityEntries, demoMoodCheckIns } from '../data/demoData';
import type {
  AppData,
  DataMode,
  DailyActivity,
  MoodCheckIn,
  RecommendationFeedback,
  StressContributor,
  ThemePreference,
  WellnessGoals,
  WorkspaceWellnessGoals,
} from '../types';

export const STORAGE_KEY = 'mindtrace.app-data.v2';
const LEGACY_MOOD_KEY = 'mindtrace.moodEntries';
const LEGACY_ACTIVITY_KEY = 'mindtrace.activityEntries';
const LEGACY_THEME_KEY = 'mindtrace.theme';

export interface LoadedAppData {
  data: AppData;
  warning: string | null;
}

const defaultTheme = (): ThemePreference => {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

function localStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
}

function isOptionalNumber(value: unknown, max: number): value is number | undefined {
  return value === undefined || (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max
  );
}

function isMoodCheckIn(value: unknown): value is MoodCheckIn {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<MoodCheckIn>;
  return typeof item.id === 'string'
    && isDateKey(item.date)
    && (typeof item.recordedAt === 'string' || item.recordedAt === undefined)
    && isRating(item.mood)
    && isRating(item.stress)
    && isRating(item.energy)
    && isRating(item.fatigue)
    && isOptionalNumber(item.sleepHours, 24)
    && (item.productivity === undefined || isRating(item.productivity))
    && (item.stressContributor === undefined || isStressContributor(item.stressContributor))
    && typeof (item.note ?? '') === 'string'
    && (item.source === 'demo' || item.source === 'user');
}

function isDailyActivity(value: unknown): value is DailyActivity {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<DailyActivity>;
  return typeof item.id === 'string'
    && isDateKey(item.date)
    && isOptionalNumber(item.totalScreenTime, 24)
    && typeof item.totalScreenTime === 'number'
    && isOptionalNumber(item.workStudyHours, 24)
    && isOptionalNumber(item.socialMediaHours, 24)
    && isOptionalNumber(item.entertainmentHours, 24)
    && isOptionalNumber(item.lateNightUsage, 24)
    && isOptionalNumber(item.breaks, 100)
    && isOptionalNumber(item.averageBreakMinutes, 240)
    && isOptionalNumber(item.tasksCompleted, 1000)
    && typeof (item.notes ?? '') === 'string'
    && (item.source === 'demo' || item.source === 'user');
}

function withLegacyTimestamp(item: MoodCheckIn): MoodCheckIn {
  return {
    ...item,
    recordedAt: item.recordedAt && Number.isFinite(Date.parse(item.recordedAt))
      ? item.recordedAt
      : new Date(`${item.date}T12:00:00`).toISOString(),
    note: item.note ?? '',
  };
}

function isTheme(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

function isDataMode(value: unknown): value is DataMode {
  return value === 'demo' || value === 'personal';
}

function isProfileName(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40;
}

function isStressContributor(value: unknown): value is StressContributor {
  return value === 'workload' || value === 'deadlines' || value === 'sleep'
    || value === 'digital-overload' || value === 'personal' || value === 'other';
}

function isWellnessGoals(value: unknown): value is WellnessGoals {
  if (typeof value !== 'object' || value === null) return false;
  const goals = value as Partial<WellnessGoals>;
  return (goals.dailyScreenTimeHours === null
      || (typeof goals.dailyScreenTimeHours === 'number'
        && Number.isFinite(goals.dailyScreenTimeHours)
        && goals.dailyScreenTimeHours >= 0
        && goals.dailyScreenTimeHours <= 24))
    && (goals.dailyBreaks === null
      || (typeof goals.dailyBreaks === 'number'
        && Number.isInteger(goals.dailyBreaks)
        && goals.dailyBreaks >= 0
        && goals.dailyBreaks <= 100));
}

function isWorkspaceWellnessGoals(value: unknown): value is WorkspaceWellnessGoals {
  if (typeof value !== 'object' || value === null) return false;
  const goals = value as Partial<WorkspaceWellnessGoals>;
  return isWellnessGoals(goals.demo) && isWellnessGoals(goals.personal);
}

function isRecommendationFeedback(value: unknown): value is Record<string, RecommendationFeedback> {
  return typeof value === 'object' && value !== null
    && Object.entries(value).every(([id, feedback]) => id.length > 0
      && (feedback === 'helpful' || feedback === 'dismissed'));
}

const emptyWellnessGoals: WellnessGoals = {
  dailyScreenTimeHours: null,
  dailyBreaks: null,
};

const defaultWellnessGoals: WorkspaceWellnessGoals = {
  demo: { ...emptyWellnessGoals },
  personal: { ...emptyWellnessGoals },
};

function readOptionalPreferences(value: Partial<AppData['preferences']>) {
  const legacyGoals = isWellnessGoals(value.wellnessGoals) ? value.wellnessGoals : null;
  return {
    profileName: isProfileName(value.profileName) ? value.profileName : '',
    wellnessGoals: isWorkspaceWellnessGoals(value.wellnessGoals)
      ? value.wellnessGoals
      : legacyGoals
        ? {
            ...defaultWellnessGoals,
            [value.dataMode === 'demo' ? 'demo' : 'personal']: legacyGoals,
          }
        : defaultWellnessGoals,
    recommendationFeedback: isRecommendationFeedback(value.recommendationFeedback)
      ? value.recommendationFeedback
      : {},
  };
}

function fromLegacyStorage(storage: Storage): { data: AppData | null; warning: string | null } {
  const rawMood = storage.getItem(LEGACY_MOOD_KEY);
  const rawActivity = storage.getItem(LEGACY_ACTIVITY_KEY);
  if (!rawMood && !rawActivity) return { data: null, warning: null };

  try {
    const moods: unknown = rawMood ? JSON.parse(rawMood) : [];
    const activities: unknown = rawActivity ? JSON.parse(rawActivity) : [];
    if (!Array.isArray(moods) || !moods.every(isMoodCheckIn)
      || !Array.isArray(activities) || !activities.every(isDailyActivity)) {
      return {
        data: null,
        warning: 'Previous saved records did not pass validation. Sample data is shown instead.',
      };
    }
    const rawTheme = storage.getItem(LEGACY_THEME_KEY);
    const personalMoods = moods.filter((item) => item.source === 'user').map(withLegacyTimestamp);
    const personalActivities = activities.filter((item) => item.source === 'user');
    const dataMode: DataMode = personalMoods.length || personalActivities.length ? 'personal' : 'demo';
    return {
      data: {
        moodCheckIns: [...demoMoodCheckIns, ...personalMoods],
        activityEntries: [...demoActivityEntries, ...personalActivities],
        preferences: {
          theme: isTheme(rawTheme) ? rawTheme : defaultTheme(),
          dataMode,
          ...readOptionalPreferences({}),
        },
      },
      warning: null,
    };
  } catch (error) {
    return {
      data: null,
      warning: `Previous saved records could not be read: ${error instanceof Error ? error.message : 'unknown storage error'}. Sample data is shown instead.`,
    };
  }
}

export function loadAppData(): LoadedAppData {
  const storage = localStorageOrNull();
  const fallback: AppData = {
    moodCheckIns: demoMoodCheckIns,
    activityEntries: demoActivityEntries,
    preferences: {
      theme: defaultTheme(),
      dataMode: 'demo',
      ...readOptionalPreferences({}),
    },
  };

  if (!storage) {
    return {
      data: fallback,
      warning: 'Browser storage is unavailable. Changes will not persist after this session.',
    };
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = fromLegacyStorage(storage);
      return { data: migrated.data ?? fallback, warning: migrated.warning };
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('Saved data has an invalid shape.');
    const saved = parsed as Partial<AppData>;
    if (!Array.isArray(saved.moodCheckIns) || !saved.moodCheckIns.every(isMoodCheckIn)
      || !Array.isArray(saved.activityEntries) || !saved.activityEntries.every(isDailyActivity)
      || typeof saved.preferences !== 'object' || saved.preferences === null
      || !isTheme(saved.preferences.theme)
      || (saved.preferences.profileName !== undefined && !isProfileName(saved.preferences.profileName))
      || (saved.preferences.wellnessGoals !== undefined
        && !isWellnessGoals(saved.preferences.wellnessGoals)
        && !isWorkspaceWellnessGoals(saved.preferences.wellnessGoals))
      || (saved.preferences.recommendationFeedback !== undefined
        && !isRecommendationFeedback(saved.preferences.recommendationFeedback))) {
      throw new Error('Saved data did not pass validation.');
    }
    const hasPersonalRecords = saved.moodCheckIns.some((item) => item.source === 'user')
      || saved.activityEntries.some((item) => item.source === 'user');
    return {
      data: {
        moodCheckIns: saved.moodCheckIns.map(withLegacyTimestamp),
        activityEntries: saved.activityEntries,
        preferences: {
          theme: saved.preferences.theme,
          dataMode: isDataMode(saved.preferences.dataMode)
            ? saved.preferences.dataMode
            : hasPersonalRecords ? 'personal' : 'demo',
          ...readOptionalPreferences(saved.preferences),
        },
      },
      warning: null,
    };
  } catch (error) {
    return {
      data: fallback,
      warning: `Saved data could not be read safely: ${error instanceof Error ? error.message : 'unknown storage error'}`,
    };
  }
}

export function saveAppData(data: AppData): void {
  const storage = localStorageOrNull();
  if (!storage) {
    throw new Error('Browser storage is unavailable. Changes cannot be saved.');
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown storage error';
    throw new Error(`Could not save your data in this browser: ${message}`);
  }
}

export function restoreDemoData(): AppData {
  return {
    moodCheckIns: demoMoodCheckIns.map((item) => ({ ...item })),
    activityEntries: demoActivityEntries.map((item) => ({ ...item })),
    preferences: {
      theme: defaultTheme(),
      dataMode: 'demo',
      ...readOptionalPreferences({}),
    },
  };
}

export function isDemoRecord(source: MoodCheckIn | DailyActivity): boolean {
  return source.source === 'demo';
}
