# Hot Desk Booking PWA

A hot-desk booking Progressive Web App built with React + Vite.

This repo currently runs as a **frontend-only MVP**: the "backend" is implemented as an in-app API client backed by `localStorage` (see `src/api`).

## Features (User Guide)

### Home
- Entry point for the app.
- Quick “Book a desk” search:
	- Pick a **date + slot** and enter a search query (desk label/zone).
	- **Search** takes you to the Bookings page and shows results immediately.
	- **Refresh** re-loads data (shows a spinner while pending).
- “Your next booking” summary:
	- Shows your next upcoming booking (including notes + created timestamp).
	- Cancel your booking from Home (shows a spinner while pending).
- “Office occupancy”:
	- Shows occupancy for the selected date + slot as a meter + percentage.

### Desks
- Browse all desks with filters:
	- Zone filter
	- Text search (desk label/zone)
	- Amenity filters
- Each desk card shows availability for the currently selected **date + time slot**.
- Desk actions menu:
	- **Book** (if available and you don’t already have a booking in that slot)
	- **Cancel booking** (if you booked it)
	- **View bookings** (read-only list)
	- **Report issue** (optionally attach one of your bookings)

### Bookings
- “My bookings” accordion:
	- Shows your upcoming bookings (collapsed by default).
	- Cancel bookings you own; admins can cancel any booking.
- “Book a desk” search:
	- Pick a date + slot and search.
	- **Search** shows results in-page (with a brief skeleton pulse).
	- **Refresh** reloads data.
- Results + filters:
	- Filter by zone, search text, and amenities.
	- Each desk card shows availability for the selected date + slot.
	- Book (if available) or cancel (if booked by you).
	- If you already have a booking for that slot, booking other desks is locked out.
- Fault reporting:
	- Report an issue from a desk card; optionally attach one of your bookings.
- Admin-only:
	- Book desks on behalf of another user (“Book for”).

### Admin
Admins can manage the inventory and operational data.

- **Config**
	- Update system-wide limits such as `maxBookingsPerDay`.
- **Desks**
	- Create and edit desks (label, zone, status, amenities).
	- Delete desks (active bookings for the desk are cancelled to preserve history).
- **Faults**
	- View reported issues.
	- Resolve issues (admin-only).
- **Bulk actions**
	- Clear bookings / clear issues (admin-only).

### Offline-first behavior
- Uses a PWA service worker (see `vite.config.ts`) for offline readiness.
- Data is persisted locally via `localStorage`.
- Some actions will be queued/retried when the app detects a retryable/offline error.

## Getting Started

### Prerequisites
- Node.js (recent LTS recommended)
- npm

### Install
```sh
npm install
```

### Run locally
```sh
npm run dev
```

### Build
```sh
npm run build
```

### Preview production build
```sh
npm run preview
```

### Typecheck
```sh
npm run typecheck
```

### Lint
```sh
npm run lint
```

### Tests
```sh
npm run test:run
```

### Coverage gate
```sh
npm run test:coverage
```

Coverage thresholds are enforced in `vitest.config.ts` (global 80% for lines/functions/branches/statements).

## System Design and Structure

### High-level architecture
- **UI**: React components + screens routed via `react-router-dom`.
- **State**: Context + reducer in `src/store`.
- **API layer**:
	- `src/api/client.ts` provides async methods that behave like HTTP endpoints.
	- `src/api/db.ts` implements persistence, schema versioning, and migrations.
	- `src/api/hooks/*` provides small React hooks wrapping API calls.

### Key runtime flow
1. The app boots in `AppProvider` (`src/store/provider.tsx`).
2. `bootstrap()` fetches a snapshot (local DB) via `apiClient.getSnapshot()`.
3. Screens read from `state.db` and call `actions.*` to mutate data.
4. Actions call `apiClient` methods, then refresh snapshot state.
5. Some UI preferences are persisted separately (see `UI_KEY = "hotdesk-ui"`).

### Folder structure
```text
src/
	api/
		client.ts           # “Fake backend” API methods (async)
		db.ts               # localStorage persistence + migrations
		hooks/              # React hooks wrapping API calls

	components/           # Shared UI components
	lib/                  # Pure utilities (date, filtering, storage, etc.)
	screens/              # Route-level pages (Home, Desks, Bookings, Admin)
	store/                # Context provider, reducer, actions
	test/                 # Vitest setup + test helpers
	types.ts              # Core domain types (Desk/Booking/Fault/etc.)
```

### Data model (frontend schema)
The canonical data model lives in `src/types.ts` and is persisted as a versioned DB object (`DbV1`).

## Backend documentation (proposed)

Even though this repo ships a frontend-only MVP, it’s designed around a backend-shaped API.

- OpenAPI draft: `docs/openapi.yaml`
- ER diagram: `docs/er-diagram.md`
