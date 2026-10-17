import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  LayoutGrid,
  Menu,
  MoonStar,
  NotebookPen,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './App.css';
import { loadActivityEntries, loadMoodEntries, persistEntries, restoreDemoEntries } from './lib/storage';
import {
  buildBehaviorChartData,
  buildMoodStressChartData,
  buildScreenTimeChartData,
  calculateSummaryMetrics,
  generateInsights,
  getBehaviorDrift,
  getRecentActivityHighlights,
  sortByDate,
} from './lib/analysis';
import type { ActivityEntry, MoodCheckIn, NavPage } from './types';

type MoodFormState = {
  date: string;
  mood: string;
  stress: string;
  energy: string;
  fatigue: string;
  note: string;
  editingId: string | null;
};

type ActivityFormState = {
  date: string;
  totalScreenTime: string;
  activeWorkHours: string;
  socialMediaHours: string;
  entertainmentHours: string;
  lateNightUsage: string;
  breaks: string;
  averageBreakMinutes: string;
  tasksCompleted: string;
  editingId: string | null;
};

const defaultMoodForm = (): MoodFormState => ({
  date: new Date().toISOString().slice(0, 10),
  mood: '3',
  stress: '3',
  energy: '3',
  fatigue: '3',
  note: '',
  editingId: null,
});

const defaultActivityForm = (): ActivityFormState => ({
  date: new Date().toISOString().slice(0, 10),
  totalScreenTime: '6',
  activeWorkHours: '3',
  socialMediaHours: '1.5',
  entertainmentHours: '1.5',
  lateNightUsage: '0.8',
  breaks: '3',
  averageBreakMinutes: '18',
  tasksCompleted: '7',
  editingId: null,
});

const navItems: Array<{ id: NavPage; label: string; icon: ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={17} /> },
  { id: 'mood', label: 'Mood Check-in', icon: <HeartPulse size={17} /> },
  { id: 'activity', label: 'Activity Log', icon: <Activity size={17} /> },
  { id: 'insights', label: 'Insights', icon: <BrainCircuit size={17} /> },
  { id: 'settings', label: 'Settings & Privacy', icon: <ShieldCheck size={17} /> },
];

function formatDateValue(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-label">{label}</p>
        <h3>{value}</h3>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState<NavPage>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moodEntries, setMoodEntries] = useState<MoodCheckIn[]>(() => loadMoodEntries());
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>(() => loadActivityEntries());
  const [moodForm, setMoodForm] = useState<MoodFormState>(() => defaultMoodForm());
  const [activityForm, setActivityForm] = useState<ActivityFormState>(() => defaultActivityForm());
  const [moodErrors, setMoodErrors] = useState<Partial<Record<keyof MoodFormState, string>>>({});
  const [activityErrors, setActivityErrors] = useState<Partial<Record<keyof ActivityFormState, string>>>({});
  const [moodSaving, setMoodSaving] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    persistEntries(moodEntries, activityEntries);
  }, [moodEntries, activityEntries]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const summary = useMemo(
    () => calculateSummaryMetrics(activityEntries, moodEntries),
    [activityEntries, moodEntries],
  );

  const screenTimeData = useMemo(() => buildScreenTimeChartData(activityEntries), [activityEntries]);
  const moodChartData = useMemo(() => buildMoodStressChartData(moodEntries), [moodEntries]);
  const behaviorData = useMemo(() => buildBehaviorChartData(activityEntries), [activityEntries]);
  const insightList = useMemo(() => generateInsights(activityEntries, moodEntries), [activityEntries, moodEntries]);
  const behaviorDrift = useMemo(() => getBehaviorDrift(activityEntries), [activityEntries]);

  const orderedMoodEntries = useMemo(
    () => sortByDate(moodEntries).reverse(),
    [moodEntries],
  );
  const orderedActivityEntries = useMemo(
    () => sortByDate(activityEntries).reverse(),
    [activityEntries],
  );

  const allDates = useMemo(
    () => [...moodEntries.map((entry) => entry.date), ...activityEntries.map((entry) => entry.date)],
    [moodEntries, activityEntries],
  );

  const dateRangeText =
    allDates.length > 0
      ? `${formatDateValue(allDates.reduce((min, current) => (current < min ? current : min), allDates[0]))}–${formatDateValue(allDates.reduce((max, current) => (current > max ? current : max), allDates[0]))}`
      : 'No local data yet';

  const usingDemoData =
    moodEntries.every((entry) => entry.source === 'demo') &&
    activityEntries.every((entry) => entry.source === 'demo');

  const moodScale = [1, 2, 3, 4, 5] as const;
  const activityHints = [
    'Record your total screen time without using background tracking.',
    'Breaks should reflect your actual pause count and duration.',
    'This app does not diagnose stress or anxiety.',
  ];

  const handleMoodFieldChange = (key: keyof Omit<MoodFormState, 'editingId'>, value: string) => {
    setMoodForm((previous) => ({ ...previous, [key]: value }));
    setMoodErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const handleActivityFieldChange = (
    key: keyof Omit<ActivityFormState, 'editingId'>,
    value: string,
  ) => {
    setActivityForm((previous) => ({ ...previous, [key]: value }));
    setActivityErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const validateMoodForm = () => {
    const nextErrors: Partial<Record<keyof MoodFormState, string>> = {};

    if (!moodForm.date) {
      nextErrors.date = 'Choose a date for this check-in.';
    }

    const moodValue = Number(moodForm.mood);
    const stressValue = Number(moodForm.stress);
    const energyValue = Number(moodForm.energy);
    const fatigueValue = Number(moodForm.fatigue);

    if (!Number.isFinite(moodValue) || moodValue < 1 || moodValue > 5) {
      nextErrors.mood = 'Mood must be between 1 and 5.';
    }

    if (!Number.isFinite(stressValue) || stressValue < 1 || stressValue > 5) {
      nextErrors.stress = 'Stress must be between 1 and 5.';
    }

    if (!Number.isFinite(energyValue) || energyValue < 1 || energyValue > 5) {
      nextErrors.energy = 'Energy must be between 1 and 5.';
    }

    if (!Number.isFinite(fatigueValue) || fatigueValue < 1 || fatigueValue > 5) {
      nextErrors.fatigue = 'Fatigue must be between 1 and 5.';
    }

    setMoodErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateActivityForm = () => {
    const nextErrors: Partial<Record<keyof ActivityFormState, string>> = {};

    const totalScreenTime = Number(activityForm.totalScreenTime);
    const activeWorkHours = Number(activityForm.activeWorkHours);
    const socialMediaHours = Number(activityForm.socialMediaHours);
    const entertainmentHours = Number(activityForm.entertainmentHours);
    const lateNightUsage = Number(activityForm.lateNightUsage);
    const breaks = Number(activityForm.breaks);
    const averageBreakMinutes = Number(activityForm.averageBreakMinutes);
    const tasksCompleted = Number(activityForm.tasksCompleted);

    if (!activityForm.date) {
      nextErrors.date = 'Choose a valid activity date.';
    }

    if (!Number.isFinite(totalScreenTime) || totalScreenTime < 0 || totalScreenTime > 24) {
      nextErrors.totalScreenTime = 'Total screen time must be a value between 0 and 24 hours.';
    }

    if (!Number.isFinite(activeWorkHours) || activeWorkHours < 0 || activeWorkHours > 24) {
      nextErrors.activeWorkHours = 'Active work/study hours must be between 0 and 24.';
    }

    if (!Number.isFinite(socialMediaHours) || socialMediaHours < 0 || socialMediaHours > 24) {
      nextErrors.socialMediaHours = 'Social media usage must be between 0 and 24 hours.';
    }

    if (!Number.isFinite(entertainmentHours) || entertainmentHours < 0 || entertainmentHours > 24) {
      nextErrors.entertainmentHours = 'Entertainment usage must be between 0 and 24 hours.';
    }

    if (!Number.isFinite(lateNightUsage) || lateNightUsage < 0 || lateNightUsage > 24) {
      nextErrors.lateNightUsage = 'Late-night usage must be between 0 and 24 hours.';
    }

    if (!Number.isFinite(breaks) || breaks < 0 || breaks > 15) {
      nextErrors.breaks = 'Break count must be between 0 and 15.';
    }

    if (!Number.isFinite(averageBreakMinutes) || averageBreakMinutes < 0 || averageBreakMinutes > 180) {
      nextErrors.averageBreakMinutes = 'Average break duration must be between 0 and 180 minutes.';
    }

    if (!Number.isFinite(tasksCompleted) || tasksCompleted < 0 || tasksCompleted > 50) {
      nextErrors.tasksCompleted = 'Tasks completed must be between 0 and 50.';
    }

    if (activeWorkHours > totalScreenTime) {
      nextErrors.activeWorkHours = 'Active work/study hours cannot exceed total screen time.';
    }

    if (socialMediaHours > totalScreenTime) {
      nextErrors.socialMediaHours = 'Social media use cannot exceed total screen time.';
    }

    if (entertainmentHours > totalScreenTime) {
      nextErrors.entertainmentHours = 'Entertainment use cannot exceed total screen time.';
    }

    if (lateNightUsage > totalScreenTime) {
      nextErrors.lateNightUsage = 'Late-night usage cannot exceed total screen time.';
    }

    setActivityErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleMoodSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!validateMoodForm()) {
      return;
    }

    setMoodSaving(true);
    const entry: MoodCheckIn = {
      id: moodForm.editingId ?? `mood-${Date.now()}`,
      date: moodForm.date,
      mood: Number(moodForm.mood),
      stress: Number(moodForm.stress),
      energy: Number(moodForm.energy),
      fatigue: Number(moodForm.fatigue),
      note: moodForm.note.trim(),
      source: 'user',
    };

    setMoodEntries((previous) => {
      const filtered = moodForm.editingId
        ? previous.filter((item) => item.id !== moodForm.editingId)
        : previous;
      return sortByDate([...filtered, entry]);
    });

    setMoodForm(defaultMoodForm());
    setMoodSaving(false);
    setNotice('Mood check-in saved locally.');
  };

  const handleActivitySubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!validateActivityForm()) {
      return;
    }

    setActivitySaving(true);
    const entry: ActivityEntry = {
      id: activityForm.editingId ?? `activity-${Date.now()}`,
      date: activityForm.date,
      totalScreenTime: Number(activityForm.totalScreenTime),
      activeWorkHours: Number(activityForm.activeWorkHours),
      socialMediaHours: Number(activityForm.socialMediaHours),
      entertainmentHours: Number(activityForm.entertainmentHours),
      lateNightUsage: Number(activityForm.lateNightUsage),
      breaks: Number(activityForm.breaks),
      averageBreakMinutes: Number(activityForm.averageBreakMinutes),
      tasksCompleted: Number(activityForm.tasksCompleted),
      source: 'user',
    };

    setActivityEntries((previous) => {
      const filtered = activityForm.editingId
        ? previous.filter((item) => item.id !== activityForm.editingId)
        : previous;
      return sortByDate([...filtered, entry]);
    });

    setActivityForm(defaultActivityForm());
    setActivitySaving(false);
    setNotice('Activity entry saved locally.');
  };

  const handleResetToDemo = () => {
    const { moodEntries: demoMoodEntries, activityEntries: demoActivityEntries } = restoreDemoEntries();
    setMoodEntries(demoMoodEntries);
    setActivityEntries(demoActivityEntries);
    setNotice('Original demo data restored.');
  };

  const resetWithConfirmation = () => {
    const confirmed = window.confirm(
      'Reset all local MindTrace data back to the original demo dataset?',
    );

    if (confirmed) {
      handleResetToDemo();
    }
  };

  const loadMoodForEdit = (entry: MoodCheckIn) => {
    setActivePage('mood');
    setMoodForm({
      date: entry.date,
      mood: String(entry.mood),
      stress: String(entry.stress),
      energy: String(entry.energy),
      fatigue: String(entry.fatigue),
      note: entry.note,
      editingId: entry.id,
    });
  };

  const loadActivityForEdit = (entry: ActivityEntry) => {
    setActivePage('activity');
    setActivityForm({
      date: entry.date,
      totalScreenTime: String(entry.totalScreenTime),
      activeWorkHours: String(entry.activeWorkHours),
      socialMediaHours: String(entry.socialMediaHours),
      entertainmentHours: String(entry.entertainmentHours),
      lateNightUsage: String(entry.lateNightUsage),
      breaks: String(entry.breaks),
      averageBreakMinutes: String(entry.averageBreakMinutes),
      tasksCompleted: String(entry.tasksCompleted),
      editingId: entry.id,
    });
  };

  const renderRatingControl = (
    key: 'mood' | 'stress' | 'energy' | 'fatigue',
    label: string,
    helperText: string,
  ) => (
    <div className="field rating-field">
      <label>{label}</label>
      <p className="helper-copy">{helperText}</p>
      <div className="segmented-control">
        {moodScale.map((value) => (
          <button
            key={`${key}-${value}`}
            type="button"
            className={`segmented-button ${String(moodForm[key]) === String(value) ? 'selected' : ''}`}
            onClick={() => handleMoodFieldChange(key, String(value))}
          >
            {value}
          </button>
        ))}
      </div>
      {moodErrors[key] && <span className="field-error">{moodErrors[key]}</span>}
    </div>
  );

  const renderOverviewPage = () => (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Wellness snapshot</h1>
          <p className="subtitle">
            Compare recent digital behavior against your personal routine and look for gentle shifts worth paying attention to.
          </p>
        </div>
        <div className={`status-pill ${usingDemoData ? 'demo' : 'live'}`}>
          {usingDemoData ? 'Demo data' : 'Local prototype data'}
        </div>
      </div>

      <div className="date-strip">
        <CalendarDays size={16} />
        <span>{dateRangeText}</span>
      </div>

      {notice && <div className="status-banner">{notice}</div>}

      <div className="metric-grid">
        <StatCard
          label="Average screen time"
          value={`${summary.avgScreenTime.toFixed(1)}h`}
          detail="per day"
          icon={<Clock3 size={18} />}
        />
        <StatCard
          label="Average mood"
          value={`${summary.avgMood.toFixed(1)}/5`}
          detail="self-reported"
          icon={<Sparkles size={18} />}
        />
        <StatCard
          label="Average breaks"
          value={`${summary.avgBreakCount.toFixed(1)}`}
          detail="per day"
          icon={<MoonStar size={18} />}
        />
        <StatCard
          label="Late-night usage"
          value={`${summary.recentLateNight.toFixed(1)}h`}
          detail="recent average"
          icon={<TrendingUp size={18} />}
        />
      </div>

      <div className="chart-grid">
        <div className="chart-card large">
          <div className="chart-header">
            <div>
              <p className="eyebrow small">Daily screen time</p>
              <h2>Screen-time trend</h2>
            </div>
          </div>
          {screenTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={screenTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7d7d0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} unit="h" />
                <Tooltip
                  formatter={(value, name) => {
                    const numericValue = Array.isArray(value) ? Number(value[0]) : Number(value ?? 0);
                    void name;
                    return [`${numericValue.toFixed(1)}h`, 'Screen time'];
                  }}
                />
                <Line type="monotone" dataKey="screenTime" stroke="#0b6a7d" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">Add activity entries to populate the trend chart.</div>
          )}
        </div>

        <div className="chart-card large">
          <div className="chart-header">
            <div>
              <p className="eyebrow small">User-reported ratings</p>
              <h2>Mood vs. stress</h2>
            </div>
          </div>
          {moodChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={moodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7d7d0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value, name) => {
                    const numericValue = Array.isArray(value) ? Number(value[0]) : Number(value ?? 0);
                    const label = name === 'mood' ? 'Mood' : 'Stress';
                    return [`${numericValue.toFixed(1)}/5`, label];
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="mood" stroke="#0d8a7b" strokeWidth={3} name="Mood" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="stress" stroke="#c56b4d" strokeWidth={3} name="Stress" dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">Add a mood check-in to see the relationship over time.</div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <p className="eyebrow small">Behavior pattern</p>
              <h2>Late-night usage</h2>
            </div>
          </div>
          {behaviorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={behaviorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7d7d0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} unit="h" />
                <Tooltip
                  formatter={(value, name) => {
                    const numericValue = Array.isArray(value) ? Number(value[0]) : Number(value ?? 0);
                    void name;
                    return [`${numericValue.toFixed(1)}h`, 'Late-night usage'];
                  }}
                />
                <Bar dataKey="lateNight" fill="#2e7d7b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No activity history yet.</div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <p className="eyebrow small">Break rhythm</p>
              <h2>Break count</h2>
            </div>
          </div>
          {behaviorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={behaviorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7d7d0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value, name) => {
                    const numericValue = Array.isArray(value) ? Number(value[0]) : Number(value ?? 0);
                    void name;
                    return [`${numericValue.toFixed(0)} breaks`, 'Breaks'];
                  }}
                />
                <Bar dataKey="breaks" fill="#d49a6a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">Break count data will appear after logging activities.</div>
          )}
        </div>
      </div>

      <div className="cta-section">
        <div className="context-panel">
          <div>
            <p className="eyebrow small">Recent activity</p>
            <h2>What changed lately?</h2>
          </div>
          <div className="mini-list">
            {getRecentActivityHighlights(activityEntries).length > 0 ? (
              getRecentActivityHighlights(activityEntries).map((item) => (
                <button key={item.date} type="button" className="mini-item" onClick={() => setActivePage('activity')}>
                  <span>{item.date}</span>
                  <strong>{item.summary}</strong>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="empty-state compact">Log an activity entry to start building this view.</div>
            )}
          </div>
        </div>

        <div className="action-panel">
          <p className="eyebrow small">Primary actions</p>
          <h2>Start with a gentle check-in</h2>
          <div className="action-stack">
            <button type="button" className="primary-button" onClick={() => setActivePage('mood')}>
              Record today&apos;s mood
            </button>
            <button type="button" className="secondary-button" onClick={() => setActivePage('activity')}>
              Add an activity entry
            </button>
            <button type="button" className="secondary-button" onClick={() => setActivePage('insights')}>
              View insights
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const renderMoodPage = () => (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Mood Check-in</p>
          <h1>Daily check-in</h1>
          <p className="subtitle">
            Your mood, stress, energy, and fatigue ratings are user-reported signals, not medical measurements.
          </p>
        </div>
      </div>

      <div className="two-column-layout">
        <form className="panel form-panel" onSubmit={handleMoodSubmit}>
          <div className="field full-width">
            <label htmlFor="mood-date">Date</label>
            <input
              id="mood-date"
              type="date"
              value={moodForm.date}
              onChange={(event) => handleMoodFieldChange('date', event.target.value)}
            />
            {moodErrors.date && <span className="field-error">{moodErrors.date}</span>}
          </div>

          <div className="rating-grid">
            {renderRatingControl('mood', 'Mood', '1 = very low, 5 = very high.')}
            {renderRatingControl('stress', 'Stress', '1 = very calm, 5 = very high stress.')}
            {renderRatingControl('energy', 'Energy', '1 = very low, 5 = very high energy.')}
            {renderRatingControl('fatigue', 'Fatigue', '1 = well-rested, 5 = very fatigued.')}
          </div>

          <div className="field full-width">
            <label htmlFor="mood-note">Optional note</label>
            <textarea
              id="mood-note"
              rows={4}
              placeholder="What stood out today?"
              value={moodForm.note}
              onChange={(event) => handleMoodFieldChange('note', event.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={moodSaving}>
              {moodSaving ? 'Saving…' : moodForm.editingId ? 'Update check-in' : 'Save check-in'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setMoodForm(defaultMoodForm())}
            >
              Clear form
            </button>
          </div>
        </form>

        <aside className="panel history-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow small">History</p>
              <h2>Previous check-ins</h2>
            </div>
          </div>

          {orderedMoodEntries.length === 0 ? (
            <div className="empty-state compact">No mood entries yet. Add your first check-in.</div>
          ) : (
            <div className="history-stack">
              {orderedMoodEntries.map((entry) => (
                <div key={entry.id} className="history-item">
                  <div>
                    <strong>{formatDateValue(entry.date)}</strong>
                    <p>
                      Mood {entry.mood}/5 · Stress {entry.stress}/5
                    </p>
                    {entry.note ? <small>{entry.note}</small> : null}
                  </div>
                  <button type="button" className="link-button" onClick={() => loadMoodForEdit(entry)}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );

  const renderActivityPage = () => (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Digital Activity Log</p>
          <h1>Daily activity</h1>
          <p className="subtitle">
            Use your own estimates for the day. These values are kept local to this browser and are not automatically monitored.
          </p>
        </div>
      </div>

      <div className="two-column-layout">
        <form className="panel form-panel" onSubmit={handleActivitySubmit}>
          <div className="field full-width">
            <label htmlFor="activity-date">Date</label>
            <input
              id="activity-date"
              type="date"
              value={activityForm.date}
              onChange={(event) => handleActivityFieldChange('date', event.target.value)}
            />
            {activityErrors.date && <span className="field-error">{activityErrors.date}</span>}
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="total-screen-time">Total screen time (hours)</label>
              <input
                id="total-screen-time"
                type="number"
                min="0"
                max="24"
                step="0.1"
                value={activityForm.totalScreenTime}
                onChange={(event) => handleActivityFieldChange('totalScreenTime', event.target.value)}
              />
              {activityErrors.totalScreenTime && <span className="field-error">{activityErrors.totalScreenTime}</span>}
            </div>

            <div className="field">
              <label htmlFor="active-work-hours">Active work/study (hours)</label>
              <input
                id="active-work-hours"
                type="number"
                min="0"
                max="24"
                step="0.1"
                value={activityForm.activeWorkHours}
                onChange={(event) => handleActivityFieldChange('activeWorkHours', event.target.value)}
              />
              {activityErrors.activeWorkHours && <span className="field-error">{activityErrors.activeWorkHours}</span>}
            </div>

            <div className="field">
              <label htmlFor="social-media-hours">Social media (hours)</label>
              <input
                id="social-media-hours"
                type="number"
                min="0"
                max="24"
                step="0.1"
                value={activityForm.socialMediaHours}
                onChange={(event) => handleActivityFieldChange('socialMediaHours', event.target.value)}
              />
              {activityErrors.socialMediaHours && <span className="field-error">{activityErrors.socialMediaHours}</span>}
            </div>

            <div className="field">
              <label htmlFor="entertainment-hours">Entertainment (hours)</label>
              <input
                id="entertainment-hours"
                type="number"
                min="0"
                max="24"
                step="0.1"
                value={activityForm.entertainmentHours}
                onChange={(event) => handleActivityFieldChange('entertainmentHours', event.target.value)}
              />
              {activityErrors.entertainmentHours && <span className="field-error">{activityErrors.entertainmentHours}</span>}
            </div>

            <div className="field">
              <label htmlFor="late-night-hours">Late-night usage (hours)</label>
              <input
                id="late-night-hours"
                type="number"
                min="0"
                max="24"
                step="0.1"
                value={activityForm.lateNightUsage}
                onChange={(event) => handleActivityFieldChange('lateNightUsage', event.target.value)}
              />
              {activityErrors.lateNightUsage && <span className="field-error">{activityErrors.lateNightUsage}</span>}
            </div>

            <div className="field">
              <label htmlFor="activity-breaks">Number of breaks</label>
              <input
                id="activity-breaks"
                type="number"
                min="0"
                max="15"
                step="1"
                value={activityForm.breaks}
                onChange={(event) => handleActivityFieldChange('breaks', event.target.value)}
              />
              {activityErrors.breaks && <span className="field-error">{activityErrors.breaks}</span>}
            </div>

            <div className="field">
              <label htmlFor="break-duration">Average break duration (minutes)</label>
              <input
                id="break-duration"
                type="number"
                min="0"
                max="180"
                step="1"
                value={activityForm.averageBreakMinutes}
                onChange={(event) => handleActivityFieldChange('averageBreakMinutes', event.target.value)}
              />
              {activityErrors.averageBreakMinutes && <span className="field-error">{activityErrors.averageBreakMinutes}</span>}
            </div>

            <div className="field">
              <label htmlFor="tasks-completed">Tasks completed</label>
              <input
                id="tasks-completed"
                type="number"
                min="0"
                max="50"
                step="1"
                value={activityForm.tasksCompleted}
                onChange={(event) => handleActivityFieldChange('tasksCompleted', event.target.value)}
              />
              {activityErrors.tasksCompleted && <span className="field-error">{activityErrors.tasksCompleted}</span>}
            </div>
          </div>

          <div className="hint-list">
            {activityHints.map((hint) => (
              <div className="hint-item" key={hint}>
                <CheckCircle2 size={16} />
                <span>{hint}</span>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={activitySaving}>
              {activitySaving ? 'Saving…' : activityForm.editingId ? 'Update entry' : 'Save activity'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setActivityForm(defaultActivityForm())}
            >
              Clear form
            </button>
          </div>
        </form>

        <aside className="panel history-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow small">Activity history</p>
              <h2>Recent entries</h2>
            </div>
          </div>

          {orderedActivityEntries.length === 0 ? (
            <div className="empty-state compact">No activity entries yet.</div>
          ) : (
            <div className="history-stack">
              {orderedActivityEntries.map((entry) => (
                <div key={entry.id} className="history-item">
                  <div>
                    <strong>{formatDateValue(entry.date)}</strong>
                    <p>
                      {entry.totalScreenTime.toFixed(1)}h total · {entry.breaks} breaks · {entry.tasksCompleted} tasks
                    </p>
                  </div>
                  <button type="button" className="link-button" onClick={() => loadActivityForEdit(entry)}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );

  const renderInsightsPage = () => (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Insights</p>
          <h1>Behavior analysis</h1>
          <p className="subtitle">
            These observations compare recent patterns with your own historical routine, using transparent rules instead of a medical diagnosis.
          </p>
        </div>
      </div>

      <div className="insight-top-row">
        <div className="panel behavior-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow small">Behavior drift</p>
              <h2>0–100 activity deviation</h2>
            </div>
          </div>
          <div className="drift-meter">
            <div className="drift-score">{behaviorDrift.value ?? '—'}</div>
            <div>
              <strong>{behaviorDrift.label}</strong>
              <p>{behaviorDrift.explanation}</p>
            </div>
          </div>
        </div>

        <div className="panel insight-summary">
          <div className="panel-header">
            <div>
              <p className="eyebrow small">Summary</p>
              <h2>What matters most</h2>
            </div>
          </div>
          <ul className="bullet-list">
            <li>Recent screen-time average: {summary.avgScreenTime.toFixed(1)}h/day</li>
            <li>Average mood: {summary.avgMood.toFixed(1)}/5</li>
            <li>Recent late-night average: {summary.recentLateNight.toFixed(1)}h/day</li>
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow small">Recent observations</p>
            <h2>Patterns and recommendations</h2>
          </div>
        </div>

        <div className="insight-list">
          {insightList.map((insight) => (
            <article key={insight.id} className="insight-item panel-soft">
              <div className="insight-title-row">
                <div className={`priority-badge ${insight.priority}`}>{insight.priority}</div>
                <h3>{insight.title}</h3>
              </div>
              <p>{insight.description}</p>
              <div className="recommendation-box">
                <Target size={16} />
                <span>{insight.recommendation}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );

  const renderSettingsPage = () => (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings &amp; Privacy</p>
          <h1>Prototype privacy</h1>
          <p className="subtitle">
            MindTrace Version 1 keeps data local to this browser. It does not sync to a backend or claim to be a medical assessment.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow small">How data is stored</p>
              <h2>Local browser storage</h2>
            </div>
          </div>
          <ul className="bullet-list">
            <li>Entries are stored in the browser using localStorage.</li>
            <li>This Version 1 is a prototype and does not send wellness data to a backend.</li>
            <li>It uses deterministic rules for comparisons and recommendations instead of an integrated external AI model.</li>
            <li>These ratings are not a diagnosis of stress, anxiety, burnout, or a medical condition.</li>
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow small">Reset controls</p>
              <h2>Demo data</h2>
            </div>
          </div>
          <div className="action-stack vertical">
            <button type="button" className="primary-button" onClick={handleResetToDemo}>
              Restore original demo data
            </button>
            <button type="button" className="secondary-button" onClick={resetWithConfirmation}>
              Reset local data
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const renderPageContent = () => {
    switch (activePage) {
      case 'mood':
        return renderMoodPage();
      case 'activity':
        return renderActivityPage();
      case 'insights':
        return renderInsightsPage();
      case 'settings':
        return renderSettingsPage();
      default:
        return renderOverviewPage();
    }
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <strong>MindTrace AI</strong>
            <small>Behavior tracker</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-button ${activePage === item.id ? 'active' : ''}`}
              onClick={() => {
                setActivePage(item.id);
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-header">
            <NotebookPen size={16} />
            <span>Prototype note</span>
          </div>
          <p>
            MindTrace uses deterministic rules to compare behavior with your own baseline and suggest supportive next steps.
          </p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button type="button" className="mobile-toggle" onClick={() => setMobileMenuOpen((open) => !open)}>
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="topbar-actions">
            <button type="button" className="inline-action" onClick={() => setActivePage('overview')}>
              <RefreshCcw size={15} />
              Refresh snapshot
            </button>
          </div>
        </header>

        {renderPageContent()}
      </main>
    </div>
  );
}

export default App;
