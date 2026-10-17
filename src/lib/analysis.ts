import type {
  DailyActivity,
  DailySummary,
  InsightStatus,
  MoodCheckIn,
} from '../types';

export type DateRange = '7d' | '30d' | 'all';

const RECENT_DAYS = 7;
const BASELINE_DAYS = 21;
const MIN_RECENT_RECORDS = 3;
const MIN_BASELINE_RECORDS = 5;

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, options ?? { month: 'short', day: 'numeric' }).format(parsed);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function sortActivities(entries: DailyActivity[]): DailyActivity[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export function sortCheckIns(entries: MoodCheckIn[]): MoodCheckIn[] {
  return [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

export function getDayPeriod(value: string): 'Morning' | 'Afternoon' | 'Evening' {
  const hour = new Date(value).getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function buildDailySummaries(
  activities: DailyActivity[],
  checkIns: MoodCheckIn[],
): DailySummary[] {
  const activityByDate = new Map(activities.map((item) => [item.date, item]));
  const moodsByDate = new Map<string, MoodCheckIn[]>();
  for (const item of checkIns) {
    const items = moodsByDate.get(item.date) ?? [];
    items.push(item);
    moodsByDate.set(item.date, items);
  }
  const dates = new Set([...activityByDate.keys(), ...moodsByDate.keys()]);

  return [...dates].sort().map((date) => {
    const dailyCheckIns = sortCheckIns(moodsByDate.get(date) ?? []);
    return {
      date,
      activity: activityByDate.get(date) ?? null,
      checkIns: dailyCheckIns,
      averageMood: average(dailyCheckIns.map((item) => item.mood)),
      averageStress: average(dailyCheckIns.map((item) => item.stress)),
      averageEnergy: average(dailyCheckIns.map((item) => item.energy)),
      averageFatigue: average(dailyCheckIns.map((item) => item.fatigue)),
    };
  });
}

export function filterByRange<T extends { date: string }>(items: T[], range: DateRange): T[] {
  if (range === 'all') return items;
  const days = range === '7d' ? 7 : 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const startKey = localDateKey(start);
  const endKey = localDateKey();
  return items.filter((item) => item.date >= startKey && item.date <= endKey);
}

export interface MetricComparison {
  metric: string;
  recent: number;
  baseline: number;
  unit: string;
}

export interface BaselineAnalysis {
  available: boolean;
  reason: string;
  latestDate: string | null;
  activityComparisons: MetricComparison[];
  moodComparisons: MetricComparison[];
}

function compareNumericMetric(
  entries: DailyActivity[],
  metric: keyof Pick<
    DailyActivity,
    'totalScreenTime' | 'lateNightUsage' | 'breaks' | 'workStudyHours' | 'tasksCompleted'
  >,
  label: string,
  unit: string,
): MetricComparison | null {
  const latest = entries.reduce((max, item) => item.date > max ? item.date : max, '');
  if (!latest) return null;
  const recentStart = new Date(`${latest}T12:00:00`);
  recentStart.setDate(recentStart.getDate() - (RECENT_DAYS - 1));
  const baselineStart = new Date(`${latest}T12:00:00`);
  baselineStart.setDate(baselineStart.getDate() - (RECENT_DAYS + BASELINE_DAYS - 1));
  const recentStartKey = localDateKey(recentStart);
  const baselineStartKey = localDateKey(baselineStart);
  const baselineEnd = new Date(recentStart);
  baselineEnd.setDate(baselineEnd.getDate() - 1);
  const baselineEndKey = localDateKey(baselineEnd);
  const values = (start: string, end: string) =>
    entries.filter((item) => item.date >= start && item.date <= end)
      .map((item) => item[metric])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const recentValues = values(recentStartKey, latest);
  const baselineValues = values(baselineStartKey, baselineEndKey);
  if (recentValues.length < MIN_RECENT_RECORDS || baselineValues.length < MIN_BASELINE_RECORDS) return null;
  const recent = average(recentValues);
  const baseline = average(baselineValues);
  if (recent === null || baseline === null) return null;
  return { metric: label, recent, baseline, unit };
}

function compareMoodMetric(
  entries: MoodCheckIn[],
  metric: 'stress' | 'energy' | 'fatigue' | 'mood',
  label: string,
): MetricComparison | null {
  const latest = entries.reduce((max, item) => item.date > max ? item.date : max, '');
  if (!latest) return null;
  const recentStart = new Date(`${latest}T12:00:00`);
  recentStart.setDate(recentStart.getDate() - (RECENT_DAYS - 1));
  const baselineStart = new Date(`${latest}T12:00:00`);
  baselineStart.setDate(baselineStart.getDate() - (RECENT_DAYS + BASELINE_DAYS - 1));
  const baselineEnd = new Date(recentStart);
  baselineEnd.setDate(baselineEnd.getDate() - 1);
  const dailyValues = new Map<string, number[]>();
  for (const item of entries) {
    const values = dailyValues.get(item.date) ?? [];
    values.push(item[metric]);
    dailyValues.set(item.date, values);
  }
  const values = (start: string, end: string) => [...dailyValues.entries()]
    .filter(([date]) => date >= start && date <= end)
    .map(([, ratings]) => average(ratings))
    .filter((value): value is number => value !== null);
  const recentValues = values(localDateKey(recentStart), latest);
  const baselineValues = values(localDateKey(baselineStart), localDateKey(baselineEnd));
  if (recentValues.length < MIN_RECENT_RECORDS || baselineValues.length < MIN_BASELINE_RECORDS) return null;
  const recent = average(recentValues);
  const baseline = average(baselineValues);
  return recent === null || baseline === null ? null : { metric: label, recent, baseline, unit: '/5' };
}

export function analyzeBaseline(
  activities: DailyActivity[],
  checkIns: MoodCheckIn[],
): BaselineAnalysis {
  const latestDate = [...activities, ...checkIns]
    .map((item) => item.date)
    .sort()
    .at(-1) ?? null;
  const activityComparisons = [
    compareNumericMetric(activities, 'totalScreenTime', 'Screen time', 'h/day'),
    compareNumericMetric(activities, 'lateNightUsage', 'Late-night use', 'h/day'),
    compareNumericMetric(activities, 'breaks', 'Breaks', '/day'),
    compareNumericMetric(activities, 'workStudyHours', 'Work / study', 'h/day'),
    compareNumericMetric(activities, 'tasksCompleted', 'Tasks completed', '/day'),
  ].filter((item): item is MetricComparison => item !== null);
  const moodComparisons = [
    compareMoodMetric(checkIns, 'stress', 'Self-reported stress'),
    compareMoodMetric(checkIns, 'energy', 'Self-reported energy'),
    compareMoodMetric(checkIns, 'fatigue', 'Self-reported fatigue'),
    compareMoodMetric(checkIns, 'mood', 'Mood'),
  ].filter((item): item is MetricComparison => item !== null);
  const available = activityComparisons.length > 0 || moodComparisons.length > 0;
  return {
    available,
    reason: available
      ? 'Recent 7 days are compared with the preceding 21 days. At least 3 recent and 5 baseline records are required for each measure.'
      : 'More consistent history is needed: comparisons use the most recent 7 days and preceding 21 days, with at least 3 recent and 5 baseline records per measure.',
    latestDate,
    activityComparisons,
    moodComparisons,
  };
}

export function buildInsights(analysis: BaselineAnalysis): {
  insights: Array<{
    id: string;
    title: string;
    description: string;
    evidence: string;
    status: InsightStatus;
    metric?: string;
    recentValue?: number;
    baselineValue?: number;
  }>;
  activityVariationIndex: number | null;
} {
  if (!analysis.available) {
    return {
      insights: [{
        id: 'history-needed',
        title: 'Build your personal baseline',
        description: 'There is not enough comparable history yet to describe a recent change.',
        evidence: analysis.reason,
        status: 'insufficient',
      }],
      activityVariationIndex: null,
    };
  }

  const insights: Array<{
    id: string;
    title: string;
    description: string;
    evidence: string;
    status: InsightStatus;
    metric?: string;
    recentValue?: number;
    baselineValue?: number;
  }> = [];
  const screen = analysis.activityComparisons.find((item) => item.metric === 'Screen time');
  const lateNight = analysis.activityComparisons.find((item) => item.metric === 'Late-night use');
  const breaks = analysis.activityComparisons.find((item) => item.metric === 'Breaks');
  const workStudy = analysis.activityComparisons.find((item) => item.metric === 'Work / study');
  const tasksCompleted = analysis.activityComparisons.find((item) => item.metric === 'Tasks completed');
  const stress = analysis.moodComparisons.find((item) => item.metric === 'Self-reported stress');
  const energy = analysis.moodComparisons.find((item) => item.metric === 'Self-reported energy');
  const fatigue = analysis.moodComparisons.find((item) => item.metric === 'Self-reported fatigue');

  const addMetricInsight = (
    id: string,
    metric: MetricComparison | undefined,
    direction: 'higher' | 'lower',
    threshold: number,
    description: string,
    title: string,
  ) => {
    if (!metric) return;
    const difference = metric.recent - metric.baseline;
    const enoughChange = direction === 'higher'
      ? difference >= threshold
      : difference <= -threshold;
    if (!enoughChange) return;
    insights.push({
      id,
      title,
      description,
      evidence: `${metric.metric}: ${metric.recent.toFixed(1)}${metric.unit}, compared with ${metric.baseline.toFixed(1)}${metric.unit} in the prior baseline.`,
      status: 'notice',
      metric: metric.metric,
      recentValue: metric.recent,
      baselineValue: metric.baseline,
    });
  };

  addMetricInsight(
    'screen-time-change',
    screen,
    'higher',
    Math.max(1, (screen?.baseline ?? 0) * 0.2),
    'Your recent average screen time is above your own earlier routine. Screen time alone does not indicate stress.',
    'More screen time than your recent baseline',
  );
  addMetricInsight(
    'late-night-change',
    lateNight,
    'higher',
    Math.max(0.3, (lateNight?.baseline ?? 0) * 0.25),
    'Late-night use has increased compared with your earlier entries. You might try a short screen-free wind-down if that feels useful.',
    'Late-night use is higher',
  );
  addMetricInsight(
    'breaks-change',
    breaks,
    'lower',
    Math.max(1, (breaks?.baseline ?? 0) * 0.25),
    'You logged fewer breaks than in your earlier routine. Short pauses can be a practical way to add breathing room.',
    'Fewer breaks recorded',
  );
  addMetricInsight(
    'tasks-completed-change',
    tasksCompleted,
    'lower',
    Math.max(1, (tasksCompleted?.baseline ?? 0) * 0.2),
    'You recorded fewer completed tasks than in your earlier routine. Task counts can vary for many reasons and are not a measure of personal worth.',
    'Fewer tasks completed',
  );
  if (workStudy && Math.abs(workStudy.recent - workStudy.baseline) >= Math.max(1, workStudy.baseline * 0.25)) {
    insights.push({
      id: 'work-study-change',
      title: 'Work / study hours shifted',
      description: 'Your average recorded work or study time differs from your earlier routine. A change in hours alone does not explain why the routine changed.',
      evidence: `${workStudy.metric}: ${workStudy.recent.toFixed(1)}${workStudy.unit}, compared with ${workStudy.baseline.toFixed(1)}${workStudy.unit} in the prior baseline.`,
      status: 'notice',
      metric: workStudy.metric,
      recentValue: workStudy.recent,
      baselineValue: workStudy.baseline,
    });
  }
  addMetricInsight(
    'stress-change',
    stress,
    'higher',
    0.7,
    'Your self-reported stress rating is higher than your own earlier check-ins.',
    'Stress ratings have moved up',
  );
  addMetricInsight(
    'energy-change',
    energy,
    'lower',
    0.7,
    'Your self-reported energy is lower than in earlier check-ins.',
    'Energy ratings have moved down',
  );
  addMetricInsight(
    'fatigue-change',
    fatigue,
    'higher',
    0.7,
    'You have reported more fatigue than in earlier check-ins.',
    'Fatigue ratings have moved up',
  );

  const activitySignals = insights.filter((insight) =>
    ['screen-time-change', 'late-night-change', 'breaks-change', 'tasks-completed-change', 'work-study-change'].includes(insight.id),
  );
  const selfReportedSignals = insights.filter((insight) =>
    ['stress-change', 'energy-change', 'fatigue-change'].includes(insight.id),
  );
  if (activitySignals.length && selfReportedSignals.length) {
    insights.push({
      id: 'combined-stress-pattern',
      title: 'Activity and well-being changes appeared together',
      description: 'A change in your recorded routine coincides with a change in your self-reported well-being. This may be worth noticing, but it does not show that one caused the other or indicate a health condition.',
      evidence: [...activitySignals, ...selfReportedSignals]
        .map((insight) => insight.evidence)
        .join(' '),
      status: 'combined',
    });
  }

  const variationMeasures = analysis.activityComparisons;
  const activityVariationIndex = variationMeasures.length >= 2
    ? Math.round(variationMeasures.reduce((sum, item) => {
      const relativeChange = Math.abs(item.recent - item.baseline) / Math.max(Math.abs(item.baseline), 1);
      return sum + Math.min(relativeChange, 1);
    }, 0) / variationMeasures.length * 100)
    : null;
  if (!insights.length) {
    insights.push({
      id: 'within-range',
      title: 'Recent patterns are near your baseline',
      description: 'No notable changes crossed the explainable thresholds in the available comparisons.',
      evidence: analysis.reason,
      status: 'steady',
    });
  }
  return { insights, activityVariationIndex };
}
