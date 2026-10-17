# MindTrace AI

**Understand your digital habits. Recognize stress patterns. Build healthier routines.**

## Problem Statement (PS)

MindTrace AI is a privacy-first wellness prototype for exploring how manually recorded digital habits may relate to self-reported mood, stress, energy, and fatigue. It is not a diagnostic tool.

## Team Name

**TECHYUVAS**

## Project Overview

MindTrace AI helps users understand their digital habits and changes in their daily well-being.

It brings together manually recorded screen time, active work or study hours, late-night use, breaks, task completion, and timestamped mood check-ins.

The frontend uses illustrative sample data on first visit. User entries and theme preferences are saved in browser local storage. No backend, external AI model, or automatic device monitoring is integrated.

## Key Features

- Daily mood and stress check-ins.
- Digital activity logging.
- Dashboard with screen-time, stress, fatigue, activity, break, and task summaries.
- Screen-time, mood, stress, break, and late-night usage trends.
- Personal baseline comparisons with documented minimum-history requirements.
- Explainable behavioral insights.
- Optional recommendations based on recorded patterns.
- Searchable daily history, JSON export, and editable entries.
- Light and dark themes with persistent preferences.
- Local-only data controls and explicit wellness limitations.

## Run locally

```sh
npm install
npm run dev
```

Use the terminal URL to open the app. Run `npm run lint` and `npm run build` to validate changes.

## Analysis limitations

Pattern comparisons use the latest 7 days against the prior 21 days. A measurement is compared only when it has at least 3 recent and 5 baseline records. The Behavior Drift indicator summarizes relative deviation in available activity measures; it is not a stress score, medical measure, or AI prediction. Recommendations are deterministic and may not fit every person.

Records stay in this browser and can be removed if browser site data is cleared. The JSON export is a local download and is not uploaded. No product demonstration video or integrated AI model is included in this frontend prototype.

