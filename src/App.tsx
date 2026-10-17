import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Download,
  Heart,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Target,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './App.css';
import {
  analyzeBaseline,
  buildDailySummaries,
  buildInsights,
  filterByRange,
  formatDate,
  formatDateTime,
  getDayPeriod,
  localDateKey,
  sortActivities,
  sortCheckIns,
  type DateRange,
} from './lib/analysis';
import { buildRecommendations } from './lib/recommendations';
import { loadAppData, restoreDemoData, saveAppData } from './lib/storage';
import type {
  AppData,
  AppPage,
  BehaviorInsight,
  DailyActivity,
  MoodCheckIn,
  ThemePreference,
} from './types';

const navItems: Array<{ id: AppPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'checkin', label: 'Daily check-in', icon: Heart },
  { id: 'activity', label: 'Activity tracking', icon: Activity },
  { id: 'insights', label: 'Behavior patterns', icon: Brain },
  { id: 'recommendations', label: 'Recommendations', icon: Target },
  { id: 'history', label: 'History & trends', icon: BarChart3 },
  { id: 'settings', label: 'Privacy & data', icon: ShieldCheck },
  { id: 'demo', label: 'Interactive demo', icon: Compass },
];

const pageCopy: Record<AppPage, { title: string; description: string }> = {
  overview: {
    title: 'Your patterns, at a glance',
    description: 'Understand your digital habits. Recognize stress patterns. Build healthier routines.',
  },
  checkin: {
    title: 'Make space to check in',
    description: 'A quick, private reflection. Add another check-in whenever it feels useful.',
  },
  activity: {
    title: 'Your digital routine',
    description: 'Record a daily snapshot by hand. MindTrace does not track your devices.',
  },
  insights: {
    title: 'Understand your patterns',
    description: 'See how recent activity and self-reported ratings compare with your own earlier routine.',
  },
  recommendations: {
    title: 'Small steps that may help',
    description: 'Practical, optional suggestions connected to the patterns you have recorded.',
  },
  history: {
    title: 'Your history',
    description: 'See mood check-ins and activity together, day by day.',
  },
  settings: {
    title: 'Your privacy & data',
    description: 'Understand what is stored here and stay in control of your preferences.',
  },
  demo: {
    title: 'Explore the interactive demo',
    description: 'Try a check-in and see the dashboard, patterns, and suggestions respond to your entries.',
  },
};

type MoodForm = {
  recordedAt: string;
  mood: number;
  stress: number;
  energy: number;
  fatigue: number;
  note: string;
  editingId: string | null;
};

type ActivityForm = {
  date: string;
  totalScreenTime: string;
  workStudyHours: string;
  socialMediaHours: string;
  entertainmentHours: string;
  lateNightUsage: string;
  breaks: string;
  averageBreakMinutes: string;
  tasksCompleted: string;
  notes: string;
  editingId: string | null;
};

type ActivityNumericField =
  | 'totalScreenTime'
  | 'workStudyHours'
  | 'socialMediaHours'
  | 'entertainmentHours'
  | 'lateNightUsage'
  | 'breaks'
  | 'averageBreakMinutes'
  | 'tasksCompleted';

function toLocalDateTimeInput(date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function newMoodForm(): MoodForm {
  return { recordedAt: toLocalDateTimeInput(), mood: 3, stress: 3, energy: 3, fatigue: 3, note: '', editingId: null };
}

function newActivityForm(): ActivityForm {
  return {
    date: localDateKey(),
    totalScreenTime: '',
    workStudyHours: '',
    socialMediaHours: '',
    entertainmentHours: '',
    lateNightUsage: '',
    breaks: '',
    averageBreakMinutes: '',
    tasksCompleted: '',
    notes: '',
    editingId: null,
  };
}

function makeId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}

function dataStatus(data: AppData): { demoOnly: boolean; demoCount: number; userCount: number } {
  const records = [...data.moodCheckIns, ...data.activityEntries];
  return {
    demoOnly: records.length > 0 && records.every((record) => record.source === 'demo'),
    demoCount: records.filter((record) => record.source === 'demo').length,
    userCount: records.filter((record) => record.source === 'user').length,
  };
}

function PageHeading({ page, children }: { page: AppPage; children?: ReactNode }) {
  const copy = pageCopy[page];
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{page === 'overview' ? 'MindTrace / overview' : navItems.find((item) => item.id === page)?.label}</div>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  action,
  children,
  className = '',
}: {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(eyebrow || title || action) && (
        <div className="panel-heading">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  accent = '',
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Activity;
  accent?: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${accent}`}><Icon size={18} strokeWidth={1.8} /></div>
      <div className="metric-content">
        <span className="metric-label">{label}</span>
        <strong>{value}</strong>
        <span className="metric-note">{note}</span>
      </div>
    </article>
  );
}

function SourceBadge({ source }: { source: 'demo' | 'user' }) {
  return <span className={`source-badge ${source}`}>{source === 'demo' ? 'Sample' : 'Personal'}</span>;
}

function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><CalendarDays size={19} /></div>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

function RatingScale({
  label,
  hint,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  low: string;
  high: string;
}) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return (
    <fieldset className="rating-field">
      <legend>{label}</legend>
      <p className="field-hint">{hint}</p>
      <div className="rating-options" role="group" aria-label={`${label} rating`}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            type="button"
            key={rating}
            className={rating === value ? 'rating-option selected' : 'rating-option'}
            aria-label={`${label} ${rating} out of 5`}
            aria-pressed={rating === value}
            onClick={() => onChange(rating)}
          >
            {rating}
          </button>
        ))}
      </div>
      <div className="scale-labels"><span>{low}</span><span>{high}</span></div>
      <span className="visually-hidden" id={`${id}-selected`}>Selected: {value} out of 5</span>
    </fieldset>
  );
}

function InsightCard({ insight }: { insight: BehaviorInsight }) {
  return (
    <article className={`insight-card ${insight.status}`}>
      <div className="insight-card-top">
        <span className={`status-dot ${insight.status}`} />
        <span className="insight-status">
          {insight.status === 'steady' ? 'Within recent range'
            : insight.status === 'combined' ? 'Changes observed together'
              : insight.status === 'insufficient' ? 'More history needed'
                : 'A change to notice'}
        </span>
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.description}</p>
      <div className="insight-evidence">{insight.evidence}</div>
    </article>
  );
}

function App() {
  const [initial] = useState(() => loadAppData());
  const [data, setData] = useState<AppData>(initial.data);
  const [activePage, setActivePage] = useState<AppPage>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notice, setNotice] = useState(initial.warning);
  const [moodForm, setMoodForm] = useState<MoodForm>(() => newMoodForm());
  const [activityForm, setActivityForm] = useState<ActivityForm>(() => newActivityForm());
  const [moodErrors, setMoodErrors] = useState<Record<string, string>>({});
  const [activityErrors, setActivityErrors] = useState<Record<string, string>>({});
  const [range, setRange] = useState<DateRange>('7d');
  const [historyRange, setHistoryRange] = useState<DateRange>('30d');
  const [historySearch, setHistorySearch] = useState('');
  const today = localDateKey();

  useEffect(() => {
    document.documentElement.dataset.theme = data.preferences.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      data.preferences.theme === 'dark' ? '#151e22' : '#f5f5f1',
    );
  }, [data.preferences.theme]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 5500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const orderedActivities = useMemo(() => sortActivities(data.activityEntries), [data.activityEntries]);
  const orderedCheckIns = useMemo(() => sortCheckIns(data.moodCheckIns), [data.moodCheckIns]);
  const allSummaries = useMemo(
    () => buildDailySummaries(data.activityEntries, data.moodCheckIns),
    [data.activityEntries, data.moodCheckIns],
  );
  const baseline = useMemo(
    () => analyzeBaseline(data.activityEntries, data.moodCheckIns),
    [data.activityEntries, data.moodCheckIns],
  );
  const analysis = useMemo(() => buildInsights(baseline), [baseline]);
  const recommendations = useMemo(() => buildRecommendations(analysis.insights), [analysis.insights]);
  const sourceSummary = useMemo(() => dataStatus(data), [data]);
  const todaySummary = allSummaries.find((item) => item.date === today);
  const todayCheckIns = orderedCheckIns.filter((entry) => entry.date === today);
  const chartSummaries = filterByRange(allSummaries, range);

  const updateData = (updater: (previous: AppData) => AppData) => {
    const updated = updater(data);
    setData(updated);
    try {
      saveAppData(updated);
      setNotice('Saved in this browser.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save your changes.');
    }
  };

  const navigate = (page: AppPage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setTheme = (theme: ThemePreference) => {
    updateData((previous) => ({ ...previous, preferences: { ...previous.preferences, theme } }));
  };

  const saveMood = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const date = new Date(moodForm.recordedAt);
    if (!moodForm.recordedAt || !Number.isFinite(date.getTime())) {
      errors.recordedAt = 'Choose a valid date and time.';
    }
    if (date.getTime() > Date.now() + 60_000) errors.recordedAt = 'A check-in cannot be in the future.';
    setMoodErrors(errors);
    if (Object.keys(errors).length) return;

    const entry: MoodCheckIn = {
      id: moodForm.editingId ?? makeId('checkin'),
      date: localDateKey(date),
      recordedAt: date.toISOString(),
      mood: moodForm.mood,
      stress: moodForm.stress,
      energy: moodForm.energy,
      fatigue: moodForm.fatigue,
      note: moodForm.note.trim(),
      source: 'user',
    };
    updateData((previous) => ({
      ...previous,
      moodCheckIns: sortCheckIns([
        ...previous.moodCheckIns.filter((item) => item.id !== entry.id),
        entry,
      ]),
    }));
    setMoodForm(newMoodForm());
  };

  const saveActivity = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const errors: Record<string, string> = {};
    const total = Number(activityForm.totalScreenTime);
    const optionalFields: Array<[keyof ActivityForm, string, number]> = [
      ['workStudyHours', 'Work / study', 24],
      ['socialMediaHours', 'Social media', 24],
      ['entertainmentHours', 'Entertainment', 24],
      ['lateNightUsage', 'Late-night use', 24],
      ['breaks', 'Break count', 100],
      ['averageBreakMinutes', 'Average break duration', 240],
      ['tasksCompleted', 'Tasks completed', 1000],
    ];
    if (!isValidDateKey(activityForm.date)) errors.date = 'Choose a valid date.';
    if (activityForm.date > today) errors.date = 'Activity dates cannot be in the future.';
    if (!Number.isFinite(total) || total < 0 || total > 24) {
      errors.totalScreenTime = 'Enter total screen time from 0 to 24 hours.';
    }
    for (const [key, label, max] of optionalFields) {
      const rawValue = activityForm[key];
      if (typeof rawValue !== 'string' || rawValue.trim() === '') continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0 || value > max) {
        errors[key] = `${label} must be between 0 and ${max}${key === 'averageBreakMinutes' ? ' minutes' : key.includes('Hours') || key === 'lateNightUsage' ? ' hours' : ''}.`;
      } else if (
        ['workStudyHours', 'socialMediaHours', 'entertainmentHours', 'lateNightUsage'].includes(key)
        && value > total
      ) {
        errors[key] = `${label} cannot exceed total screen time.`;
      } else if (key === 'breaks' && !Number.isInteger(value)) {
        errors[key] = 'Break count must be a whole number.';
      } else if (key === 'tasksCompleted' && !Number.isInteger(value)) {
        errors[key] = 'Tasks completed must be a whole number.';
      }
    }
    setActivityErrors(errors);
    if (Object.keys(errors).length) return;

    const entry: DailyActivity = {
      id: activityForm.editingId
        ?? data.activityEntries.find((item) => item.date === activityForm.date)?.id
        ?? makeId('activity'),
      date: activityForm.date,
      totalScreenTime: total,
      workStudyHours: optionalNumber(activityForm.workStudyHours),
      socialMediaHours: optionalNumber(activityForm.socialMediaHours),
      entertainmentHours: optionalNumber(activityForm.entertainmentHours),
      lateNightUsage: optionalNumber(activityForm.lateNightUsage),
      breaks: optionalNumber(activityForm.breaks),
      averageBreakMinutes: optionalNumber(activityForm.averageBreakMinutes),
      tasksCompleted: optionalNumber(activityForm.tasksCompleted),
      notes: activityForm.notes.trim() || undefined,
      source: 'user',
    };
    updateData((previous) => ({
      ...previous,
      activityEntries: sortActivities([
        ...previous.activityEntries.filter((item) => item.id !== entry.id && item.date !== entry.date),
        entry,
      ]),
    }));
    setActivityForm(newActivityForm());
  };

  const editMood = (entry: MoodCheckIn) => {
    setMoodForm({
      recordedAt: toLocalDateTimeInput(new Date(entry.recordedAt)),
      mood: entry.mood,
      stress: entry.stress,
      energy: entry.energy,
      fatigue: entry.fatigue,
      note: entry.note,
      editingId: entry.id,
    });
    setMoodErrors({});
    navigate('checkin');
  };

  const editActivity = (entry: DailyActivity) => {
    setActivityForm({
      date: entry.date,
      totalScreenTime: String(entry.totalScreenTime),
      workStudyHours: entry.workStudyHours === undefined ? '' : String(entry.workStudyHours),
      socialMediaHours: entry.socialMediaHours === undefined ? '' : String(entry.socialMediaHours),
      entertainmentHours: entry.entertainmentHours === undefined ? '' : String(entry.entertainmentHours),
      lateNightUsage: entry.lateNightUsage === undefined ? '' : String(entry.lateNightUsage),
      breaks: entry.breaks === undefined ? '' : String(entry.breaks),
      averageBreakMinutes: entry.averageBreakMinutes === undefined ? '' : String(entry.averageBreakMinutes),
      tasksCompleted: entry.tasksCompleted === undefined ? '' : String(entry.tasksCompleted),
      notes: entry.notes ?? '',
      editingId: entry.id,
    });
    setActivityErrors({});
    navigate('activity');
  };

  const deleteMood = (entry: MoodCheckIn) => {
    if (!window.confirm(`Delete the ${formatDateTime(entry.recordedAt)} check-in? This cannot be undone.`)) return;
    updateData((previous) => ({
      ...previous,
      moodCheckIns: previous.moodCheckIns.filter((item) => item.id !== entry.id),
    }));
  };

  const deleteActivity = (entry: DailyActivity) => {
    if (!window.confirm(`Delete the activity entry for ${formatDate(entry.date)}? This cannot be undone.`)) return;
    updateData((previous) => ({
      ...previous,
      activityEntries: previous.activityEntries.filter((item) => item.id !== entry.id),
    }));
    if (activityForm.editingId === entry.id) setActivityForm(newActivityForm());
  };

  const resetToDemo = () => {
    if (!window.confirm('Restore the sample dataset? This replaces the records currently saved in this browser.')) return;
    updateData((previous) => ({
      ...restoreDemoData(),
      preferences: previous.preferences,
    }));
    setMoodForm(newMoodForm());
    setActivityForm(newActivityForm());
    setNotice('Sample records restored in this browser.');
  };

  const clearPersonalData = () => {
    if (!window.confirm('Remove all personal records saved in this browser? Sample records will remain. This cannot be undone.')) return;
    updateData((previous) => ({
      ...previous,
      moodCheckIns: previous.moodCheckIns.filter((item) => item.source === 'demo'),
      activityEntries: previous.activityEntries.filter((item) => item.source === 'demo'),
    }));
    setNotice('Personal records cleared. Sample records were kept.');
  };

  const exportData = () => {
    try {
      const payload = JSON.stringify({ format: 'mindtrace-local-export-v1', exportedAt: new Date().toISOString(), data }, null, 2);
      const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `mindtrace-export-${today}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('A JSON export was downloaded to your device.');
    } catch (error) {
      setNotice(error instanceof Error ? `Export failed: ${error.message}` : 'Export failed.');
    }
  };

  const goToAction = (page: AppPage) => () => navigate(page);

  const renderOverview = () => {
    const latestTodayMood = todayCheckIns.at(-1);
    const chartData = chartSummaries.map((summary) => ({
      date: formatDate(summary.date),
      screenTime: summary.activity?.totalScreenTime ?? null,
      lateNight: summary.activity?.lateNightUsage ?? null,
      breaks: summary.activity?.breaks ?? null,
      tasks: summary.activity?.tasksCompleted ?? null,
      mood: summary.averageMood === null ? null : Number(summary.averageMood.toFixed(2)),
      stress: summary.averageStress === null ? null : Number(summary.averageStress.toFixed(2)),
      fatigue: summary.averageFatigue === null ? null : Number(summary.averageFatigue.toFixed(2)),
    }));
    const recentCheckIns = [...todayCheckIns].reverse();
    const priorityInsight = analysis.insights[0];
    return (
      <>
        <PageHeading page="overview">
          <button className="button button-quiet" onClick={goToAction('checkin')}><Plus size={16} /> Check in</button>
          <button className="button button-primary" onClick={goToAction('activity')}><Plus size={16} /> Log activity</button>
        </PageHeading>

        {sourceSummary.demoOnly && (
          <div className="demo-banner"><span className="demo-pip" /> Sample data is shown. Add your own entries to make these patterns personal.
            <button onClick={goToAction('demo')}>Try the interactive demo <ChevronRight size={14} /></button>
            <button onClick={goToAction('settings')}>Data controls <ChevronRight size={14} /></button>
          </div>
        )}

        <div className="snapshot-heading">
          <div><span className="eyebrow">Today · {formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <h2>A snapshot, not a score</h2></div>
          <div className="range-switcher" role="group" aria-label="Chart date range">
            {(['7d', '30d', 'all'] as const).map((item) => (
              <button key={item} className={range === item ? 'range-button selected' : 'range-button'} onClick={() => setRange(item)}>
                {item === 'all' ? 'All time' : item === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>

        <div className="metric-grid">
          <MetricCard label="Self-reported stress" value={latestTodayMood ? `${latestTodayMood.stress} / 5` : '—'}
            note={latestTodayMood ? 'Higher means more stress' : 'Only shown when reported'} icon={Brain} accent="amber" />
          <MetricCard label="Self-reported fatigue" value={latestTodayMood ? `${latestTodayMood.fatigue} / 5` : '—'}
            note={latestTodayMood ? 'Higher means more fatigue' : 'Only shown when reported'} icon={Heart} accent="rose" />
          <MetricCard label="Screen time" value={todaySummary?.activity ? `${todaySummary.activity.totalScreenTime.toFixed(1)}h` : '—'}
            note={todaySummary?.activity ? 'Manual daily entry' : 'No activity recorded today'} icon={Activity} accent="teal" />
          <MetricCard label="Active work / study" value={todaySummary?.activity?.workStudyHours === undefined ? '—' : `${todaySummary.activity.workStudyHours.toFixed(1)}h`}
            note={todaySummary?.activity?.workStudyHours === undefined ? 'No active hours recorded' : 'Manually recorded hours'} icon={Clock3} accent="blue" />
          <MetricCard label="Tasks completed" value={todaySummary?.activity?.tasksCompleted === undefined ? '—' : String(todaySummary.activity.tasksCompleted)}
            note={todaySummary?.activity?.tasksCompleted === undefined ? 'No task count recorded' : 'Self-reported daily total'} icon={Target} accent="blue" />
          <MetricCard label="Breaks taken" value={todaySummary?.activity?.breaks === undefined ? '—' : String(todaySummary.activity.breaks)}
            note={todaySummary?.activity?.breaks === undefined ? 'No break count recorded' : 'Self-reported daily total'} icon={Check} accent="teal" />
        </div>

        <div className="dashboard-grid chart-grid">
          <Panel className="chart-panel chart-wide" eyebrow="Digital activity" title="Screen time over time"
            action={<span className="chart-unit">Hours per day</span>}>
            {chartData.some((item) => item.screenTime !== null) ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 10, bottom: 2, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={22} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="h" />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value) => [value === null ? 'Not recorded' : `${Number(value).toFixed(1)}h`, 'Screen time']} />
                    <Line type="monotone" dataKey="screenTime" name="Screen time" stroke="var(--teal)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--surface)', strokeWidth: 2 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No activity entries in this range">Record activity manually to see your trend.</EmptyState>}
          </Panel>

          <Panel className="chart-panel" eyebrow="Self-reported" title="Mood, stress & fatigue"
            action={<span className="chart-unit">Scale of 1–5</span>}>
            {chartData.some((item) => item.mood !== null || item.stress !== null || item.fatigue !== null) ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 2, left: -20 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={18} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value, name) => [value === null ? 'Not recorded' : `${Number(value).toFixed(1)} / 5`, name]} />
                    <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
                    <Line type="monotone" dataKey="mood" name="Mood" stroke="var(--teal)" strokeWidth={2.2} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="stress" name="Stress" stroke="var(--coral)" strokeWidth={2.2} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="var(--amber)" strokeWidth={2.2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No check-ins in this range">Mood and stress are shown only when you record them.</EmptyState>}
          </Panel>

          <Panel className="chart-panel" eyebrow="Rest rhythm" title="Breaks recorded"
            action={<span className="chart-unit">Count per day</span>}>
            {chartData.some((item) => item.breaks !== null) ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 2, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={18} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value) => [value === null ? 'Not recorded' : `${value} breaks`, 'Breaks']} />
                    <Line type="monotone" dataKey="breaks" name="Breaks" stroke="var(--blue)" strokeWidth={2.2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No break data in this range">Breaks appear when you choose to record them.</EmptyState>}
          </Panel>

          <Panel className="chart-panel" eyebrow="Digital routine" title="Late-night use"
            action={<span className="chart-unit">Hours per day</span>}>
            {chartData.some((item) => item.lateNight !== null) ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 2, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={18} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="h" />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value) => [value === null ? 'Not recorded' : `${Number(value).toFixed(1)}h`, 'Late-night use']} />
                    <Line type="monotone" dataKey="lateNight" name="Late-night use" stroke="var(--amber)" strokeWidth={2.2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No late-night data in this range">This optional field appears after you record it.</EmptyState>}
          </Panel>

          <Panel className="chart-panel" eyebrow="Daily focus" title="Tasks completed"
            action={<span className="chart-unit">Self-reported count</span>}>
            {chartData.some((item) => item.tasks !== null) ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 2, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={18} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value) => [value === null ? 'Not recorded' : `${value} tasks`, 'Tasks completed']} />
                    <Line type="monotone" dataKey="tasks" name="Tasks completed" stroke="var(--blue)" strokeWidth={2.2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No task data in this range">Task counts are optional and are not a measure of well-being.</EmptyState>}
          </Panel>
        </div>

        <div className="dashboard-grid lower-grid">
          <Panel eyebrow="Check-in timeline" title={`Today · ${todayCheckIns.length} ${todayCheckIns.length === 1 ? 'entry' : 'entries'}`}
            action={<button className="text-button" onClick={goToAction('checkin')}>Add check-in <ChevronRight size={14} /></button>}>
            {recentCheckIns.length ? (
              <div className="timeline-list">
                {recentCheckIns.map((entry) => (
                  <div className="timeline-row" key={entry.id}>
                    <span className="timeline-marker" />
                    <div className="timeline-main"><strong>{getDayPeriod(entry.recordedAt)}</strong><span>{new Date(entry.recordedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
                    <div className="timeline-ratings"><span>Mood <b>{entry.mood}/5</b></span><span>Stress <b>{entry.stress}/5</b></span></div>
                    <SourceBadge source={entry.source} />
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No check-ins recorded today">There is no daily target. Add a reflection only if it is useful to you.</EmptyState>}
          </Panel>
          <Panel eyebrow="Worth a look" title={priorityInsight?.title ?? 'Patterns at a glance'}
            action={<button className="text-button" onClick={goToAction('insights')}>All insights <ChevronRight size={14} /></button>}>
            {priorityInsight ? <InsightCard insight={priorityInsight} /> : <EmptyState title="More history needed">Add records over time for a personal comparison.</EmptyState>}
          </Panel>
        </div>
      </>
    );
  };

  const renderCheckIn = () => (
    <>
      <PageHeading page="checkin">
        <span className="privacy-inline"><ShieldCheck size={15} /> Stored in this browser</span>
      </PageHeading>
      <div className="two-column-layout">
        <div className="form-stack">
          <Panel className="form-panel" eyebrow="Personal reflection" title={moodForm.editingId ? 'Edit this check-in' : 'How are you feeling?'}>
            <form onSubmit={saveMood} className="form-stack">
            <label className="field">
              <span>Date and time</span>
              <input type="datetime-local" value={moodForm.recordedAt} max={toLocalDateTimeInput()}
                onChange={(event) => {
                  setMoodForm((previous) => ({ ...previous, recordedAt: event.target.value }));
                  setMoodErrors((previous) => ({ ...previous, recordedAt: '' }));
                }} />
              {moodErrors.recordedAt && <span className="field-error">{moodErrors.recordedAt}</span>}
            </label>
            <div className="rating-grid">
              <RatingScale label="Mood" hint="How does your mood feel right now?" value={moodForm.mood} onChange={(mood) => setMoodForm((previous) => ({ ...previous, mood }))} low="Very low" high="Very good" />
              <RatingScale label="Stress" hint="Higher means more self-reported stress." value={moodForm.stress} onChange={(stress) => setMoodForm((previous) => ({ ...previous, stress }))} low="Very calm" high="Very high" />
              <RatingScale label="Energy" hint="How much energy do you have?" value={moodForm.energy} onChange={(energy) => setMoodForm((previous) => ({ ...previous, energy }))} low="Very low" high="Very high" />
              <RatingScale label="Fatigue" hint="Higher means more self-reported fatigue." value={moodForm.fatigue} onChange={(fatigue) => setMoodForm((previous) => ({ ...previous, fatigue }))} low="Well rested" high="Very tired" />
            </div>
            <label className="field">
              <span>Optional note</span>
              <textarea rows={3} maxLength={500} placeholder="Anything you want to remember about this moment?"
                value={moodForm.note} onChange={(event) => setMoodForm((previous) => ({ ...previous, note: event.target.value }))} />
              <small>Only stored locally. Avoid adding details you would not want saved in this browser.</small>
            </label>
            <div className="form-actions">
              <button className="button button-primary" type="submit">{moodForm.editingId ? 'Update check-in' : 'Save check-in'} <ChevronRight size={16} /></button>
              {moodForm.editingId && <button className="button button-quiet" type="button" onClick={() => { setMoodForm(newMoodForm()); setMoodErrors({}); }}>Cancel edit</button>}
            </div>
            <p className="form-footnote">Your ratings are personal reflections, not clinical measurements. You can record multiple check-ins on the same day.</p>
            </form>
          </Panel>
          <Panel className="form-panel quick-activity-panel" eyebrow="Daily digital routine" title="Add an activity snapshot">
            <p className="panel-copy">Keep activity and well-being in one daily flow. Activity is entered manually and may be saved separately from multiple mood check-ins.</p>
            <form onSubmit={(event) => saveActivity(event)} className="form-stack quick-activity-form">
              <div className="form-grid">
                <label className="field"><span>Activity date</span>
                  <input type="date" value={activityForm.date} max={today} onChange={(event) => {
                    setActivityForm((previous) => ({ ...previous, date: event.target.value }));
                    setActivityErrors((previous) => ({ ...previous, date: '' }));
                  }} />
                  {activityErrors.date && <span className="field-error">{activityErrors.date}</span>}
                </label>
                <label className="field"><span>Total screen time (hours) *</span>
                  <input type="number" min="0" max="24" step="0.1" required value={activityForm.totalScreenTime}
                    onChange={(event) => {
                      setActivityForm((previous) => ({ ...previous, totalScreenTime: event.target.value }));
                      setActivityErrors((previous) => ({ ...previous, totalScreenTime: '' }));
                    }} />
                  {activityErrors.totalScreenTime && <span className="field-error">{activityErrors.totalScreenTime}</span>}
                </label>
                <label className="field"><span>Active work / study (hours)</span>
                  <input type="number" min="0" max="24" step="0.1" value={activityForm.workStudyHours}
                    onChange={(event) => {
                      setActivityForm((previous) => ({ ...previous, workStudyHours: event.target.value }));
                      setActivityErrors((previous) => ({ ...previous, workStudyHours: '' }));
                    }} />
                  {activityErrors.workStudyHours && <span className="field-error">{activityErrors.workStudyHours}</span>}
                </label>
                <label className="field"><span>Late-night use (hours)</span>
                  <input type="number" min="0" max="24" step="0.1" value={activityForm.lateNightUsage}
                    onChange={(event) => {
                      setActivityForm((previous) => ({ ...previous, lateNightUsage: event.target.value }));
                      setActivityErrors((previous) => ({ ...previous, lateNightUsage: '' }));
                    }} />
                  {activityErrors.lateNightUsage && <span className="field-error">{activityErrors.lateNightUsage}</span>}
                </label>
                <label className="field"><span>Breaks taken</span>
                  <input type="number" min="0" max="100" step="1" value={activityForm.breaks}
                    onChange={(event) => {
                      setActivityForm((previous) => ({ ...previous, breaks: event.target.value }));
                      setActivityErrors((previous) => ({ ...previous, breaks: '' }));
                    }} />
                  {activityErrors.breaks && <span className="field-error">{activityErrors.breaks}</span>}
                </label>
                <label className="field"><span>Tasks completed</span>
                  <input type="number" min="0" max="1000" step="1" value={activityForm.tasksCompleted}
                    onChange={(event) => {
                      setActivityForm((previous) => ({ ...previous, tasksCompleted: event.target.value }));
                      setActivityErrors((previous) => ({ ...previous, tasksCompleted: '' }));
                    }} />
                  {activityErrors.tasksCompleted && <span className="field-error">{activityErrors.tasksCompleted}</span>}
                </label>
              </div>
              <div className="form-actions">
                <button className="button button-primary" type="submit">{activityForm.editingId ? 'Update activity' : 'Save activity'} <Activity size={15} /></button>
                <button className="button button-quiet" type="button" onClick={() => navigate('activity')}>More activity fields</button>
              </div>
            </form>
          </Panel>
        </div>
        <Panel className="list-panel" eyebrow="Your history" title={`${orderedCheckIns.length} check-ins`}>
          {orderedCheckIns.length ? (
            <div className="record-list">
              {[...orderedCheckIns].reverse().map((entry) => (
                <article className="record-row" key={entry.id}>
                  <div className="record-date"><span>{formatDate(entry.date, { month: 'short', day: 'numeric' })}</span><small>{new Date(entry.recordedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>
                  <div className="record-body"><strong>{getDayPeriod(entry.recordedAt)} check-in</strong>
                    <span>Mood {entry.mood} · Stress {entry.stress} · Energy {entry.energy} · Fatigue {entry.fatigue}</span>
                    {entry.note && <p>{entry.note}</p>}</div>
                  <div className="record-tools"><SourceBadge source={entry.source} />
                    <button className="icon-button" aria-label="Edit check-in" title="Edit" onClick={() => editMood(entry)}><span className="visually-hidden">Edit check-in</span><Activity size={15} /></button>
                    <button className="icon-button danger" aria-label="Delete check-in" title="Delete" onClick={() => deleteMood(entry)}><span className="visually-hidden">Delete check-in</span><X size={15} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="Your check-ins will appear here">No entries yet. Your first reflection is always optional.</EmptyState>}
        </Panel>
      </div>
    </>
  );

  const renderActivity = () => {
    const clearActivityError = (field: string) => {
      setActivityErrors((previous) => ({ ...previous, [field]: '' }));
    };
    const numberField = (
      label: string,
      key: ActivityNumericField,
      options: { min?: number; max?: number; step?: number; required?: boolean; suffix?: string } = {},
    ) => (
      <label className="field" key={key}>
        <span>{label}{options.required ? ' *' : ''}</span>
        <div className="input-with-unit">
          <input type="number" min={options.min ?? 0} max={options.max ?? 24} step={options.step ?? 'any'}
            required={options.required} value={activityForm[key]}
            onChange={(event) => {
              setActivityForm((previous) => ({ ...previous, [key]: event.target.value }));
              clearActivityError(key);
            }} />
          {options.suffix && <span>{options.suffix}</span>}
        </div>
        {activityErrors[key] && <span className="field-error">{activityErrors[key]}</span>}
      </label>
    );
    return (
      <>
        <PageHeading page="activity"><span className="privacy-inline"><Clock3 size={15} /> Manual entry only</span></PageHeading>
        <div className="two-column-layout activity-layout">
          <Panel className="form-panel" eyebrow="Daily activity" title={activityForm.editingId ? 'Edit activity entry' : 'Add a daily snapshot'}>
            <form onSubmit={saveActivity} className="form-stack">
              <div className="form-grid">
                <label className="field">
                  <span>Date *</span>
                  <input type="date" value={activityForm.date} max={today}
                    onChange={(event) => {
                      setActivityForm((previous) => ({ ...previous, date: event.target.value }));
                      clearActivityError('date');
                    }} />
                  {activityErrors.date && <span className="field-error">{activityErrors.date}</span>}
                </label>
                {numberField('Total screen time', 'totalScreenTime', { max: 24, step: 0.1, required: true, suffix: 'hours' })}
              </div>
              <div className="form-section-heading"><span>Screen use</span><small>Categories are optional and should be within total screen time.</small></div>
              <div className="form-grid">
                {numberField('Work / study', 'workStudyHours', { suffix: 'hours' })}
                {numberField('Social media', 'socialMediaHours', { suffix: 'hours' })}
                {numberField('Entertainment', 'entertainmentHours', { suffix: 'hours' })}
                {numberField('Late-night use', 'lateNightUsage', { suffix: 'hours' })}
              </div>
              <div className="form-section-heading"><span>Breaks & focus</span><small>Leave fields blank when you did not record them.</small></div>
              <div className="form-grid">
                {numberField('Number of breaks', 'breaks', { max: 100, step: 1, suffix: 'breaks' })}
                {numberField('Average break duration', 'averageBreakMinutes', { max: 240, step: 1, suffix: 'minutes' })}
                {numberField('Tasks completed', 'tasksCompleted', { max: 1000, step: 1, suffix: 'tasks' })}
              </div>
              <label className="field"><span>Optional note</span>
                <textarea rows={2} maxLength={500} value={activityForm.notes} placeholder="Anything about this day you want to note?"
                  onChange={(event) => setActivityForm((previous) => ({ ...previous, notes: event.target.value }))} />
              </label>
              <p className="form-footnote">Enter the total once. Work/study, social media, entertainment, and late-night use are each checked against that total; categories may overlap.</p>
              <div className="form-actions">
                <button className="button button-primary" type="submit">{activityForm.editingId ? 'Update activity' : 'Save activity'} <ChevronRight size={16} /></button>
                {activityForm.editingId && <button className="button button-quiet" type="button" onClick={() => { setActivityForm(newActivityForm()); setActivityErrors({}); }}>Cancel edit</button>}
                {!activityForm.editingId && <button className="button button-quiet" type="button" onClick={() => { setActivityForm(newActivityForm()); setActivityErrors({}); }}>Clear fields</button>}
              </div>
            </form>
          </Panel>
          <Panel className="list-panel" eyebrow="One activity record per day" title={`${orderedActivities.length} days recorded`}>
            {orderedActivities.length ? (
              <div className="record-list">
                {[...orderedActivities].reverse().map((entry) => (
                  <article className="record-row activity-record" key={entry.id}>
                    <div className="record-date"><span>{formatDate(entry.date, { month: 'short', day: 'numeric' })}</span><small>{entry.totalScreenTime.toFixed(1)}h screen</small></div>
                    <div className="record-body"><strong>{entry.breaks === undefined ? 'Breaks not recorded' : `${entry.breaks} breaks`}
                      {entry.lateNightUsage !== undefined ? ` · ${entry.lateNightUsage.toFixed(1)}h late-night` : ''}</strong>
                      <span>{entry.workStudyHours === undefined ? 'Work/study not recorded' : `${entry.workStudyHours.toFixed(1)}h work/study`}{entry.tasksCompleted === undefined ? '' : ` · ${entry.tasksCompleted} tasks`}</span>
                      {entry.notes && <p>{entry.notes}</p>}
                    </div>
                    <div className="record-tools"><SourceBadge source={entry.source} />
                      <button className="icon-button" aria-label="Edit activity entry" title="Edit" onClick={() => editActivity(entry)}><span className="visually-hidden">Edit activity entry</span><Activity size={15} /></button>
                      <button className="icon-button danger" aria-label="Delete activity entry" title="Delete" onClick={() => deleteActivity(entry)}><span className="visually-hidden">Delete activity entry</span><X size={15} /></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState title="No activity entries yet">Start with total screen time. Other measurements are optional.</EmptyState>}
          </Panel>
        </div>
      </>
    );
  };

  const renderInsights = () => (
    <>
      <PageHeading page="insights" />
      <div className="insight-overview-grid">
        <Panel className="drift-panel" eyebrow="Personal activity pattern" title="Behavior drift">
          <div className="drift-content">
            <div className={`drift-number ${analysis.drift === null ? 'unavailable' : ''}`}>
              {analysis.drift === null ? '—' : analysis.drift}<small>{analysis.drift === null ? '' : '/100'}</small>
            </div>
            <div><strong>{analysis.drift === null ? 'Not enough comparable data' : 'Deviation from your recent routine'}</strong>
              <p>This is a transparent activity-pattern deviation indicator, not a stress score, health measure, or prediction.</p>
              <span className="field-hint">{baseline.reason}</span>
            </div>
          </div>
          {(baseline.activityComparisons.length > 0 || baseline.moodComparisons.length > 0) && (
            <div className="comparison-list">
              {baseline.activityComparisons.length > 0 && (
                <>
                  <div className="comparison-section-label">Digital activity</div>
                  {baseline.activityComparisons.map((item) => (
                    <div className="comparison-row" key={item.metric}><span>{item.metric}</span>
                      <span>{item.baseline.toFixed(1)}{item.unit} baseline</span><b>{item.recent.toFixed(1)}{item.unit} recent</b>
                      {item.recent > item.baseline ? <ArrowUpRight size={15} /> : item.recent < item.baseline ? <ArrowDownRight size={15} /> : <span className="comparison-equal">—</span>}
                    </div>
                  ))}
                </>
              )}
              {baseline.moodComparisons.length > 0 && (
                <>
                  <div className="comparison-section-label">Self-reported ratings</div>
                  {baseline.moodComparisons.map((item) => (
                    <div className="comparison-row" key={item.metric}><span>{item.metric}</span>
                      <span>{item.baseline.toFixed(1)}{item.unit} baseline</span><b>{item.recent.toFixed(1)}{item.unit} recent</b>
                      {item.recent > item.baseline ? <ArrowUpRight size={15} /> : item.recent < item.baseline ? <ArrowDownRight size={15} /> : <span className="comparison-equal">—</span>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </Panel>
        <Panel className="baseline-note" eyebrow="How to read this" title="Your routine is the reference">
          <p>Each available measure compares your latest 7 days with the 21 days before that. A comparison appears only with at least 3 recent and 5 baseline records for that measure.</p>
          <p>Behavior drift averages capped relative deviations for available activity measures (screen time, late-night use, breaks, and work/study). Missing measures are excluded; at least two comparisons are needed.</p>
          <p>These are descriptive rules, not an AI model or clinical assessment. Screen time alone is never treated as proof of stress.</p>
        </Panel>
      </div>
      <div className="section-title"><div><span className="eyebrow">Explainable patterns</span><h2>What changed</h2></div><span>{analysis.insights.length} observations</span></div>
      <div className="insight-grid">{analysis.insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)}</div>
    </>
  );

  const renderRecommendations = () => (
    <>
      <PageHeading page="recommendations" />
      <div className="recommendation-grid">
        {recommendations.map((recommendation) => (
          <article className="recommendation-card" key={recommendation.id}>
            <div className={`recommendation-priority ${recommendation.priority}`}><Target size={15} /> {recommendation.priority}</div>
            <h3>{recommendation.title}</h3><p>{recommendation.explanation}</p>
            <div className="recommendation-evidence"><strong>What this is based on</strong><span>{recommendation.supportingObservation}</span></div>
            <div className="recommendation-action"><Check size={16} /><span>{recommendation.suggestedAction}</span></div>
          </article>
        ))}
      </div>
      <p className="recommendations-disclaimer">Suggestions are optional, based on your recorded information, and are not medical advice.</p>
    </>
  );

  const renderDemo = () => {
    const latestTodayMood = todayCheckIns.at(-1);
    const todayActivity = todaySummary?.activity;
    return (
      <>
        <PageHeading page="demo">
          <span className="privacy-inline"><ShieldCheck size={15} /> Uses illustrative sample records</span>
        </PageHeading>
        <div className="demo-intro-grid">
          <Panel className="demo-start-panel" eyebrow="Try the experience" title="Your check-in updates the story">
            <p className="panel-copy">This is a working prototype, not a video or a scripted simulation. Submit a reflection or activity snapshot, then see the dashboard and rule-based observations update from the same browser data.</p>
            <div className="demo-steps">
              <div><span>01</span><strong>Record</strong><small>Add a daily check-in or activity snapshot.</small></div>
              <div><span>02</span><strong>Review</strong><small>See recorded values in your dashboard and history.</small></div>
              <div><span>03</span><strong>Reflect</strong><small>Explore comparisons and practical suggestions.</small></div>
            </div>
            <div className="form-actions demo-actions">
              <button className="button button-primary" onClick={goToAction('checkin')}>Complete a check-in <ChevronRight size={15} /></button>
              <button className="button button-quiet" onClick={goToAction('overview')}>View dashboard</button>
            </div>
          </Panel>
          <Panel className="demo-live-panel" eyebrow="Live sample state" title="What the prototype currently sees">
            <div className="demo-live-values">
              <div><span>Today’s screen time</span><strong>{todayActivity ? `${todayActivity.totalScreenTime.toFixed(1)}h` : 'Not recorded'}</strong></div>
              <div><span>Most recent stress</span><strong>{latestTodayMood ? `${latestTodayMood.stress} / 5` : 'Not recorded'}</strong></div>
              <div><span>Most recent fatigue</span><strong>{latestTodayMood ? `${latestTodayMood.fatigue} / 5` : 'Not recorded'}</strong></div>
              <div><span>Behavior drift</span><strong>{analysis.drift === null ? 'Insufficient history' : `${analysis.drift} / 100`}</strong></div>
            </div>
            <div className="demo-live-insight">
              <span className="eyebrow">Current observation</span>
              <strong>{analysis.insights[0]?.title ?? 'More history needed'}</strong>
              <p>{analysis.insights[0]?.description ?? 'Record data over time to create a personal comparison.'}</p>
            </div>
            <button className="text-button" onClick={goToAction('recommendations')}>See related suggestions <ChevronRight size={14} /></button>
          </Panel>
        </div>
      </>
    );
  };

  const renderHistory = () => {
    const rangedSummaries = filterByRange(allSummaries, historyRange);
    const historyChartData = rangedSummaries.map((summary) => ({
      date: formatDate(summary.date),
      screenTime: summary.activity?.totalScreenTime ?? null,
      mood: summary.averageMood === null ? null : Number(summary.averageMood.toFixed(2)),
      stress: summary.averageStress === null ? null : Number(summary.averageStress.toFixed(2)),
      fatigue: summary.averageFatigue === null ? null : Number(summary.averageFatigue.toFixed(2)),
    }));
    const summaries = rangedSummaries.filter((item) => {
      if (!historySearch.trim()) return true;
      const query = historySearch.toLowerCase();
      return item.date.includes(query) || item.checkIns.some((entry) => entry.note.toLowerCase().includes(query))
        || item.activity?.notes?.toLowerCase().includes(query) === true;
    }).reverse();
    return (
      <>
        <PageHeading page="history">
          <button className="button button-quiet" onClick={exportData}><Download size={16} /> Export JSON</button>
        </PageHeading>
        <div className="history-trend-grid">
          <Panel className="chart-panel" eyebrow="Historical activity" title="Screen time"
            action={<span className="chart-unit">Hours per day</span>}>
            {historyChartData.some((item) => item.screenTime !== null) ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyChartData} margin={{ top: 8, right: 8, bottom: 2, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} minTickGap={18} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} unit="h" />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value) => [value === null ? 'Not recorded' : `${Number(value).toFixed(1)}h`, 'Screen time']} />
                    <Line type="monotone" dataKey="screenTime" name="Screen time" stroke="var(--teal)" strokeWidth={2.2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No activity in this range">Activity trends appear after entries are recorded.</EmptyState>}
          </Panel>
          <Panel className="chart-panel" eyebrow="Historical check-ins" title="Mood, stress & fatigue"
            action={<span className="chart-unit">Scale of 1–5</span>}>
            {historyChartData.some((item) => item.mood !== null || item.stress !== null || item.fatigue !== null) ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyChartData} margin={{ top: 8, right: 8, bottom: 2, left: -20 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} minTickGap={18} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value, name) => [value === null ? 'Not recorded' : `${Number(value).toFixed(1)} / 5`, name]} />
                    <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 11 }} />
                    <Line type="monotone" dataKey="mood" name="Mood" stroke="var(--teal)" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="stress" name="Stress" stroke="var(--coral)" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="var(--amber)" strokeWidth={2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No check-ins in this range">Ratings only appear when you choose to record them.</EmptyState>}
          </Panel>
        </div>
        <Panel className="history-controls">
          <div className="history-toolbar">
            <label className="search-field"><span className="visually-hidden">Search history notes or dates</span>
              <input type="search" placeholder="Search notes or dates…" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} />
            </label>
            <div className="range-switcher" role="group" aria-label="History date range">
              {(['7d', '30d', 'all'] as const).map((item) => (
                <button key={item} className={historyRange === item ? 'range-button selected' : 'range-button'} onClick={() => setHistoryRange(item)}>
                  {item === 'all' ? 'All time' : item === '7d' ? '7 days' : '30 days'}
                </button>
              ))}
            </div>
          </div>
          <p className="history-count">Showing {summaries.length} {summaries.length === 1 ? 'day' : 'days'} with at least one record. Missing activity or check-ins are left blank.</p>
        </Panel>
        <div className="history-days">
          {summaries.length ? summaries.map((summary) => (
            <Panel className="day-card" key={summary.date}>
              <div className="day-heading">
                <div><span className="eyebrow">{formatDate(summary.date, { weekday: 'long' })}</span><h2>{formatDate(summary.date, { month: 'long', day: 'numeric', year: 'numeric' })}</h2></div>
                {summary.activity && <SourceBadge source={summary.activity.source} />}
              </div>
              <div className="day-summary-grid">
                <div className="daily-activity-summary">
                  <h3><Activity size={16} /> Activity</h3>
                  {summary.activity ? (
                    <>
                      <p><strong>{summary.activity.totalScreenTime.toFixed(1)}h</strong> total screen time</p>
                      <p>{summary.activity.lateNightUsage === undefined ? 'Late-night use not recorded' : `${summary.activity.lateNightUsage.toFixed(1)}h late-night`}
                        {' · '}{summary.activity.breaks === undefined ? 'Breaks not recorded' : `${summary.activity.breaks} breaks`}</p>
                      <button className="text-button" onClick={() => { if (summary.activity) editActivity(summary.activity); }}>Edit activity <ChevronRight size={13} /></button>
                    </>
                  ) : <p className="missing-data">No activity record for this day.</p>}
                </div>
                <div className="daily-checkins-summary">
                  <h3><Heart size={16} /> Check-ins <span>{summary.checkIns.length}</span></h3>
                  {summary.checkIns.length ? summary.checkIns.map((entry) => (
                    <div className="history-checkin" key={entry.id}>
                      <div className="history-checkin-top"><strong>{getDayPeriod(entry.recordedAt)}</strong><span>{new Date(entry.recordedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span><SourceBadge source={entry.source} /></div>
                      <p>Mood {entry.mood}/5 · Stress {entry.stress}/5 · Energy {entry.energy}/5 · Fatigue {entry.fatigue}/5</p>
                      {entry.note && <p className="history-note">{entry.note}</p>}
                      <div className="record-action-links"><button className="text-button" onClick={() => editMood(entry)}>Edit</button><button className="text-button danger-text" onClick={() => deleteMood(entry)}>Delete</button></div>
                    </div>
                  )) : <p className="missing-data">No check-in recorded for this day.</p>}
                  <button className="text-button" onClick={() => { setMoodForm({ ...newMoodForm(), recordedAt: toLocalDateTimeInput(new Date(`${summary.date}T12:00:00`)) }); navigate('checkin'); }}>Add check-in <ChevronRight size={13} /></button>
                </div>
              </div>
            </Panel>
          )) : <EmptyState title="No records match this view">Try another date range or search term, or start recording activity and check-ins.</EmptyState>}
        </div>
      </>
    );
  };

  const renderSettings = () => (
    <>
      <PageHeading page="settings" />
      <div className="settings-grid">
        <Panel eyebrow="Appearance" title="Choose your theme">
          <p className="panel-copy">Your preference is saved with your local app data. First visit follows your device setting.</p>
          <div className="theme-picker" role="group" aria-label="Theme preference">
            <button className={data.preferences.theme === 'light' ? 'theme-choice selected' : 'theme-choice'} onClick={() => setTheme('light')} aria-pressed={data.preferences.theme === 'light'}><Sun size={18} /> Light {data.preferences.theme === 'light' && <Check size={15} />}</button>
            <button className={data.preferences.theme === 'dark' ? 'theme-choice selected' : 'theme-choice'} onClick={() => setTheme('dark')} aria-pressed={data.preferences.theme === 'dark'}><Moon size={18} /> Dark {data.preferences.theme === 'dark' && <Check size={15} />}</button>
          </div>
        </Panel>
        <Panel eyebrow="Data location" title="Local to this browser">
          <div className="privacy-callout"><ShieldCheck size={18} /><p>Your records are stored in this browser’s local storage. This prototype does not sync to a server or send data to an AI service.</p></div>
          <ul className="privacy-list"><li>Clearing browser site data may remove your entries.</li><li>Do not use a shared device for sensitive notes.</li><li>No device tracking or automatic collection is used.</li></ul>
        </Panel>
        <Panel eyebrow="Your records" title="Data controls">
          <div className="data-counts"><div><strong>{sourceSummary.userCount}</strong><span>Personal entries</span></div><div><strong>{sourceSummary.demoCount}</strong><span>Sample entries</span></div></div>
          <div className="data-actions">
            <button className="button button-quiet" onClick={exportData}><Download size={16} /> Download JSON export</button>
            <button className="button button-quiet" onClick={clearPersonalData}>Clear personal data</button>
            <button className="button button-danger" onClick={resetToDemo}>Restore sample data</button>
          </div>
          <p className="field-hint">Clearing personal data keeps clearly labeled sample records. Restoring sample data replaces all saved entries.</p>
        </Panel>
        <Panel eyebrow="How observations work" title="Deterministic, not diagnostic">
          <p className="panel-copy">MindTrace uses transparent TypeScript rules to compare recent entries with a personal baseline. It does not currently use an AI model, make predictions, or diagnose health conditions.</p>
          <p className="panel-copy">Patterns are descriptive and can be incomplete. A change in screen time or a self-reported rating is not proof of stress or a medical condition.</p>
          <div className="disclaimer">Wellness support only · Not medical advice</div>
        </Panel>
        <Panel className="export-format-panel" eyebrow="Portability" title="JSON export format">
          <p className="panel-copy">The downloaded file contains a <code>format</code> version, export timestamp, check-ins, activity entries, and theme preference. This version supports export only; it does not upload data.</p>
        </Panel>
      </div>
    </>
  );

  const pageContent: Record<AppPage, () => ReactNode> = {
    overview: renderOverview,
    checkin: renderCheckIn,
    activity: renderActivity,
    insights: renderInsights,
    recommendations: renderRecommendations,
    history: renderHistory,
    settings: renderSettings,
    demo: renderDemo,
  };
  const ActiveIcon = navItems.find((item) => item.id === activePage)?.icon ?? LayoutDashboard;

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={mobileMenuOpen ? 'sidebar mobile-open' : 'sidebar'}>
        <div className="brand-lockup">
          <div className="brand-mark"><Brain size={21} /></div>
          <div><strong>mindtrace<span>.</span></strong><small>PERSONAL WELLNESS</small></div>
          <button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)}><X size={18} /></button>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activePage === id ? 'nav-link active' : 'nav-link'}
              aria-current={activePage === id ? 'page' : undefined} onClick={() => navigate(id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{activePage === id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status"><span className="status-pip" /><div><strong>Private by design</strong><small>Stored on this device</small></div></div>
          <button className="sidebar-theme" onClick={() => setTheme(data.preferences.theme === 'light' ? 'dark' : 'light')}>
            {data.preferences.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>Switch to {data.preferences.theme === 'light' ? 'dark' : 'light'} theme</span>
          </button>
          <div className="sidebar-disclaimer">A gentle reflection tool.<br />Not a clinical assessment.</div>
        </div>
      </aside>
      {mobileMenuOpen && <button className="sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <button className="menu-button icon-button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><ActiveIcon size={15} /><span>{navItems.find((item) => item.id === activePage)?.label}</span></div>
          <div className="topbar-right"><span className="current-date"><CalendarDays size={15} />{formatDate(today, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <button className="theme-toggle icon-button" aria-label={`Switch to ${data.preferences.theme === 'light' ? 'dark' : 'light'} theme`}
              title={`Switch to ${data.preferences.theme === 'light' ? 'dark' : 'light'} theme`}
              onClick={() => setTheme(data.preferences.theme === 'light' ? 'dark' : 'light')}>
              {data.preferences.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className="topbar-checkin" onClick={goToAction('checkin')}><Plus size={15} /> Check in</button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {pageContent[activePage]()}
          <footer className="app-footer"><span>MindTrace AI</span><span>Designed for reflection, not diagnosis.</span></footer>
        </main>
      </div>
      {notice && <div className={`notice ${/could not|failed|unavailable/i.test(notice) ? 'warning' : ''}`} role="status">
        <span>{/could not|failed|unavailable/i.test(notice) ? <ShieldCheck size={16} /> : <Check size={16} />}</span>{notice}
        <button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={15} /></button>
      </div>}
    </div>
  );
}

export default App;
