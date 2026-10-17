# MindTrace

**Understand your digital habits. Recognize stress patterns. Build healthier routines.**

## Problem Statement (PS)

MindTrace is a privacy-first wellness prototype for exploring how manually recorded digital habits may relate to self-reported mood, stress, energy, and fatigue. It is not a diagnostic tool.

## Team Name

**TECHYUVAS**

## Project Overview

MindTrace helps users understand their digital habits and changes in their daily well-being.

It brings together manually recorded screen time, active work or study hours, late-night use, breaks, task completion, and timestamped mood check-ins.

The frontend opens in an illustrative demo workspace so visitors can explore it without entering personal information. A persistent workspace switch separates sample records from personal entries; check-ins and activity entered from the demo flow into the personal workspace, never into the sample dataset. User entries and preferences are saved in browser local storage. This prototype uses deterministic rules only; it has no backend, machine-learning model, or automatic device monitoring.

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
- Self-guided dashboard tour and interactive sample walkthrough.
- Separate demo and personal workspaces; sample records are read-only and never appear in personal charts.
- Local-only data controls and explicit wellness limitations.

## Run locally

```sh
npm install
npm run dev
```

Use the terminal URL to open the app. Run `npm run lint` and `npm run build` to validate changes.

## Analysis limitations

Pattern comparisons use the latest 7 days against the prior 21 days. A measurement is compared only when it has at least 3 recent and 5 baseline records. Explainable observations include screen time, late-night use, breaks, work/study hours, task completion, and self-reported ratings. When one or more activity signals shift and at least one self-reported stress, energy, or fatigue measure also shifts, the app surfaces a combined observation with the supporting comparisons. Co-occurrence does not show causation or indicate a health condition.

The Routine Variation Index averages capped relative changes across available activity measures compared with a personal baseline and appears only when at least two measures have enough records. It is not a stress score, medical measure, or prediction. Recommendation priority labels are qualitative rule-based guidance, not evidence-based efficacy scores; suggestions are deterministic and may not fit every person.

Personal entries stay in this browser and can be removed if browser site data is cleared. The JSON export includes only the currently selected workspace and is a local download; it is not uploaded. No product demonstration video, shared database, or authentication is included in this frontend prototype. Supabase integration and Vercel deployment have not yet been configured.
