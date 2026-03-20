# Workspace

## Overview

pnpm workspace monorepo using TypeScript. MEET — Automotive Community Telegram Mini App.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS v4
- **UI**: Framer Motion, Lucide React, react-hook-form
- **Font**: Geologica (Google Fonts)

## App Description

MEET is a Telegram Mini App for automotive community. Features:
- **Onboarding**: Role selection (Viewer, Participant, Organizer), car garage setup
- **Garage**: View cars, AI-styled images, applications dashboard
- **Events Map**: Events on map with category filters
- **Events Calendar**: Browse events by category (Motorsport, Exhibition, Cruise, Club)
- **Event Detail**: Apply as viewer or participant
- **Create Event**: Organizer-only event creation form
- **Profile**: User settings and role management
- **Notifications**: Event reminders and application status updates

## Design

- **Background**: #1f1f1f (dark)
- **Accent**: Red (#e53935)
- **Font**: Geologica
- **Mobile-first**: 390px viewport

## User Roles

- **Viewer (Зритель)**: Browse events, apply as viewer
- **Participant (Участник)**: All viewer features + car garage + apply as participant
- **Organizer (Организатор)**: All participant features + create events + manage applications

## Event Categories

- **motorsport**: Rally, drift, track day, time attack, etc.
- **exhibition**: Shows, stance, tuning, retro, etc.
- **cruise**: Multi-day, single day, trophies, etc.
- **club**: By make, JDM, VAG, stance, etc.

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── meet-app/           # React + Vite frontend (Telegram Mini App)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── users.ts
│           ├── cars.ts
│           ├── events.ts
│           ├── applications.ts
│           ├── clubs.ts
│           └── notifications.ts
```

## API Endpoints

- `GET /api/users/me` — Get current user profile
- `POST /api/users/onboarding` — Complete user onboarding
- `GET/POST /api/events` — List/create events
- `GET /api/events/:id` — Event details
- `GET/POST /api/events/:id/applications` — View/apply to event
- `PUT/DELETE /api/events/:id/applications/:appId` — Manage application
- `GET /api/cars` — My garage
- `POST /api/cars` — Add car
- `GET /api/clubs` — Recommended clubs
- `GET /api/users/me/notifications` — My notifications
- `GET /api/users/me/applications` — My applications

## Auth

Telegram ID passed via `x-telegram-id` HTTP header. Set globally via `setExtraHeadersGetter` in the API client.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.
- Always typecheck from the root: `pnpm run typecheck`
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
- Push DB schema: `pnpm --filter @workspace/db run push`
