import type { BehaviorInsight, Recommendation } from '../types';

export function buildRecommendations(insights: BehaviorInsight[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const workloadInsights = insights.filter(
    (insight) => insight.id === 'stress-change' || insight.id === 'energy-change',
  );

  for (const insight of insights) {
    if (insight.id === 'combined-stress-pattern') {
      recommendations.push({
        id: 'combined-pattern-reset',
        title: 'Choose one supportive next step',
        explanation: 'Your activity notes and self-reported well-being both shifted from your baseline. A small response may be more useful than trying to change everything at once.',
        supportingObservation: insight.evidence,
        suggestedAction: 'Consider a brief screen-free break, a gentler wind-down, or making your next task more manageable—choose what fits your day.',
        priority: 'consider',
        relatedInsightId: insight.id,
      });
    } else if (insight.id === 'late-night-change') {
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
        title: 'Try one small screen-time boundary',
        explanation: `Your recent screen-time average is ${insight.recentValue?.toFixed(1) ?? '—'} hours a day, compared with ${insight.baselineValue?.toFixed(1) ?? '—'} hours in your earlier baseline. A small experiment can help you see what fits your routine.`,
        supportingObservation: insight.evidence,
        suggestedAction: 'For the next 3 days, choose one non-essential screen session and stop 15 minutes earlier. Keep work or study time separate, then notice whether the change felt manageable.',
        priority: 'gentle',
        relatedInsightId: insight.id,
      });
    } else if (insight.id === 'work-study-change') {
      recommendations.push({
        id: 'routine-check',
        title: 'Check whether your routine needs adjusting',
        explanation: 'Your recorded work or study hours have shifted from your earlier pattern.',
        supportingObservation: insight.evidence,
        suggestedAction: 'If the change feels difficult, consider breaking the day into smaller work blocks with protected pauses.',
        priority: 'gentle',
        relatedInsightId: insight.id,
      });
    }
  }

  const stressInsight = insights.find((insight) => insight.id === 'stress-change');
  if (stressInsight) {
    recommendations.push({
      id: 'guided-reset',
      title: 'Try a short guided reset',
      explanation: 'A brief pause can create room to notice how you are feeling without needing to solve everything at once.',
      supportingObservation: stressInsight.evidence,
      suggestedAction: 'Try two minutes of slow breathing or a short guided relaxation from a source you trust. Stop if it does not feel comfortable.',
      priority: 'gentle',
      relatedInsightId: stressInsight.id,
    });
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
