import { demoActivityEntries, demoMoodCheckIns } from '../data/demoData';
import type { ActivityEntry, MoodCheckIn } from '../types';

export const STORAGE_KEYS = {
  moodEntries: 'mindtrace.moodEntries',
  activityEntries: 'mindtrace.activityEntries',
} as const;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStored<T>(key: string, fallback: T): T {
  const storage = getStorage();

  if (!storage) {
    return fallback;
  }

  try {
    const rawValue = storage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(rawValue) as T;
    return parsedValue;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function isMoodEntry(value: unknown): value is MoodCheckIn {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<MoodCheckIn>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.note === 'string' &&
    typeof candidate.mood === 'number' &&
    typeof candidate.stress === 'number' &&
    typeof candidate.energy === 'number' &&
    typeof candidate.fatigue === 'number' &&
    (candidate.source === 'demo' || candidate.source === 'user')
  );
}

function isActivityEntry(value: unknown): value is ActivityEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ActivityEntry>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.totalScreenTime === 'number' &&
    typeof candidate.activeWorkHours === 'number' &&
    typeof candidate.socialMediaHours === 'number' &&
    typeof candidate.entertainmentHours === 'number' &&
    typeof candidate.lateNightUsage === 'number' &&
    typeof candidate.breaks === 'number' &&
    typeof candidate.averageBreakMinutes === 'number' &&
    typeof candidate.tasksCompleted === 'number' &&
    (candidate.source === 'demo' || candidate.source === 'user')
  );
}

export function loadMoodEntries(): MoodCheckIn[] {
  const stored = readStored<MoodCheckIn[]>(STORAGE_KEYS.moodEntries, demoMoodCheckIns);

  if (!Array.isArray(stored) || stored.some((item) => !isMoodEntry(item))) {
    return demoMoodCheckIns;
  }

  return stored;
}

export function loadActivityEntries(): ActivityEntry[] {
  const stored = readStored<ActivityEntry[]>(STORAGE_KEYS.activityEntries, demoActivityEntries);

  if (!Array.isArray(stored) || stored.some((item) => !isActivityEntry(item))) {
    return demoActivityEntries;
  }

  return stored;
}

export function persistEntries(moodEntries: MoodCheckIn[], activityEntries: ActivityEntry[]): void {
  writeStored(STORAGE_KEYS.moodEntries, moodEntries);
  writeStored(STORAGE_KEYS.activityEntries, activityEntries);
}

export function restoreDemoEntries(): { moodEntries: MoodCheckIn[]; activityEntries: ActivityEntry[] } {
  return {
    moodEntries: demoMoodCheckIns,
    activityEntries: demoActivityEntries,
  };
}
