import type { BehaviorInsight, Recommendation } from '../types';

export function buildRecommendations(insights: BehaviorInsight[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const workloadInsights = insights.filter(
    (insight) => insight.id === 'stress-change' || insight.id === 'energy-change',
  );

  for (const insight of insights) {
    if (insight.id === 'late-night-change') {
      recommendations.push({
        id: 'wind-down',
        title: 'Try a gentler wind-down',
        explanation: 'A small routine change can be easier to sustain than a strict screen-time goal.',
        supportingObservation: insight.evidence,
        suggestedAction: 'If it suits your schedule, try setting aside 20 minutes without screens before bed.',
        priority: 'consider',
        relatedInsightId: insight.id,
      });
    } else if (insight.id === 'breaks-change') {
      recommendations.push({
        id: 'short-breaks',
        title: 'Make room for short pauses',
        explanation: 'Your recent break count is lower than your own baseline.',
        supportingObservation: insight.evidence,
        suggestedAction: 'Consider adding one brief stretch or away-from-screen pause to a work block.',
        priority: 'useful',
        relatedInsightId: insight.id,
      });
    } else if (insight.id === 'fatigue-change') {
      recommendations.push({
        id: 'rest-reminder',
        title: 'Give rest some space',
        explanation: 'You have reported higher fatigue than your earlier check-ins.',
        supportingObservation: insight.evidence,
        suggestedAction: 'Consider a gentle pause or an earlier wind-down if that feels right for you.',
        priority: 'consider',
        relatedInsightId: insight.id,
      });
    } else if (insight.id === 'screen-time-change') {
      recommendations.push({
        id: 'screen-boundaries',
        title: 'Notice where screen time goes',
        explanation: 'Your recent screen-time average has moved beyond your earlier routine.',
        supportingObservation: insight.evidence,
        suggestedAction: 'If helpful, look at the activity categories and choose one small boundary to try.',
        priority: 'gentle',
        relatedInsightId: insight.id,
      });
    }
  }

  if (workloadInsights.length > 0) {
    recommendations.push({
      id: 'workload-check',
      title: 'Check in with your workload',
      explanation: 'Your recent self-reported stress or energy ratings have changed from your earlier check-ins.',
      supportingObservation: workloadInsights.map((insight) => insight.evidence).join(' '),
      suggestedAction: 'You could review what feels most demanding and make room for a realistic rest break.',
      priority: 'consider',
      relatedInsightId: workloadInsights.length === 1 ? workloadInsights[0].id : undefined,
    });
  }

  if (!recommendations.length && insights.some((item) => item.status === 'insufficient')) {
    recommendations.push({
      id: 'collect-more',
      title: 'Keep building your picture',
      explanation: 'A personal baseline needs enough recent and earlier records to make a fair comparison.',
      supportingObservation: 'There is not enough information to compare patterns yet.',
      suggestedAction: 'Add activity entries or check-ins over time; there is no need to fill in every field.',
      priority: 'gentle',
    });
  } else if (!recommendations.length) {
    recommendations.push({
      id: 'steady-routine',
      title: 'Keep what feels sustainable',
      explanation: 'No notable change crossed the current comparison thresholds.',
      supportingObservation: insights.find((item) => item.status === 'steady')?.evidence
        ?? 'Your recent records are close to your personal baseline.',
      suggestedAction: 'Continue checking in when useful; you do not need to record every day.',
      priority: 'gentle',
    });
  }

  return recommendations;
}
