export type NavPage = 'overview' | 'mood' | 'activity' | 'insights' | 'settings';

export type SourceKind = 'demo' | 'user';

export interface MoodCheckIn {
  id: string;
  date: string;
  mood: number;
  stress: number;
  energy: number;
  fatigue: number;
  note: string;
  source: SourceKind;
}

export interface ActivityEntry {
  id: string;
  date: string;
  totalScreenTime: number;
  activeWorkHours: number;
  socialMediaHours: number;
  entertainmentHours: number;
  lateNightUsage: number;
  breaks: number;
  averageBreakMinutes: number;
  tasksCompleted: number;
  source: SourceKind;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface BehaviorDriftResult {
  value: number | null;
  label: string;
  explanation: string;
}
