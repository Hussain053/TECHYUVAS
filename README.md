# MindTrace

### Personal Digital-Wellness Pattern Explorer

**Understand your digital habits. Recognize stress patterns. Build healthier routines.**

MindTrace is a privacy-conscious, self-guided web prototype that helps people reflect on how manually recorded digital routines may coincide with their self-reported mood, stress, energy, and fatigue. It translates entries into readable comparisons, evidence-linked observations, and small optional actions—without presenting them as a diagnosis or a substitute for professional support.

> **Project status:** Functional frontend prototype. Sample and personal workspaces are available. Personal records are stored in the current browser. Authentication, cloud persistence, and a trained AI/ML model are not implemented. Vercel deployment is not yet confirmed.

---

## Contents

- [The challenge](#the-challenge)
- [Product approach](#product-approach)
- [Implemented capabilities](#implemented-capabilities)
- [Additional reflection tools](#additional-reflection-tools)
- [How pattern analysis works](#how-pattern-analysis-works)
- [Technology stack and architecture](#technology-stack-and-architecture)
- [Run the project locally](#run-the-project-locally)
- [Deployment readiness](#deployment-readiness)
- [Privacy, safety, and limitations](#privacy-safety-and-limitations)
- [Evaluation framework](#evaluation-framework)
- [Suggested demonstration flow](#suggested-demonstration-flow)
- [Roadmap](#roadmap)
- [Team](#team)

## The challenge

Stress and mental fatigue can coincide with changes in everyday routines—for example, increased late-night screen use, fewer breaks, changing work or study hours, or shifts in self-reported energy. These signals are personal and contextual: a single measure cannot establish what someone is feeling or why a routine changed.

MindTrace addresses this challenge with a lightweight reflection experience. Users can record their own activity summaries and check-ins, compare recent records with their own earlier routine, and explore practical suggestions that are connected to the observations shown in the interface.

## Product approach

MindTrace is designed for students, working professionals, and anyone who wants a clearer view of their digital routines. The experience is organized around a straightforward journey:

1. **Explore** clearly labeled sample records without entering personal information.
2. **Record** a daily activity snapshot or self-reported check-in.
3. **Compare** recent activity and ratings with the user's own earlier entries.
4. **Understand** which measures changed and see the supporting evidence.
5. **Choose** an optional, practical next step—or simply continue observing.

The interface emphasizes self-awareness, user choice, and understandable explanations rather than clinical labels or opaque scores.

## Implemented capabilities

### Personal workspace and daily reflection

- Daily check-ins for mood, perceived stress, energy, and fatigue, each on a 1–5 scale.
- Manual activity entries for total screen time, work/study, social media, entertainment, late-night use, breaks, break duration, and tasks completed.
- Input validation, dated entries, editable personal records, and deletion controls.
- Optional profile name, saved locally in the browser.

### Dashboard, history, and visualization

- Dashboard summaries for screen time, self-reported well-being, breaks, and task completion.
- Trend visualizations for recorded activity and check-ins.
- Searchable history with date-range filters and daily activity/check-in summaries.
- JSON export of the currently selected workspace.

### Explainable pattern exploration

- Personal-baseline comparisons across digital activity and self-reported ratings.
- Plain-language observations with supporting values from the relevant records.
- A Routine Variation Index, shown only when enough comparable activity measures are available.
- Optional suggestions linked to observed changes, with an explanation of what they are based on.
- An interactive demo where sample records make the dashboard, comparisons, and recommendation flow easy to explore.

### Additional reflection tools

- **Weekly Wellness Report:** summarizes the last seven days of activity and self-reported ratings, compares available averages with the previous seven days, includes optional sleep, perceived productivity, and reported stress contributors, highlights the highest and lowest recorded stress-rating days, and surfaces up to three suggestions from the existing rule-based recommendation logic. The report can be printed or saved as a PDF from the browser. It is descriptive, not a clinical assessment.
- **Personal habit goals:** users can optionally set their own screen-time and daily-break targets. Goals are saved separately for the Demo and Personal workspaces. The Goals page shows recent observed averages and attainment only for days with corresponding records, offers to prefill a target from the recent average, and does not count missing days as missed goals. No default target is imposed.
- **Richer daily reflection:** check-ins may optionally record sleep duration, perceived productivity, and the main reported stress contributor. These fields are contextual reflection data; they do not change the existing baseline thresholds or imply causation.
- **Routine simulator:** an unsaved what-if preview lets users adjust hypothetical screen time, late-night use, and daily breaks, then compare those values with recent activity in the selected workspace. It does not calculate a stress prediction or change recorded data.
- **Behaviour replay:** a day-by-day playback of recorded activity and self-reported check-ins, with play, pause, step, and scrub controls. Missing records are not inferred, and sample and personal workspaces remain separate.
- **Recommendation feedback:** users can mark an existing suggestion helpful or dismiss it. Feedback is saved locally per workspace, and dismissed suggestions can be restored. Feedback does not alter the analysis or create new recommendations.

### Workspace and interface controls

- Separate **Explore demo** and **Personal** workspaces. Sample entries do not appear in personal charts or exports, and user entries do not alter the sample dataset.
- Light and dark themes.
- Responsive layouts for desktop and mobile.
- Local data controls, including export, personal-data clearing, and sample-data restoration.

## How pattern analysis works

The current prototype uses deterministic, explicitly coded rules. It does **not** connect to a trained artificial-intelligence or machine-learning model.

### Baseline comparison

- For each measure, the most recent **7 days** are compared with the **21 days before that**, based on the latest recorded date.
- A comparison is displayed only when that measure has at least **3 recent records** and **5 baseline records**.
- Activity and self-reported ratings are compared separately; missing measures remain unavailable rather than being silently treated as zero.

### Routine Variation Index

When at least two activity measures meet the history requirements, the index averages their absolute relative differences from baseline. Each measure's relative difference is capped at 100%, and the baseline denominator is bounded to avoid division by zero. The result is displayed on a 0–100 scale.

The index describes variation in recorded activity. It is **not** a stress score, probability, diagnosis, health measure, or prediction.

### Observations and recommendations

Rule thresholds identify notable changes in available measures such as screen time, late-night use, breaks, tasks completed, work/study hours, stress, energy, and fatigue. When activity and self-reported well-being changes coincide, the app can describe that co-occurrence; it does not claim one caused the other.

Suggestions are selected by transparent rules and include supporting observations. They are optional ideas, not clinical advice or validated measures of effectiveness. Individual needs, schedules, and circumstances vary.

## Technology stack and architecture

### Implemented stack

| Layer | Technology | Role in MindTrace |
|---|---|---|
| Language | TypeScript 6 | Typed application logic, domain models, and component contracts |
| UI framework | React 19 | Component-driven single-page application and interactive user flows |
| Markup | HTML5 via JSX | Semantic page structure and accessible form controls |
| Styling | CSS3 | Responsive layouts, design tokens, and light/dark themes; no CSS framework |
| Build tool and dev server | Vite 8 | Fast local development and optimized static production builds |
| React integration | `@vitejs/plugin-react` | React support in the Vite toolchain |
| Data visualization | Recharts 3 | Responsive trend charts |
| Icon system | Lucide React | Consistent interface icons |
| Local persistence | Browser `localStorage` | Saves personal entries, profile name, goals, recommendation feedback, and preferences on the current device |
| Illustrative data | Local TypeScript dataset | Populates the isolated demo workspace |
| Code quality | Oxlint | Static linting through `npm run lint` |
| Package management | npm | Dependency installation and project scripts |
| Source control | Git and GitHub | Version-controlled project source |

### Current architecture

The app is a client-side React single-page application. Its analysis and recommendation logic runs in the browser using deterministic TypeScript rules. Personal entries and preferences are saved locally; sample data is loaded separately and is not merged into the personal workspace. The frontend has no API server, database, authentication provider, or external AI service.

### Planned, not yet integrated

| Technology or capability | Status |
|---|---|
| Supabase Database | Planned for cloud persistence; not connected |
| Supabase Auth | Planned; no sign-in or user accounts yet |
| Row-level security (RLS) | Required before storing real user records in a shared database; not configured |
| Vercel | Intended hosting target; a completed deployment and public URL have not been verified |
| Trained AI/ML model | Not implemented; current pattern analysis is rule-based |

No secrets or backend credentials are needed to run the current prototype. Do not add a Supabase service-role key or other private credentials to frontend code.

## Run the project locally

### Prerequisites

- Node.js compatible with the installed Vite version.
- npm.

### Install and start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create and locally serve a production build:

```bash
npm run build
npm run preview
```

Run the available code-quality check with:

```bash
npm run lint
```

### Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run Oxlint |
| `npm run build` | Run TypeScript project checks and create the production bundle |
| `npm run preview` | Serve the production bundle locally |

## Deployment readiness

The application is built with Vite and is suitable for a static Vercel deployment. The repository can be imported into Vercel with the Vite preset and the repository root as the project root. The production output directory is `dist`; the build command is `npm run build`.

**Deployment status:** A Vercel project-import screen was reached, but a completed deployment and working public URL have not been verified. Do not treat the project as publicly deployed until the Vercel build succeeds and the resulting URL has been tested.

No environment variables are required for the current standalone prototype. The app is designed to be demonstrable with sample data. Hosting availability, free-tier eligibility, quotas, and provider terms depend on the hosting account and can change; this repository does not promise a particular price or quota.

## Privacy, safety, and limitations

- Personal entries, the optional profile name, and preferences are saved in browser-local storage on the device in use.
- Data is not synchronized between browsers or devices and is not backed up to a server.
- Clearing the browser's site data can remove locally stored information.
- The JSON export is downloaded locally and includes only the selected workspace.
- Sample records are illustrative and should not be represented as real participant data.
- MindTrace does not provide medical advice, diagnose mental-health conditions, or determine the cause of observed changes.
- The current logic has not been clinically validated; outputs are descriptive and may be incomplete.
- Do not use this prototype to make high-stakes health, employment, education, or organizational decisions.
- Until authentication, secure cloud storage, and access controls are implemented, users should not enter sensitive real-world information into a shared or public deployment.

## Evaluation framework

The following **suggested 100-mark rubric** can help a project evaluator assess the prototype. It is a proposed scoring guide, not an awarded score or a guarantee of results; final marks are determined by the event's evaluators.

| Evaluation dimension | Suggested marks | Evidence to assess |
|---|---:|---|
| Problem relevance and user value | 15 | Clarity of the digital-wellness problem, target users, and value of a personal reflection workflow |
| Feature completeness and end-to-end journey | 20 | Check-in and activity entry, dashboard, history, comparisons, suggestions, and interactive sample experience |
| Explainability and analytical integrity | 20 | Personal-baseline comparisons, visible evidence, understandable rules, and avoidance of unsupported diagnostic or AI claims |
| User experience and accessibility | 15 | Navigation, self-guidance, responsive desktop/mobile presentation, readable charts, keyboard-accessible controls, and clear form feedback |
| Privacy, consent, and responsible use | 15 | Separation of sample and personal workspaces, local-only storage disclosures, user data controls, and appropriate safety limitations |
| Engineering quality and deployment readiness | 15 | React/TypeScript/Vite structure, validation, lint/build health, maintainability, and a verified deployment if completed |
| **Total** | **100** | |

For a fair evaluation, assess only functionality that can be demonstrated in the submitted build. In particular, do not award the prototype credit for cloud synchronization, authentication, a trained model, or a completed deployment unless those are implemented and verifiably available.

## Suggested demonstration flow

1. Open **Explore demo** and describe the records as illustrative sample data.
2. Review the dashboard and navigate to **Behavior Patterns**.
3. Explain one baseline comparison using the displayed values and its evidence.
4. Show the corresponding optional recommendation and clarify that it is rule-based.
5. Submit a sample check-in or show how a personal entry is created.
6. Switch to **Personal** to demonstrate workspace separation and local data controls.
7. Close with the privacy and limitations statement, including that the current build has no backend or trained AI model.

## Roadmap

The following items are planned work and are **not part of the current implementation**:

1. **Supabase authentication and persistence** for accounts and personal records.
2. **Row-level security and privacy controls** so each authenticated user can access only their own records; sample data should remain separate.
3. **Migration and consent design** for users moving from browser-local storage to a cloud-backed account.
4. **Verified Vercel deployment** with environment-specific configuration and a tested public URL.
5. **Further quality assurance** for account flows, data access boundaries, mobile layouts, and error handling.
6. **Model integration only if justified** by consented data, a validated approach, explainability, and appropriate safety review. Until then, retain transparent deterministic analysis.

##What makes MindTrace useful?
“Beyond the dashboard, we have added features like weekly wellness reports, personal habit goals, and recommendation feedback.

Users can compare their recent routines with their own historical baseline, understand the evidence behind each observation, and choose practical steps according to their needs.

Aur sabse important, demo aur personal workspaces separate hain, so sample data doesn't mix with personal records.”

## Team

**Team:** TECHYUVAS

**Project:** MindTrace

**Domain:** AI / Health & Well-being — currently delivered as an explainable, rule-based frontend prototype.
