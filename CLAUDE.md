# CLAUDE.md

## Project Overview

Wäsche-Timer is now a mobile-first Android-styled PWA built with Vite + React + TypeScript.
It tracks laundry drying progress, washing machine runtime, reminders, templates, and history.

## Architecture

- `Vite` build system
- `React 18` with hooks
- `TypeScript` strict mode
- `vite-plugin-pwa` for manifest + service worker integration
- Versioned local storage with migration from legacy keys

## Key Features

- Multiple laundry timers with 3-day default target
- Edit timer name/start datetime
- Reminder offsets per timer (in minutes before target)
- Washing machine countdown with preset and custom minutes
- History/archive with restore flow
- Template system (default + custom templates)
- Backup export/import (legacy + v2 schema support)
- Bottom navigation (Dashboard, Timer, Settings)

## Data Model

- Storage key: `wt.app.v2`
- Schema version: `2`
- Legacy migration reads:
  - `laundryTimers`
  - `washingMachineEndTime`

## Local Development

- Install deps: `npm install`
- Run dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Tests: `npm run test`

## Important Paths

- App entry: `src/main.tsx`
- Main UI shell: `src/app/App.tsx`
- State/reducer: `src/app/state.tsx`
- Storage layer: `src/shared/storage/repository.ts`
- Migration logic: `src/shared/storage/migrations.ts`
- Theme/styles: `src/styles.css`

