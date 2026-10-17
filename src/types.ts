export type AppPage =
  | 'overview'
  | 'checkin'
  | 'activity'
  | 'insights'
  | 'recommendations'
  | 'history'
  | 'settings'
  | 'demo';

export type SourceKind = 'demo' | 'user';
export type ThemePreference = 'light' | 'dark';
export type DataMode = 'demo' | 'personal';
export type InsightStatus = 'steady' | 'notice' | 'combined' | 'insufficient';

export interface MoodCheckIn {
  id: string;
  date: string;
  recordedAt: string;
  mood: number;
  stress: number;
  energy: number;
  fatigue: number;
  note: string;
  source: SourceKind;
}

export interface DailyActivity {
  id: string;
  date: string;
  totalScreenTime: number;
  workStudyHours?: number;
  socialMediaHours?: number;
  entertainmentHours?: number;
  lateNightUsage?: number;
  breaks?: number;
  averageBreakMinutes?: number;
  tasksCompleted?: number;
  notes?: string;
  source: SourceKind;
}

export interface DailySummary {
  date: string;
  activity: DailyActivity | null;
  checkIns: MoodCheckIn[];
  averageMood: number | null;
  averageStress: number | null;
  averageEnergy: number | null;
  averageFatigue: number | null;
}

export interface BehaviorInsight {
  id: string;
  title: string;
  description: string;
  evidence: string;
  status: InsightStatus;
  metric?: string;
  recentValue?: number;
  baselineValue?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  explanation: string;
  supportingObservation: string;
  suggestedAction: string;
  priority: 'gentle' | 'consider' | 'useful';
  relatedInsightId?: string;
}

export interface UserPreferences {
  theme: ThemePreference;
  dataMode: DataMode;
  profileName: string;
}

export interface AppData {
  moodCheckIns: MoodCheckIn[];
  activityEntries: DailyActivity[];
  preferences: UserPreferences;
}
