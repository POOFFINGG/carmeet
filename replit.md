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
- **API client**: Manually-maintained React Query hooks in `lib/api-client-react/src/generated/`
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS v4
- **UI**: Framer Motion, Lucide React, react-hook-form
- **Font**: Geologica (Google Fonts)

## App Description

MEET is a Telegram Mini App for automotive community. Features:
- **Onboarding**: 4-step flow: name → role selection → role-specific details → interest categories
- **Garage**: View cars, AI-styled images, applications dashboard
- **Events Map**: Events on map with category filters
- **Events Calendar**: Browse events by category (Motorsport, Exhibition, Cruise, Club)
- **Event Detail**: 4-button action system (Пойду/Хочу участвовать с проектом/Думаю/Не пойду), price display, countdown timer, participant list, organizer contact
- **Create Event**: Full form with subcategories, privacy toggle, prices, end time, auto-accept toggle
- **Organizer Manage**: Approve/reject applications per event (route: /events/:id/manage)
- **Profile**: User settings and role management
- **Notifications**: Event reminders and application status updates

## Design

- **Background**: #1f1f1f / #0d0d0d (dark)
- **Accent**: Red (#e53935)
- **Font**: Geologica
- **Mobile-first**: 390px viewport

## User Roles

- **Viewer (Зритель)**: Browse events, apply as viewer, choose silhouette (bicycle/scooter/skateboard/cart)
- **Participant (Участник)**: All viewer features + car garage + apply as participant with car
- **Organizer (Организатор)**: All participant features + create events + manage applications

## Event Categories

- **motorsport**: drag, drift, circuit, rally, track_day
- **exhibition**: meetup, show, concours
- **cruise**: city, mountain, night, convoy
- **club**: meeting, training, social

## DB Schema

### users
- Standard fields: id, telegramId, username, displayName, avatarUrl, role, onboardingComplete
- Organizer fields: organizationName, contactLink, adminContact
- Viewer: viewerSilhouette (bicycle/scooter/skateboard/cart)
- Common: interestCategories (array), createdAt, updatedAt

### events
- Core: id, title, description, category, subcategories, organizerId, date, endDate, location, lat, lng
- Access: isPrivate, autoAccept
- Pricing: priceParticipants, priceViewers
- Extra: organizerLink, coverImageUrl, status, maxParticipants

### applications
- Core: id, eventId, userId, carId, type (participant/viewer), status (pending/approved/rejected)
- New: attendanceStatus (going/thinking/not_going)
- Extra: comment, createdAt

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── meet-app/           # React + Vite frontend (Telegram Mini App)
├── lib/
│   ├── api-spec/           # OpenAPI spec (manually updated)
│   ├── api-client-react/   # React Query hooks (manually maintained, not auto-generated)
│   ├── api-zod/            # Zod schemas
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

- `GET /api/users/me` — Get current user profile (includes adminContact)
- `PATCH /api/users/me` — Update profile (role, categories, contactLink, adminContact, avatarUrl, etc.)
- `POST /api/users/onboarding` — Complete user onboarding (includes adminContact, interestCategories)
- `GET /api/users/:id` — Get user by ID
- `GET/POST /api/events` — List/create events (includes prices, autoAccept, isPrivate)
- `GET/PUT/DELETE /api/events/:id` — Event CRUD
- `GET/POST /api/events/:id/applications` — View/apply to event (auto-accept if event.autoAccept=true, upserts existing)
- `PUT/DELETE /api/events/:id/applications/:appId` — Manage application (organizer: approve/reject, user: update attendanceStatus)
- `GET /api/cars` — My garage
- `POST/PUT/DELETE /api/cars/:id` — Car CRUD
- `GET /api/clubs` — Recommended clubs
- `GET /api/users/me/notifications` — My notifications
- `GET /api/users/me/applications` — My applications

## Auth

Telegram ID passed via `x-telegram-id` HTTP header. Set globally via `setExtraHeadersGetter` in the API client.
Dev mock ID: `tg_123456789`
Admin check: `["1000001", "tg_123456789"].includes(tgUser.id)`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.
- Always typecheck from the root: `pnpm run typecheck`
- API client types are manually maintained in `lib/api-client-react/src/generated/api.schemas.ts`
- Push DB schema: `pnpm --filter @workspace/db run push`

## Important Notes

- The `api-client-react` package does NOT use auto-codegen — hooks are manually maintained
- When adding new fields to DB schema, always update: 1) DB schema, 2) API routes, 3) OpenAPI spec, 4) api.schemas.ts
- Applications POST endpoint upserts (updates if already exists) so users can change attendance status
- `autoAccept` on events auto-approves applications on POST
