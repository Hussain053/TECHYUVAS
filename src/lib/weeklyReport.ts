import type { DailyActivity, MoodCheckIn, StressContributor } from '../types';
import { localDateKey } from './analysis';

export interface ReportWindow {
  start: string;
  end: string;
  activityDays: number;
  checkInDays: number;
  averageScreenTime: number | null;
  averageBreaks: number | null;
  averageMood: number | null;
  averageStress: number | null;
  averageEnergy: number | null;
  averageFatigue: number | null;
  averageSleepHours: number | null;
  averageProductivity: number | null;
  leadingStressContributor: { contributor: StressContributor; count: number } | null;
  highestStressDay: { date: string; rating: number } | null;
  lowestStressDay: { date: string; rating: number } | null;
}

export interface WeeklyReport {
  current: ReportWindow;
  previous: ReportWindow;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function getDateKey(date: Date): string {
  return localDateKey(date);
}

function getWindow(
  activities: DailyActivity[],
  checkIns: MoodCheckIn[],
  endDate: Date,
): ReportWindow {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startKey = getDateKey(start);
  const endKey = getDateKey(end);
  const inWindow = (date: string) => date >= startKey && date <= endKey;
  const windowActivities = activities.filter((entry) => inWindow(entry.date));
  const checkInsByDate = new Map<string, MoodCheckIn[]>();
  for (const entry of checkIns.filter((item) => inWindow(item.date))) {
    const dailyEntries = checkInsByDate.get(entry.date) ?? [];
    dailyEntries.push(entry);
    checkInsByDate.set(entry.date, dailyEntries);
  }
  const dailyRatings = [...checkInsByDate.entries()].map(([date, entries]) => ({
    date,
    mood: average(entries.map((entry) => entry.mood)),
    stress: average(entries.map((entry) => entry.stress)),
    energy: average(entries.map((entry) => entry.energy)),
    fatigue: average(entries.map((entry) => entry.fatigue)),
  }));
  const stressDays = dailyRatings
    .filter((item): item is typeof item & { stress: number } => item.stress !== null)
    .sort((first, second) => first.stress - second.stress);
  const contributorCounts = new Map<StressContributor, number>();
  for (const entry of checkIns.filter((item) => inWindow(item.date))) {
    if (entry.stressContributor) {
      contributorCounts.set(entry.stressContributor, (contributorCounts.get(entry.stressContributor) ?? 0) + 1);
    }
  }
  const leadingStressContributor = [...contributorCounts.entries()]
    .sort((first, second) => second[1] - first[1])[0];

  return {
    start: startKey,
    end: endKey,
    activityDays: windowActivities.length,
    checkInDays: checkInsByDate.size,
    averageScreenTime: average(windowActivities.map((entry) => entry.totalScreenTime)),
    averageBreaks: average(windowActivities
      .map((entry) => entry.breaks)
      .filter((value): value is number => value !== undefined)),
    averageMood: average(dailyRatings.map((item) => item.mood)
      .filter((value): value is number => value !== null)),
    averageStress: average(dailyRatings.map((item) => item.stress)
      .filter((value): value is number => value !== null)),
    averageEnergy: average(dailyRatings.map((item) => item.energy)
      .filter((value): value is number => value !== null)),
    averageFatigue: average(dailyRatings.map((item) => item.fatigue)
      .filter((value): value is number => value !== null)),
    averageSleepHours: average([...checkInsByDate.values()]
      .map((entries) => average(entries.map((entry) => entry.sleepHours)
        .filter((value): value is number => value !== undefined)))
      .filter((value): value is number => value !== null)),
    averageProductivity: average(dailyRatings.map((item) => average(
      checkInsByDate.get(item.date)?.map((entry) => entry.productivity)
        .filter((value): value is number => value !== undefined) ?? [],
    )).filter((value): value is number => value !== null)),
    leadingStressContributor: leadingStressContributor
      ? { contributor: leadingStressContributor[0], count: leadingStressContributor[1] }
      : null,
    highestStressDay: stressDays.length
      ? { date: stressDays.at(-1)!.date, rating: stressDays.at(-1)!.stress }
      : null,
    lowestStressDay: stressDays.length
      ? { date: stressDays[0].date, rating: stressDays[0].stress }
      : null,
  };
}

export function buildWeeklyReport(
  activities: DailyActivity[],
  checkIns: MoodCheckIn[],
  referenceDate = new Date(),
): WeeklyReport {
  const currentEnd = new Date(referenceDate);
  currentEnd.setHours(0, 0, 0, 0);
  const previousEnd = new Date(currentEnd);
  previousEnd.setDate(previousEnd.getDate() - 7);
  return {
    current: getWindow(activities, checkIns, currentEnd),
    previous: getWindow(activities, checkIns, previousEnd),
  };
}
