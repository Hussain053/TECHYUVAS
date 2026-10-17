import type { DailyActivity, MoodCheckIn } from '../types';

function localDate(daysAgo: number): Date {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() - daysAgo);
  return value;
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const activityPatterns = [
  [6.8, 3.2, 1.2, 1.4, 0.5, 4],
  [7.6, 3.8, 1.6, 1.5, 0.9, 3],
  [8.2, 4.1, 1.8, 1.7, 1.2, 2],
  [6.4, 2.9, 1.1, 1.3, 0.4, 5],
  [7.1, 3.4, 1.5, 1.2, 0.7, 4],
  [5.9, 2.3, 1.0, 1.4, 0.3, 5],
  [7.4, 3.6, 1.7, 1.4, 0.8, 3],
];

const moodPatterns = [
  [4, 2, 4, 2],
  [3, 3, 3, 3],
  [2, 4, 2, 4],
  [4, 2, 4, 2],
  [3, 3, 3, 3],
  [5, 1, 5, 1],
  [4, 2, 4, 2],
];

export const demoActivityEntries: DailyActivity[] = Array.from({ length: 28 }, (_, index) => {
  const daysAgo = 27 - index;
  const date = dateKey(localDate(daysAgo));
  const [baseScreenTime, baseWorkStudyHours, socialMediaHours, entertainmentHours, baseLateNightUsage, baseBreaks] =
    activityPatterns[daysAgo % activityPatterns.length];
  const recentShift = daysAgo < 7;
  const totalScreenTime = baseScreenTime + (recentShift ? 1.8 : 0);
  const workStudyHours = baseWorkStudyHours + (recentShift ? 0.3 : 0);
  const lateNightUsage = baseLateNightUsage + (recentShift ? 0.7 : 0);
  const breaks = Math.max(0, baseBreaks - (recentShift ? 2 : 0));

  return {
    id: `demo-activity-${date}`,
    date,
    totalScreenTime,
    workStudyHours,
    socialMediaHours,
    entertainmentHours,
    lateNightUsage,
    breaks,
    averageBreakMinutes: breaks > 0 ? 12 + (daysAgo % 4) * 3 : undefined,
    tasksCompleted: 4 + (daysAgo % 6),
    source: 'demo',
  };
});

export const demoMoodCheckIns: MoodCheckIn[] = Array.from({ length: 28 }, (_, index) => {
  const daysAgo = 27 - index;
  const date = dateKey(localDate(daysAgo));
  const [baseMood, baseStress, baseEnergy, baseFatigue] = moodPatterns[daysAgo % moodPatterns.length];
  const recentShift = daysAgo < 7;
  const mood = Math.max(1, baseMood - (recentShift ? 1 : 0));
  const stress = Math.min(5, baseStress + (recentShift ? 1 : 0));
  const energy = Math.max(1, baseEnergy - (recentShift ? 1 : 0));
  const fatigue = Math.min(5, baseFatigue + (recentShift ? 1 : 0));
  const checkInDate = localDate(daysAgo);
  checkInDate.setHours(index % 4 === 0 ? 9 : index % 3 === 0 ? 20 : 14, 0, 0, 0);

  return {
    id: `demo-mood-${date}`,
    date,
    recordedAt: checkInDate.toISOString(),
    mood,
    stress,
    energy,
    fatigue,
    note: '',
    source: 'demo',
  };
});

demoMoodCheckIns.push({
  id: 'demo-mood-today',
  date: dateKey(localDate(0)),
  recordedAt: (() => {
    const value = localDate(0);
    value.setHours(Math.min(9, new Date().getHours()), 0, 0, 0);
    return value.toISOString();
  })(),
  mood: 4,
  stress: 2,
  energy: 3,
  fatigue: 2,
  note: 'Taking a moment to notice how I feel today.',
  source: 'demo',
});
