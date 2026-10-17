import type { DailyActivity, MoodCheckIn, TimelineEvent, DayComparisonMetric } from '../types';
import { formatDateTime } from './analysis';

export function minuteToTimeString(minuteOfDay: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minuteOfDay)));
  const hours24 = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const padMin = String(minutes).padStart(2, '0');
  return `${hours12}:${padMin} ${ampm}`;
}

export function buildDayEvents(
  activity: DailyActivity | null,
  checkIns: MoodCheckIn[]
): {
  timestampedEvents: TimelineEvent[];
  aggregateEvents: TimelineEvent[];
} {
  const timestampedEvents: TimelineEvent[] = [];
  const aggregateEvents: TimelineEvent[] = [];

  // 1. Process exact timestamped mood check-ins
  for (const checkin of checkIns) {
    const dateObj = new Date(checkin.recordedAt);
    let minuteOfDay: number | null = null;
    let timeLabel = 'Time unknown';

    if (Number.isFinite(dateObj.getTime())) {
      minuteOfDay = dateObj.getHours() * 60 + dateObj.getMinutes();
      timeLabel = formatDateTime(checkin.recordedAt);
    }

    const event: TimelineEvent = {
      id: checkin.id,
      type: 'checkin',
      title: `Reflection Check-In`,
      description: `Self-reported Mood ${checkin.mood}/5, Stress ${checkin.stress}/5, Energy ${checkin.energy}/5, Fatigue ${checkin.fatigue}/5`,
      minuteOfDay,
      timeLabel,
      hasExactTimestamp: minuteOfDay !== null,
      ratings: {
        mood: checkin.mood,
        stress: checkin.stress,
        energy: checkin.energy,
        fatigue: checkin.fatigue,
      },
      note: checkin.note || undefined,
      source: checkin.source,
    };

    if (minuteOfDay !== null) {
      timestampedEvents.push(event);
    } else {
      aggregateEvents.push(event);
    }
  }

  // Sort timestamped events by time of day
  timestampedEvents.sort((a, b) => (a.minuteOfDay ?? 0) - (b.minuteOfDay ?? 0));

  // 2. Process Daily Activity Summary (Daily aggregate, no fabricated minute timestamps)
  if (activity) {
    aggregateEvents.push({
      id: `act-${activity.id}`,
      type: 'activity_summary',
      title: 'Digital Activity Log',
      description: `Daily total: ${activity.totalScreenTime.toFixed(1)}h screen time recorded.`,
      minuteOfDay: null,
      timeLabel: 'Daily aggregate (no exact start/end hours)',
      hasExactTimestamp: false,
      metrics: {
        screenTime: activity.totalScreenTime,
        activeWork: activity.workStudyHours,
        breaks: activity.breaks,
        lateNight: activity.lateNightUsage,
        tasks: activity.tasksCompleted,
      },
      note: activity.notes || undefined,
      source: activity.source,
    });

    if (activity.lateNightUsage && activity.lateNightUsage > 0) {
      aggregateEvents.push({
        id: `late-${activity.id}`,
        type: 'late_night_window',
        title: 'Late-Night Activity Reported',
        description: `${activity.lateNightUsage.toFixed(1)}h of screen use was recorded for late-night hours.`,
        minuteOfDay: null,
        timeLabel: 'Late-night aggregate (recorded after hours)',
        hasExactTimestamp: false,
        metrics: {
          lateNight: activity.lateNightUsage,
        },
        source: activity.source,
      });
    }

    if (activity.breaks && activity.breaks > 0) {
      aggregateEvents.push({
        id: `breaks-${activity.id}`,
        type: 'rest_rhythm',
        title: 'Rest Rhythm',
        description: `${activity.breaks} breaks logged${activity.averageBreakMinutes ? ` averaging ${activity.averageBreakMinutes} minutes` : ''}.`,
        minuteOfDay: null,
        timeLabel: 'Daily aggregate',
        hasExactTimestamp: false,
        metrics: {
          breaks: activity.breaks,
        },
        source: activity.source,
      });
    }
  }

  return { timestampedEvents, aggregateEvents };
}

export function compareTwoDays(
  dayA: { date: string; activity: DailyActivity | null; checkIns: MoodCheckIn[] },
  dayB: { date: string; activity: DailyActivity | null; checkIns: MoodCheckIn[] }
): DayComparisonMetric[] {
  const metrics: DayComparisonMetric[] = [];

  // Helper for numeric delta
  const diffNumber = (a?: number, b?: number, unit = ''): { aStr: string; bStr: string; delta?: string } => {
    const aStr = a !== undefined && a !== null ? `${a}${unit}` : 'Not recorded';
    const bStr = b !== undefined && b !== null ? `${b}${unit}` : 'Not recorded';
    if (a !== undefined && a !== null && b !== undefined && b !== null) {
      const d = Math.round((b - a) * 10) / 10;
      const delta = d === 0 ? '0' : d > 0 ? `+${d}${unit}` : `${d}${unit}`;
      return { aStr, bStr, delta };
    }
    return { aStr, bStr };
  };

  // Screen time
  const screen = diffNumber(dayA.activity?.totalScreenTime, dayB.activity?.totalScreenTime, 'h');
  metrics.push({ label: 'Total screen time', dayAValue: screen.aStr, dayBValue: screen.bStr, delta: screen.delta });

  // Active work
  const work = diffNumber(dayA.activity?.workStudyHours, dayB.activity?.workStudyHours, 'h');
  metrics.push({ label: 'Active work / study', dayAValue: work.aStr, dayBValue: work.bStr, delta: work.delta });

  // Late night
  const late = diffNumber(dayA.activity?.lateNightUsage, dayB.activity?.lateNightUsage, 'h');
  metrics.push({ label: 'Late-night usage', dayAValue: late.aStr, dayBValue: late.bStr, delta: late.delta });

  // Breaks count
  const breaks = diffNumber(dayA.activity?.breaks, dayB.activity?.breaks);
  metrics.push({ label: 'Breaks taken', dayAValue: breaks.aStr, dayBValue: breaks.bStr, delta: breaks.delta });

  // Tasks completed
  const tasks = diffNumber(dayA.activity?.tasksCompleted, dayB.activity?.tasksCompleted);
  metrics.push({ label: 'Tasks completed', dayAValue: tasks.aStr, dayBValue: tasks.bStr, delta: tasks.delta });

  // Check-ins count
  metrics.push({
    label: 'Check-ins recorded',
    dayAValue: dayA.checkIns.length,
    dayBValue: dayB.checkIns.length,
    delta: dayB.checkIns.length - dayA.checkIns.length > 0 ? `+${dayB.checkIns.length - dayA.checkIns.length}` : `${dayB.checkIns.length - dayA.checkIns.length}`,
  });

  // Average stress
  const avgStress = (arr: MoodCheckIn[]) =>
    arr.length ? Math.round((arr.reduce((s, c) => s + c.stress, 0) / arr.length) * 10) / 10 : undefined;
  const stressDiff = diffNumber(avgStress(dayA.checkIns), avgStress(dayB.checkIns), '/5');
  metrics.push({ label: 'Average stress', dayAValue: stressDiff.aStr, dayBValue: stressDiff.bStr, delta: stressDiff.delta });

  // Average mood
  const avgMood = (arr: MoodCheckIn[]) =>
    arr.length ? Math.round((arr.reduce((s, c) => s + c.mood, 0) / arr.length) * 10) / 10 : undefined;
  const moodDiff = diffNumber(avgMood(dayA.checkIns), avgMood(dayB.checkIns), '/5');
  metrics.push({ label: 'Average mood', dayAValue: moodDiff.aStr, dayBValue: moodDiff.bStr, delta: moodDiff.delta });

  return metrics;
}
