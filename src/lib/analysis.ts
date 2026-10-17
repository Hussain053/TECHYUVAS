import type { ActivityEntry, BehaviorDriftResult, Insight, MoodCheckIn } from '../types';

export const THRESHOLDS = {
  screenTimeIncrease: 1.2,
  lateNightIncrease: 0.8,
  breakDecrease: 1,
  stressIncrease: 1,
  energyDecrease: 1,
};

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sortByDate<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.date.localeCompare(right.date));
}

export function formatDateLabel(date: string): string {
  const safeDate = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(safeDate);
}

export function calculateSummaryMetrics(activityEntries: ActivityEntry[], moodEntries: MoodCheckIn[]) {
  const sortedActivities = sortByDate(activityEntries);
  const sortedMood = sortByDate(moodEntries);
  const recentActivity = sortedActivities.slice(-7);
  const recentMood = sortedMood.slice(-7);

  return {
    avgScreenTime: roundToOne(average(sortedActivities.map((entry) => entry.totalScreenTime))),
    avgMood: roundToOne(average(sortedMood.map((entry) => entry.mood))),
    avgBreakCount: roundToOne(average(sortedActivities.map((entry) => entry.breaks))),
    recentLateNight: roundToOne(average(recentActivity.map((entry) => entry.lateNightUsage))),
    recentMoodAverage: recentMood.length
      ? roundToOne(average(recentMood.map((entry) => entry.mood)))
      : 0,
  };
}

export function buildScreenTimeChartData(activityEntries: ActivityEntry[]) {
  return sortByDate(activityEntries).map((entry) => ({
    date: formatDateLabel(entry.date),
    screenTime: roundToOne(entry.totalScreenTime),
  }));
}

export function buildMoodStressChartData(moodEntries: MoodCheckIn[]) {
  return sortByDate(moodEntries).map((entry) => ({
    date: formatDateLabel(entry.date),
    mood: entry.mood,
    stress: entry.stress,
  }));
}

export function buildBehaviorChartData(activityEntries: ActivityEntry[]) {
  return sortByDate(activityEntries).map((entry) => ({
    date: formatDateLabel(entry.date),
    lateNight: roundToOne(entry.lateNightUsage),
    breaks: entry.breaks,
  }));
}

export function getRecentActivityHighlights(activityEntries: ActivityEntry[]) {
  return sortByDate(activityEntries)
    .slice(-3)
    .reverse()
    .map((entry) => ({
      date: formatDateLabel(entry.date),
      summary: `${entry.totalScreenTime.toFixed(1)}h total screen time · ${entry.breaks} breaks`,
    }));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function generateInsights(activityEntries: ActivityEntry[], moodEntries: MoodCheckIn[]): Insight[] {
  const sortedActivities = sortByDate(activityEntries);
  const sortedMood = sortByDate(moodEntries);

  if (sortedActivities.length === 0 || sortedMood.length === 0) {
    return [
      {
        id: 'no-data',
        title: 'Data is still being gathered',
        description: 'Add a few mood check-ins and activity entries to unlock a more tailored view.',
        recommendation: 'Use the daily forms to log the next few days so trends become more informative.',
        priority: 'low',
      },
    ];
  }

  const recentActivity = sortedActivities.slice(-7);
  const baselineActivity = sortedActivities.slice(0, Math.max(0, sortedActivities.length - 7));
  const recentMood = sortedMood.slice(-7);
  const baselineMood = sortedMood.slice(0, Math.max(0, sortedMood.length - 7));

  const recentAvgScreen = average(recentActivity.map((entry) => entry.totalScreenTime));
  const baselineAvgScreen = average(baselineActivity.map((entry) => entry.totalScreenTime));
  const recentAvgLateNight = average(recentActivity.map((entry) => entry.lateNightUsage));
  const baselineAvgLateNight = average(baselineActivity.map((entry) => entry.lateNightUsage));
  const recentAvgBreaks = average(recentActivity.map((entry) => entry.breaks));
  const baselineAvgBreaks = average(baselineActivity.map((entry) => entry.breaks));
  const recentAvgStress = average(recentMood.map((entry) => entry.stress));
  const baselineAvgStress = average(baselineMood.map((entry) => entry.stress));
  const recentAvgEnergy = average(recentMood.map((entry) => entry.energy));
  const baselineAvgEnergy = average(baselineMood.map((entry) => entry.energy));

  const insights: Insight[] = [];

  if (baselineAvgScreen > 0 && recentAvgScreen > baselineAvgScreen + THRESHOLDS.screenTimeIncrease) {
    insights.push({
      id: 'screen-time-rise',
      title: 'Screen time is running above your recent rhythm',
      description: `Your average screen time was ${roundToOne(recentAvgScreen)}h over the past week, compared with ${roundToOne(baselineAvgScreen)}h in the earlier baseline window.`,
      recommendation: 'Review your workload and schedule one shorter screen-free block before bed or during a break.',
      priority: 'medium',
    });
  }

  if (baselineAvgLateNight > 0 && recentAvgLateNight > baselineAvgLateNight + THRESHOLDS.lateNightIncrease) {
    insights.push({
      id: 'late-night-rise',
      title: 'Late-night usage has climbed',
      description: `Late-night screen use averaged ${roundToOne(recentAvgLateNight)}h recently, versus ${roundToOne(baselineAvgLateNight)}h before that.`,
      recommendation: 'Try a screen-free wind-down period for 30 to 45 minutes before bed and keep your charger out of reach.',
      priority: 'high',
    });
  }

  if (baselineAvgBreaks > 0 && recentAvgBreaks < baselineAvgBreaks - THRESHOLDS.breakDecrease) {
    insights.push({
      id: 'break-frequency-drop',
      title: 'Break frequency has dipped',
      description: `You averaged ${roundToOne(recentAvgBreaks)} breaks in the recent window compared with ${roundToOne(baselineAvgBreaks)} in your baseline.`,
      recommendation: 'Add a short reset every 60 to 90 minutes, even if it is as simple as standing up and stretching.',
      priority: 'medium',
    });
  }

  if (baselineAvgStress > 0 && recentAvgStress > baselineAvgStress + THRESHOLDS.stressIncrease) {
    insights.push({
      id: 'stress-increase',
      title: 'Stress reports have moved upward',
      description: `Self-reported stress averaged ${roundToOne(recentAvgStress)} recently, versus ${roundToOne(baselineAvgStress)} in the earlier pattern.`,
      recommendation: 'Consider one gentle support habit, such as a walk, a short pause, or a less screen-heavy evening routine.',
      priority: 'high',
    });
  }

  if (baselineAvgEnergy > 0 && recentAvgEnergy < baselineAvgEnergy - THRESHOLDS.energyDecrease) {
    insights.push({
      id: 'energy-drop',
      title: 'Energy has been trending lower',
      description: `Your average energy rating was ${roundToOne(recentAvgEnergy)} recently compared with ${roundToOne(baselineAvgEnergy)} in your baseline.`,
      recommendation: 'Reduce a small part of the evening load or protect this time for rest and recovery if you can.',
      priority: 'medium',
    });
  }

  if (
    insights.length > 1 &&
    recentAvgScreen > baselineAvgScreen + THRESHOLDS.screenTimeIncrease &&
    recentAvgLateNight > baselineAvgLateNight + THRESHOLDS.lateNightIncrease &&
    recentAvgBreaks < baselineAvgBreaks - THRESHOLDS.breakDecrease
  ) {
    insights.push({
      id: 'combined-pattern',
      title: 'Several changes are reinforcing each other',
      description: 'Higher screen time, later-night usage, and fewer breaks are happening together in the same recent window.',
      recommendation: 'Try a planned wind-down routine and add a short break before the next deep-focus session.',
      priority: 'high',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'stable-pattern',
      title: 'No clear change is showing up right now',
      description: 'Your recent measurements are staying fairly close to the routine seen in earlier entries.',
      recommendation: 'Keep tracking, and revisit this view when routine changes or life events naturally shift your patterns.',
      priority: 'low',
    });
  }

  return insights.slice(0, 4);
}

export function getBehaviorDrift(activityEntries: ActivityEntry[]): BehaviorDriftResult {
  const sorted = sortByDate(activityEntries);

  if (sorted.length < 4) {
    return {
      value: null,
      label: 'Insufficient history',
      explanation: 'We need at least four activity entries before a behavior-drift value can be calculated fairly.',
    };
  }

  const recentEntries = sorted.slice(-Math.min(7, sorted.length));
  const baselineEntries = sorted.slice(0, Math.max(2, Math.floor(sorted.length / 2)));

  if (baselineEntries.length < 2) {
    return {
      value: null,
      label: 'Insufficient history',
      explanation: 'There is not enough earlier activity to compare the recent routine against a personal baseline yet.',
    };
  }

  const recentAvgScreen = average(recentEntries.map((entry) => entry.totalScreenTime));
  const baselineAvgScreen = average(baselineEntries.map((entry) => entry.totalScreenTime));
  const recentAvgLateNight = average(recentEntries.map((entry) => entry.lateNightUsage));
  const baselineAvgLateNight = average(baselineEntries.map((entry) => entry.lateNightUsage));
  const recentAvgBreaks = average(recentEntries.map((entry) => entry.breaks));
  const baselineAvgBreaks = average(baselineEntries.map((entry) => entry.breaks));

  const screenShift = baselineAvgScreen > 0 ? Math.max(0, recentAvgScreen - baselineAvgScreen) / baselineAvgScreen : 0;
  const lateNightShift = baselineAvgLateNight > 0 ? Math.max(0, recentAvgLateNight - baselineAvgLateNight) / baselineAvgLateNight : 0;
  const breakDrop = baselineAvgBreaks > 0 ? Math.max(0, baselineAvgBreaks - recentAvgBreaks) / baselineAvgBreaks : 0;

  const rawScore =
    Math.min(screenShift, 1.5) * 35 +
    Math.min(lateNightShift, 1.5) * 25 +
    Math.min(breakDrop, 1.5) * 25 +
    Math.min(Math.max(0, recentAvgLateNight - baselineAvgLateNight), 1.5) * 15;

  const value = clamp(Math.round(rawScore), 0, 100);

  return {
    value,
    label: `${value}/100`,
    explanation: 'Behavior drift measures how much your recent activity pattern differs from your own baseline, without implying a clinical diagnosis.',
  };
}
